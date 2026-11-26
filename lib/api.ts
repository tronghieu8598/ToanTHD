import { env } from 'cloudflare:workers';
import { gradeAttempt, answeredCount, validExamStructure, numericValue } from './grading.mjs';
import {createAuth} from './auth.mjs';
import {can,canUseClass,canUseSession,requireTeacherRoute,teacherWriteGuard} from './access.mjs';
import {handleAccounts} from './accounts.mjs';
import {handleLibraryUploads} from './library-uploads.mjs';
import {handleStudioPlan} from './studio-plan.mjs';
import {handleBankRelease} from './bank-release.mjs';
import {handleAdmin,currentBankSQL} from './admin.mjs';
import {handleBackup} from './backup-service.mjs';
import {createStudentEntry} from './student-entry.mjs';
import {decodeQuestion,publicQuestion,canAutoGrade,canEnterSession,bankFilter,parseNumberSelection,isCourseDocument} from './course-bank.mjs';
import {resolveQuestionVariant,availableQuestionVariantKeys} from './accepted-variants.mjs';
type Row = Record<string, any>;
class ApiError extends Error {
    constructor(public status: number, message: string, public code?: string) { super(message); }
}
const database = () => { if (!env.DB)
    throw new ApiError(503, 'Chưa có cơ sở dữ liệu. Chạy bước cài đặt lần đầu.'); return env.DB; };
const all = async (sql: string, ...args: any[]): Promise<Row[]> => (await database().prepare(sql).bind(...args).all()).results as Row[];
const first = async (sql: string, ...args: any[]): Promise<Row | null> => await database().prepare(sql).bind(...args).first();
const json = (value: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
const must = (condition: unknown, message: string, status = 400) => { if (!condition)
    throw new ApiError(status, message); };
const verifiedOverrideValue = async (): Promise<string | null> => {
    const row = await first("SELECT value FROM workspace_settings WHERE key='verified_course_keys'");
    return row?.value ?? null;
};
const decodeVerifiedOverrides = (value: string | null): Record<string, any> => {
    try { return value ? JSON.parse(value) || {} : {}; } catch { return {}; }
};
const getVerifiedOverrides = async () => decodeVerifiedOverrides(await verifiedOverrideValue());
const getSession = async (id: string) => {
    const s = await first('SELECT s.*, c.label AS class_label FROM sessions s JOIN classrooms c ON c.id=s.classroom_id WHERE s.id=?', id);
    if (!s)
        throw new ApiError(404, 'Không tìm thấy phiên làm bài.');
    if(s.roster_snapshot){const snap=JSON.parse(s.roster_snapshot);s.class_label=snap.class_label;}
    return s;
};
const sessionQuestions = async (id: string) => (await all('SELECT snapshot FROM session_questions WHERE session_id=? ORDER BY position', id)).map(r => JSON.parse(r.snapshot));
const isOpen = (s: Row) => s.state === 'open' && Date.now() < s.closes_at;
const readBody = async (request: Request, maxLength = 5000000): Promise<Row> => {
    const text = await request.text();
    must(text.length <= maxLength, 'Nội dung gửi lên quá lớn.', 413);
    try {
        const data = JSON.parse(text);
        must(data && typeof data === 'object' && !Array.isArray(data), 'Dữ liệu không hợp lệ.');
        return data;
    }
    catch (e) {
        if (e instanceof ApiError)
            throw e;
        throw new ApiError(400, 'Dữ liệu JSON không hợp lệ.');
    }
};
const authTools=createAuth({env,database,first,must});
const secureEqual=authTools.equal;
const studentEntry=createStudentEntry({env,database,first,all,must,equal:secureEqual});
async function getRoster(s:Row) {
 if(s.roster_snapshot){const snap=JSON.parse(s.roster_snapshot);return (snap.students||[]).sort((a:Row,b:Row)=>a.ordinal-b.ordinal);}
 return all('SELECT id,ordinal,name FROM students WHERE classroom_id=? ORDER BY ordinal',s.classroom_id);
}
async function attemptFrom(request: Request) {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
    const a = await first('SELECT * FROM attempts WHERE token=?', token);
    if (!a)
        throw new ApiError(401, 'Thiết bị chưa có quyền làm bài hoặc giáo viên đã cho đổi thiết bị. Hãy vào lại phiên.', 'device_revoked');
    return a;
}
function validateAnswers(qs: Row[], input: any, existingAnswers: Row = {}) {
    must(input && typeof input === 'object' && !Array.isArray(input), 'Câu trả lời không hợp lệ.');
    const clean: Row = {};
    for (const [k, v] of Object.entries(existingAnswers)) {
        if (k.startsWith('__free_score:')) clean[k] = v;
    }
    for (const q of qs) {
        const a = input[q.id];
        if (a === undefined)
            continue;
        if (q.kind === 'mcq') {
            must(typeof a === 'string' && q.choices.some((c: Row) => c.key === a), 'Phương án lựa chọn không hợp lệ.');
            clean[q.id] = a;
        }
        else if (q.kind === 'tf') {
            must(Array.isArray(a) && a.length === 4 && a.every(v => v === null || typeof v === 'boolean'), 'Đáp án Đúng/Sai không hợp lệ.');
            clean[q.id] = a;
        }
        else if (q.kind === 'free') {
            must(typeof a === 'string' && a.length <= 500, 'Ghi chú bài làm tự luận quá dài (tối đa 500 ký tự).');
            clean[q.id] = a.trim();
        }
        else {
            must(typeof a === 'string' && a.length <= 80, 'Đáp án trả lời ngắn quá dài.');
            clean[q.id] = a.trim();
        }
    }
    return clean;
}
async function finalize(a: Row, qs: Row[]) {
    const token=a.token;
    for(let retry=0;retry<5;retry++){
        if(a.token!==token)throw new ApiError(401,'Thiết bị đã hết quyền làm bài. Hãy vào lại phiên.','device_revoked');
        if(a.submitted_at)return a;
        const session=await getSession(a.session_id);
        const result=gradeAttempt(qs,JSON.parse(a.answers),session.scoring_mode);
        const now=Date.now();
        const updated=await database().prepare('UPDATE attempts SET submitted_at=?,earned=?,score=?,updated_at=? WHERE id=? AND submitted_at IS NULL AND save_revision=? AND token=?').bind(now,result.earned,result.score,now,a.id,a.save_revision,token).run();
        const current=(await first('SELECT * FROM attempts WHERE id=?',a.id))!;
        if(current.token!==token)throw new ApiError(401,'Thiết bị đã hết quyền làm bài. Hãy vào lại phiên.','device_revoked');
        if(updated.meta?.changes||current.submitted_at)return current;
        a=current;
    }
    throw new ApiError(409,'Bài đang được lưu ở tab khác. Chờ một chút rồi nộp lại.','stale_write');
}
async function settle(s: Row) {
    if (!isOpen(s)) {
        const qs = await sessionQuestions(s.id);
        for (const a of await all('SELECT * FROM attempts WHERE session_id=? AND submitted_at IS NULL', s.id))
            await finalize(a, qs);
    }
}
async function packAttempt(a: Row) {
    const s = await getSession(a.session_id), qs = await sessionQuestions(s.id);
    if (!isOpen(s))
        a = await finalize(a, qs);
    const student = (await getRoster(s)).find((item:Row)=>item.id===a.student_id);
    const {roster_snapshot,owner_teacher_id,...safeSession}=s;
    const rawAnswers = JSON.parse(a.answers);
    const publicAnswers = Object.fromEntries(Object.entries(rawAnswers).filter(([k]) => !k.startsWith('__free_score:')));
    return { id: a.id, token: a.token, save_revision:a.save_revision, session: { ...safeSession, state: isOpen(s) ? 'open' : 'closed' }, student, questions: qs.map(publicQuestion), answers: publicAnswers, submitted_at: a.submitted_at, score: a.submitted_at ? a.score : null, server_time: Date.now() };
}
function checkOrigin(request: Request) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method))
        return;
    const origin = request.headers.get('origin');
    if (origin)
        must(origin === authTools.publicOrigin(request.url), 'Yêu cầu đến từ địa chỉ khác không được chấp nhận.', 403);
}
type StaffAuth = Awaited<ReturnType<typeof authTools.requireTeacher>>;
type ExamQuestion = {position:number;source_id:string;snapshot:string};
type ExamSettings = {title:string;minutes:number;mode:string;scoring_mode:string};
const examReadable = "(visibility='team' OR (?<>'demo' AND owner_teacher_id IS ?))";
const ownsExam = (exam: Row, auth: StaffAuth) => auth.role !== 'demo' && exam.owner_teacher_id === auth.id;
const managesExam = (exam: Row, auth: StaffAuth) =>
    ownsExam(exam, auth) && can(auth, 'author_exams') || auth.role === 'admin' && exam.visibility === 'team';
