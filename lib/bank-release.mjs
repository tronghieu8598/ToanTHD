import {availableQuestionVariantKeys} from './accepted-variants.mjs';
import chapter01 from '../data/chapter-variants/generated/12-C01.json' with {type: 'json'};
import chapter02 from '../data/chapter-variants/generated/12-C02.json' with {type: 'json'};
import chapter03 from '../data/chapter-variants/generated/12-C03.json' with {type: 'json'};
import chapter04 from '../data/chapter-variants/generated/12-C04.json' with {type: 'json'};
import chapter05 from '../data/chapter-variants/generated/12-C05.json' with {type: 'json'};
import chapter06 from '../data/chapter-variants/generated/12-C06.json' with {type: 'json'};
import chapter02Bank from '../data/course-bank/generated/12-C02.json' with {type: 'json'};
import chapter04Bank from '../data/course-bank/generated/12-C04.json' with {type: 'json'};
import chapter05Bank from '../data/course-bank/generated/12-C05.json' with {type: 'json'};
import courseBankReview from '../data/course-bank/review.json' with {type: 'json'};
import variantManifest from '../data/chapter-variants/manifest.json' with {type: 'json'};
import {bankReleaseChapters} from './bank-release-chapters.mjs';
import {canAutoGrade, COURSE_ROW_FIELDS, courseRowPayload} from './course-bank.mjs';
import {validateRichHtml} from './rich-html.mjs';

const format = 'toanthd.bank-release/1';
const defaultScope = '12-C06';
const variants = {'12-C01': chapter01, '12-C02': chapter02, '12-C03': chapter03,
    '12-C04': chapter04, '12-C05': chapter05, '12-C06': chapter06};
const chapter01Review = new Set(variantManifest.chapters.find(chapter => chapter.id === '12-C01').held.map(item => item.source_id));
const courseReviewScopes = new Set(['12-C02', '12-C03', '12-C04', '12-C05']);
const courseReviewIds = new Set(courseBankReview.filter(row => row.grade === 12 && row.status === 'review').map(row => row.id));
const approvalFingerprints = Object.fromEntries(Object.entries({
    '12-C02': chapter02Bank, '12-C04': chapter04Bank, '12-C05': chapter05Bank,
}).map(([scope, bank]) => [scope, new Map(bank.rows.map(row => [row.id, row.bank_fingerprint]))]));
const activeKey = scope => 'course_bank_release:' + scope;
const stagedKey = (scope, digest) => `bank-release/staged/${scope}/${digest}.json`;
const hashPattern = /^[a-f0-9]{64}$/;
const questionFields = [...COURSE_ROW_FIELDS, 'bank_fingerprint'];
const contentFields = questionFields.slice(questionFields.indexOf('prompt')).filter(field => field !== 'family_id');
const encoder = new TextEncoder();

const sha256 = async text => Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text))),
    byte => byte.toString(16).padStart(2, '0'),
).join('');
const parsed = (text, fallback = null) => {
    try { return JSON.parse(text); } catch { return fallback; }
};
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const project = (value, fields) => Object.fromEntries(fields.map(field => [field, value[field]]));
const byId = (a, b) => a.id.localeCompare(b.id);
const matchesApproval = (scope, question) => question?.bank_status === 'auto' &&
    question.bank_fingerprint === approvalFingerprints[scope]?.get(question.id);
const requiresReview = (scope, chapter, id) => scope === '12-C01' ? chapter01Review.has(id) :
    courseReviewScopes.has(scope) && courseReviewIds.has(id) && !Object.hasOwn(chapter.approvedReviews ?? {}, id);

