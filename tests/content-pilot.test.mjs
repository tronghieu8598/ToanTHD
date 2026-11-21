import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {test} from 'node:test';
import {compileContent, frozenLessonInputs} from '../scripts/content-pilot.mjs';
import {readCourseBank, readFrozenCourseBank} from '../scripts/course-bank-data.mjs';
import {availableQuestionVariantKeys} from '../lib/accepted-variants.mjs';
import {canEnterSession, decodeQuestion} from '../lib/course-bank.mjs';
import {BACKUP_TABLES, sealBackup, validateBackup} from '../lib/backup-model.mjs';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root));
const list = folder => readdirSync(new URL(folder + '/', root));
const id = 'dc-12-hk2-6D2-q013-v4';
const bankFolder = 'data/course-bank/src/12/C06/B02';
const bankFile = `${bankFolder}/${id}.json`;
const variantFile = `data/chapter-variants/src/12/C06/B02/${id}.json`;
const coverFile = 'data/digital-library/src/12/C06/12-monty-hall-game-577dcd0/cover.jpg';
const frozen = frozenLessonInputs();
const withDraft = (files = {}) => file => files[file] ?? frozen[file] ?? read(file);
const toBytes = value => Buffer.from(JSON.stringify(value));

test('v0.14: a Chapter VI solution and a Monty Hall cover produce independent release files', () => {
    const [baselineBank, baselineVariants, baselineLibrary] = compileContent('all', withDraft());
    assert.equal(baselineBank.summary.questions, 118);
    assert.equal(baselineVariants.summary.available, 436);
    for (const result of compileContent())
        for (const [file, bytes] of result.files) assert.deepEqual(read(file), bytes);

    const question = JSON.parse(frozen[bankFile]);
    question.solution += '<p>Đối chiếu kết quả với các nhánh trong sơ đồ.</p>';
    const [changedBank, heldVariants, untouchedLibrary] = compileContent('all', withDraft({[bankFile]: toBytes(question)}));
    assert.deepEqual(changedBank.summary.changed, [id]);
    assert.notEqual(changedBank.summary.version, baselineBank.summary.version);
    assert.deepEqual(untouchedLibrary.files, baselineLibrary.files);
    assert.deepEqual(heldVariants.files, baselineVariants.files);
    assert.deepEqual(heldVariants.summary.held, [id]);
    assert.equal(heldVariants.summary.available, 432);
    const effective = changedBank.effective.get(id);
    assert.equal(effective.original_number, 13);
    assert.notEqual(effective.bank_fingerprint, question.based_on);

    const repinned = JSON.parse(frozen[variantFile]);
    repinned.source_fingerprint = effective.bank_fingerprint;
    const [approvedVariants] = compileContent('variants', withDraft({
        [bankFile]: toBytes(question), [variantFile]: toBytes(repinned),
    }));
    assert.equal(approvedVariants.summary.available, 436);
    assert.deepEqual(approvedVariants.summary.changed, [id]);
    assert.deepEqual(approvedVariants.summary.held, []);

    // An alternate JPEG fixture exercises the same input path as a replacement cover.
    const alternate = read('public/studio/covers/12-ung-dung-tich-phan-fb504a8.jpg');
    const [untouchedBank, untouchedVariants, changedLibrary] = compileContent('all', withDraft({[coverFile]: alternate}));
    assert.deepEqual(untouchedBank.files, baselineBank.files);
    assert.deepEqual(untouchedVariants.files, baselineVariants.files);
    assert.notEqual(changedLibrary.summary.cover_sha256, baselineLibrary.summary.cover_sha256);
    assert.notEqual(changedLibrary.files[0][0], baselineLibrary.files[0][0]);
    assert.deepEqual(changedLibrary.files[0][1], alternate);
    assert.equal(readCourseBank().questions.length, 5837);
});

test('v0.14: content validation rejects active HTML, missing IDs and a variant tied to a stale question', () => {
    const draft = JSON.parse(frozen[bankFile]);
    draft.solution += '<script>alert(1)</script>';
    assert.throws(()=>compileContent('bank',withDraft({[bankFile]:toBytes(draft)})),/script/);
    draft.id = 'dc-12-hk2-6D2-q014-v4';
    assert.throws(()=>compileContent('bank',withDraft({[bankFile]:toBytes(draft)})),/khớp tên tệp/);
    assert.throws(()=>compileContent('bank',withDraft(),folder => folder === bankFolder
        ? list(folder).filter(file => file !== `${id}.json`) : list(folder)),/Thiếu tệp/);
    assert.throws(()=>compileContent('bank',withDraft(),folder => folder === bankFolder
        ? [...list(folder), 'unexpected.json'] : list(folder)),/ngoài danh mục/);
    const variants = JSON.parse(frozen[variantFile]);
    variants.source_fingerprint = '1'.repeat(64);
    assert.throws(()=>compileContent('variants',withDraft({[variantFile]:toBytes(variants)})),/Cập nhật dấu vân tay/);
});