async function scopedSession(id: unknown, auth: StaffAuth) {
    const session = await getSession(typeof id === 'string' ? id : '');
    must(canUseSession(auth, session), 'Không tìm thấy phiên làm bài.', 404);
    return session;
}

function sessionScope(auth: StaffAuth) {
    if (auth.role !== 'teacher') return {sql: '', args: []};
    return {
        sql: ' AND s.owner_teacher_id=? AND s.classroom_id IN (SELECT value FROM json_each(?))',
        args: [auth.id, JSON.stringify(auth.classIds)],
    };
}

function examSettings(input: Row): ExamSettings {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const scoringMode = input.scoring_mode || 'practice';
    must(title.length > 0 && title.length <= 160, 'Tên đề hoặc phiên cần từ 1 đến 160 ký tự.');
    must(Number.isInteger(input.minutes) && input.minutes >= 1 && input.minutes <= 180, 'Thời gian cần từ 1 đến 180 phút.');
    must(['online', 'paper'].includes(input.mode), 'Chế độ không hợp lệ.');
    must(['practice','exam-1246'].includes(scoringMode), 'Chế độ chấm không hợp lệ.');
    return {title, minutes: input.minutes, mode: input.mode, scoring_mode: scoringMode};
}

async function questionsFromBank(body: Row, settings: ExamSettings): Promise<ExamQuestion[]> {
    const ids = body.question_ids;
    must(Array.isArray(ids) && ids.length > 0 && ids.length <= 100, 'Chọn từ 1 đến 100 câu.');
    must(ids.every((id: unknown) => typeof id === 'string' && id.length > 0 && id.length <= 160), 'Mã câu hỏi không hợp lệ.');
    must(new Set(ids).size === ids.length, 'Danh sách đang có câu bị lặp.');
    const suppliedVariants = body.question_variants === undefined ? {} : body.question_variants;
    must(suppliedVariants && typeof suppliedVariants === 'object' && !Array.isArray(suppliedVariants), 'Danh sách biến thể không hợp lệ.');
    const variants = new Map(Object.entries(suppliedVariants));
    must(!variants.size || settings.mode === 'online', 'Đề có biến thể cần dùng chế độ Đề đầy đủ.');
    must([...variants].every(([id, key]) => ids.includes(id) && typeof key === 'string' && key.length <= 30), 'Có biến thể không thuộc câu đã chọn.');
    const [bank, verifiedOverrides] = await Promise.all([
        all(currentBankSQL+' AND q.archived_at IS NULL AND q.id IN (SELECT value FROM json_each(?))',JSON.stringify(ids)),
        getVerifiedOverrides(),
    ]);
    const byId = new Map(bank.map(q => [q.id,q]));
    const allowFree = body.allow_free === true && settings.scoring_mode === 'practice';
    const selected: Row[] = await Promise.all(ids.map(async (id: string) => {
        const row = byId.get(id);
        must(row, 'Có câu hỏi không còn tồn tại.');
        const question = decodeQuestion(row!,verifiedOverrides);
        const key = variants.get(id);
        const chosen = key === undefined ? question : await resolveQuestionVariant(question,key);
        must(chosen, 'Biến thể không còn hợp lệ. Hãy mở lại câu gốc để chọn biến thể.',409);
        must(canEnterSession(chosen,{allowFree}), 'Có câu cần đối chiếu đáp án hoặc chưa được chọn tự luận.');
        return chosen!;
    }));
    if (settings.scoring_mode === 'exam-1246') {
        must(validExamStructure(selected), 'Cấu trúc này cần đúng 12 trắc nghiệm, 4 Đúng/Sai và 6 trả lời ngắn.');
    }
    return selected.map((q,position) => {
        const {bank_tex,bank_meta,bank_search,source_json,bank_fingerprint,verified_override,original_bank_status,...snapshot} = q;
        return {position,source_id:q.id,snapshot:JSON.stringify(snapshot)};
    });
}

