import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const currentSite = 'toan-thd-thu-hoc-lieu-https.h01882808481.chatgpt.site';
const promptMarker = 'Dien tap HTTPS - 1 + 1 bang bao nhieu?';
const sheets = ['Tổng quan', 'Bảng điểm', 'Phổ điểm', 'Từng câu', 'Lựa chọn', 'Chi tiết trả lời'];
const rosterName = ordinal => 'Dien tap ' + String(ordinal).padStart(2, '0');
const expectedScore = (ordinal, size) => ordinal === size ? 0 : 10;

function must(condition, message) {
    if (!condition) throw new Error(message);
}

function validateSize(count) {
    must(Number.isInteger(count) && count >= 40 && count <= 45, 'Cần từ 40 đến 45 học sinh giả.');
    return count;
}

export function rehearsalPlan(input) {
    must(input && typeof input === 'object' && typeof input.origin === 'string', 'Thiếu địa chỉ HTTPS diễn tập.');
    const url = new URL(input.origin);
    must(url.protocol === 'https:' && url.href === url.origin + '/' && !url.username && !url.password &&
        url.hostname !== currentSite && !url.hostname.endsWith('.' + currentSite),
    'Dùng địa chỉ gốc của bản HTTPS diễn tập riêng.');
    must(typeof input.marker === 'string' && /^[A-Z0-9]{6,12}$/.test(input.marker), 'Mã đợt diễn tập cần 6–12 chữ in hoa hoặc số.');
    must(typeof input.code === 'string' && /^[A-Z0-9]{6}$/.test(input.code), 'Mã phiên thử phải gồm 6 ký tự in hoa hoặc số.');
    must(Array.isArray(input.codes), 'Thiếu danh sách mã cá nhân đã cấp cho lớp giả.');
    const size = validateSize(input.codes.length);
    const codes = new Map();
    const distinct = new Set();
    for (const item of input.codes) {
        must(item && Number.isInteger(item.ordinal) && item.ordinal >= 1 && item.ordinal <= size &&
            typeof item.code === 'string' && /^[A-Za-z0-9-]{6,64}$/.test(item.code) &&
            !codes.has(item.ordinal) && !distinct.has(item.code.toUpperCase()), 'Số thứ tự hoặc mã cá nhân sai hay trùng.');
        codes.set(item.ordinal, item.code);
        distinct.add(item.code.toUpperCase());
    }
    const title = 'Dien tap HTTPS ' + input.marker;
    return {origin: url.origin, code: input.code, title, classLabel: '11 ' + title, size, codes};
}

async function request(fetchResponse, origin, endpoint, {body, token, expected = 200} = {}) {
    let response;
    try {
        response = await fetchResponse(origin + '/api/public/' + endpoint, {
            redirect: 'error',
            signal: AbortSignal.timeout(20000),
            method: body ? 'POST' : 'GET',
            headers: {
                ...(body && {'Content-Type': 'application/json', Origin: origin}),
                ...(token && {Authorization: 'Bearer ' + token}),
            },
            ...(body && {body: JSON.stringify(body)}),
        });
    } catch {
        throw new Error('Không kết nối được API ' + endpoint.split('?')[0] + ' trên bản diễn tập.');
    }
    must(response.status === expected, 'API ' + endpoint.split('?')[0] + ' trả mã ' + response.status + '.');
    try {
        return await response.json();
    } catch {
        throw new Error('Bản diễn tập chưa trả JSON ở API ' + endpoint.split('?')[0] + '.');
    }
}

