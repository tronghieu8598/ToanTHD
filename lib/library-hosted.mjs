import {libraryPath, libraryContentType, parseLibraryRange, validLibraryPath} from './library-http.mjs';

// Only published standard resources use this prefix. Teacher uploads stay behind their own API.
export const publishedLibraryPrefix = 'library/';

export async function serveHostedLibrary(request, bucket) {
    const error = (status, headers = {}) => new Response(null, {status, headers: {'Cache-Control': 'no-store', ...headers}});
    if (!['GET', 'HEAD'].includes(request.method)) return error(405, {Allow: 'GET, HEAD'});

    const pathname = new URL(request.url).pathname;
    if (!pathname.startsWith(libraryPath)) return error(404);
    let relative;
    try { relative = decodeURIComponent(pathname.slice(libraryPath.length)); }
    catch { return error(400); }
    if (!validLibraryPath(relative) || relative.split('/').some(segment => !segment)) return error(400);

    const key = publishedLibraryPrefix + relative;
    const object = await bucket.head(key);
    if (!object) return error(404);
    const contentType = libraryContentType(relative);
    const lastModified = object.uploaded.toUTCString();
    const headers = new Headers({
        'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff', ETag: object.httpEtag,
        'Last-Modified': lastModified, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
    });
    if (contentType.startsWith('text/html')) {
        headers.set('Content-Security-Policy', "sandbox allow-scripts allow-forms allow-modals allow-downloads allow-pointer-lock; base-uri 'none'; object-src 'none'; frame-ancestors 'self'");
    }
    if (contentType === 'application/zip') headers.set('Content-Disposition', 'attachment');

    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch?.split(',').some(tag => ['*', object.httpEtag].includes(tag.trim().replace(/^W\//, '')))) {
        return new Response(null, {status: 304, headers});
    }
    const rangeHeader = request.headers.get('Range');
    const ifRange = request.headers.get('If-Range');
    let range;
    if (rangeHeader && (!ifRange || ifRange === object.httpEtag || ifRange === lastModified)) {
        const parsed = parseLibraryRange(rangeHeader, object.size);
        if (!parsed) return error(416, {'Content-Range': 'bytes */' + object.size});
        const {start, end} = parsed;
        range = {offset: start, length: end - start + 1};
        headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
    }
    headers.set('Content-Length', String(range?.length ?? object.size));
    const status = range ? 206 : 200;
    if (request.method === 'HEAD') return new Response(null, {status, headers});

    const result = await bucket.get(key, {onlyIf: {etagMatches: object.etag}, ...(range && {range})});
    if (!result) return error(404);
    if (!('body' in result)) return error(412);
    return new Response(result.body, {status, headers});
}