test('two edits in the same lesson combine by question ID', () => {
    const secondId = 'dc-12-hk2-6D2-q014-v4';
    const secondFile = `${bankFolder}/${secondId}.json`;
    const first = JSON.parse(frozen[bankFile]);
    const second = JSON.parse(frozen[secondFile]);
    first.solution += '<p>Đối chiếu câu 13.</p>';
    second.solution += '<p>Đối chiếu câu 14.</p>';

    const [bank] = compileContent('bank', withDraft({[bankFile]: toBytes(first), [secondFile]: toBytes(second)}));
    assert.deepEqual(bank.summary.changed, [id, secondId]);
    assert.equal(bank.effective.get(id).solution, first.solution);
    assert.equal(bank.effective.get(secondId).solution, second.solution);
});

test('Chapter I keeps the published variants and routes the held source question for review', async () => {
    const heldId = 'dc-12-hk1-1D3-q038-v4';
    const [bank, variants] = compileContent('all', read, list, '12-C01');
    assert.equal(bank.summary.questions, 230);
    assert.deepEqual(bank.summary.changed, [heldId]);
    assert.equal(variants.summary.available, 900);
    for (const result of [bank, variants])
        for (const [file, bytes] of result.files) assert.deepEqual(read(file), bytes);

    const source = readFrozenCourseBank().questions.find(row => row.id === heldId);
    const rows = readCourseBank().questions.filter(row => bank.effective.has(row.id));
    assert.equal(rows.length, 230);
    assert.equal(rows.reduce((sum, row) => sum + availableQuestionVariantKeys(row).length, 0), 900);
    const held = rows.find(row => row.id === heldId);
    assert.deepEqual({...held, bank_status: source.bank_status, bank_fingerprint: source.bank_fingerprint}, source);
    assert.equal(held.bank_status, 'review');
    assert.equal(canEnterSession(decodeQuestion(held)), false);

    const current = {
        id: heldId, course_ref: held.bank_fingerprint, archived_at: null, updated_at: 0,
    };
    const tables = Object.fromEntries(BACKUP_TABLES.map(key => [key, []]));
    tables.questions.push({...current, course_ref: source.bank_fingerprint});
    const oldBackup = await sealBackup(tables);
    const restored = await validateBackup(oldBackup, {courseRows: [current]});
    assert.equal(restored.tables.questions[0].course_ref, held.bank_fingerprint);
});

test('Chapter II editing applies only the two approved corrections and preserves variant holds', () => {
    const scope = '12-C02';
    const lessonIds = new Set(['dc-12-hk1-2H1-v4', 'dc-12-hk1-2H2-v4', 'dc-12-hk1-2H3-v4']);
    const reviewId = 'dc-12-hk1-2H1-q058-v4';
    const approved37Id = 'dc-12-hk1-2H2-q037-v4';
    const originals = readFrozenCourseBank().questions.filter(row => lessonIds.has(row.lesson_id));
    const [bank, variants] = compileContent('all', read, list, scope);
    assert.equal(bank.summary.questions, 218);
    assert.deepEqual(bank.summary.changed, [reviewId, approved37Id]);
    const unchanged = row => row.id !== reviewId && row.id !== approved37Id;
    assert.deepEqual([...bank.effective.values()].filter(unchanged), originals.filter(unchanged));
    assert.equal(variants.summary.available, 696);
    assert.deepEqual(variants.summary.changed, []);
    assert.deepEqual(variants.summary.held, [approved37Id]);
    for (const result of [bank, variants]) {
        for (const [file, bytes] of result.files) assert.deepEqual(read(file), bytes);
    }

    const chapter = JSON.parse(read('data/chapter-variants/manifest.json')).chapters.find(entry => entry.id === scope);
    const sourceHolds = chapter.held.filter(hold => bank.effective.has(hold.source_id));
    assert.equal(sourceHolds.length, 43);
    const rows = readCourseBank().questions.filter(row => bank.effective.has(row.id));
    assert.deepEqual(rows, [...bank.effective.values()]);
    assert.deepEqual(rows.filter(row => row.bank_status === 'review'), []);
    const variantsByQuestion = new Map(rows.map(row => [row.id, availableQuestionVariantKeys(row)]));
    assert.equal([...variantsByQuestion.values()].flat().length, 696);
    assert.deepEqual(variantsByQuestion.get(approved37Id), []);
    for (const hold of sourceHolds) assert.deepEqual(variantsByQuestion.get(hold.source_id), []);

    const original = originals.find(row => row.id === reviewId);
    const approved = bank.effective.get(reviewId);
    const {solution, bank_status, bank_note, bank_meta, bank_fingerprint, ...rest} = approved;
    assert.deepEqual({...rest, solution: original.solution, bank_status: original.bank_status,
        bank_note: original.bank_note, bank_meta: original.bank_meta, bank_fingerprint: original.bank_fingerprint}, original);
    assert.equal(solution, original.solution.replace('<li><strong>Sai</strong>', '<li><strong>Đúng</strong>'));
    assert.equal(bank_status, 'auto');
    assert.deepEqual(JSON.parse(bank_meta), {...JSON.parse(original.bank_meta), flags: []});
    assert.match(bank_note, /đã duyệt/);
    assert.notEqual(bank_fingerprint, original.bank_fingerprint);
    assert.equal(canEnterSession(decodeQuestion(approved)), true);
    const approved37 = bank.effective.get(approved37Id);
    assert.equal(canEnterSession(decodeQuestion(approved37)), true);
    assert.equal(approved37.correct, originals.find(row => row.id === approved37Id).correct);
});

