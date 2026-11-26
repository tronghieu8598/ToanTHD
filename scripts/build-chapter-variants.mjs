import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync, gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {DOMParser} from 'linkedom/worker';
import {validateRichHtml} from '../lib/rich-html.mjs';
import {numericValue} from '../lib/grading.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.resolve(process.argv[2] || path.join(root, 'data/chapter-variants/source'));
const dataDir = path.join(root, 'data/chapter-variants');
const moduleDir = path.join(root, 'lib/chapter-variants');
const sha = value => createHash('sha256').update(value).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(message); };
const bank = new Map(JSON.parse(gunzipSync(fs.readFileSync(path.join(root, 'data/course-bank/questions.json.gz')))).map(q => [q.id, q]));
const release = JSON.parse(fs.readFileSync(path.join(dataDir, 'release.json'), 'utf8'));
const index = {}, assetPaths = new Set(), chapters = [];
const retainedAssets=path.join(root,'public/variant-assets');
if(fs.existsSync(retainedAssets))for(const name of fs.readdirSync(retainedAssets)){
  if(!/^[a-f0-9]{64}\.svg$/.test(name))continue;
  fail(sha(fs.readFileSync(path.join(retainedAssets,name)))===name.slice(0,64),'Hình đã lưu bị thay đổi: '+name);
  assetPaths.add('/variant-assets/'+name);
}
fs.mkdirSync(moduleDir, {recursive:true});

