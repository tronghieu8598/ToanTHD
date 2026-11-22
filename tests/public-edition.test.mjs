import assert from 'node:assert/strict';
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
