import {createHash, randomUUID} from 'node:crypto';
import {existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {parseArgs} from 'node:util';
import {bankSearch, courseRowPayload} from '../lib/course-bank.mjs';
import {bankReleaseChapters} from '../lib/bank-release-chapters.mjs';
import {numericValue} from '../lib/grading.mjs';
import {validateRichHtml} from '../lib/rich-html.mjs';
import frozenVariantIndex from '../lib/chapter-variants/index.mjs';
import chapterOnePacked from '../lib/chapter-variants/12-C01.mjs';
import chapterTwoPacked from '../lib/chapter-variants/12-C02.mjs';
import chapterSixPacked from '../lib/chapter-variants/12-C06.mjs';
import {readFrozenCourseBank} from './course-bank-data.mjs';

const workspace = fileURLToPath(new URL('../', import.meta.url));
const defaultScope = '12-C06';
const monty = '12-monty-hall-game-577dcd0';
const parts = ['bank', 'variants', 'library'];
const digest = value => createHash('sha256').update(value).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const bankSource = (scope, file) => `data/course-bank/src/${scope.replace('-', '/')}/${file}`;
const variantSource = (scope, file) => `data/chapter-variants/src/${scope.replace('-', '/')}/${file}`;
const librarySource = file => `data/digital-library/src/12/C06/${monty}/${file}`;
const fail = (ok, message) => { if (!ok) throw new Error(message); };
const shape = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const fingerprint = /^[a-f0-9]{64}$/;

const packedVariants = {'12-C01': chapterOnePacked, '12-C02': chapterTwoPacked, '12-C06': chapterSixPacked};
const cachedVariants = new Map();
function frozenVariantsFor(scope) {
    if (!cachedVariants.has(scope)) {
        cachedVariants.set(scope, JSON.parse(gunzipSync(Buffer.from(packedVariants[scope], 'base64'))));
    }
    return cachedVariants.get(scope);
}
const readDisk = relative => readFileSync(path.join(workspace, relative));
const listDisk = relative => readdirSync(path.join(workspace, relative));
function readJson(read, file) {
    try { return JSON.parse(read(file)); }
    catch (error) { throw new Error(file + ' · ' + error.message, {cause: error}); }
}
function readLesson(read, list, folder, lessonId, format, key, ids) {
    const filenames = ids.map(id => id + '.json');
    const expected = new Set(filenames);
    const actual = new Set(list(folder).filter(file => /\.json$/i.test(file)));
    const missing = filenames.filter(file => !actual.has(file));
    const extra = [...actual].filter(file => !expected.has(file));
    fail(!missing.length, folder + ' · Thiếu tệp ' + missing.join(', ') + '.');
    fail(!extra.length, folder + ' · Tệp ngoài danh mục ' + extra.join(', ') + '.');

    // Assemble in the original lesson order so the generated version is reproducible.
    const entries = ids.map((id, i) => {
        const file = folder + '/' + filenames[i];
        const entry = readJson(read, file);
        fail(entry?.id === id, file + ' · Mã câu phải khớp tên tệp.');
        return entry;
    });
    return {format, lesson_id: lessonId, [key]: entries};
}

function questionContent(row) {
    return {
        prompt: row.prompt,
        choices: JSON.parse(row.choices),
        correct: JSON.parse(row.correct),
        solution: row.solution,
        accepted_answers: JSON.parse(row.bank_meta || '{}').acceptedAnswers ?? [],
    };
}
const fields = ['prompt', 'choices', 'correct', 'solution', 'accepted_answers'];
function validateContent(value, kind, label, allowUnresolved = false) {
    const {prompt, choices, correct, solution, accepted_answers: accepted} = value;
    fail(typeof prompt === 'string' && prompt.trim() && typeof solution === 'string', label + ' · Thiếu câu hỏi hoặc sai lời giải.');
    fail(Array.isArray(choices) && Array.isArray(accepted), label + ' · Sai định dạng phương án hoặc đáp án thay thế.');
    const optionKeys = kind === 'mcq' ? 'ABCD' : kind === 'tf' ? 'abcd' : '';
    fail(choices.length === optionKeys.length && choices.every((choice, i) =>
        shape(choice, ['key', 'text']) && choice.key === optionKeys[i] && typeof choice.text === 'string' && choice.text.trim()),
    label + ' · Sai thứ tự hoặc nội dung phương án.');
    const validAnswer = kind === 'mcq' ? typeof correct === 'string' && /^[ABCD]$/.test(correct)
        : kind === 'tf' ? Array.isArray(correct) && correct.length === 4 && correct.every(answer => typeof answer === 'boolean')
        : kind === 'short' ? (typeof correct === 'string' || typeof correct === 'number') && numericValue(correct) !== null
        : kind === 'free' && correct === null;
    fail(validAnswer || allowUnresolved && correct === null, label + ' · Đáp án không phù hợp dạng câu.');
    fail(accepted.length <= 20 && (kind === 'short' || !accepted.length) &&
        accepted.every(answer => (typeof answer === 'string' || typeof answer === 'number') && numericValue(answer) !== null),
    label + ' · Đáp án thay thế không hợp lệ.');
    try { for (const html of [prompt, solution, ...choices.map(choice => choice.text)]) validateRichHtml(html); }
    catch (error) { throw new Error(label + ' · ' + error.message, {cause: error}); }
}

let frozenBank;
function baseBank() {
    frozenBank ??= readFrozenCourseBank();
    return frozenBank;
}

function compileBank(read, list, scope) {
    const {manifest, questions} = baseBank();
    const rows = [], approvedSources = [], effective = new Map();
    for (const lesson of bankReleaseChapters[scope].lessons) {
        const folder = bankSource(scope, lesson.folder);
        const originals = new Map(questions.filter(row => row.lesson_id === lesson.id).map(row => [row.id, row]));
        const doc = readLesson(read, list, folder, lesson.id, 'toanthd.question-lesson/1', 'questions', [...originals.keys()]);
        const lessonMeta = manifest.lessons.find(item => item.id === lesson.id);
        for (const input of doc.questions) {
            const original = originals.get(input.id);
            const label = folder + '/' + input.id + '.json';
            const keys = ['id', 'original_number', 'kind', 'based_on', ...fields];
            const needsReview = Object.hasOwn(input, 'bank_status');
            if (needsReview) keys.push('bank_status');
            fail(shape(input, keys) && (!needsReview || input.bank_status === 'review') &&
                input.original_number === original.original_number && input.kind === original.kind && input.based_on === original.bank_fingerprint,
            label + ' · Mã, số gốc, dạng câu hoặc dấu vân tay nguồn đã thay đổi.');
            const baseContent = questionContent(original);
            const content = Object.fromEntries(fields.map(key => [key, input[key]]));
            const edited = !same(content, baseContent);
            const status = needsReview ? input.bank_status : original.bank_status;
            if (!edited && status === original.bank_status) {
                effective.set(original.id, original);
                continue;
            }
            const row = {...original, bank_status: status};
            if (edited) {
                validateContent(content, original.kind, label, status === 'review');
                const meta = JSON.parse(original.bank_meta || '{}');
                meta.acceptedAnswers = content.accepted_answers;
                Object.assign(row, {
                    prompt: content.prompt,
                    solution: content.solution,
                    choices: JSON.stringify(content.choices),
                    correct: JSON.stringify(content.correct),
                    bank_meta: JSON.stringify(meta),
                });
            }
            if (row.prompt !== original.prompt || row.choices !== original.choices) {
                const text = [row.prompt, ...content.choices.map(choice => choice.text)].join(' ').replace(/<[^>]*>/g, ' ');
                row.bank_search = bankSearch([text, lessonMeta.title, lessonMeta.chapter, row.original_number].join(' '));
            }
            row.bank_fingerprint = digest(courseRowPayload(row));
            rows.push(row);
            effective.set(row.id, row);
        }
        approvedSources.push(doc);
    }
    const output = {
        format: 'toanthd.bank-overlay/1',
        version: digest(JSON.stringify(approvedSources)).slice(0, 12),
        base_sha256: manifest.questions_sha256,
        rows,
    };
    const affected = rows.filter(row => frozenVariantIndex[row.id]?.count > 0).map(row => ({
        id: row.id, source_fingerprint: row.bank_fingerprint, previous_variants: frozenVariantIndex[row.id].count,
    }));
    return {
        files: [[`data/course-bank/generated/${scope}.json`, jsonBytes(output)]],
        summary: {part: 'bank', version: output.version, questions: effective.size, changed: rows.map(row => row.id), affected_variants: affected},
        effective,
    };
}

function compileVariants(read, list, effective, scope) {
    const entries = {}, held = [], approvedSources = [];
    const frozenVariants = frozenVariantsFor(scope);
    let available = 0;
    for (const lesson of bankReleaseChapters[scope].lessons) {
        const folder = variantSource(scope, lesson.folder);
        const ids = [...effective.values()].filter(row => row.lesson_id === lesson.id).map(row => row.id);
        const doc = readLesson(read, list, folder, lesson.id, 'toanthd.variant-lesson/1', 'families', ids);
        for (const family of doc.families) {
            const {id, source_fingerprint, variants} = family;
            const current = effective.get(id), baseline = frozenVariantIndex[id];
            const label = folder + '/' + id + '.json';
            fail(shape(family, ['id', 'source_fingerprint', 'variants']) && fingerprint.test(source_fingerprint)
                && Array.isArray(variants) && [0, 4].includes(variants.length), label + ' · Một câu có 0 hoặc 4 biến thể.');
            const originalFamily = source_fingerprint === baseline.fingerprint && same(variants, frozenVariants[id]);
            if (source_fingerprint !== current.bank_fingerprint) {
                fail(originalFamily, label + ' · Cập nhật dấu vân tay từ câu gốc hiện tại rồi duyệt lại các biến thể.');
                if (variants.length) held.push(id);
                continue;
            }
            available += variants.length;
            if (originalFamily) continue;
            for (const [i, variant] of variants.entries()) {
                fail(shape(variant, ['id', 'number', 'kind', ...fields]) &&
                    variant.id === id + '--bt' + String(i + 1).padStart(2, '0') && variant.number === i + 1 &&
                    variant.kind === current.kind && typeof variant.solution === 'string' && variant.solution.trim(),
                label + ' · Sai mã, thứ tự, dạng hoặc thiếu lời giải biến thể.');
                validateContent(variant, current.kind, label);
            }
            entries[id] = {
                index: {...baseline, fingerprint: source_fingerprint, count: variants.length,
                    version: digest(JSON.stringify(family)).slice(0, 12)},
                variants,
            };
        }
        approvedSources.push(doc);
    }
    const output = {
        format: 'toanthd.variant-overlay/1',
        version: digest(JSON.stringify(approvedSources)).slice(0, 12),
        entries,
    };
    return {
        files: [[`data/chapter-variants/generated/${scope}.json`, jsonBytes(output)]],
        summary: {part: 'variants', version: output.version, available, changed: Object.keys(entries), held},
    };
}

function compileLibrary(read) {
    const file = librarySource('manifest.json');
    const doc = readJson(read, file);
    const original = readJson(read, 'data/digital-library/catalog.json').find(item => item.id === monty);
    fail(shape(doc, ['format', 'id', 'grade', 'chapter_number', 'title', 'description', 'cover', 'original_sha256'])
        && doc.format === 'toanthd.library-item/1' && doc.id === monty && doc.grade === 12 && doc.chapter_number === 6
        && doc.cover === 'cover.jpg' && typeof doc.title === 'string' && doc.title.trim() && doc.title.length <= 160
        && typeof doc.description === 'string' && doc.description.length <= 1000 && fingerprint.test(doc.original_sha256),
    file + ' · Sai thông tin học liệu.');
    const originalBytes = read('public' + original.url);
    fail(digest(originalBytes) === doc.original_sha256 && originalBytes.length === original.bytes, file + ' · Tệp HTML gốc không khớp.');
    const cover = read(librarySource(doc.cover));
    fail(cover.length >= 4 && cover.length <= 2_000_000 && cover[0] === 0xff && cover[1] === 0xd8 &&
        cover.at(-2) === 0xff && cover.at(-1) === 0xd9, file + ' · Bìa cần là ảnh JPEG dưới 2 MB.');
    const coverSha = digest(cover);
    const output = {
        format: 'toanthd.library-overlay/1',
        version: digest(JSON.stringify([doc, coverSha])).slice(0, 12),
        resource: {id: doc.id, title: doc.title.trim(), description: doc.description, chapterNumber: doc.chapter_number,
            cover: `/studio/covers/${monty}-${coverSha.slice(0, 12)}.jpg`},
        cover_sha256: coverSha,
        original_sha256: doc.original_sha256,
    };
    return {
        files: [['public' + output.resource.cover, cover], ['data/digital-library/generated/monty-hall.json', jsonBytes(output)]],
        summary: {part: 'library', version: output.version, id: monty, cover_sha256: coverSha},
    };
}

export function compileContent(part = 'all', read = readDisk, list = listDisk, scope = defaultScope) {
    fail(part === 'all' || parts.includes(part), 'Chọn bank, variants, library hoặc all.');
    fail(Object.hasOwn(bankReleaseChapters, scope), 'Chương chưa có cấu hình biên tập.');
    const bank = part !== 'library' ? compileBank(read, list, scope) : null;
    const results = [];
    if (part === 'all' || part === 'bank') results.push(bank);
    if (part === 'all' || part === 'variants') results.push(compileVariants(read, list, bank.effective, scope));
    if (part === 'library' || (part === 'all' && scope === defaultScope)) results.push(compileLibrary(read));
    return results;
}

function writeGenerated(relative, bytes) {
    const target = path.join(workspace, relative);
    if (existsSync(target) && readFileSync(target).equals(bytes)) return;
    mkdirSync(path.dirname(target), {recursive: true});
    const temp = target + '.' + randomUUID() + '.tmp';
    try {
        writeFileSync(temp, bytes, {flag: 'wx'});
        renameSync(temp, target);
    } finally {
        if (existsSync(temp)) unlinkSync(temp);
    }
}

export function frozenLessonInputs(scope = defaultScope) {
    fail(Object.hasOwn(bankReleaseChapters, scope), 'Chương chưa có cấu hình biên tập.');
    const {questions} = baseBank();
    const frozenVariants = frozenVariantsFor(scope);
    const files = {};
    for (const lesson of bankReleaseChapters[scope].lessons) {
        const bankFolder = bankSource(scope, lesson.folder);
        const variantFolder = variantSource(scope, lesson.folder);
        for (const row of questions.filter(row => row.lesson_id === lesson.id)) {
            const filename = row.id + '.json';
            files[bankFolder + '/' + filename] = jsonBytes({id: row.id, original_number: row.original_number,
                kind: row.kind, based_on: row.bank_fingerprint, ...questionContent(row)});
            files[variantFolder + '/' + filename] = jsonBytes({id: row.id, source_fingerprint: row.bank_fingerprint,
                variants: frozenVariants[row.id]});
        }
    }
    return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const {positionals, values} = parseArgs({allowPositionals: true, options: {chapter: {type: 'string'}}});
        const [command = 'check', part = 'all'] = positionals;
        fail(positionals.length <= 2 && ['check', 'build', 'preview'].includes(command),
            'Dùng content-pilot.mjs check|build|preview [bank|variants|library|all] [--chapter 12-C01|12-C02|12-C06].');
        const scopes = values.chapter ? [values.chapter]
            : command === 'check' && part !== 'library' ? Object.keys(bankReleaseChapters) : [defaultScope];
        const outputs = scopes.flatMap(scope => compileContent(part, readDisk, listDisk, scope)
            .map(output => ({...output, scope})));
        for (const {files, scope} of outputs) for (const [file, bytes] of files) {
            if (command === 'build') writeGenerated(file, bytes);
            if (command === 'check') fail(existsSync(path.join(workspace, file)) && readDisk(file).equals(bytes),
                file + ' chưa đồng bộ. Chạy npm run content:build -- ' + part + ' --chapter ' + scope + '.');
        }
        console.log(JSON.stringify(outputs.map(output => output.summary), null, 2));
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
