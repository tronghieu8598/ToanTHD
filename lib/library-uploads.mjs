import curriculum from '../data/curriculum/kntt-math.json' with {type: 'json'};
import {can} from './access.mjs';

const fileLimit = 5_000_000;
const chunkSize = 250_000;
const routes = new Set(['teacher/library', 'teacher/library/file', 'teacher/library/change']);
const mediaTypes = {html: 'text/html', htm: 'text/html', pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', zip: 'application/zip'};
const uploadId = /^upload-[0-9a-f-]{36}$/;
const shared = 'team', personal = 'private';
const columns = 'u.*, a.display_name';
const tables = 'library_uploads u LEFT JOIN teacher_accounts a ON a.id=u.owner_key';
const isVisibility = value => value === personal || value === shared;
const textDecoder = new TextDecoder('utf-8', {fatal: true});

function decodeHeader(request, header) {
    try { return decodeURIComponent(request.headers.get(header) || ''); }
    catch { return ''; }
}

async function readFile(request, must) {
    const length = Number(request.headers.get('content-length') || 0);
    must(Number.isFinite(length) && length <= fileLimit, 'Tệp vượt quá 5 MB.', 413);
    must(request.body, 'Chọn tệp học liệu.');
    const reader = request.body.getReader();
    const bytes = new Uint8Array(fileLimit);
    let offset = 0;
    try {
        for (;;) {
            const {done, value} = await reader.read();
            if (done) break;
            if (offset + value.length > fileLimit) {
                await reader.cancel().catch(() => {});
                must(false, 'Tệp vượt quá 5 MB.', 413);
            }
            bytes.set(value, offset);
            offset += value.length;
        }
    } finally {
        reader.releaseLock();
    }
    must(offset > 0, 'Tệp đang trống.');
    return bytes.subarray(0, offset);
}

function matchesFormat(bytes, mime) {
    const starts = (signature, offset = 0) => signature.every((value, i) => value === bytes[i + offset]);
    const ascii = (value, offset) => starts(Array.from(value, c => c.charCodeAt(0)), offset);
    if (mime === 'application/pdf') return ascii('%PDF-');
    if (mime === 'image/jpeg') return starts([0xff, 0xd8, 0xff]);
    if (mime === 'image/png') return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (mime === 'image/webp') return ascii('RIFF') && ascii('WEBP', 8);
    if (mime === 'application/zip') return starts([0x50, 0x4b, 0x03, 0x04]) || starts([0x50, 0x4b, 0x05, 0x06]);
    if (mime === 'text/html') {
        try {
            const text = textDecoder.decode(bytes);
            return !text.includes('\0') && /^\s*(?:<!--[\s\S]*?-->\s*)*(?:<!doctype\s+html\b|<html[\s>]|<head[\s>]|<body[\s>])/i.test(text);
        } catch { return false; }
    }
    return false;
}

function encodeChunk(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
}

function describe(row, actor, isAdmin) {
    const url = '/api/teacher/library/file?id=' + row.id;
    return {
        id: row.id, title: row.title, grade: row.grade, grades: [row.grade],
        chapterNumber: row.chapter_number, chapter: `C${row.chapter_number} - ${curriculum[row.grade][row.chapter_number - 1]}`,
        kind: row.mime === 'text/html' ? 'lesson' : row.mime === 'application/zip' ? 'archive' : 'document',
        url, sourcePath: row.filename, bytes: row.byte_length, offline: true, description: '',
        ...(row.mime.startsWith('image/') && !row.deleted_at ? {cover: url} : {}),
        upload: {
            visibility: row.visibility, owned: row.owner_key === actor,
            canManage: row.owner_key === actor || isAdmin && row.visibility === shared,
            ownerName: row.display_name || (row.owner_key === 'admin' ? 'Quản trị' : 'Giáo viên'),
            filename: row.filename, mime: row.mime, deletedAt: row.deleted_at, revision: row.revision,
            restorePrivate: !isAdmin && row.deleted_by === 'admin',
        },
    };
}

export async function handleLibraryUploads(path, request, ctx) {
    if (!routes.has(path)) return null;
    const {auth, authTools, database, all, first, must, json, readBody} = ctx;
    const url = new URL(request.url), method = request.method;
    const isAdmin = auth.role === 'admin', actor = isAdmin ? 'admin' : auth.id;
    if (auth.role === 'demo' && path === 'teacher/library' && method === 'GET') return json({items: []});
    must(isAdmin || auth.role === 'teacher', 'Đăng nhập tài khoản của tổ để dùng học liệu đăng tải.', 403);

    if (path === 'teacher/library' && method === 'GET') {
        const rows = await all(`SELECT ${columns} FROM ${tables}
            WHERE u.owner_key=? OR (u.visibility='team' AND (u.deleted_at IS NULL OR ?=1))
            ORDER BY u.created_at DESC`, actor, isAdmin ? 1 : 0);
        return json({items: rows.map(row => describe(row, actor, isAdmin))});
    }

    if (path === 'teacher/library/file' && ['GET', 'HEAD'].includes(method)) {
        const id = url.searchParams.get('id') || '';
        const unavailable = 'Không tìm thấy học liệu hoặc tài khoản chưa có quyền xem.';
        must(uploadId.test(id), unavailable, 404);
        const row = await first(`SELECT mime,filename,byte_length,revision FROM library_uploads
            WHERE id=? AND deleted_at IS NULL AND (visibility='team' OR owner_key=?)`, id, actor);
        must(row, unavailable, 404);
        const attachment = row.mime === 'application/zip' || url.searchParams.get('download') === '1';
        const headers = {
            'Content-Type': row.mime + (row.mime === 'text/html' ? '; charset=utf-8' : ''),
            'Content-Length': String(row.byte_length),
            'Content-Disposition': `${attachment ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(row.filename).replace(/[!'()*]/g, char => '%' + char.charCodeAt(0).toString(16))}`,
            'Cache-Control': 'private, no-store',
            'Cross-Origin-Resource-Policy': 'same-origin',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer',
            'Content-Security-Policy': row.mime === 'text/html'
                ? "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; form-action 'none'; base-uri 'none'; frame-ancestors 'self'"
                : "frame-ancestors 'self'; object-src 'none'; base-uri 'none'",
        };
        if (method === 'HEAD') return new Response(null, {headers});
        const chunks = await all(`SELECT c.data FROM library_upload_chunks c JOIN library_uploads u ON u.id=c.upload_id
            WHERE c.upload_id=? AND u.revision=? AND u.deleted_at IS NULL AND (u.visibility='team' OR u.owner_key=?)
            ORDER BY c.position`, id, row.revision, actor);
        must(chunks.length, unavailable, 404);
        const bytes = new Uint8Array(row.byte_length);
        let offset = 0;
        for (const chunk of chunks) {
            const binary = atob(chunk.data);
            for (let i = 0; i < binary.length; i++) bytes[offset++] = binary.charCodeAt(i);
        }
        must(offset === bytes.length, 'Tệp lưu trữ chưa đầy đủ.', 500);
        return new Response(bytes, {headers});
    }

    must(method === 'POST' && path !== 'teacher/library/file', 'Phương thức không được hỗ trợ.', 405);
    await authTools.requireReal(auth);
    if (path === 'teacher/library') {
        must(can(auth, 'upload_library'), 'Tài khoản chưa có quyền đăng học liệu.', 403);
        const grade = Number(url.searchParams.get('grade'));
        const chapter = Number(url.searchParams.get('chapter'));
        const visibility = url.searchParams.get('visibility');
        must([10,11,12].includes(grade) && Number.isInteger(chapter) && chapter >= 1 && chapter <= curriculum[grade].length, 'Chọn khối và chương hợp lệ.');
        must(isVisibility(visibility), 'Chọn phạm vi xem học liệu.');
        const title = decodeHeader(request, 'x-title').trim();
        const filename = decodeHeader(request, 'x-file-name').trim();
        must(title.length >= 1 && title.length <= 160 && !/[\u0000-\u001f\u007f]/.test(title), 'Tên học liệu cần từ 1 đến 160 ký tự.');
        must(filename.length >= 1 && filename.length <= 180 && !/[/\\\u0000-\u001f\u007f]/.test(filename), 'Tên tệp không hợp lệ.');
        const mime = mediaTypes[filename.split('.').pop()?.toLowerCase()];
        must(typeof mime === 'string', 'Chỉ nhận HTML, PDF, JPG, PNG, WebP hoặc ZIP.', 415);
        const bytes = await readFile(request, must);
        must(matchesFormat(bytes, mime), 'Tệp không khớp định dạng. Với HTML, dùng một tệp UTF-8 độc lập.', 415);
        const id = 'upload-' + crypto.randomUUID(), db = database();
        const save = db.prepare(`INSERT INTO library_uploads
            (id,owner_key,title,grade,chapter_number,visibility,mime,filename,byte_length,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id, actor, title, grade, chapter, visibility, mime, filename, bytes.length, Date.now());
        const statements = [save];
        for (let i = 0; i < bytes.length; i += chunkSize) {
            statements.push(db.prepare('INSERT INTO library_upload_chunks(upload_id,position,data) VALUES (?,?,?)')
                .bind(id, i / chunkSize, encodeChunk(bytes.subarray(i, i + chunkSize))));
        }
        await db.batch(statements);
        return json({item: describe(await first(`SELECT ${columns} FROM ${tables} WHERE u.id=?`, id), actor, isAdmin)}, 201);
    }

    const body = await readBody(request, 2048);
    must(typeof body.id === 'string' && uploadId.test(body.id), 'Không tìm thấy học liệu.', 404);
    const row = await first('SELECT * FROM library_uploads WHERE id=?', body.id);
    const own = row?.owner_key === actor;
    must(row && (own || isAdmin && row.visibility === shared), 'Không tìm thấy học liệu hoặc tài khoản chưa có quyền quản lý.', 404);
    must(row.revision === body.revision, 'Học liệu vừa được cập nhật. Hãy tải lại kho.', 409);
    let visibility = row.visibility, deletedAt = row.deleted_at, deletedBy = row.deleted_by;
    if (body.action === 'visibility') {
        must(own && !deletedAt, 'Chỉ chủ học liệu có thể đổi phạm vi chia sẻ khi tệp còn trong kho.', 403);
        must(isVisibility(body.visibility), 'Chọn phạm vi xem học liệu.');
        visibility = body.visibility;
    } else if (body.action === 'trash') {
        must(!deletedAt, 'Học liệu đã ở trong Thùng rác.', 409);
        deletedAt = Date.now();
        deletedBy = actor;
    } else if (body.action === 'restore') {
        must(deletedAt, 'Học liệu không ở trong Thùng rác.', 409);
        if (!isAdmin && deletedBy === 'admin') visibility = personal;
        deletedAt = null;
        deletedBy = null;
    } else must(false, 'Thao tác học liệu không hợp lệ.');
    const result = await database().prepare(`UPDATE library_uploads SET visibility=?,deleted_at=?,deleted_by=?,revision=revision+1
        WHERE id=? AND revision=?`).bind(visibility, deletedAt, deletedBy, row.id, row.revision).run();
    must(result.meta?.changes === 1, 'Học liệu vừa được cập nhật. Hãy tải lại kho.', 409);
    return json({item: describe(await first(`SELECT ${columns} FROM ${tables} WHERE u.id=?`, row.id), actor, isAdmin)});
}
