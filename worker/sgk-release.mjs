import {createAuth} from '../lib/auth.mjs';
import {libraryPath} from '../lib/library-http.mjs';
import {publishedLibraryPrefix, serveHostedLibrary} from '../lib/library-hosted.mjs';
import manifest from '../data/sgk-release.json' with {type: 'json'};

export const sgkReleasePath = '/api/teacher/sgk-release/';

const books = new Map(manifest.map(book => [String(book.grade), book]));
const folder = book => `${book.grade}-sgk-toan-tap-1`;
const publishedPath = book => `${libraryPath}${folder(book)}/index.html`;
const filePath = book => `${folder(book)}/${book.sha256.slice(0, 12)}/index.html`;
const booksByPath = new Map(manifest.map(book => [publishedPath(book), book]));
const response = (data, status = 200, headers = {}) =>
    Response.json(data, {status, headers: {'Cache-Control': 'no-store', ...headers}});

class UploadError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

function must(condition, message, status = 400) {
    if (!condition) throw new UploadError(message, status);
}

function matchesBook(stored, book) {
    const checksum = stored?.checksums?.sha256;
    return stored?.size === book.bytes && checksum &&
        Array.from(new Uint8Array(checksum), value => value.toString(16).padStart(2, '0')).join('') === book.sha256;
}

export async function serveSgkVersion(request, bucket) {
    const url = new URL(request.url);
    const book = booksByPath.get(url.pathname);
    if (!book || !['GET', 'HEAD'].includes(request.method)) return null;
    url.pathname = libraryPath + filePath(book);
    const version = await serveHostedLibrary(new Request(url, request), bucket);
    return version.status === 404 ? null : version;
}

export async function handleSgkRelease(request, env) {
    const url = new URL(request.url);
    const book = books.get(url.pathname.slice(sgkReleasePath.length));
    if (!url.pathname.startsWith(sgkReleasePath) || !book || url.search) {
        return response({error: 'Không tìm thấy tệp SGK trong đợt nạp.'}, 404);
    }
    if (request.method !== 'GET' && request.method !== 'PUT') {
        return response({error: 'Phương thức không được hỗ trợ.'}, 405, {Allow: 'GET, PUT'});
    }
    try {
        must(env.DB && env.BUCKET, 'Kho học liệu HTTPS chưa sẵn sàng.', 503);
        const first = (sql, ...args) => env.DB.prepare(sql).bind(...args).first();
        const authTools = createAuth({env, database: () => env.DB, first, must});
        const origin = authTools.publicOrigin(request.url);
        const publicUrl = new URL(origin);
        must(publicUrl.protocol === 'https:' && url.host === publicUrl.host &&
            request.headers.get('Origin') === origin, 'Yêu cầu nạp học liệu đến từ địa chỉ khác.', 403);
        const auth = await authTools.requireTeacher(request);
        must(auth.role === 'admin', 'Cần tài khoản quản trị để nạp SGK.', 403);
        await authTools.requireReal(auth);

        const key = publishedLibraryPrefix + filePath(book);
        const details = {grade: book.grade, url: publishedPath(book), bytes: book.bytes, sha256: book.sha256};
        const existing = await env.BUCKET.head(key);
        if (existing) {
            must(matchesBook(existing, book), 'Khóa tệp SGK đã chứa một phiên bản khác.', 409);
            return response({...details, ready: true});
        }
        if (request.method === 'GET') return response({...details, ready: false});

        must(request.body && request.headers.get('Content-Length') === String(book.bytes),
            'Luồng nạp cần đủ số byte ghi trong danh mục SGK.', 411);
        must(!request.headers.has('Content-Encoding') &&
            request.headers.get('Content-Type') === 'application/octet-stream',
            'Gửi tệp SGK gốc dưới dạng application/octet-stream.', 415);
        const stored = await env.BUCKET.put(key, request.body, {
            sha256: book.sha256,
            onlyIf: new Headers({'If-None-Match': '*'}),
            httpMetadata: {contentType: 'text/html; charset=utf-8'},
        });
        must(matchesBook(stored ?? await env.BUCKET.head(key), book),
            'Kho R2 chưa xác nhận dung lượng và SHA-256 của tệp.', 409);
        return response({...details, ready: true}, stored ? 201 : 200);
    } catch (error) {
        if (error instanceof UploadError) return response({error: error.message}, error.status);
        if (error instanceof Error && /checksum|sha-?256/i.test(error.message)) {
            return response({error: 'Nội dung tệp không khớp SHA-256 trong danh mục SGK.'}, 422);
        }
        console.error('SGK release failed', error instanceof Error ? error.name : typeof error);
        return response({error: 'Chưa xác nhận được tệp SGK trong R2.'}, 502);
    }
}
