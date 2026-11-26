import {createAuth} from '../lib/auth.mjs';
import {publishedLibraryPrefix, serveHostedLibrary} from '../lib/library-hosted.mjs';
import {libraryPath, validLibraryPath} from '../lib/library-http.mjs';

export const libraryReleasePath = '/api/teacher/library-release';
export const libraryReleaseStatusPath = '/api/library-release/status';

const activeKey = 'library_release_active';
const resourceIdsKey = 'library_release_resource_ids';
const versionPattern = /^[a-f0-9]{12,64}$/;
const hashPattern = /^[a-f0-9]{64}$/;
const resourceIdPattern = /^[a-z0-9][a-z0-9-]{0,127}$/;
const fileRoute = libraryReleasePath + '/files/';
const activationRoute = libraryReleasePath + '/activate';
const releasePrefix = version => `library-release/${version}/`;
const reply = (data, status = 200, headers = {}) =>
    Response.json(data, {status, headers: {'Cache-Control': 'no-store', ...headers}});

class ReleaseError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

function must(condition, message, status = 400) {
    if (!condition) throw new ReleaseError(message, status);
}

function validPath(path) {
    return typeof path === 'string' && path.length <= 500 && validLibraryPath(path) &&
        path.split('/').every(Boolean) && !/[?#%]/.test(path);
}

function firstValue(db, key) {
    return db.prepare('SELECT value FROM workspace_settings WHERE key=?').bind(key).first('value');
}

async function activeVersion(db) {
    const version = db && await firstValue(db, activeKey);
    return typeof version === 'string' && versionPattern.test(version) ? version : null;
}

async function publicStatus(db) {
    const row = db && await db.prepare(`SELECT
        (SELECT value FROM workspace_settings WHERE key=?) AS version,
        (SELECT value FROM workspace_settings WHERE key=?) AS resourceIds`)
        .bind(activeKey, resourceIdsKey).first();
    if (!row?.version || !versionPattern.test(row.version)) return {version: null, resourceIds: []};
    return {version: row.version, resourceIds: row.resourceIds ? JSON.parse(row.resourceIds) : []};
}

function matchesFile(object, file) {
    if (object?.size !== file.bytes) return false;
    const checksum = object.checksums?.sha256;
    const hash = checksum
        ? Array.from(new Uint8Array(checksum), byte => byte.toString(16).padStart(2, '0')).join('')
        : object.customMetadata?.sha256;
    return hash === file.sha256;
}

async function storeFile(bucket, key, body, file) {
    const options = {sha256: file.sha256, onlyIf: new Headers({'If-None-Match': '*'}),
        customMetadata: {sha256: file.sha256}};
    if (typeof globalThis.FixedLengthStream !== 'function') return bucket.put(key, body, options);

    // A proxy may deliver the incoming body as a stream with unknown length.
    const stream = new globalThis.FixedLengthStream(file.bytes);
    const cancel = new AbortController();
    const transfer = body.pipeTo(stream.writable, {signal: cancel.signal}).then(() => null, error => error);
    try {
        const stored = await bucket.put(key, stream.readable, options);
        if (stored) {
            const transferError = await transfer;
            if (transferError) throw transferError;
        }
        return stored;
    } finally {
        cancel.abort();
    }
}

export function createLibraryRelease(manifest) {
    const {version, files, resources} = manifest;
    if (manifest.format !== 'toanthd.library-release/1' || typeof version !== 'string' ||
        !versionPattern.test(version) || !Array.isArray(files) || !files.length || !Array.isArray(resources) || !resources.length) {
        throw new Error('Danh mục phát hành học liệu không hợp lệ.');
    }
    const filesByPath = new Map();
    for (const file of files) {
        if (!validPath(file.path) || filesByPath.has(file.path) || !Number.isSafeInteger(file.bytes) ||
            file.bytes < 1 || typeof file.sha256 !== 'string' || !hashPattern.test(file.sha256)) {
            throw new Error('Sai đường dẫn, kích thước hoặc SHA-256 trong danh mục phát hành học liệu.');
        }
        filesByPath.set(file.path, {path: file.path, bytes: file.bytes, sha256: file.sha256});
    }
    const resourceIds = new Set();
    for (const resource of resources) {
        if (typeof resource.id !== 'string' || !resourceIdPattern.test(resource.id) || resourceIds.has(resource.id) ||
            typeof resource.url !== 'string' || !resource.url.startsWith(libraryPath) ||
            !filesByPath.has(resource.url.slice(libraryPath.length))) {
            throw new Error('Mã hoặc đường dẫn học liệu chưa khớp với danh mục tệp phát hành.');
        }
        resourceIds.add(resource.id);
    }
    const resourceIdsJson = JSON.stringify([...resourceIds].sort());
    const prefix = releasePrefix(version);

    async function fileReadiness(bucket) {
        const readyPaths = new Set();
        let cursor;
        do {
            const result = await bucket.list({prefix, limit: 1000, include: ['customMetadata'], cursor});
            for (const object of result.objects) {
                const path = object.key.slice(prefix.length);
                const file = filesByPath.get(path);
                if (file && matchesFile(object, file)) readyPaths.add(path);
            }
            cursor = result.truncated ? result.cursor : undefined;
        } while (cursor);
        return readyPaths;
    }

    async function activate(db, readiness, summary) {
        if (!summary.ready) {
            return reply({error: 'Chưa đủ tệp đã đối chiếu để phát hành học liệu.', ...summary,
                missing: [...filesByPath.keys()].filter(path => !readiness.has(path))}, 409);
        }
        const save = (key, value) => db.prepare(`INSERT INTO workspace_settings(key,value) VALUES(?,?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE workspace_settings.value<>excluded.value`).bind(key, value);
        const [result] = await db.batch([save(activeKey, version), save(resourceIdsKey, resourceIdsJson)]);
        return reply({...summary, activeVersion: version, replayed: result.meta?.changes === 0});
    }

    async function fileUpload(request, bucket, file) {
        const key = prefix + file.path;
        const details = {version, ...file};
        const existing = await bucket.head(key);
        if (existing) {
            must(matchesFile(existing, file), 'Kho đang lưu một nội dung khác tại khóa tệp này.', 409);
            return reply({...details, ready: true});
        }
        if (request.method === 'GET') return reply({...details, ready: false});

        must(request.body && request.headers.get('Content-Length') === String(file.bytes),
            'Luồng nạp cần đủ số byte ghi trong danh mục học liệu.', 411);
        must(!request.headers.has('Content-Encoding') &&
            request.headers.get('Content-Type') === 'application/octet-stream',
            'Gửi tệp gốc dưới dạng application/octet-stream.', 415);
        const stored = await storeFile(bucket, key, request.body, file);
        must(matchesFile(stored ?? await bucket.head(key), file),
            'Kho tệp chưa xác nhận dung lượng và SHA-256 của tệp.', 409);
        return reply({...details, ready: true}, stored ? 201 : 200);
    }

    async function handleLibraryRelease(request, env) {
        const url = new URL(request.url);
        const {pathname} = url;
        try {
            if (pathname === libraryReleaseStatusPath) {
                must(request.method === 'GET', 'Phương thức không được hỗ trợ.', 405);
                return reply(await publicStatus(env.DB));
            }
            let file;
            const isSummary = pathname === libraryReleasePath;
            const isActivation = pathname === activationRoute;
            if (pathname.startsWith(fileRoute)) {
                let path;
                try { path = decodeURIComponent(pathname.slice(fileRoute.length)); }
                catch { throw new ReleaseError('Đường dẫn tệp học liệu không hợp lệ.', 400); }
                file = filesByPath.get(path);
            }
            must(!url.search && (isSummary || isActivation || file), 'Không tìm thấy mục phát hành học liệu.', 404);
            const methods = isSummary ? ['GET'] : isActivation ? ['POST'] : ['GET', 'PUT'];
            if (!methods.includes(request.method)) {
                return reply({error: 'Phương thức không được hỗ trợ.'}, 405, {Allow: methods.join(', ')});
            }
            must(env.DB && env.BUCKET, 'Kho học liệu HTTPS chưa sẵn sàng.', 503);
            const first = (sql, ...args) => env.DB.prepare(sql).bind(...args).first();
            const authTools = createAuth({env, database: () => env.DB, first, must});
            const origin = authTools.publicOrigin(request.url);
            const requestOrigin = request.headers.get('Origin');
            must(origin.startsWith('https://') && url.origin === origin &&
                (request.method === 'GET' && requestOrigin === null || requestOrigin === origin),
            'Yêu cầu nạp học liệu đến từ địa chỉ khác.', 403);
            const auth = await authTools.requireTeacher(request);
            must(auth.role === 'admin', 'Cần tài khoản quản trị để phát hành học liệu.', 403);
            await authTools.requireReal(auth);
            must(request.method === 'GET' || request.headers.get('X-ToanTHD-Library-Version') === version,
                'Danh mục học liệu đã đổi. Mở lại trang nạp trước khi tiếp tục.', 409);

            if (file) return await fileUpload(request, env.BUCKET, file);
            const [readiness, current] = await Promise.all([fileReadiness(env.BUCKET), activeVersion(env.DB)]);
            const total = filesByPath.size;
            const summary = {version, activeVersion: current, total, readyCount: readiness.size, ready: readiness.size === total};
            if (isActivation) return await activate(env.DB, readiness, summary);
            return reply({...summary, files: [...filesByPath.values()].map(entry => ({...entry, ready: readiness.has(entry.path)}))});
        } catch (error) {
            if (error instanceof ReleaseError) return reply({error: error.message}, error.status);
            if (error instanceof Error && /checksum|sha-?256/i.test(error.message)) {
                return reply({error: 'Nội dung tệp không khớp SHA-256 trong danh mục học liệu.'}, 422);
            }
            console.error('Library release failed', error instanceof Error ? error.name : typeof error);
            return reply({error: 'Kho học liệu chưa phản hồi. Hãy thử lại.'}, 502);
        }
    }

    async function serveLibraryRelease(request, env) {
        if (!env.BUCKET || !new URL(request.url).pathname.startsWith(libraryPath) ||
            !['GET', 'HEAD'].includes(request.method)) return null;
        const active = await activeVersion(env.DB);
        if (!active) return null;

        // Staged objects are outside the legacy public bucket namespace.
        const activePrefix = releasePrefix(active);
        const key = name => activePrefix + name.slice(publishedLibraryPrefix.length);
        const releaseBucket = {
            head: name => env.BUCKET.head(key(name)),
            get: (name, options) => env.BUCKET.get(key(name), options),
        };
        const response = await serveHostedLibrary(request, releaseBucket);
        return response.status === 404 ? null : response;
    }

    return {handleLibraryRelease, serveLibraryRelease};
}
