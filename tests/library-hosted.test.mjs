import test from 'node:test';
import assert from 'node:assert/strict';
import {serveHostedLibrary} from '../lib/library-hosted.mjs';

const base = 'https://test.local/hoc-lieu-so/nguon/';

function fixture() {
    const bytes = new TextEncoder().encode('<!doctype html><title>Học liệu mẫu</title>');
    const file = {size: bytes.length, etag: 'version-one', httpEtag: '"version-one"', uploaded: new Date('2026-11-18T06:00:00Z')};
    const names = new Set(['library/xac-suat/index.html', 'library/mau.zip']);
    const storage = {
        opened: [],
        versionChanged: false,
        async head(key) { return names.has(key) ? file : null; },
        async get(key, options) {
            storage.opened.push(key);
            assert.equal(options.onlyIf.etagMatches, file.etag);
            if (storage.versionChanged) return file;
            const {offset, length} = options.range ?? {offset: 0, length: bytes.length};
            return {...file, body: new Response(bytes.slice(offset, offset + length)).body};
        },
    };
    return {storage, bytes, open: (name, options) => serveHostedLibrary(new Request(base + name, options), storage)};
}

test('the HTTPS library serves published R2 objects with HEAD, safe HTML and range requests', async () => {
    const {open, bytes, storage} = fixture();
    const head = await open('xac-suat/index.html',{method:'HEAD'});
    assert.equal(head.status,200);
    assert.equal(Number(head.headers.get('content-length')),bytes.length);
    assert.match(head.headers.get('content-security-policy'),/sandbox allow-scripts/);
    assert.doesNotMatch(head.headers.get('content-security-policy'),/allow-same-origin/);
    assert.equal(storage.opened.length,0);
    const cached = await open('xac-suat/index.html',{headers:{'If-None-Match':'W/"version-one"'}});
    assert.equal(cached.status,304);
    assert.equal(storage.opened.length,0);
    const range = await open('xac-suat/index.html',{headers:{Range:'bytes=0-8'}});
    assert.equal(range.status,206);
    assert.equal(range.headers.get('content-range'),`bytes 0-8/${bytes.length}`);
    assert.deepEqual(new Uint8Array(await range.arrayBuffer()),bytes.slice(0,9));
    assert.equal((await open('xac-suat/index.html',{headers:{Range:'bytes=10000-'}})).status,416);
    assert.equal((await open('xac-suat/index.html',{headers:{Range:'bytes=0-8','If-Range':'"another-version"'}})).status,200);
    assert.equal((await open('mau.zip')).headers.get('content-disposition'),'attachment');
});

test('the HTTPS library rejects invalid paths and mutations and detects a concurrent replacement', async () => {
    const {open, storage} = fixture();
    for (const path of ['%2ehidden/password', 'xac-suat/%5cprivate', 'xac-suat//index.html']) {
        assert.equal((await open(path)).status,400);
    }
    assert.equal((await open('no-such-material.html')).status,404);
    const post = await open('xac-suat/index.html',{method:'POST'});
    assert.equal(post.status,405);
    assert.equal(post.headers.get('allow'),'GET, HEAD');
    assert.equal(storage.opened.length,0);
    storage.versionChanged=true;
    assert.equal((await open('xac-suat/index.html')).status,412);
});
