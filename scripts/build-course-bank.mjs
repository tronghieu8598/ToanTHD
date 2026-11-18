// Read the data blocks in the three original course files without executing their scripts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { DOMParser } from 'linkedom/worker';
import { COURSE_BANK_VERSION, bankSearch, courseRowPayload } from '../lib/course-bank.mjs';
import { PREVIOUS_COURSE_ROW_FINGERPRINTS } from '../lib/course-previous.mjs';
import { validateRichHtml } from '../lib/rich-html.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = process.argv.slice(2);
const grades = [10, 11, 12];
if (files.length !== grades.length) throw new Error('Dùng: npm run bank:rebuild -- <HTML Toán 10> <HTML Toán 11> <HTML Toán 12>');

const hash = value => createHash('sha256').update(value).digest('hex');
const parseHtml = html => new DOMParser().parseFromString('<html><body>' + html + '</body></html>', 'text/html').body;
const plain = html => parseHtml(html).textContent.replace(/\s+/g, ' ').trim();
const bankDir = path.join(root, 'data/course-bank');
const documents = [], lessons = [], questions = [], issues = [], sources = [];
const assets = new Map();

function readSource(filename, grade) {
  const bytes = fs.readFileSync(filename);
  const data = bytes.toString('utf8').match(/<script\b(?=[^>]*\bid="course-data")[^>]*>\s*([A-Za-z0-9+/=\s]+)<\/script>/i)?.[1];
  if (!data) throw new Error('Thiếu khối JSON nén course-data trong ' + path.basename(filename));
  const course = JSON.parse(gunzipSync(Buffer.from(data, 'base64')));
  sources.push({ filename: path.basename(filename), grade, sha256: hash(bytes), format: 'course-data-json-gzip' });
  return course;
}

function svgFile(url, id) {
  const encoded = /^data:image\/svg\+xml;base64,([A-Za-z0-9+/=\s]+)$/.exec(url)?.[1];
  if (!encoded) throw new Error('Thiếu hình SVG ' + id);
  const bytes = Buffer.from(encoded, 'base64');
  const src = '/bank-assets/' + hash(bytes) + '.svg';
  if (assets.has(src)) return src;
  const svg = bytes.toString('utf8');
  if (/<!ENTITY|<!DOCTYPE[^>]*\bSYSTEM\b/i.test(svg)) throw new Error('SVG có tham chiếu ngoài');
  const tree = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (!tree.querySelector('svg')) throw new Error('Hình SVG không đọc được');
  for (const el of tree.querySelectorAll('*')) {
    if (['script', 'foreignobject', 'iframe', 'object', 'embed', 'audio', 'video'].includes(el.localName.toLowerCase())) {
      throw new Error('SVG có nội dung hoạt động');
    }
    for (const {name, value} of el.attributes) {
      const attr = name.toLowerCase();
      if (attr.startsWith('on')) throw new Error('SVG có sự kiện');
      if (['href', 'xlink:href', 'src'].includes(attr) && !value.startsWith('#') && !/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=\s]+$/.test(value)) {
        throw new Error('SVG có liên kết ngoài');
      }
      for (const match of value.matchAll(/url\(\s*['"]?([^)'"]+)['"]?\s*\)/gi)) {
        if (!match[1].startsWith('#')) throw new Error('SVG có URL ngoài');
      }
    }
    if (el.localName === 'style' && /@import|url\(\s*['"]?(?!#)/i.test(el.textContent)) throw new Error('SVG có CSS ngoài');
  }
  assets.set(src, bytes);
  return src;
}

function hydrate(html, course) {
  const result = html
    .replace(/<span\b[^>]*\bdata-math="([^"]+)"[^>]*><\/span>/g, (_tag, id) => {
      const math = course.math[id];
      if (typeof math !== 'string' || !math.includes('<math')) throw new Error('Thiếu công thức ' + id);
      return math;
    })
    .replace(/<button\b[^>]*\bdata-figure="[^"]+"[^>]*>([\s\S]*?)<\/button>/g, '$1')
    .replace(/\bdata-asset="([^"]+)"/g, (_attr, id) => 'src="' + svgFile(course.assets[id], id) + '"');
  if (/\bdata-(?:math|asset|figure)=/.test(result)) throw new Error('Còn tham chiếu công thức hoặc hình chưa xử lý');
  return result;
}