// Validate every input before writing runtime files. Source approval and the
// teacher's integration decision remain separate, auditable fields.
const staged = [];
for (const entry of release.chapters) {
  const sourceBytes = fs.readFileSync(path.join(sourceRoot, entry.file));
  fail(sha(sourceBytes) === entry.sha256, 'Sai SHA-256: '+entry.file);
  const raw = entry.file.endsWith('.gz') ? gunzipSync(sourceBytes) : sourceBytes;
  const source = JSON.parse(raw);
  fail(source.chapter_id === entry.id && source.format === 'toanthd.chapter-variants/1', 'Sai định dạng chương');
  const approvedByTeacher = entry.acceptance === 'teacher_confirmed_integration';
  fail(approvedByTeacher || entry.acceptance === 'source_approved', 'Chương chưa được chấp nhận');
  const files = new Map(), assetMap = new Map();
  for (const asset of source.assets) {
    fail(/^variant-assets\/[A-Za-z0-9._-]+\.svg$/.test(asset.path), 'Đường dẫn SVG không hợp lệ');
    const doc = new DOMParser().parseFromString(asset.svg, 'image/svg+xml');
    fail(doc.documentElement?.localName === 'svg', 'SVG không hợp lệ: '+asset.path);
    for (const el of doc.querySelectorAll('*')) {
      fail(!['script','foreignobject','iframe','object','embed','image','use','style','a','animate','set','animatetransform','animatemotion'].includes(el.localName.toLowerCase()), 'SVG chứa nội dung chủ động');
      for (const attr of el.attributes) {
        const value = attr.value.replace(/url\(#[A-Za-z_][\w.-]*\)/g, '');
        fail(!/^on|href|src/i.test(attr.name) && !/url\s*\(|javascript:|@import/i.test(value), 'Thuộc tính SVG không hợp lệ: '+asset.path+' '+attr.name);
      }
    }
    const url = '/variant-assets/'+sha(asset.svg)+'.svg';
    assetMap.set(asset.path, url); assetPaths.add(url); files.set(url, asset.svg);
  }
  const rewrite = html => String(html || '').replace(/(<img\b[^>]*\bsrc\s*=\s*)(["'])([^"']+)\2/gi, (match, prefix, quote, src) => {
    fail(assetMap.has(src), 'Ảnh không nằm trong gói chương: '+src);
    return prefix+quote+assetMap.get(src)+quote;
  });
  const records = {}, held = [], statuses = {}, kinds = {};
  for (const item of source.items) {
    const original = bank.get(item.source_id);
    fail(original && original.bank_fingerprint === item.source_fingerprint, 'Không khớp câu gốc: '+item.source_id);
    fail(!index[item.source_id], 'Mã câu gốc trùng giữa các chương');
    const variants = [];
    fail(item.decision === 'generated' ? item.variants.length === 4 : item.variants.length === 0, 'Số biến thể không khớp quyết định');
    for (const variant of item.variants) {
      fail(approvedByTeacher || variant.review_status === 'approved', 'Biến thể chưa được duyệt: '+variant.id);
      fail(variant.kind === original.kind && variant.id === item.source_id+'--bt'+String(variant.number).padStart(2,'0'), 'Sai mã/loại biến thể');
      fail(Number.isInteger(variant.number) && variant.number >= 1 && variant.number <= 4 && !variants.some(v => v.number === variant.number), 'Trùng số biến thể');
      const v = Object.fromEntries(['id','number','kind','prompt','choices','correct','solution','accepted_answers'].map(k => [k, variant[k]]));
      v.prompt = rewrite(v.prompt); v.solution = rewrite(v.solution);
      v.choices = v.choices.map(c => ({key:c.key, text:rewrite(c.text)}));
      fail(v.prompt.length > 0 && v.solution.length > 0, 'Thiếu đề hoặc lời giải');
      if (v.kind === 'mcq') fail(/^[ABCD]$/.test(v.correct) && v.choices.length === 4, 'Sai đáp án MCQ');
      if (v.kind === 'tf') fail(Array.isArray(v.correct) && v.correct.length === 4 && v.correct.every(x => typeof x === 'boolean') && v.choices.length === 4, 'Sai đáp án TF');
      if (v.kind === 'short') { fail(numericValue(v.correct) !== null && v.choices.length === 0, 'Sai đáp án ngắn'); v.correct = String(v.correct); }
      if (v.kind === 'free') fail(v.correct === null && v.choices.length === 0, 'Tự luận phải chấm tay');
      v.choices.forEach((c,i) => fail(c.key === (v.kind === 'mcq'?'ABCD':'abcd')[i], 'Sai nhãn phương án'));
      fail(Array.isArray(v.accepted_answers) && v.accepted_answers.every(x => numericValue(x) !== null), 'Sai đáp án thay thế');
      for (const html of [v.prompt,v.solution,...v.choices.map(c => c.text)]) validateRichHtml(html, {assets:assetPaths});
      statuses[variant.review_status] = (statuses[variant.review_status] || 0)+1;
      kinds[v.kind] = (kinds[v.kind] || 0)+1;
      variants.push(v);
    }
    variants.sort((a,b) => a.number-b.number);
    records[item.source_id] = variants;
    if (!variants.length) held.push({source_id:item.source_id, decision:item.decision, reason:item.reason});
    index[item.source_id] = {chapter:entry.id, source:sha(item.source_id).slice(0,8), fingerprint:item.source_fingerprint, kind:original.kind, count:variants.length};
  }
  const payload = JSON.stringify(records), digest = sha(payload).slice(0,12);
  for (const item of source.items) index[item.source_id].version = digest;
  chapters.push({id:entry.id,title:entry.title,version:digest,source_questions:source.items.length,
    generated_sources:source.items.length-held.length,variants:Object.values(records).reduce((n,a)=>n+a.length,0),
    assets:files.size,source_assets:source.assets.length,kinds,source_review_statuses:statuses,acceptance:entry.acceptance,held});
  staged.push({entry,sourceBytes,files,packed:gzipSync(payload,{level:9})});
}
for (const {entry,sourceBytes,files,packed} of staged) {
  fs.mkdirSync(path.join(dataDir,'source'),{recursive:true});
  fs.writeFileSync(path.join(dataDir,'source',entry.file),sourceBytes);
  fs.writeFileSync(path.join(moduleDir,entry.id+'.mjs'), '// Server-only compressed chapter. Generated by scripts/build-chapter-variants.mjs.\nexport default '+JSON.stringify(packed.toString('base64'))+';\n');
  for (const [url,svg] of files) { const target=path.join(root,'public',url); fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,svg); }
}
fs.writeFileSync(path.join(moduleDir,'index.mjs'),'// Generated metadata only; no answers.\nexport default '+JSON.stringify(index)+';\n');
fs.writeFileSync(path.join(moduleDir,'assets.mjs'),'// Immutable asset paths, also used when restoring snapshots.\nexport const VARIANT_ASSET_PATHS = new Set('+JSON.stringify([...assetPaths].sort())+');\n');
fs.writeFileSync(path.join(moduleDir,'loaders.mjs'),'// Explicit server imports keep answer keys out of public assets.\nexport default {\n'+chapters.map(c=>JSON.stringify(c.id)+': () => import("./'+c.id+'.mjs")').join(',\n')+'\n};\n');
fs.writeFileSync(path.join(dataDir,'manifest.json'),JSON.stringify({version:release.version,accepted_on:release.accepted_on,chapters},null,2)+'\n');
fs.writeFileSync(path.join(dataDir,'summary.json'),JSON.stringify(chapters.map(({id,title,variants,generated_sources})=>({id,title,variants,generated_sources})),null,2)+'\n');
console.log(JSON.stringify(chapters.map(({id,source_questions,variants,assets,held})=>({id,source_questions,variants,assets,held:held.length})),null,2));