async function validateRelease(input, chapter, must) {
    const valid = (condition, message) => must(condition, message, 422);
    const {scope} = input;
    const {documentId, grade, lessons} = chapter;
    const lessonCounts = Object.fromEntries(lessons.map(lesson => [lesson.id, lesson.count]));
    const expectedQuestions = lessons.reduce((count, lesson) => count + lesson.count, 0);
    valid(input.format === format, 'Định dạng gói phát hành không hợp lệ.');
    valid(typeof input.source_commit === 'string' && /^[a-f0-9]{40}$/.test(input.source_commit) &&
        typeof input.source_version === 'string' && /^[a-z0-9+.-]{1,100}$/.test(input.source_version), 'Phiên bản nguồn không hợp lệ.');
    valid(input.variants_version === variants[scope].version, 'Gói biến thể không khớp phiên bản của web.');

    const [document] = Array.isArray(input.documents) ? input.documents : [];
    valid(input.documents?.length === 1 && document?.id === documentId && document.grade === grade &&
        document.is_sample === 0 && (document.parent_id ?? null) === null && typeof document.title === 'string' &&
        !!document.title.trim() && typeof document.edition === 'string' && !!document.edition.trim(), 'Tài liệu chuẩn không đúng phạm vi.');
    valid(Array.isArray(input.lessons) && input.lessons.length === lessons.length && input.lessons.every(lesson =>
        Object.hasOwn(lessonCounts, lesson?.id) && lesson.document_id === documentId &&
        typeof lesson.title === 'string' && !!lesson.title.trim() && typeof lesson.chapter === 'string' && !!lesson.chapter.trim(),
    ) && new Set(input.lessons.map(lesson => lesson.id)).size === lessons.length, 'Danh sách bài học không đúng phạm vi phát hành.');

    const assetPaths = new Set();
    valid(Array.isArray(input.assets), 'Danh sách tệp hình không hợp lệ.');
    const assets = input.assets.map(asset => {
        const match = typeof asset?.path === 'string' && /^\/(?:bank|variant)-assets\/([a-f0-9]{64})\.svg$/.exec(asset.path);
        valid(match && asset.sha256 === match[1] && Number.isSafeInteger(asset.bytes) && asset.bytes > 0 &&
            !assetPaths.has(asset.path), 'Tệp hình thiếu mã băm hoặc bị trùng.');
        assetPaths.add(asset.path);
        return project(asset, ['path', 'sha256', 'bytes']);
    }).sort((a, b) => a.path.localeCompare(b.path));

    valid(Array.isArray(input.questions) && input.questions.length === expectedQuestions, `Gói ${scope} phải đủ ${expectedQuestions} câu hỏi.`);
    const ids = new Set();
    const counts = new Map();
    const questions = await Promise.all(input.questions.map(async question => {
        valid(record(question) && typeof question.lesson_id === 'string' && Object.hasOwn(lessonCounts, question.lesson_id) &&
            Number.isSafeInteger(question.original_number) && question.original_number > 0 && question.revision === 1 &&
            question.original_number <= lessonCounts[question.lesson_id] &&
            ['mcq', 'tf', 'short', 'free'].includes(question.kind) && ['auto', 'review', 'reference'].includes(question.bank_status) &&
            typeof question.bank_fingerprint === 'string' && hashPattern.test(question.bank_fingerprint), 'Mã hoặc trạng thái câu hỏi không hợp lệ.');
        const expectedId = `${question.lesson_id.slice(0, -3)}-q${String(question.original_number).padStart(3, '0')}-v4`;
        valid(question.id === expectedId && question.family_id === expectedId && !ids.has(expectedId), 'Mã câu hỏi không khớp bài, số gốc hoặc bị trùng.');
        if (requiresReview(scope, chapter, expectedId)) {
            valid(question.bank_status === 'review', `Câu ${expectedId} cần giữ trạng thái chờ duyệt.`);
        }
        if (Object.hasOwn(chapter.approvedReviews ?? {}, expectedId)) {
            valid(matchesApproval(scope, question), `Câu ${expectedId} cần khớp bản đã duyệt.`);
        }
        ids.add(expectedId);
        counts.set(question.lesson_id, (counts.get(question.lesson_id) ?? 0) + 1);

        const row = project(question, questionFields);
        valid(['prompt', 'solution', 'choices', 'correct', 'bank_note', 'bank_search'].every(field => typeof row[field] === 'string') &&
            ['source_json', 'bank_origin', 'bank_tex', 'bank_meta'].every(field => row[field] === null || typeof row[field] === 'string'),
        'Nội dung câu hỏi không đúng định dạng.');
        const choices = parsed(row.choices);
        const invalidAnswer = Symbol();
        const answer = parsed(row.correct, invalidAnswer);
        valid(Array.isArray(choices) && choices.every(choice => typeof choice?.key === 'string' && typeof choice.text === 'string') &&
            answer !== invalidAnswer && (row.bank_meta === null || record(parsed(row.bank_meta))) &&
            (row.source_json === null || record(parsed(row.source_json))) &&
            (row.bank_status !== 'auto' || canAutoGrade({...row, correct: answer})), 'Đáp án hoặc nội dung lựa chọn không hợp lệ.');
        valid(await sha256(courseRowPayload(row)) === row.bank_fingerprint, `Dấu vân tay câu ${row.id} không khớp.`);
        for (const html of [row.prompt, row.solution, ...choices.map(choice => choice.text)]) validateRichHtml(html, {assets: assetPaths});
        return row;
    }));
    valid(Object.entries(lessonCounts).every(([id, count]) => counts.get(id) === count), 'Số câu của từng bài học không khớp.');

    return {
        ...project(input, ['format', 'scope', 'source_commit', 'source_version', 'variants_version']),
        documents: [project(document, ['id', 'grade', 'title', 'edition', 'is_sample'])],
        lessons: input.lessons.map(lesson => project(lesson, ['id', 'document_id', 'chapter', 'title'])).sort(byId),
        questions: questions.sort(byId),
        assets,
    };
}

