import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {gunzipSync} from 'node:zlib';
import {DOMParser} from 'linkedom/worker';
import {availableQuestionVariantKeys, resolveQuestionVariant} from '../lib/accepted-variants.mjs';
import frozenVariants from '../lib/chapter-variants/12-C06.mjs';
import frozenVariantIndex from '../lib/chapter-variants/index.mjs';
import {courseRowPayload, decodeQuestion} from '../lib/course-bank.mjs';
import {validateRichHtml} from '../lib/rich-html.mjs';
import {compileContent} from './content-pilot.mjs';
import {readCourseBank} from './course-bank-data.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const scope = '12-C06';
const lessonIds = new Set(['dc-12-hk2-6D1-v4', 'dc-12-hk2-6D2-v4']);
const sourcePaths = [
    'data/course-bank/manifest.json', 'data/course-bank/questions.json.gz',
    'data/course-bank/src/12/C06', 'data/course-bank/generated/12-C06.json',
    'data/chapter-variants/manifest.json', 'data/chapter-variants/release.json',
    'data/chapter-variants/src/12/C06', 'data/chapter-variants/source/12-C06.json.gz',
    'data/chapter-variants/generated/12-C06.json', 'lib/chapter-variants/12-C06.mjs',
    'lib/chapter-variants/assets.mjs', 'lib/chapter-variants/index.mjs', 'lib/chapter-variants/loaders.mjs',
    'lib/course-assets.mjs', 'lib/course-bank.mjs', 'lib/accepted-variants.mjs',
    'lib/content.mjs', 'lib/grading.mjs', 'lib/question-variants.mjs', 'lib/rich-html.mjs',
    'scripts/content-pilot.mjs', 'scripts/course-bank-data.mjs', 'package-lock.json',
];
const read = relative => readFileSync(path.join(root, relative));
const readJson = relative => JSON.parse(read(relative));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
const assert = (ok, message) => { if (!ok) throw new Error(message); };

function assertCommittedSource(assets = []) {
    const paths = sourcePaths.concat(assets.map(asset => 'public' + asset.path));
    assert(!git('status', '--porcelain=v1', '--untracked-files=all', '--', ...paths),
        'Hãy commit các thay đổi nguồn câu hỏi, biến thể và hình trước khi đóng gói.');
}

function verifyVariantSource(questions) {
    const entry = readJson('data/chapter-variants/release.json').chapters.find(item => item.id === scope);
    assert(entry?.file === scope + '.json.gz' && ['source_approved', 'teacher_confirmed_integration'].includes(entry.acceptance),
        'Thiếu nguồn biến thể Chương VI đã duyệt.');
    const frozen = read('data/chapter-variants/source/' + entry.file);
    assert(sha256(frozen) === entry.sha256, 'Nguồn biến thể Chương VI sai SHA-256.');
    const source = JSON.parse(gunzipSync(frozen));
    const ids = new Set(source.items.map(item => item.source_id));
    assert(source.format === 'toanthd.chapter-variants/1' && source.chapter_id === scope &&
        source.items.length === questions.length && ids.size === questions.length &&
        questions.every(question => ids.has(question.id)) && source.items.every(item => {
            const indexed = frozenVariantIndex[item.source_id];
            return indexed?.chapter === scope && indexed.fingerprint === item.source_fingerprint &&
                indexed.count === item.variants.length;
        }), 'Nguồn biến thể Chương VI không khớp danh sách mã câu chuẩn.');

    const compiled = readJson('data/chapter-variants/manifest.json').chapters.find(item => item.id === scope);
    assert(compiled?.source_questions === questions.length &&
        sha256(gunzipSync(Buffer.from(frozenVariants, 'base64'))).slice(0, 12) === compiled.version,
        'Mô-đun biến thể gốc Chương VI không khớp bản đã duyệt.');
}