function reviewQuestion(q, solution) {
  let status = q.type === 'free' ? 'reference' : q.answer == null ? 'review' : 'auto';
  const flags = [], notes = [];
  if (status === 'review') {
    flags.push(q.manualReason || 'manual-answer');
    notes.push(q.reviewNote || (q.type === 'short'
      ? 'Đáp số cần chấm tay hoặc chưa có đáp số số học duy nhất.'
      : 'Nguồn đánh dấu chấm tay hoặc chưa có khóa đáp án đầy đủ.'));
  }
  if (q.reviewNote && !notes.includes(q.reviewNote)) notes.push(q.reviewNote);
  if (q.type === 'tf' && Array.isArray(q.answer)) {
    const entries = [...parseHtml(solution).querySelectorAll('ol.alpha-list > li')];
    const stated = entries.map(el => el.textContent.trim().match(/^(Đúng|Sai)\s*[.。:]/i));
    if (stated.length === 4 && stated.every(Boolean) && stated.some((m, i) => (m[1].toLocaleLowerCase('vi') === 'đúng') !== q.answer[i])) {
      status = 'review';
      flags.push('conflicting-tf-solution');
      notes.push('Khóa Đúng/Sai và danh sách Đúng/Sai trong lời giải không khớp. Cần giáo viên đối chiếu trước khi chấm.');
    }
  }
  if (q.type === 'mcq' && q.answer != null) {
    const stated = plain(solution).match(/^(?:Lời giải\s*[:.]?\s*)?Chọn\s+([ABCD])(?:\s|[.。:]|$)/i);
    if (stated && stated[1].toUpperCase() !== 'ABCD'[q.answer]) {
      status = 'review';
      flags.push('conflicting-mcq-solution');
      notes.push('Khóa lựa chọn và dòng “Chọn …” trong lời giải không khớp. Cần đối chiếu trước khi chấm.');
    }
  }
  return {status, flags, note: notes.join('\n')};
}

for (const [index, grade] of grades.entries()) {
  const course = readSource(files[index], grade);
  for (const book of course.books) {
    const documentId = `dc-${grade}-${book.id}-v4`;
    documents.push({id: documentId, grade, title: `Đề cương Toán ${grade} · ${book.title}`, edition: 'Đề cương gốc', parent_id: null, is_sample: 0});
    const bookLessons = new Map(book.lessons.map(lesson => [lesson.id, lesson]));
    for (const lesson of book.lessons) {
      lessons.push({id: `dc-${grade}-${lesson.id}-v4`, document_id: documentId, chapter: lesson.chapter, title: lesson.title});
    }
    for (const q of book.questions) {
      const id = `dc-${grade}-${q.id}-v4`;
      const lesson = bookLessons.get(q.lesson);
      if (!lesson || !PREVIOUS_COURSE_ROW_FINGERPRINTS.has(id)) throw new Error('Mã câu hoặc bài không khớp ngân hàng ' + id);
      try {
        const prompt = hydrate(q.stem, course);
        const solution = hydrate(q.solution, course);
        const choices = q.options.map((html, i) => ({key: (q.type === 'mcq' ? 'ABCD' : 'abcd')[i], text: hydrate(html, course)}));
        const correct = q.answer == null ? null : q.type === 'mcq' ? 'ABCD'[q.answer] : q.type === 'short' ? String(q.answer) : q.answer;
        const {status, flags, note} = reviewQuestion(q, solution);
        const {sourceFile, sourceNumber, semester, answerRaw, acceptedAnswers = [], answerUnit = ''} = q;
        const row = {
          id, lesson_id: `dc-${grade}-${q.lesson}-v4`, original_number: q.number, revision: 1, kind: q.type,
          prompt, choices: JSON.stringify(choices), correct: JSON.stringify(correct), solution,
          family_id: id, source_json: null, archived_at: null, updated_at: 0,
          bank_status: status, bank_origin: grade + ':' + q.id, bank_tex: null,
          bank_meta: JSON.stringify({sourceFile, sourceNumber, semester, answerRaw, acceptedAnswers, answerUnit, flags}),
          bank_note: note, bank_search: bankSearch([plain(prompt), ...choices.map(c => plain(c.text)), lesson.title, lesson.chapter, q.number].join(' ')),
        };
        row.bank_fingerprint = hash(courseRowPayload(row));
        questions.push(row);
        if (status === 'review' || note) issues.push({id, grade, lesson: lesson.title, number: q.number, kind: q.type, status, flags, note});
      } catch (error) {
        throw new Error(id + ': ' + error.message, {cause: error});
      }
    }
  }
}