const chapterExpectations = [
    {
        scope: '12-C03',
        lessonIds: ['dc-12-hk1-3D1-v4', 'dc-12-hk1-3D2-v4'],
        questions: 151, variants: 604, approvalIds: [], repinIds: [], heldVariants: 0,
    },
    {
        scope: '12-C04',
        lessonIds: ['dc-12-hk2-4D1-v4', 'dc-12-hk2-4D2-v4', 'dc-12-hk2-4D3-v4'],
        questions: 153, variants: 568, heldVariants: 9,
        approvalIds: ['dc-12-hk2-4D2-q026-v4', 'dc-12-hk2-4D3-q039-v4', 'dc-12-hk2-4D3-q056-v4'],
        repinIds: ['dc-12-hk2-4D3-q039-v4', 'dc-12-hk2-4D3-q056-v4'],
    },
    {
        scope: '12-C05',
        lessonIds: ['dc-12-hk2-5H1-v4', 'dc-12-hk2-5H2-v4', 'dc-12-hk2-5H3-v4'],
        questions: 168, variants: 624, heldVariants: 9,
        approvalIds: ['dc-12-hk2-5H2-q057-v4', 'dc-12-hk2-5H3-q028-v4', 'dc-12-hk2-5H3-q034-v4'],
        repinIds: ['dc-12-hk2-5H2-q057-v4', 'dc-12-hk2-5H3-q028-v4', 'dc-12-hk2-5H3-q034-v4'],
    },
];

for (const expected of chapterExpectations) {
    test(`${expected.scope} keeps the approved source questions and variant holds`, () => {
        const originals = readFrozenCourseBank().questions.filter(row => expected.lessonIds.includes(row.lesson_id));
        const [bank, variants] = compileContent('all', read, list, expected.scope);
        assert.equal(bank.summary.questions, expected.questions);
        assert.deepEqual(bank.summary.changed, expected.approvalIds);
        const unchanged = row => !expected.approvalIds.includes(row.id);
        assert.deepEqual([...bank.effective.values()].filter(unchanged), originals.filter(unchanged));
        assert.equal(variants.summary.available, expected.variants);
        assert.deepEqual(variants.summary.changed, []);
        assert.deepEqual(variants.summary.held, expected.repinIds);
        for (const result of [bank, variants]) {
            for (const [file, bytes] of result.files) assert.deepEqual(read(file), bytes);
        }

        const rows = readCourseBank().questions.filter(row => expected.lessonIds.includes(row.lesson_id));
        assert.deepEqual(rows, [...bank.effective.values()]);
        assert.deepEqual(rows.filter(row => row.bank_status === 'review'), []);
        const byId = new Map(rows.map(row => [row.id, row]));
        for (const id of expected.approvalIds) {
            const approved = byId.get(id);
            assert.equal(approved.bank_status, 'auto');
            assert.equal(canEnterSession(decodeQuestion(approved)), true);
            assert.deepEqual(JSON.parse(approved.bank_meta).flags, []);
        }
        const chapters = JSON.parse(read('data/chapter-variants/manifest.json')).chapters;
        const sourceHolds = chapters.find(entry => entry.id === expected.scope).held;
        assert.equal(sourceHolds.length, expected.heldVariants);
        for (const hold of sourceHolds) {
            assert.deepEqual(availableQuestionVariantKeys(bank.effective.get(hold.source_id)), []);
        }
        for (const id of expected.repinIds) {
            assert.deepEqual(availableQuestionVariantKeys(byId.get(id)), []);
        }
    });
}
