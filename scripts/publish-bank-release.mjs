import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {bankReleaseChapters} from '../lib/bank-release-chapters.mjs';

const releaseRoute = '/api/teacher/bank-release/';

export async function openBankReleaseClient({origin, password, sitesToken}) {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
        throw new Error('Chỉ định đúng địa chỉ gốc HTTPS của bản cần nạp.');
    }
    if (typeof password !== 'string' || !password) throw new Error('Cần mật khẩu quản trị của bản đã chọn.');

    const siteHeaders = sitesToken ? {'OAI-Sites-Authorization': `Bearer ${sitesToken}`} : {};
    const request = (path, {method = 'GET', cookie, body} = {}) => {
        const target = new URL(path, url);
        if (target.origin !== url.origin) throw new Error('Yêu cầu vượt ngoài địa chỉ của bản đã chọn.');
        return fetch(target, {
            method,
            headers: {
                ...siteHeaders,
                ...(cookie && {Cookie: cookie}),
                ...(body != null && {Origin: url.origin, 'Content-Type': 'application/json'}),
            },
            body,
            redirect: 'error',
            signal: AbortSignal.timeout(60_000),
        });
    };
    const login = await request('/api/teacher/login', {
        method: 'POST', body: JSON.stringify({username: 'admin', password}),
    });
    const cookie = login.headers.getSetCookie().find(value => value.startsWith('toanthd_teacher='))?.split(';')[0];
    await login.body?.cancel();
    if (!login.ok || !cookie) throw new Error(`Đăng nhập quản trị thất bại (HTTP ${login.status}).`);

    return {
        async request(path, options) {
            return request(path, {cookie, ...options});
        },
        async release(action, body) {
            const response = await request(releaseRoute + action, {method: 'POST', cookie, body});
            const result = await response.json().catch(() => null);
            if (!response.ok || !result) {
                const message = typeof result?.error === 'string' ? ` ${result.error}` : '';
                throw new Error(`Bộ nạp trả về HTTP ${response.status}.${message}`);
            }
            return result;
        },
    };
}

export async function verifyBankReleaseAssets(client, pack) {
    if (!Array.isArray(pack?.assets)) throw new Error('Gói thiếu danh mục hình.');
    for (let start = 0; start < pack.assets.length; start += 8) {
        await Promise.all(pack.assets.slice(start, start + 8).map(async asset => {
            const name = /^\/(?:bank|variant)-assets\/([a-f0-9]{64})\.svg$/.exec(asset?.path);
            if (!name || name[1] !== asset.sha256 || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) {
                throw new Error('Danh mục có tệp hình không hợp lệ.');
            }
            const response = await client.request(asset.path);
            if (!response.ok || !response.headers.get('Content-Type')?.startsWith('image/svg+xml')) {
                await response.body?.cancel();
                throw new Error(`Tệp hình chưa có trên bản thử ${asset.path}.`);
            }
            const bytes = Buffer.from(await response.arrayBuffer());
            if (bytes.length !== asset.bytes || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) {
                throw new Error(`Tệp hình trên bản thử sai mã kiểm tra ${asset.path}.`);
            }
        }));
    }
}

export async function readReleaseCredentials() {
    const origin = process.env.TOANTHD_RELEASE_ORIGIN;
    if (origin) return {origin, password: process.env.TOANTHD_RELEASE_ADMIN_PASSWORD, sitesToken: process.env.TOANTHD_RELEASE_SITES_TOKEN};

    if (process.stdin.isTTY) {
        process.stderr.write('Đang đợi cấu hình HTTPS trên stdin (giá trị nhập được ẩn).\n');
        process.stdin.setRawMode(true);
    }
    try {
        const json = await new Promise((resolve, reject) => {
            let text = '';
            const finish = error => {
                process.stdin.off('data', receive);
                process.stdin.off('end', finish);
                process.stdin.pause();
                error ? reject(error) : resolve(text);
            };
            const receive = chunk => {
                text += chunk;
                if (text.includes('\u0003')) finish(new Error('Đã hủy nhập cấu hình.'));
                else if (text.length > 32_768) finish(new Error('Cấu hình vượt quá dung lượng cho phép.'));
                else if (/[\r\n]/.test(text)) finish();
            };
            process.stdin.setEncoding('utf8').on('data', receive).once('end', finish).resume();
        });
        return JSON.parse(json);
    } catch {
        throw new Error('Cần cấu hình JSON gồm origin, password và sitesToken nếu bản dùng Sites.');
    } finally {
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
    }
}

async function main(args) {
    const {values, positionals: [action, input, ...extra]} = parseArgs({
        args, options: {chapter: {type: 'string'}}, allowPositionals: true,
    });
    if (!['stage', 'activate'].includes(action) || !input || extra.length) {
        throw new Error('Cách dùng\n  node scripts/publish-bank-release.mjs stage <gói.json>\n  node scripts/publish-bank-release.mjs activate <sha256> [--chapter 12-C01|12-C06]');
    }
    const chapter = values.chapter;
    if (chapter && !Object.hasOwn(bankReleaseChapters, chapter)) throw new Error('Chương chưa có cấu hình phát hành.');
    if (action === 'activate' && !/^[a-f0-9]{64}$/.test(input)) throw new Error('Thiếu SHA-256 nhận được từ bước xem trước.');
    const body = action === 'stage' ? await readFile(input) : JSON.stringify({digest: input, scope: chapter});
    const pack = action === 'stage' ? JSON.parse(body) : null;
    if (pack && chapter && chapter !== pack.scope) throw new Error('Chương đã chọn khác với chương trong gói.');
    const client = await openBankReleaseClient(await readReleaseCredentials());
    if (pack) await verifyBankReleaseAssets(client, pack);
    console.log(JSON.stringify(await client.release(action, body), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main(process.argv.slice(2)).catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
