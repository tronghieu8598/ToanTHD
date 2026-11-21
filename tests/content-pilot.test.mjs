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

test('Chapter II editing covers only B01 and preserves the reviewed source and variant holds', () => {
    const scope = '12-C02';
    const lessonId = 'dc-12-hk1-2H1-v4';
    const reviewId = 'dc-12-hk1-2H1-q058-v4';
    const originals = readFrozenCourseBank().questions.filter(row => row.lesson_id === lessonId);
    const [bank, variants] = compileContent('all', read, list, scope);
    assert.equal(bank.summary.questions, 107);
    assert.deepEqual(bank.summary.changed, []);
    assert.deepEqual([...bank.effective.values()], originals);
    assert.equal(variants.summary.available, 256);
    assert.deepEqual(variants.summary.changed, []);
    for (const result of [bank, variants]) {
        for (const [file, bytes] of result.files) assert.deepEqual(read(file), bytes);
    }

    const chapter = JSON.parse(read('data/chapter-variants/manifest.json')).chapters.find(entry => entry.id === scope);
    const sourceHolds = chapter.held.filter(hold => bank.effective.has(hold.source_id));
    assert.equal(sourceHolds.length, 43);
    const rows = readCourseBank().questions.filter(row => bank.effective.has(row.id));
    assert.deepEqual(rows, originals);
    const variantsByQuestion = new Map(rows.map(row => [row.id, availableQuestionVariantKeys(row)]));
    assert.equal([...variantsByQuestion.values()].flat().length, 256);
    for (const hold of sourceHolds) assert.deepEqual(variantsByQuestion.get(hold.source_id), []);

    const held = rows.find(row => row.id === reviewId);
    assert.equal(held.bank_status, 'review');
    assert.equal(canEnterSession(decodeQuestion(held)), false);
});
