import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readdir, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {buildPublicEdition, planPublicEdition} from '../scripts/build-public-edition.mjs';

const approval = {by: 'Người duyệt giả', date: '2026-11-22', evidence: 'Căn cứ giả để kiểm thử'};
const approved = (id, url, host) => ({id, approval, official: {url, host}});
const manifest = approved => ({format: 'toanthd.public-approvals/1', approved});

test('public edition builds only explicitly approved records and files', async t => {
    const folder = await mkdtemp(path.join(os.tmpdir(), 'toanthd-public-'));
    t.after(() => rm(folder, {recursive: true, force: true}));
    const file = path.join(folder, 'approvals.json');
    const preview = path.join(folder, 'preview');
    const release = path.join(folder, 'release');
    await writeFile(file, JSON.stringify(manifest([])));
    await assert.rejects(buildPublicEdition({out: release, approvals: file}), /Chưa có học liệu/);
    assert.equal((await buildPublicEdition({out: preview, approvals: file, preview: true})).items, 0);
    assert.match(await readFile(path.join(preview, 'index.html'), 'utf8'), /content="noindex"/);

    const entry = approved('11-sgk-toan-tap-1', 'https://example.org/books/11', 'example.org');
    await writeFile(file, JSON.stringify(manifest([entry])));
    assert.equal((await buildPublicEdition({out: release, approvals: file})).items, 1);
    assert.deepEqual((await readdir(release)).sort(), ['catalog.js', 'index.html', 'library.css', 'library.js']);
    const script = await readFile(path.join(release, 'catalog.js'), 'utf8');
    assert.match(script, /SGK Toán 11/);
    assert.doesNotMatch(script, /hoc-lieu-so\/nguon|sourcePath|Bản lưu nội bộ|monty-hall/);
});

test('public edition rejects unapproved identifiers and internal or credential-bearing URLs', async () => {
    await assert.rejects(planPublicEdition(manifest([approved('private-resource', 'https://example.org', 'example.org')])), /chưa có trong danh mục/);
    for (const link of [
        'http://example.org/file',
        'https://user@example.org/file',
        'https://example.org/file?token=fixture',
        'https://toan-thd-thu-hoc-lieu-https.h01882808481.chatgpt.site/file',
    ]) {
        const source = approved('11-sgk-toan-tap-1', link, new URL(link).hostname);
        await assert.rejects(planPublicEdition(manifest([source])), /liên kết HTTPS chính thức/);
    }
});

test('public edition packages only the approved version of a standalone lesson', async t => {
    const folder = await mkdtemp(path.join(os.tmpdir(), 'toanthd-public-'));
    t.after(() => rm(folder, {recursive: true, force: true}));
    const file = path.join(folder, 'approvals.json');
    const release = path.join(folder, 'release');
    const id = '12-monty-hall-game-577dcd0';
    const bytes = await readFile(new URL(`../public/hoc-lieu-so/nguon/${id}/index.html`, import.meta.url));
    const lesson = {sha256: createHash('sha256').update(bytes).digest('hex')};
    const entry = {id, approval, lesson};
    const reader = approved('12-sgk-toan-tap-1', 'https://example.org/books/12', 'example.org');

    await writeFile(file, JSON.stringify(manifest([entry, reader])));
    const result = await buildPublicEdition({out: release, approvals: file});
    assert.equal(result.items, 2);
    assert.equal(result.lessons, 1);
    assert.deepEqual(await readdir(path.join(release, 'lessons')), [id]);
    assert.deepEqual(await readdir(path.join(release, 'lessons', id)), ['index.html']);
    assert.deepEqual(await readFile(path.join(release, 'lessons', id, 'index.html')), bytes);
    const script = await readFile(path.join(release, 'catalog.js'), 'utf8');
    assert.ok(script.includes(`"href":"lessons/${id}/index.html"`));
    assert.ok(script.includes('"href":"https://example.org/books/12"'));
    assert.doesNotMatch(script, /hoc-lieu-so\/nguon|sourcePath|sha256/);

    await assert.rejects(planPublicEdition(manifest([{id, approval}])), /đúng một nguồn/);
    await assert.rejects(planPublicEdition(manifest([{...entry, official: reader.official}])), /đúng một nguồn/);
    await assert.rejects(planPublicEdition(manifest([{id: reader.id, approval, lesson}])), /không có tệp HTML/);
    await assert.rejects(planPublicEdition(manifest([{...entry, lesson: {...lesson, path: '../internal.html'}}])), /Thiếu SHA-256/);
    const differentHash = (lesson.sha256[0] === 'a' ? 'b' : 'a') + lesson.sha256.slice(1);
    await assert.rejects(planPublicEdition(manifest([{...entry, lesson: {sha256: differentHash}}])), /khác phiên bản đã duyệt/);

    const withFiles = names => manifest([{...entry, lesson: {...lesson,
        assets: names.map(name => ({name, sha256: lesson.sha256})),
    }}]);
    for (const name of ['../escape.js', 'nested/file.js', 'nested\\file.js', 'example.html']) {
        await assert.rejects(planPublicEdition(withFiles([name])), /Danh sách tệp thư viện.*không hợp lệ/);
    }
    await assert.rejects(planPublicEdition(withFiles(['OrbitControls.js', 'orbitcontrols.js'])), /phải duy nhất/);
});
