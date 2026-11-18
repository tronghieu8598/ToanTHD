export const libraryPath = '/hoc-lieu-so/nguon/';

const types = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav', '.mp4': 'video/mp4', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.zip': 'application/zip',
};

export function libraryContentType(filename) {
    const extension = filename.match(/\.[a-z0-9]+$/i)?.[0].toLowerCase();
    return types[extension] || 'application/octet-stream';
}

export function validLibraryPath(relative) {
    return !!relative && !relative.split('/').some(segment => segment.startsWith('.')) && !/[\\\u0000-\u001f\u007f:]/.test(relative);
}

export function parseLibraryRange(header, size) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(header);
    if (!match || !match[1] && !match[2]) return null;
    let start = 0, end = size - 1;
    if (match[1]) {
        start = Number(match[1]);
        if (match[2]) end = Math.min(end, Number(match[2]));
    } else start = Math.max(0, size - Number(match[2]));
    return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < size
        ? { start, end } : null;
}