if (questions.length !== PREVIOUS_COURSE_ROW_FINGERPRINTS.size || new Set(questions.map(q => q.id)).size !== questions.length) {
  throw new Error('Ngân hàng nguồn không có đúng các mã câu gốc.');
}
if (new Set(questions.map(q => q.lesson_id + ':' + q.original_number)).size !== questions.length) {
  throw new Error('Trùng số câu trong cùng bài.');
}
const allowed = new Set(assets.keys());
for (const q of questions) {
  try {
    for (const html of [q.prompt, q.solution, ...JSON.parse(q.choices).map(c => c.text)]) validateRichHtml(html, {assets: allowed});
  } catch (error) {
    throw new Error(q.id + ': ' + error.message, {cause: error});
  }
}

const summary = {total: questions.length, by_grade: {}, by_kind: {}, by_status: {}};
for (const q of questions) {
  const grade = Number(q.bank_origin.split(':')[0]);
  const group = summary.by_grade[grade] ??= {
    total: 0, auto: 0, review: 0, reference: 0, lessons: lessons.filter(l => l.id.startsWith(`dc-${grade}-`)).length,
  };
  group.total++;
  group[q.bank_status]++;
  summary.by_kind[q.kind] = (summary.by_kind[q.kind] || 0) + 1;
  summary.by_status[q.bank_status] = (summary.by_status[q.bank_status] || 0) + 1;
}
const packed = gzipSync(JSON.stringify(questions), {level: 9});
const paths = [...assets.keys()].sort();
const manifest = {
  format: 'toanthd-course-bank', version: COURSE_BANK_VERSION, sources, documents, lessons, summary,
  assets: {count: assets.size, bytes: [...assets.values()].reduce((n, b) => n + b.length, 0), paths},
  questions_sha256: hash(packed),
};
fs.mkdirSync(bankDir, {recursive: true});
fs.mkdirSync(path.join(root, 'public/bank-assets'), {recursive: true});
for (const [src, bytes] of assets) fs.writeFileSync(path.join(root, 'public', src), bytes);
fs.writeFileSync(path.join(bankDir, 'questions.json.gz'), packed);
fs.writeFileSync(path.join(bankDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(bankDir, 'review.json'), JSON.stringify(issues, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'lib/course-fingerprints.mjs'),
  '// Generated immutable question identities.\n' +
  'export const COURSE_ROW_FINGERPRINTS=new Map(' + JSON.stringify(questions.map(q => [q.id, q.bank_fingerprint])) + ');\n' +
  'export const COURSE_ROW_META=new Map(' + JSON.stringify(questions.map(({id, lesson_id, original_number, kind, revision}) => [id, {lesson_id, original_number, kind, revision}])) + ');\n');
fs.writeFileSync(path.join(root, 'lib/course-metadata.mjs'),
  '// Generated bundled documents and lessons.\nexport const COURSE_METADATA=' + JSON.stringify({documents, lessons}) + ';\n');
fs.writeFileSync(path.join(root, 'lib/course-assets.mjs'),
  '// Generated local assets from the original course bank.\nexport const COURSE_ASSET_PATHS=new Set(' + JSON.stringify(paths) + ');\n');
console.log(JSON.stringify({...summary, assets: assets.size, packed_bytes: packed.length}, null, 2));