// Both the preview and the guard use the same ordered view, including conflicting non-bank IDs.
const scopeState = `SELECT
    (SELECT value FROM workspace_settings WHERE key=?) AS active,
    (SELECT json_array(grade,is_sample,parent_id) FROM documents WHERE id=?) AS document,
    (SELECT json_group_array(json_array(id,document_id)) FROM (
        SELECT id,document_id FROM lessons WHERE id IN (SELECT value FROM json_each(?)) ORDER BY id
    )) AS lessons,
    (SELECT json_group_array(json_array(id,lesson_id,original_number,revision,kind,family_id,bank_fingerprint)) FROM (
        SELECT id,lesson_id,original_number,revision,kind,family_id,bank_fingerprint FROM questions
        WHERE id IN (SELECT value FROM json_each(?)) OR lesson_id IN (SELECT value FROM json_each(?)) ORDER BY id
    )) AS questions`;
const scopeArgs = (release, chapter) => {
    const lessons = JSON.stringify(release.lessons.map(lesson => lesson.id));
    return [activeKey(release.scope), chapter.documentId, lessons, JSON.stringify(release.questions.map(question => question.id)), lessons];
};

function previewChanges(release, chapter, state, must) {
    const incompatible = condition => must(condition, 'Mã tài liệu, bài hoặc câu hỏi xung đột với dữ liệu hiện có.', 409);
    incompatible(state.document === null || state.document === JSON.stringify([chapter.grade, 0, null]));
    incompatible(JSON.parse(state.lessons).every(([, parent]) => parent === chapter.documentId));
    const rows = JSON.parse(state.questions);
    const byId = new Map(rows.map(row => [row[0], row]));
    const sourceNumbers = new Map(rows.filter(row => row[3] === 1).map(row => [`${row[1]}:${row[2]}`, row[0]]));
    const added_ids = [];
    const changed_ids = [];

    for (const row of release.questions) {
        const before = byId.get(row.id);
        const collision = sourceNumbers.get(`${row.lesson_id}:${row.original_number}`);
        incompatible(!collision || collision === row.id);
        if (!before) { added_ids.push(row.id); continue; }
        const [, lesson, number, revision, kind, family, fingerprint] = before;
        incompatible(lesson === row.lesson_id && number === row.original_number && revision === row.revision &&
            kind === row.kind && family === row.family_id && typeof fingerprint === 'string' && hashPattern.test(fingerprint));
        if (fingerprint !== row.bank_fingerprint) changed_ids.push(row.id);
    }

    return {added: added_ids.length, changed: changed_ids.length,
        unchanged: release.questions.length - added_ids.length - changed_ids.length, added_ids, changed_ids};
}

const releaseInfo = release => ({...project(release, ['scope', 'source_commit', 'source_version', 'variants_version']),
    questions: release.questions.length, lessons: release.lessons.length, assets: release.assets.length,
    variants: release.questions.reduce((count, question) => count + availableQuestionVariantKeys(question).length, 0),
});