async function startSession(request: Request, settings: ExamSettings, questions: ExamQuestion[], classroomId: unknown, auth: StaffAuth, exam?: Row) {
    must(typeof classroomId === 'string' && canUseClass(auth,classroomId), 'Lớp không thuộc danh sách giảng dạy của tài khoản.', 403);
    const room = await first('SELECT * FROM classrooms WHERE id=?',classroomId);
    must(room,'Lớp không tồn tại.',404);
    if (!room!.is_sample) await authTools.requireReal(auth);
    const requiresEntryCode = !room!.is_sample && authTools.publicOrigin(request.url).startsWith('https://');
    const roster = await all('SELECT id,ordinal,name FROM students WHERE classroom_id=? AND archived_at IS NULL ORDER BY ordinal',room!.id);
    must(roster.length > 0,'Lớp chưa có học sinh.');
    must(questions.length > 0 && questions.length <= 100,'Đề cần từ 1 đến 100 câu hỏi.');
    const id = crypto.randomUUID();
    const now = Date.now();
    const rosterSnapshot = JSON.stringify({class_label:room!.label,school_year:room!.school_year,students:roster});
    // The guard runs inside the same transaction as the insert and catches a concurrent permission change.
    const guards: string[] = [], args: any[] = [];
    if (auth.role === 'teacher') {
        const teacherGuard = teacherWriteGuard(auth);
        guards.push(teacherGuard.sql);
        args.push(...teacherGuard.args);
    }
    if (exam) {
        guards.push('EXISTS(SELECT 1 FROM saved_exams WHERE id=? AND revision=? AND archived_at IS NULL AND '+examReadable+')');
        args.push(exam.id, exam.revision, auth.role, auth.id);
    }
    const checkedClass = guards.length ? 'CASE WHEN '+guards.join(' AND ')+' THEN ? ELSE NULL END' : '?';
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let retry = 0; retry < 4; retry++) {
        const code = Array.from(crypto.getRandomValues(new Uint8Array(6)),byte=>alphabet[byte%alphabet.length]).join('');
        const statements = [database().prepare(`INSERT INTO sessions(id,code,title,classroom_id,mode,minutes,state,created_at,closes_at,roster_snapshot,scoring_mode,owner_teacher_id,requires_entry_code)
            VALUES(?,?,?,${checkedClass},?,?,'open',?,?,?,?,?,?)`).bind(id,code,settings.title,...args,room!.id,settings.mode,settings.minutes,
            now,now+settings.minutes*60000,rosterSnapshot,settings.scoring_mode,auth.id,Number(requiresEntryCode)),
            ...questions.map(q=>database().prepare('INSERT INTO session_questions(id,session_id,position,source_id,snapshot) VALUES(?,?,?,?,?)')
                .bind(crypto.randomUUID(),id,q.position,q.source_id,q.snapshot))];
        try {
            await database().batch(statements);
            return json({id,code},201);
        } catch (error) {
            const message = String((error as Error).message);
            if (message.includes('sessions.code')) continue;
            if (message.includes('NOT NULL constraint failed: sessions.classroom_id')) {
                throw new ApiError(409,'Quyền hoặc trạng thái đề vừa thay đổi. Tải lại rồi thử lại.');
            }
            throw error;
        }
    }
    throw new ApiError(409,'Chưa tạo được mã phiên. Vui lòng thử lại.');
}

async function savedQuestions(examId: string): Promise<ExamQuestion[]> {
    const rows=await all(`SELECT e.position,e.source_id,e.snapshot,q.id AS current_source
        FROM saved_exam_questions e LEFT JOIN questions q ON q.id=e.source_id WHERE e.exam_id=? ORDER BY e.position`,examId);
    must(rows.every(row=>row.current_source),'Đề này thiếu câu nguồn sau khi phục hồi dữ liệu. Hãy nhờ người soạn lưu lại đề.',409);
    return rows as ExamQuestion[];
}