function referencedAssets(rows) {
    const paths = new Set();
    const parser = new DOMParser();
    for (const row of rows) {
        for (const html of [row.prompt, row.solution, ...row.choices.map(choice => choice.text)]) {
            validateRichHtml(html);
            const page = parser.parseFromString('<html><body>' + html + '</body></html>', 'text/html');
            for (const img of page.querySelectorAll('img[src]')) {
                const src = img.getAttribute('src');
                if (src.startsWith('/')) paths.add(src);
            }
        }
    }
    return [...paths].sort().map(src => {
        const expected = /^\/(?:bank|variant)-assets\/([a-f0-9]{64})\.svg$/.exec(src)?.[1];
        assert(expected, 'Đường dẫn hình trong gói không hợp lệ: ' + src);
        const bytes = read('public' + src);
        assert(sha256(bytes) === expected, 'SHA-256 không khớp hình ' + src);
        return {path: src, sha256: expected, bytes: bytes.length};
    });
}

export async function buildBankRelease() {
    const sourceCommit = git('rev-parse', '--verify', 'HEAD^{commit}');
    assertCommittedSource();
    const bank = compileContent('bank')[0];
    const variantOverlay = compileContent('variants')[0];
    for (const {files} of [bank, variantOverlay]) {
        for (const [file, bytes] of files) {
            assert(read(file).equals(bytes), 'Gói chưa đồng bộ với nguồn: ' + file + '. Chạy npm run content:build rồi commit.');
        }
    }

    const {manifest, questions: allQuestions} = readCourseBank();
    const questions = allQuestions.filter(question => lessonIds.has(question.lesson_id));
    const ids = new Set(questions.map(question => question.id));
    const lessons = manifest.lessons.filter(lesson => lessonIds.has(lesson.id));
    const documents = manifest.documents.filter(document => lessons.some(lesson => lesson.document_id === document.id));
    assert(lessons.length === lessonIds.size && documents.length === 1 &&
        documents[0].id === 'dc-12-hk2-v4' && documents[0].grade === 12 &&
        questions.length === bank.summary.questions && ids.size === questions.length && questions.every(question =>
        question.bank_fingerprint === sha256(courseRowPayload(question))),
        'Tài liệu, bài học hoặc dấu vân tay câu chuẩn Chương VI không khớp.');
    verifyVariantSource(questions);

    const variants = [];
    for (const question of questions) {
        for (const key of availableQuestionVariantKeys(question)) {
            const variant = await resolveQuestionVariant(question, key);
            assert(variant && variant.kind === question.kind,
                'Không đọc được biến thể đã duyệt của ' + question.id);
            variants.push(variant);
        }
    }
    assert(variants.length === variantOverlay.summary.available, 'Số biến thể mà web dùng chưa khớp gói đã duyệt.');
    const assets = referencedAssets([...questions.map(question => decodeQuestion(question)), ...variants]);
    assertCommittedSource(assets);
    assert(sourceCommit === git('rev-parse', '--verify', 'HEAD^{commit}'), 'Commit nguồn vừa đổi. Chạy lại bước đóng gói.');

    const release = {
        format: 'toanthd.bank-release/1', scope, source_commit: sourceCommit,
        source_version: manifest.version, variants_version: variantOverlay.summary.version,
        documents, lessons, questions, assets,
    };
    const data = Buffer.from(JSON.stringify(release));
    const summary = {
        scope, source_commit: sourceCommit, source_version: manifest.version, variants_version: release.variants_version,
        documents: documents.length, lessons: lessons.length, questions: questions.length,
        variants: variants.length, held: variantOverlay.summary.held,
        assets: assets.length, bytes: data.length, sha256: sha256(data),
    };
    return {data, summary};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const {values} = parseArgs({options: {output: {type: 'string'}}});
        const {data, summary} = await buildBankRelease();
        if (values.output !== undefined) {
            assert(values.output.trim(), 'Hãy chỉ rõ đường dẫn cho --output.');
            writeFileSync(path.resolve(values.output), data, {flag: 'wx'});
        }
        console.log(JSON.stringify(summary));
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