export async function handleBankRelease(path, request, ctx) {
    const {env, database, first, must, json, readBody, auth, authTools} = ctx;
    must(request.method === 'POST', 'Chức năng phát hành chỉ nhận yêu cầu POST.', 405);
    must(auth.role === 'admin', 'Chỉ tài khoản quản trị được phát hành ngân hàng chuẩn.', 403);
    must(request.headers.get('origin') === authTools.publicOrigin(request.url), 'Cần gửi yêu cầu từ đúng địa chỉ web.', 403);
    await authTools.requireReal(auth);
    must(env.BUCKET, 'Chưa có kho tệp để lưu gói phát hành.', 503);

    if (path === 'teacher/bank-release/stage') {
        const input = await readBody(request);
        const {scope} = input;
        must(typeof scope === 'string' && Object.hasOwn(bankReleaseChapters, scope), 'Chương chưa được cấu hình phát hành.', 422);
        const chapter = bankReleaseChapters[scope];
        const release = await validateRelease(input, chapter, must);
        const before = await first(scopeState, ...scopeArgs(release, chapter));
        const preview = previewChanges(release, chapter, before, must);
        const release_digest = await sha256(JSON.stringify(release));
        const staged = JSON.stringify({release, release_digest, before});
        const digest = await sha256(staged);
        await env.BUCKET.put(stagedKey(scope, digest), staged, {httpMetadata: {contentType: 'application/json'}});
        return json({digest, release_digest, release: releaseInfo(release), preview});
    }

    const {digest, scope = defaultScope} = await readBody(request, 2000);
    must(typeof digest === 'string' && hashPattern.test(digest), 'Mã gói đã xem trước không hợp lệ.');
    must(typeof scope === 'string' && Object.hasOwn(bankReleaseChapters, scope), 'Chương chưa được cấu hình phát hành.', 422);
    const chapter = bankReleaseChapters[scope];
    const object = await env.BUCKET.get(stagedKey(scope, digest));
    must(object, 'Chưa tìm thấy gói đã xem trước.', 404);
    const staged = await object.text();
    must(await sha256(staged) === digest, 'Gói đã lưu không khớp mã kiểm tra. Xem trước lại.', 409);
    const {release, release_digest, before} = JSON.parse(staged);
    const approvalsMatch = Object.keys(chapter.approvedReviews ?? {}).every(id =>
        matchesApproval(scope, release.questions.find(question => question.id === id)));
    const reviewStatusesMatch = !courseReviewScopes.has(scope) || release.questions.every(question =>
        !requiresReview(scope, chapter, question.id) || question.bank_status === 'review');
    must(release.format === format && release.scope === scope && release.variants_version === variants[scope].version &&
        approvalsMatch && reviewStatusesMatch,
        'Gói đã xem trước không còn khớp phiên bản hiện tại. Xem trước lại.', 409);
    const summary = releaseInfo(release);
    const args = scopeArgs(release, chapter);
    const current = await first(scopeState, ...args);
    const isReplay = state => {
        if (parsed(state.active)?.digest !== release_digest) return false;
        const diff = previewChanges(release, chapter, state, must);
        return !diff.added && !diff.changed;
    };
    const sameBaseline = state => ['active', 'document', 'lessons', 'questions'].every(field => state[field] === before[field]);
    const stale = 'Ngân hàng đã đổi sau khi xem trước. Xem trước lại trước khi phát hành.';
    const result = (replayed, preview) => json({digest, release_digest, release: summary, replayed, preview});
    if (isReplay(current)) return result(true, previewChanges(release, chapter, current, must));
    must(sameBaseline(current), stale, 409);

    const db = database();
    const preview = previewChanges(release, chapter, current, must);
    const ids = new Set([...preview.added_ids, ...preview.changed_ids]);
    const statement = (sql, ...values) => db.prepare(sql).bind(...values);
    const receipt = JSON.stringify({...summary, digest: release_digest, activated_at: Date.now()});
    // A stale preview would write NULL into the required setting value. D1 aborts the entire batch.
    const statements = [statement(`INSERT INTO workspace_settings(key,value)
        SELECT ?, CASE WHEN active IS ? AND document IS ? AND lessons IS ? AND questions IS ? AND
            COALESCE((SELECT value FROM workspace_settings WHERE key='auth_epoch'),'1')=? THEN ? ELSE NULL END
        FROM (${scopeState}) WHERE 1 ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    activeKey(scope), before.active, before.document, before.lessons, before.questions, auth.epoch, receipt, ...args)];
    const [document] = release.documents;
    statements.push(statement('INSERT INTO documents(id,grade,title,edition,is_sample) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING',
        document.id, document.grade, document.title, document.edition, document.is_sample));
    for (const lesson of release.lessons) statements.push(statement(
        'INSERT INTO lessons(id,document_id,chapter,title) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING',
        lesson.id, lesson.document_id, lesson.chapter, lesson.title,
    ));
    const fields = questionFields.join(',');
    const values = questionFields.map(() => '?').join(',');
    const updates = contentFields.map(field => `${field}=excluded.${field}`).join(',');
    for (const row of release.questions) if (ids.has(row.id)) statements.push(statement(
        `INSERT INTO questions(${fields}) VALUES(${values}) ON CONFLICT(id) DO UPDATE SET ${updates}`,
        ...questionFields.map(field => row[field]),
    ));
    for (let from = 0; from < preview.changed_ids.length; from += 25) {
        const keys = preview.changed_ids.slice(from, from + 25).map(id => `$."${id}"`);
        statements.push(statement(`UPDATE workspace_settings SET value=json_remove(value,${keys.map(() => '?').join(',')})
            WHERE key='verified_course_keys' AND json_valid(value)`, ...keys));
    }
    try {
        await db.batch(statements);
    } catch (error) {
        const live = await first(scopeState, ...args);
        if (isReplay(live)) return result(true, previewChanges(release, chapter, live, must));
        must(sameBaseline(live), stale, 409);
        if (String(error?.message).includes('NOT NULL constraint failed: workspace_settings.value')) {
            must(false, 'Phiên quản trị đã đổi. Đăng nhập lại và xem trước gói.', 409);
        }
        throw error;
    }
    return result(false, preview);
}