export async function runRehearsal(plan, fetchResponse = fetch) {
    const call = (endpoint, options) => request(fetchResponse, plan.origin, endpoint, options);
    const session = await call('session?code=' + plan.code);
    must(session.code === plan.code && session.title === plan.title && session.class_label === plan.classLabel &&
        session.requires_entry_code === true && session.mode === 'online' && session.scoring_mode === 'practice',
    'Phiên cần đúng bộ dữ liệu giả, chế độ Luyện tập online và có mã cá nhân.');
    must(Number.isFinite(session.closes_at) && session.closes_at - Date.now() >= 120000, 'Cần ít nhất 2 phút còn lại.');
    const students = Array.from({length: plan.size}, (_, index) => ({
        ordinal: index + 1, code: plan.code, entry_code: plan.codes.get(index + 1),
    }));
    const timing = {};
    async function wave(name, work) {
        const results = await Promise.allSettled(students.map(async (student, index) => {
            const start = performance.now();
            const result = await work(student, index);
            return {result, milliseconds: performance.now() - start};
        }));
        const failures = results.filter(result => result.status === 'rejected');
        must(!failures.length, name + ' lỗi ' + failures.length + '/' + students.length + ' lượt. ' + failures[0]?.reason?.message);
        const durations = results.map(record => record.value.milliseconds).sort((a, b) => a - b);
        timing[name] = {
            p95_ms: Math.round(durations[Math.ceil(durations.length * 0.95) - 1]),
            max_ms: Math.round(durations.at(-1)),
        };
        return results.map(record => record.value.result);
    }

    await wave('lookup', async student => {
        const row = await call('lookup', {body: student});
        must(row.ordinal === student.ordinal && row.name === rosterName(student.ordinal), 'Danh sách khác mẫu diễn tập.');
    });

    const joined = await wave('join', async student => {
        const attempt = await call('join', {body: student, expected: 201});
        const question = attempt.questions?.[0];
        must(attempt.student?.ordinal === student.ordinal && attempt.student?.name === rosterName(student.ordinal) &&
            attempt.session?.code === plan.code && typeof attempt.id === 'string' && typeof attempt.token === 'string' &&
            attempt.save_revision === 0 && !attempt.submitted_at && attempt.questions?.length === 1 &&
            question?.kind === 'mcq' && typeof question.id === 'string' &&
            question.prompt?.includes(promptMarker) && question.choices?.some(choice => choice.key === 'A') &&
            question.choices?.some(choice => choice.key === 'B') && !Object.hasOwn(question, 'correct'),
        'Bài làm khác đề trắc nghiệm giả hoặc chưa ở trạng thái mới.');
        return {id: attempt.id, token: attempt.token, question: question.id};
    });
    must(new Set(joined.map(item => item.id)).size === plan.size, 'Có lượt làm trùng.');

    const answers = (student, index) => ({[joined[index].question]: student.ordinal === plan.size ? 'B' : 'A'});
    await wave('save', async (student, index) => {
        const row = await call('save', {body: {answers: answers(student, index), expected_revision: 0}, token: joined[index].token});
        must(row.save_revision === 1, 'Phiên bản bản nháp sau khi lưu không đúng.');
    });
    const [first] = joined;
    const firstAnswers = answers(students[0], 0);
    const stale = await call('save', {
        body: {answers: firstAnswers, expected_revision: 0}, token: first.token, expected: 409,
    });
    must(stale.code === 'stale_write', 'Lưu lại sau phản hồi bị mất phải yêu cầu đọc lại bản mới.');
    const recovered = await call('attempt', {token: first.token});
    must(recovered.save_revision === 1 && recovered.answers?.[first.question] === firstAnswers[first.question],
        'Bản nháp đọc lại khác dữ liệu đã lưu.');

    const submitted = await wave('submit', async (student, index) => {
        const row = await call('submit', {body: {}, token: joined[index].token});
        must(row.id === joined[index].id && Number.isFinite(row.submitted_at) &&
            row.score === expectedScore(student.ordinal, plan.size), 'Bài nộp hoặc điểm khác kết quả dự kiến.');
        return row.submitted_at;
    });
    const replay = await call('submit', {body: {}, token: first.token});
    must(replay.id === first.id && replay.submitted_at === submitted[0] && replay.score === 10,
        'Nộp lại phải giữ nguyên bài và thời điểm nộp.');
    await call('save', {body: {answers: firstAnswers, expected_revision: 1}, token: first.token, expected: 409});
    return {students: plan.size, submitted: plan.size, score10: plan.size - 1, score0: 1,
        recoveredSavedDraft: true, replayKeptSubmission: true, timing};
}

export async function verifyWorkbook(plan, filename) {
    const {default: Excel} = await import('exceljs');
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(filename);
    must(workbook.worksheets.map(sheet => sheet.name).join('\0') === sheets.join('\0'), 'Báo cáo cần đúng 6 sheet của phiên.');
    const summary = workbook.getWorksheet('Tổng quan');
    must(summary.getCell('B2').value === plan.title && summary.getCell('B3').value === plan.classLabel &&
        summary.getCell('B4').value === plan.code && summary.getCell('B9').value === plan.size &&
        summary.getCell('B10').value === plan.size && summary.getCell('B11').value === 0 &&
        summary.getCell('B12').value === 0, 'Tổng quan Excel khác phiên giả đã chạy.');
    const grades = workbook.getWorksheet('Bảng điểm');
    must(grades.rowCount === plan.size + 1, 'Số dòng bảng điểm khác danh sách giả.');
    for (let ordinal = 1; ordinal <= plan.size; ordinal++) {
        const row = grades.getRow(ordinal + 1);
        must(row.getCell('A').value === ordinal && row.getCell('B').value === rosterName(ordinal) &&
            row.getCell('C').value === 'Đã nộp' && row.getCell('F').value === expectedScore(ordinal, plan.size),
        'Bảng điểm Excel không khớp ở STT ' + ordinal + '.');
    }
    return {sheets: sheets.length, students: plan.size, score10: plan.size - 1, score0: 1};
}

async function main() {
    const {values} = parseArgs({options: {
        plan: {type: 'string'}, run: {type: 'boolean'}, excel: {type: 'string'}, roster: {type: 'string'}, help: {type: 'boolean'},
    }});
    if (values.help || !Object.keys(values).length) {
        console.log('node scripts/https-rehearsal.mjs --roster 42');
        console.log('node scripts/https-rehearsal.mjs --plan <ten-tep.json> [--run | --excel <bao-cao.xlsx>]');
        return;
    }
    if (values.roster) {
        must(Object.keys(values).length === 1, '--roster dùng riêng.');
        const size = validateSize(Number(values.roster));
        console.log('STT,Họ và tên\n' + Array.from({length: size}, (_, index) =>
            (index + 1) + ',' + rosterName(index + 1)).join('\n'));
        return;
    }
    must(values.plan && !(values.run && values.excel), 'Cần tệp --plan và chọn tối đa một thao tác.');
    let input;
    try {
        input = JSON.parse((await readFile(values.plan, 'utf8')).replace(/^\uFEFF/, ''));
    } catch {
        throw new Error('Không đọc được tệp JSON cấu hình diễn tập.');
    }
    const plan = rehearsalPlan(input);
    const output = values.run ? await runRehearsal(plan) :
        values.excel ? await verifyWorkbook(plan, values.excel) :
            {origin: plan.origin, classLabel: plan.classLabel, students: plan.size};
    console.log(JSON.stringify(output, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(error => {
        // Do not log session codes, credential rows, API payloads or attempt tokens.
        console.error(error.message);
        process.exitCode = 1;
    });
}