export async function handleApi(request: Request) {
    try {
        checkOrigin(request);
        const url = new URL(request.url), path = url.pathname.replace(/^\/api\//, '');
        const method = request.method;
        if (path === 'health' && method === 'GET') {
            const row = await first('SELECT COUNT(*) AS count FROM questions');
            return json({ ready: true, version: '0.14.0', questions: row?.count });
        }
        if(path==='public/meta'&&method==='GET')return json(await authTools.info(null));
        if(path==='teacher/demo'&&method==='POST'){
          const info=await authTools.info(null);must(info.demo_available,'Bản minh họa không mở được khi có dữ liệu thật. Hãy đăng nhập bằng mật khẩu.',403);
          return json({ok:true,demo:true},200,{'Set-Cookie':await authTools.issue('demo',request.url)});
        }
        if(path==='teacher/login'&&method==='POST'){
          const body=await readBody(request,2000);
          return json({ok:true},200,{'Set-Cookie':await authTools.login(body.username,body.password,request.url)});
        }
        if (path === 'teacher/logout' && method === 'POST')
            return json({ ok: true }, 200, { 'Set-Cookie': authTools.clearCookie(request.url) });
        if (path.startsWith('teacher/')) {
            const teacherAuth=await authTools.requireTeacher(request);
            requireTeacherRoute(teacherAuth,path,method,must);
            if(path==='teacher/studio-plan')return await handleStudioPlan(request,{all,first,database,must,json,readBody,auth:teacherAuth,authTools});
            if(path==='teacher/bank-release/stage'||path==='teacher/bank-release/activate')
                return await handleBankRelease(path,request,{env,first,database,must,json,readBody,auth:teacherAuth,authTools});
            const uploads=await handleLibraryUploads(path,request,{all,first,database,must,json,readBody,auth:teacherAuth,authTools});
            if(uploads)return uploads;
            const accountResponse=await handleAccounts(path,request,{all,first,database,must,json,readBody,auth:teacherAuth,authTools});
            if(accountResponse)return accountResponse;
            const backup=await handleBackup(path,request,{env,all,first,database,must,json,readBody,auth:teacherAuth,authTools});
            if(backup)return backup;
            const managed=await handleAdmin(path,request,{env,all,first,database,must,json,readBody,auth:teacherAuth,authTools});
            if(managed)return managed;
            if (path === 'teacher/bootstrap' && method === 'GET') {
                const auth = await authTools.info(teacherAuth);
                const visibleBank = !teacherAuth.setupRequired && (can(teacherAuth,'author_exams') || can(teacherAuth,'edit_bank'));
                const scope = sessionScope(teacherAuth);
                const scopedClasses = teacherAuth.role === 'teacher';
                const allowed = JSON.stringify(teacherAuth.setupRequired ? [] : teacherAuth.classIds);
                const [documents,lessons,classrooms,students,sessionRows,totals,verifiedOverrides] = await Promise.all([
                    visibleBank ? all(`SELECT d.*,(SELECT COUNT(*) FROM (${currentBankSQL} AND q.archived_at IS NULL) bank WHERE bank.document_id=d.id) AS question_count FROM documents d ORDER BY CASE WHEN d.id LIKE 'dc-%-v4' THEN 0 ELSE 1 END,d.grade,d.id`) : [],
                    visibleBank ? all('SELECT * FROM lessons ORDER BY id') : [],
                    scopedClasses ? all('SELECT * FROM classrooms WHERE id IN (SELECT value FROM json_each(?)) ORDER BY label',allowed) : all('SELECT * FROM classrooms ORDER BY label'),
                    !teacherAuth.setupRequired && can(teacherAuth,'manage_rosters')
                        ? scopedClasses ? all('SELECT * FROM students WHERE archived_at IS NULL AND classroom_id IN (SELECT value FROM json_each(?)) ORDER BY classroom_id,ordinal',allowed)
                            : all('SELECT * FROM students WHERE archived_at IS NULL ORDER BY classroom_id,ordinal')
                        : [],
                    teacherAuth.setupRequired ? [] : all('SELECT s.*, c.label AS class_label, (SELECT COUNT(*) FROM session_questions q WHERE q.session_id=s.id) AS question_count, (SELECT COUNT(*) FROM attempts a WHERE a.session_id=s.id) AS joined, (SELECT COUNT(*) FROM attempts a WHERE a.session_id=s.id AND a.submitted_at IS NOT NULL) AS submitted FROM sessions s JOIN classrooms c ON c.id=s.classroom_id WHERE 1=1'+scope.sql+' ORDER BY created_at DESC',...scope.args),
                    visibleBank ? all('SELECT grade,bank_status,COUNT(*) AS count FROM ('+currentBankSQL+' AND q.archived_at IS NULL) GROUP BY grade,bank_status') : [],
                    visibleBank ? getVerifiedOverrides() : {},
                ]);
                return json({documents:documents.map(d=>({...d,is_bundled:isCourseDocument(d.id)})),lessons,questions:[],bank_paged:true,
                    bank_summary:totals,verified_count:Object.keys(verifiedOverrides).length,question_count:totals.reduce((n,r)=>n+r.count,0),
                    classrooms,students,sessions:sessionRows.map(({roster_snapshot,...row})=>({...row,
                        class_label:roster_snapshot?JSON.parse(roster_snapshot).class_label:row.class_label,state:isOpen(row)?'open':'closed',
                    })),version:'0.14.0',auth});
            }
            if (path === 'teacher/exams' && method === 'GET') {
                const exams=await all(`SELECT e.id,e.title,e.minutes,e.mode,e.scoring_mode,e.archived_at,e.created_at,e.owner_teacher_id,e.visibility,e.revision,
                    (SELECT COUNT(*) FROM saved_exam_questions q WHERE q.exam_id=e.id) AS question_count
                    FROM saved_exams e WHERE ${examReadable}
                    AND (e.archived_at IS NULL OR (?<>'demo' AND e.owner_teacher_id IS ?) OR (?='admin' AND e.visibility='team'))
                    ORDER BY e.archived_at IS NOT NULL,e.created_at DESC`,
                    teacherAuth.role,teacherAuth.id,teacherAuth.role,teacherAuth.id,teacherAuth.role);
                return json({exams:exams.map(row => {
                    const {owner_teacher_id, ...exam} = row;
                    const owned = ownsExam(row, teacherAuth);
                    return {...exam, owned, can_manage: managesExam(row, teacherAuth),
                        can_share: owned && can(teacherAuth, 'author_exams')};
                })});
            }
            if (path === 'teacher/exams' && method === 'POST') {
                await authTools.requireReal(teacherAuth);
                const body=await readBody(request);
                const visibility = body.visibility ?? 'private';
                must(visibility === 'private' || visibility === 'team', 'Chọn phạm vi chia sẻ hợp lệ.');
                must(!(body.session_id && body.source_exam_id), 'Chọn một nguồn để lưu đề.');
                const session=body.session_id?await scopedSession(body.session_id,teacherAuth):null;
                const sourceExam=body.source_exam_id ? await first(
                    'SELECT * FROM saved_exams WHERE id=? AND archived_at IS NULL AND '+examReadable,
                    String(body.source_exam_id),teacherAuth.role,teacherAuth.id) : null;
                if (body.source_exam_id) must(sourceExam,'Đề nguồn không còn khả dụng.',404);
                const settings=examSettings(session ? {...session,title:body.title??session.title} :
                    sourceExam ? {...sourceExam,minutes:body.minutes??sourceExam.minutes,
                        title:body.title??String(sourceExam.title).slice(0,150)+' · Bản sao'} : body);
                const questions:ExamQuestion[]=session
                    ?(await all('SELECT position,source_id,snapshot FROM session_questions WHERE session_id=? ORDER BY position',session.id)) as ExamQuestion[]
                    :sourceExam ? await savedQuestions(sourceExam.id)
                    :await questionsFromBank(body,settings);
                must(questions.length > 0,'Đề chưa có câu hỏi.');
                const id=crypto.randomUUID();
                const guard = teacherWriteGuard(teacherAuth);
                const sourceGuard = sourceExam
                    ? ' AND EXISTS(SELECT 1 FROM saved_exams WHERE id=? AND revision=? AND archived_at IS NULL AND '+examReadable+')' : '';
                const args = sourceExam ? [...guard.args,sourceExam.id,sourceExam.revision,teacherAuth.role,teacherAuth.id] : guard.args;
                const statements=[database().prepare(`INSERT INTO saved_exams(id,title,mode,minutes,scoring_mode,owner_teacher_id,created_at,visibility)
                    VALUES(?,CASE WHEN ${guard.sql}${sourceGuard} THEN ? ELSE NULL END,?,?,?,?,?,?)`)
                        .bind(id,...args,settings.title,settings.mode,settings.minutes,settings.scoring_mode,teacherAuth.id,Date.now(),visibility),
                    ...questions.map(q=>database().prepare('INSERT INTO saved_exam_questions(exam_id,position,source_id,snapshot) VALUES(?,?,?,?)')
                        .bind(id,q.position,q.source_id,q.snapshot))];
                try { await database().batch(statements); }
                catch(error) {
                    if(String((error as Error).message).includes('NOT NULL constraint failed: saved_exams.title'))throw new ApiError(409,'Quyền hoặc đề nguồn vừa thay đổi. Tải lại trước khi lưu.');
                    throw error;
                }
                return json({id},201);
            }
            if (path === 'teacher/exams/assign' && method === 'POST') {
                const body=await readBody(request,3000);
                const exam=await first('SELECT * FROM saved_exams WHERE id=? AND archived_at IS NULL AND '+examReadable,
                    String(body.exam_id||''),teacherAuth.role,teacherAuth.id);
                must(exam,'Đề đã lưu không còn khả dụng.',404);
                const settings=examSettings({...exam,minutes:body.minutes??exam!.minutes});
                return await startSession(request,settings,await savedQuestions(exam!.id),body.classroom_id,teacherAuth,exam!);
            }
            if (['teacher/exams/archive','teacher/exams/visibility','teacher/exams/details'].includes(path) && method === 'POST') {
                await authTools.requireReal(teacherAuth);
                const body=await readBody(request,3000);
                const exam=await first('SELECT * FROM saved_exams WHERE id=?',String(body.id||''));
                must(exam && managesExam(exam,teacherAuth),
                    'Không tìm thấy đề trong phạm vi quản lý.',404);
                must(body.revision === undefined || body.revision === exam!.revision,'Đề vừa thay đổi. Tải lại danh sách.',409);
                let fields: string, values: any[];
                if (path === 'teacher/exams/archive') {
                    fields = 'archived_at=?';
                    values = [body.archived ? Date.now() : null];
                } else {
                    must(ownsExam(exam!,teacherAuth) && !exam!.archived_at,'Đề không khả dụng để sửa hoặc chia sẻ.',404);
                    if (path === 'teacher/exams/visibility') {
                        must(body.visibility === 'private' || body.visibility === 'team','Chọn phạm vi chia sẻ hợp lệ.');
                        fields = 'visibility=?';
                        values = [body.visibility];
                    } else {
                        must(exam!.visibility === 'private','Chuyển đề về riêng tư để chỉnh tên và thời lượng.',409);
                        const settings = examSettings({...exam,title:body.title,minutes:body.minutes});
                        fields = 'title=?, minutes=?';
                        values = [settings.title,settings.minutes];
                    }
                }
                const guard = teacherWriteGuard(teacherAuth);
                const result = await database().prepare('UPDATE saved_exams SET '+fields+', revision=revision+1 WHERE id=? AND revision=? AND '+guard.sql)
                    .bind(...values,exam!.id,exam!.revision,...guard.args).run();
                must(result.meta?.changes===1,'Quyền hoặc đề vừa thay đổi. Tải lại danh sách.',409);
                return json({ok:true});
            }
            if(path==='teacher/bank'&&method==='GET'){
                must(url.searchParams.get('archived')!=='1'||can(teacherAuth,'edit_bank'),'Cần quyền biên tập để xem câu đã lưu trữ.',403);
                for(const key of ['from','to']){const value=url.searchParams.get(key);must(!value||Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=99999,'Khoảng số câu không hợp lệ.');}
                must((url.searchParams.get('q')||'').length<=200,'Từ khóa tìm kiếm quá dài.');
                const verifiedOverrides=await getVerifiedOverrides();
                const filter=bankFilter(url.searchParams,Object.keys(verifiedOverrides)),page=Math.max(1,Math.min(100000,Number(url.searchParams.get('page'))||1)),size=20;
                must(Number.isInteger(page),'Số trang không hợp lệ.');
                const base=currentBankSQL+filter.sql;
                const count=await first('SELECT COUNT(*) AS total FROM ('+base+')',...filter.args);
                const rows=await all(base+' ORDER BY d.grade,l.document_id,l.id,q.original_number LIMIT ? OFFSET ?',...filter.args,size,(page-1)*size);
                const questions=rows.map(row=>{
                    const question=decodeQuestion(row,verifiedOverrides);
                    const count=can(teacherAuth,'author_exams') ? availableQuestionVariantKeys(question).length : 0;
                    return count ? {...question,variant_available:true,variant_count:count} : question;
                });
                return json({questions,total:count?.total||0,page,page_size:size});
            }
            if(path==='teacher/bank/variant'&&method==='POST'){
                const body=await readBody(request,2000);
                must(typeof body.question_id==='string' && body.question_id.length>0 && body.question_id.length<=160, 'Mã câu hỏi không hợp lệ.');
                const [row,overrides]=await Promise.all([
                    first(currentBankSQL+' AND q.id=? AND q.archived_at IS NULL',body.question_id),
                    getVerifiedOverrides(),
                ]);
                must(row, 'Không tìm thấy câu gốc.',404);
                const question=decodeQuestion(row!,overrides);
                const available=availableQuestionVariantKeys(question);
                must(available.length, 'Câu này chưa có biến thể được chấp nhận.',409);
                must(body.variant_key===undefined || typeof body.variant_key==='string' && available.includes(body.variant_key), 'Mã biến thể không hợp lệ.',409);
                const keys=available.filter(key=>key!==body.previous_key);
                const key=body.variant_key ?? keys[crypto.getRandomValues(new Uint32Array(1))[0]%keys.length];
                const variant=await resolveQuestionVariant(question,key);
                must(variant, 'Không tải được biến thể. Hãy mở lại câu gốc.',409);
                return json({question:variant,variants:available.map((key, i)=>({key,number:i+1}))});
            }
            if(path==='teacher/bank/select'&&method==='POST'){
                const b=await readBody(request),mode=String(b.mode||'');
                must(['exam-1246','numbers','odd','even','random','all'].includes(mode),'Chế độ chọn câu không hợp lệ.');
                const params=new URLSearchParams();
                for(const k of ['grade','course','document_id','chapter','lesson_id','kind','from','to','q','status']){if(b[k])params.set(k,String(b[k]));}
                const verifiedOverrides=await getVerifiedOverrides();
                const filter=bankFilter(params,Object.keys(verifiedOverrides));
                const rows=await all(currentBankSQL+filter.sql+' ORDER BY d.grade,l.document_id,l.id,q.original_number',...filter.args);
                const decoded=rows.map(r=>decodeQuestion(r,verifiedOverrides));
                const allowFree=!!b.allow_free&&mode!=='exam-1246';
                const eligible=decoded.filter(q=>canEnterSession(q,{allowFree}));
                const shuffle=(arr:Row[])=>{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
                if(mode==='exam-1246'){
                    const byKind=Object.fromEntries(['mcq','tf','short'].map(k=>[k,eligible.filter(q=>q.kind===k&&canAutoGrade(q))]));
                    must(byKind.mcq.length>=12&&byKind.tf.length>=4&&byKind.short.length>=6,`Bộ lọc hiện tại có ${byKind.mcq.length} câu TN, ${byKind.tf.length} câu Đ/S, ${byKind.short.length} câu TLN (cần tối thiểu 12 TN, 4 Đ/S, 6 TLN). Hãy mở rộng phạm vi chương, bài hoặc số câu.`);
                    const picked=['mcq','tf','short'].flatMap((k,i)=>shuffle(byKind[k]).slice(0,[12,4,6][i]).sort((a,b)=>a.lesson_id.localeCompare(b.lesson_id)||a.original_number-b.original_number));
                    return json({questions:picked});
                }
                if(mode==='numbers'){
                    const nums=new Set(parseNumberSelection(b.numbers_spec));
                    must(nums.size>0,'Nhập số câu hoặc khoảng câu hợp lệ, ví dụ: 1-10, 15, 22.');
                    const picked=eligible.filter(q=>nums.has(q.original_number)).slice(0,100);
                    must(picked.length>0,'Không tìm thấy câu có thể chấm khớp với các số câu đã nhập trong bộ lọc này.');
                    return json({questions:picked});
                }
                if(mode==='odd'||mode==='even'){
                    const rem=mode==='odd'?1:0;
                    const picked=eligible.filter(q=>q.original_number%2===rem).slice(0,100);
                    return json({questions:picked});
                }
                if(mode==='random'){
                    const count=Math.min(100,Math.max(1,Number(b.count)||10));
                    const picked=shuffle(eligible).slice(0,count).sort((a,b)=>a.lesson_id.localeCompare(b.lesson_id)||a.original_number-b.original_number);
                    return json({questions:picked});
                }
                return json({questions:eligible.slice(0,100)});
            }
            if(path==='teacher/questions/resolve-key'&&method==='POST'){
                const b=await readBody(request),qid=String(b.id||'');
                const row=await first('SELECT * FROM questions WHERE id=?',qid);
                must(row,'Câu hỏi không tồn tại.',404);
                const previous=await verifiedOverrideValue();
                const overrides=decodeVerifiedOverrides(previous);
                if(b.reset){
                    delete overrides[qid];
                }else{
                    const kind=row!.kind,correct=b.correct;
                    if(kind==='mcq')must(typeof correct==='string'&&/^[ABCD]$/.test(correct),'Đáp án trắc nghiệm cần là A, B, C hoặc D.');
                    else if(kind==='tf')must(Array.isArray(correct)&&correct.length===4&&correct.every(v=>typeof v==='boolean'),'Đáp án Đúng/Sai cần đủ 4 ý Đúng hoặc Sai.');
                    else if(kind==='short')must(typeof correct==='string'&&numericValue(correct)!==null,'Đáp án trả lời ngắn cần là số hoặc phân số hợp lệ.');
                    else must(false,'Chỉ chốt khóa đáp án tự động cho câu trắc nghiệm, Đúng/Sai hoặc trả lời ngắn.');
                    overrides[qid]={correct:kind==='short'?String(correct).trim():correct,updated_at:Date.now()};
                }
                const updatedSetting=await database().prepare(`INSERT INTO workspace_settings(key,value)
                    SELECT 'verified_course_keys',? WHERE EXISTS(SELECT 1 FROM questions WHERE id=? AND bank_fingerprint IS ?)
                        AND (SELECT value FROM workspace_settings WHERE key='verified_course_keys') IS ?
                    ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(JSON.stringify(overrides),qid,row!.bank_fingerprint,previous).run();
                must(updatedSetting.meta.changes===1,'Câu hỏi hoặc đáp án vừa đổi. Tải lại trước khi xác nhận.',409);
                const updated=(await all(currentBankSQL+' AND q.id=?',qid))[0]||row;
                return json({ok:true,question:decodeQuestion(updated,overrides)});
            }
            if(path==='teacher/bank/export'&&method==='GET'){
                const did=url.searchParams.get('document_id');must(did,'Chọn tài liệu cần xuất.');
                const doc=await first('SELECT * FROM documents WHERE id=?',did);must(doc,'Tài liệu không tồn tại.',404);
                const lessons=await all('SELECT * FROM lessons WHERE document_id=? ORDER BY id',did);
                const bundled=isCourseDocument(did);
                const exportSQL=bundled?currentBankSQL.replace('q.*,','q.id,q.lesson_id,q.original_number,q.kind,q.prompt,q.choices,q.correct,q.solution,q.bank_status,q.bank_meta,q.bank_note,'):currentBankSQL;
                const exported=await all(exportSQL+' AND l.document_id=? AND q.archived_at IS NULL ORDER BY l.id,q.original_number',did);
                const overrides=bundled?await getVerifiedOverrides():null;
                const questions=exported.map(r=>decodeQuestion(r,overrides));
                return json({documents:[doc],lessons,questions,is_bundled:bundled},200,{'Content-Disposition':'attachment; filename="ToanTHD_ngan_hang.json"'});
            }
            if (path === 'teacher/sessions' && method === 'POST') {
                const body=await readBody(request),settings=examSettings(body);
                return await startSession(request,settings,await questionsFromBank(body,settings),body.classroom_id,teacherAuth);
            }
            if (path === 'teacher/sessions/clone' && method === 'POST') {
                const body=await readBody(request),source=await scopedSession(body.session_id,teacherAuth);
                const title=typeof body.title==='string'&&body.title.trim()?body.title:source.title;
                const settings=examSettings({...source,title,minutes:body.minutes===undefined?source.minutes:Number(body.minutes)});
                const questions=(await all('SELECT position,source_id,snapshot FROM session_questions WHERE session_id=? ORDER BY position',source.id)) as ExamQuestion[];
                return await startSession(request,settings,questions,body.classroom_id,teacherAuth);
            }
            if (path === 'teacher/extend' && method === 'POST') {
                const body = await readBody(request), s = await scopedSession(body.id,teacherAuth);
                const addMinutes = Number(body.minutes);
                must(Number.isInteger(addMinutes) && addMinutes >= 1 && addMinutes <= 120, 'Số phút gia hạn cần từ 1 đến 120.');
                const now = Date.now();
                const nextClosesAt = Math.max(now, Number(s.closes_at)) + addMinutes * 60000;
                const nextMinutes = Math.min(180, Number(s.minutes) + addMinutes);
                await database().prepare("UPDATE sessions SET state='open', closes_at=?, minutes=? WHERE id=?").bind(nextClosesAt, nextMinutes, s.id).run();
                return json({ ok: true, closes_at: nextClosesAt, minutes: nextMinutes });
            }
            if (path === 'teacher/grade-free' && method === 'POST') {
                const body = await readBody(request);
                const a = await first('SELECT * FROM attempts WHERE id=?', String(body.attempt_id || ''));
                must(a, 'Không tìm thấy bài làm này.', 404);
                const s = await scopedSession(a!.session_id,teacherAuth), qs = await sessionQuestions(s.id);
                const q = qs.find((item: Row) => item.id === body.question_id);
                must(q && q.kind === 'free', 'Chỉ chấm tay cho câu tự luận trong phiên.');
                const fraction = body.fraction;
                must(fraction === null || (typeof fraction === 'number' && [0, 0.25, 0.5, 0.75, 1].includes(fraction)), 'Mức điểm tự luận cần là 0, 25%, 50%, 75% hoặc 100%.');
                const answers = JSON.parse(a!.answers || '{}');
                if (fraction === null) delete answers['__free_score:' + q.id];
                else answers['__free_score:' + q.id] = fraction;
                const result = gradeAttempt(qs, answers, s.scoring_mode);
                const now = Date.now();
                if (a!.submitted_at != null || !isOpen(s)) {
                    await database().prepare('UPDATE attempts SET answers=?,earned=?,score=?,updated_at=? WHERE id=?').bind(JSON.stringify(answers), result.earned, result.score, now, a!.id).run();
                } else {
                    await database().prepare('UPDATE attempts SET answers=?,updated_at=? WHERE id=?').bind(JSON.stringify(answers), now, a!.id).run();
                }
                return json({ ok: true, score: result.score, earned: result.earned });
            }
            if (path === 'teacher/classroom-summary' && method === 'GET') {
                const cid = url.searchParams.get('classroom_id') || '';
                must(canUseClass(teacherAuth,cid),'Lớp không tồn tại.',404);
                const cl = await first('SELECT * FROM classrooms WHERE id=?', cid);
                must(cl, 'Lớp không tồn tại.', 404);
                const students = await all('SELECT id,ordinal,name FROM students WHERE classroom_id=? AND archived_at IS NULL ORDER BY ordinal', cid);
                const scope=sessionScope(teacherAuth);
                const sessions=await all('SELECT s.id,s.code,s.title,s.mode,s.scoring_mode,s.minutes,s.state,s.created_at,s.closes_at FROM sessions s WHERE s.classroom_id=?'+scope.sql+' ORDER BY s.created_at ASC',cid,...scope.args);
                for(const s of sessions)await settle(s);
                const attempts=await all('SELECT a.id,a.session_id,a.student_id,a.submitted_at,a.score,a.earned FROM attempts a JOIN sessions s ON s.id=a.session_id WHERE s.classroom_id=?'+scope.sql,cid,...scope.args);
                const byKey = new Map(attempts.map(a => [`${a.session_id}:${a.student_id}`, a]));
                const rows = students.map(st => {
                    let submittedCount = 0, workingCount = 0, absentCount = 0, scoreSum = 0;
                    const sessionScores: Record<string, any> = {};
                    for (const s of sessions) {
                        const a = byKey.get(`${s.id}:${st.id}`);
                        if (a?.submitted_at != null && typeof a.score === 'number') {
                            submittedCount++;
                            scoreSum += a.score;
                            sessionScores[s.id] = { status: 'submitted', score: a.score, submitted_at: a.submitted_at };
                        } else if (a) {
                            workingCount++;
                            sessionScores[s.id] = { status: 'working', score: null };
                        } else {
                            absentCount++;
                            sessionScores[s.id] = { status: 'absent', score: null };
                        }
                    }
                    const meanScore = submittedCount ? Math.round((scoreSum / submittedCount) * 100) / 100 : null;
                    return { student: st, submitted_count: submittedCount, working_count: workingCount, absent_count: absentCount, mean_score: meanScore, sessions: sessionScores };
                });
                return json({ classroom: cl, sessions: sessions.map(s => ({ ...s, state: isOpen(s) ? 'open' : 'closed' })), rows, generated_at: Date.now() });
            }
            if (path === 'teacher/session' && method === 'GET') {
                const s = await scopedSession(url.searchParams.get('id'),teacherAuth);
                await settle(s);
                const qs = await sessionQuestions(s.id);
                const roster=await getRoster(s);
                const attempts = await all('SELECT a.id,a.student_id,a.answers,a.submitted_at,a.earned,a.score,a.updated_at,a.last_seen_at,a.save_revision,a.allow_rejoin FROM attempts a WHERE a.session_id=?', s.id);
                return json({ generated_at: Date.now(), session: { ...s, state: isOpen(s) ? 'open' : 'closed' }, questions: qs, roster, attempts: attempts.map(a => ({ ...a, answers: JSON.parse(a.answers), answered: answeredCount(qs, JSON.parse(a.answers)) })) });
            }
            if (path === 'teacher/session-entry-codes' && method === 'POST') {
                await authTools.requireReal(teacherAuth);
                const b = await readBody(request,2000), s = await scopedSession(b.session_id,teacherAuth);
                must(s.requires_entry_code && isOpen(s), 'Chỉ phát mã cá nhân cho phiên đang mở có bảo vệ.', 409);
                const roster = await getRoster(s);
                const selected = b.ordinal === undefined ? roster : roster.filter((student: Row) => student.ordinal === b.ordinal);
                must(selected.length, 'Không có STT này trong lớp.', 404);
                return json(await studentEntry.issueCodes(s.id,selected,s.closes_at,teacherWriteGuard(teacherAuth),Date.now()));
            }
            if(path==='teacher/device-reset'&&method==='POST'){
                const b=await readBody(request),a=await first('SELECT * FROM attempts WHERE id=?',b.attempt_id||'');
                must(a,'Không có bài làm này.',404);const s=await scopedSession(a!.session_id,teacherAuth);
                must(isOpen(s)&&!a!.submitted_at,'Chỉ đổi thiết bị khi phiên đang mở và bài chưa nộp.',409);
                const replacementToken = crypto.randomUUID()+crypto.randomUUID();
                if (s.requires_entry_code) {
                    await authTools.requireReal(teacherAuth);
                    const student = (await getRoster(s)).find((item: Row) => item.id === a!.student_id);
                    must(student, 'Học sinh không còn trong danh sách phiên.', 409);
                    return json(await studentEntry.renewDevice(s,a!,student!.ordinal,teacherWriteGuard(teacherAuth),Date.now(),replacementToken));
                }
                const changed=await database().prepare("UPDATE attempts SET token=?,allow_rejoin=1,last_seen_at=0 WHERE id=? AND submitted_at IS NULL AND EXISTS(SELECT 1 FROM sessions WHERE id=? AND state='open' AND closes_at>?)").bind(replacementToken,a!.id,s.id,Date.now()).run();
                must(changed.meta?.changes,'Phiên vừa đóng. Làm mới để kiểm tra.',409);
                return json({ok:true});
            }
            if (path === 'teacher/close' && method === 'POST') {
                const body = await readBody(request), s = await scopedSession(body.id,teacherAuth);
                await database().prepare("UPDATE sessions SET state='closed' WHERE id=?").bind(s.id).run();
                await settle({ ...s, state: 'closed' });
                return json({ ok: true });
            }

        }
        if (path === 'public/session' && method === 'GET') {
            const code = (url.searchParams.get('code') || '').trim().toUpperCase();
            const s = await first('SELECT s.*,c.label AS class_label FROM sessions s JOIN classrooms c ON c.id=s.classroom_id WHERE s.code=?', code);
            must(s, 'Không tìm thấy mã phiên này.', 404);
            must(isOpen(s!), 'Phiên đã đóng hoặc hết thời gian.', 409);
            if(s!.roster_snapshot)s!.class_label=JSON.parse(s!.roster_snapshot).class_label;
            return json({ code: s!.code, title: s!.title, class_label: s!.class_label, mode: s!.mode, scoring_mode:s!.scoring_mode, minutes: s!.minutes, closes_at: s!.closes_at, requires_entry_code: Boolean(s!.requires_entry_code) });
        }
        if ((path === 'public/lookup' || path === 'public/join') && method === 'POST') {
            const b = await readBody(request,2000), code = String(b.code || '').trim().toUpperCase();
            const s = await first('SELECT * FROM sessions WHERE code=?', code);
            must(s, 'Không tìm thấy mã phiên.', 404);
            must(isOpen(s!), 'Phiên đã đóng hoặc hết thời gian.', 409);
            must(Number.isInteger(b.ordinal) && b.ordinal > 0 && b.ordinal <= 999, 'STT không hợp lệ.');
            const student=(await getRoster(s!)).find((item:Row)=>item.ordinal===b.ordinal);
            let a = student && (s!.requires_entry_code || path === 'public/join')
                ? await first('SELECT * FROM attempts WHERE session_id=? AND student_id=?', s!.id,student.id) : null;
            const existingDevice = Boolean(a && !a.allow_rejoin && typeof b.token === 'string' && await secureEqual(b.token,a.token));
            const entry = s!.requires_entry_code && !existingDevice
                ? await studentEntry.authorizeCode(s!.id,b.ordinal,b.entry_code) : null;
            must(student, 'Không có STT này trong lớp.', 404);
            if (path === 'public/lookup')
                return json({ name: student!.name, ordinal: student!.ordinal });
            const now=Date.now(), guard=studentEntry.guardClaim(entry,now);
            if(a){
                if(a.allow_rejoin&&!a.submitted_at){
                    const token=crypto.randomUUID()+crypto.randomUUID();
                    const statement=database().prepare(`UPDATE attempts SET token=?,allow_rejoin=0,last_seen_at=?
                        WHERE id=? AND token=? AND allow_rejoin=1 AND submitted_at IS NULL
                        AND EXISTS(SELECT 1 FROM sessions WHERE id=? AND state='open' AND closes_at>?)${guard.sql}`)
                        .bind(token,now,a.id,a.token,s!.id,now,...guard.args);
                    const claimed=await studentEntry.claim(statement,entry,token);
                    must(claimed.meta?.changes,'Thiết bị khác vừa tiếp tục bài. Báo giáo viên nếu cần đổi lại.',409);
                    a=(await first('SELECT * FROM attempts WHERE id=?',a.id))!;
                }else{
                    must(existingDevice,'STT này đã có lượt làm. Tiếp tục trên thiết bị cũ hoặc báo giáo viên cho đổi thiết bị.',409);
                }
            }else{
                const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID();
                const statement=database().prepare(`INSERT INTO attempts(id,token,session_id,student_id,answers,updated_at,last_seen_at)
                    SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sessions WHERE id=? AND state='open' AND closes_at>?)${guard.sql}
                    ON CONFLICT(session_id,student_id) DO NOTHING`).bind(id,token,s!.id,student!.id,'{}',now,now,s!.id,now,...guard.args);
                const inserted=await studentEntry.claim(statement,entry,token);
                must(inserted.meta?.changes,'STT này vừa được dùng ở thiết bị khác. Báo giáo viên nếu cần đổi thiết bị.',409);
                a=(await first('SELECT * FROM attempts WHERE id=?',id))!;
            }
            return json(await packAttempt(a!), 201);
        }
        if((path==='public/attempt'&&method==='GET')||(path==='public/heartbeat'&&method==='POST')){
            const a=await attemptFrom(request);
            await database().prepare('UPDATE attempts SET last_seen_at=? WHERE id=? AND token=?').bind(Date.now(),a.id,a.token).run();
            if(path==='public/attempt')return json(await packAttempt(a));
            const s=await getSession(a.session_id);
            if(a.submitted_at||!isOpen(s))return json({attempt:await packAttempt(a),server_time:Date.now()});
            return json({state:'open',closes_at:s.closes_at,save_revision:a.save_revision,server_time:Date.now()});
        }
        if(path==='public/save'&&method==='POST'){
            const a=await attemptFrom(request),s=await getSession(a.session_id);
            if(a.submitted_at||!isOpen(s))throw new ApiError(409,'Bài đã nộp hoặc phiên đã hết giờ.','closed');
            const b=await readBody(request),qs=await sessionQuestions(s.id),answers=validateAnswers(qs,b.answers,JSON.parse(a.answers||'{}'));
            must(Number.isInteger(b.expected_revision)&&b.expected_revision>=0,'Cần tải lại trang để dùng phiên bản lưu bài mới.');
            const now=Date.now();
            const saved=await database().prepare("UPDATE attempts SET answers=?,updated_at=?,last_seen_at=?,save_revision=save_revision+1 WHERE id=? AND token=? AND save_revision=? AND submitted_at IS NULL AND EXISTS(SELECT 1 FROM sessions WHERE id=? AND state='open' AND closes_at>?)").bind(JSON.stringify(answers),now,now,a.id,a.token,b.expected_revision,s.id,now).run();
            if(!saved.meta?.changes){
                const current=await first('SELECT token,submitted_at FROM attempts WHERE id=?',a.id);
                if(current?.token!==a.token)throw new ApiError(401,'Thiết bị đã hết quyền làm bài.','device_revoked');
                if(current?.submitted_at||!isOpen(await getSession(s.id)))throw new ApiError(409,'Bài đã nộp hoặc phiên đã hết giờ.','closed');
                throw new ApiError(409,'Bài đã thay đổi hoặc phản hồi lưu trước bị mất. Đang kiểm tra lại.','stale_write');
            }
            return json({ok:true,saved_at:now,save_revision:b.expected_revision+1});
        }
        if (path === 'public/submit' && method === 'POST') {
            const a = await attemptFrom(request), qs = await sessionQuestions(a.session_id);
            const done = await finalize(a, qs);
            return json(await packAttempt(done));
        }
        throw new ApiError(404, 'Đường dẫn không tồn tại.');
    }
    catch (e) {
        if (e instanceof ApiError)
            return json({ error: e.message, ...(e.code?{code:e.code}:{}) }, e.status);
        if ((e as any)?.name==='ValidationError')return json({error:(e as Error).message},422);
        console.error('API failure:', e instanceof Error ? e.message : e);
        return json({ error: 'Không thực hiện được. Kiểm tra dữ liệu cục bộ và cửa sổ chạy web.' }, 500);
    }
    finally {
        // The local proxy can drop responses when a handler leaves the upload unread.
        const body = request.body;
        if (body && !request.bodyUsed && !body.locked) {
            const reader = body.getReader();
            let received = 0;
            try {
                for (;;) {
                    const {done, value} = await reader.read();
                    if (done) break;
                    received += value.byteLength;
                    if (received > 5_100_000) {
                        await reader.cancel();
                        break;
                    }
                }
            } catch {
                // Preserve the API response if the client disconnects.
            } finally {
                reader.releaseLock();
            }
        }
    }
}
