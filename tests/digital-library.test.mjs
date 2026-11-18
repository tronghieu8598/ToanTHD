import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const resources = JSON.parse(fs.readFileSync(path.join(root, 'data/digital-library/catalog.json'), 'utf8'));
const sgk = JSON.parse(fs.readFileSync(path.join(root, 'data/digital-library/large-assets.json'), 'utf8')).sgk_offline;

test('Danh mục được xây từ 34 tài nguyên gốc, không trùng ID/đường dẫn', () => {
  assert.equal(resources.length, 34);
  assert.equal(new Set(resources.map(r=>r.id)).size, resources.length);
  assert.equal(new Set(resources.map(r=>r.url)).size, resources.length);
  assert.equal(resources.filter(r=>r.kind==='lesson').length, 28);
  assert.equal(resources.filter(r=>r.kind==='book').length, 1);
  assert.equal(resources.filter(r=>r.kind==='elearning').length, 1);
  assert.equal(resources.filter(r=>r.kind==='document').length, 2);
  assert.equal(resources.filter(r=>r.kind==='archive').length, 2);
  for (const r of resources) {
    assert.ok(r.title && r.id && r.url && r.sourcePath);
    assert.ok(r.url.startsWith('/hoc-lieu-so/nguon/'));
    assert.ok(r.sourcePath.startsWith('HOC LIEU SO/'));
    assert.ok(!r.url.includes('..') && !r.url.includes('\\'));
    assert.ok(r.grades.length >= 1 && r.grades.every(g => [10,11,12].includes(g)));
  }
});

test('Sau khi cài, mọi học liệu có đường dẫn hợp lệ trong public', {skip: !fs.existsSync(path.join(root, 'public/hoc-lieu-so/nguon'))}, () => {
  for (const r of resources) {
    const p = path.join(root, 'public', r.url.slice(1));
    if (process.env.TOANTHD_GIT_CHECKOUT === '1' && 'public'+r.url === sgk.path && !fs.existsSync(p)) continue;
    assert.ok(fs.existsSync(p), 'Thiếu ' + p);
    assert.equal(fs.statSync(p).size, r.bytes, 'Sai dung lượng nguồn ' + r.title);
  }
  const elearning = path.join(root,'public/hoc-lieu-so/nguon/e-learning-csn');
  for (const p of ['app.js','styles.css','vendor/katex/katex.min.js','audio/slide-01.mp3', 'audio/slide-35.mp3'])
    assert.ok(fs.existsSync(path.join(elearning, p)), 'Thiếu asset: ' + p);
});
