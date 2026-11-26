import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createAuth} from '../lib/auth.mjs';
import {serveHostedLibrary} from '../lib/library-hosted.mjs';
import {createLibraryRelease, libraryReleasePath, libraryReleaseStatusPath} from '../worker/library-release.mjs';

const origin = 'https://toanthd.test';
const version = '001122334455';
const nextVersion = '001122334456';
const lesson = 'xac-suat/index.html';
const preview = 'xac-suat/demo.mp4';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function fixture(t) {
    const sqlite = new DatabaseSync(':memory:');
    t.after(() => sqlite.close());
    sqlite.exec('CREATE TABLE workspace_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
    sqlite.exec('CREATE TABLE teacher_accounts(id TEXT PRIMARY KEY, enabled INTEGER, auth_epoch TEXT, permissions TEXT, allowed_class_ids TEXT)');
    sqlite.exec(`INSERT INTO teacher_accounts VALUES('teacher-one',1,'1','{}','[]')`);
    const env = {
        AUTH_SECRET: 'test-fixture-secret', THD_PUBLIC_ORIGIN: origin, TEACHER_PASSWORD: 'test-fixture-password',
        DB: {
            prepare(sql) {
                const query = sqlite.prepare(sql);
                return {bind(...args) {
                    return {
                        async first(column) { const row = query.get(...args); return column ? row?.[column] ?? null : row ?? null; },
                        run() { return {meta: query.run(...args)}; },
                    };
                }};
            },
            async batch(statements) {
                sqlite.exec('BEGIN');
                try {
                    const results = statements.map(statement => statement.run());
                    sqlite.exec('COMMIT');
                    return results;
                } catch (error) {
                    sqlite.exec('ROLLBACK');
                    throw error;
                }
            },
        },
    };
    const first = (sql, ...args) => env.DB.prepare(sql).bind(...args).first();
    const auth = createAuth({env, database: () => env.DB, first, must: condition => assert.ok(condition)});
    const data = {[lesson]: Buffer.from('<!doctype html><title>Thử xác suất</title>'), [preview]: Buffer.from([1, 2, 3, 4])};
    const objects = new Map();
    env.BUCKET = {
        async head(key) { return objects.get(key) ?? null; },
        async get(key, options) {
            const object = objects.get(key);
            if (!object) return null;
            assert.equal(options.onlyIf.etagMatches, object.etag);
            const {offset, length} = options.range ?? {offset: 0, length: object.size};
            return {...object, body: new Response(object.bytes.subarray(offset, offset + length)).body};
        },
        async put(key, stream, options) {
            assert.equal(options.onlyIf.get('If-None-Match'), '*');
            const bytes = Buffer.from(await new Response(stream).arrayBuffer());
            if (hash(bytes) !== options.sha256) throw new Error('SHA-256 checksum mismatch');
            if (objects.has(key)) return null;
            const etag = hash(bytes);
            const object = {key, size: bytes.length, bytes, etag, httpEtag: `"${etag}"`, uploaded: new Date(),
                checksums: {sha256: Uint8Array.from(Buffer.from(etag, 'hex')).buffer}, customMetadata: options.customMetadata};
            objects.set(key, object);
            return object;
        },
        async list(options) {
            assert.deepEqual(options.include, ['customMetadata']);
            const matches = [...objects.values()].filter(object => object.key.startsWith(options.prefix));
            const page = Number(options.cursor ?? 0);
            const truncated = page + 1 < matches.length;
            const listed = matches.slice(page, page + 1).map(({checksums: _, ...rest}) => rest);
            return {objects: listed, truncated, cursor: truncated ? String(page + 1) : undefined};
        },
    };
    const manifest = {format: 'toanthd.library-release/1', version, files: Object.entries(data)
        .map(([path, bytes]) => ({path, bytes: bytes.length, sha256: hash(bytes)})),
        resources: [{id: 'xac-suat', url: '/hoc-lieu-so/nguon/' + lesson}]};
    const worker = createLibraryRelease(manifest);
    async function call(path = '', method = 'GET', options = {}, release = worker) {
        const {body, role = 'admin', versionHeader = version, requestOrigin = origin, headers: extra} = options;
        const headers = new Headers({'X-ToanTHD-Library-Version': versionHeader, ...extra});
        if (role) headers.set('Cookie', (await auth.issue(role === 'admin' ? 'password' : 'account', origin, '1',
            role === 'admin' ? null : 'teacher-one')).split(';')[0]);
        if (requestOrigin !== null) headers.set('Origin', requestOrigin);
        if (body) {
            if (!headers.has('Content-Length')) headers.set('Content-Length', String(body.length));
            if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/octet-stream');
        }
        const url = path === libraryReleaseStatusPath ? origin + path : origin + libraryReleasePath + path;
        return release.handleLibraryRelease(new Request(url, {method, headers, body}), env);
    }
    const view = (path, options, release = worker) => release.serveLibraryRelease(
        new Request(origin + '/hoc-lieu-so/nguon/' + path, options), env);
    return {env, worker, manifest, data, call, view};
}

test('only a real administrator can check, upload or activate the exact library release', async t => {
    const {call, data} = fixture(t);
    assert.equal((await call('', 'GET', {role: null})).status, 401);
    assert.equal((await call('', 'GET', {role: 'teacher'})).status, 403);
    assert.equal((await call('', 'GET', {requestOrigin: null})).status, 200);
    assert.equal((await call('/files/' + lesson, 'PUT', {body: data[lesson], requestOrigin: null})).status, 403);
    assert.equal((await call('/activate', 'POST', {requestOrigin: 'https://other.test'})).status, 403);
    assert.equal((await call('/activate', 'POST', {versionHeader: nextVersion})).status, 409);
    assert.equal((await call('/files/%2ehidden')).status, 404);
    assert.equal((await call('/files/%ZZ')).status, 400);
    assert.equal((await call('/files/' + lesson, 'PUT', {body: data[lesson], headers: {'Content-Length': '1'}})).status, 411);
    assert.equal((await call('/files/' + lesson, 'PUT', {body: data[lesson], headers: {'Content-Type': 'text/html'}})).status, 415);
    assert.equal((await call('/files/' + lesson, 'PUT', {body: Buffer.alloc(data[lesson].length)})).status, 422);
    assert.equal((await (await call('/files/' + lesson)).json()).ready, false);
});

test('staging is private, activation verifies all files, retries are safe, and streaming preserves existing HTTP behavior', async t => {
    const {env, call, data, view} = fixture(t);
    assert.deepEqual(await (await call(libraryReleaseStatusPath, 'GET', {role: null, requestOrigin: null})).json(),
        {version: null, resourceIds: []});
    for (const [path, body] of Object.entries(data)) {
        assert.equal((await call('/files/' + path, 'PUT', {body})).status, 201);
        assert.equal((await call('/files/' + path, 'PUT', {body})).status, 200);
        assert.equal(await view(path), null);
        if (path === lesson) {
            const missing = await call('/activate', 'POST');
            assert.equal(missing.status, 409);
            assert.deepEqual((await missing.json()).missing, [preview]);
        }
    }
    const direct = await serveHostedLibrary(new Request(origin + '/hoc-lieu-so/nguon/library-release/' + version + '/' + lesson), env.BUCKET);
    assert.equal(direct.status, 404);
    const staged = await (await call()).json();
    assert.equal(staged.readyCount, 2);
    assert.equal(staged.activeVersion, null);
    const receipt = await (await call('/activate', 'POST')).json();
    assert.deepEqual(receipt, {version, activeVersion: version, readyCount: 2, total: 2, ready: true, replayed: false});
    assert.equal((await (await call('/activate', 'POST')).json()).replayed, true);
    assert.deepEqual(await (await call(libraryReleaseStatusPath, 'GET', {role: null})).json(), {version, resourceIds: ['xac-suat']});
    const response = await view(lesson);
    assert.equal(await response.text(), data[lesson].toString());
    assert.match(response.headers.get('Content-Security-Policy'), /sandbox allow-scripts/);
    const range = await view(preview, {headers: {Range: 'bytes=1-2'}});
    assert.equal(range.status, 206);
    assert.equal(range.headers.get('Content-Type'), 'video/mp4');
    assert.deepEqual(Buffer.from(await range.arrayBuffer()), data[preview].subarray(1, 3));
});

test('a newly deployed manifest keeps the previous release active until all changed assets are ready', async t => {
    const {call, data, manifest, view} = fixture(t);
    for (const [path, body] of Object.entries(data)) await call('/files/' + path, 'PUT', {body});
    assert.equal((await call('/activate', 'POST')).status, 200);
    const revised = Buffer.from('Học liệu đã sửa');
    const next = createLibraryRelease({...manifest, version: nextVersion,
        files: [{path: lesson, bytes: revised.length, sha256: hash(revised)}],
        resources: [{id: 'xac-suat-moi', url: '/hoc-lieu-so/nguon/' + lesson}]});
    assert.equal(await (await view(lesson, {}, next)).text(), data[lesson].toString());
    assert.equal((await view(preview, {}, next)).status, 200);
    assert.equal((await call('/files/' + lesson, 'PUT', {body: revised, versionHeader: nextVersion}, next)).status, 201);
    assert.equal(await (await view(lesson, {}, next)).text(), data[lesson].toString());
    assert.deepEqual(await (await call(libraryReleaseStatusPath, 'GET', {role: null}, next)).json(),
        {version, resourceIds: ['xac-suat']});
    assert.equal((await call('/activate', 'POST', {versionHeader: nextVersion}, next)).status, 200);
    assert.equal(await (await view(lesson, {}, next)).text(), revised.toString());
    assert.equal(await view(preview, {}, next), null);
    assert.deepEqual(await (await call(libraryReleaseStatusPath, 'GET', {role: null}, next)).json(),
        {version: nextVersion, resourceIds: ['xac-suat-moi']});
});
