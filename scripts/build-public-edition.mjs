import {createHash} from 'node:crypto';
import {lstat, mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import {isIP} from 'node:net';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const approvalFile = path.join(root, 'public-edition', 'approvals.json');
const sourceDir = path.join(root, 'public-edition', 'site');
const mediaDir = path.join(root, 'public', 'studio');
const shellFiles = ['index.html', 'library.css', 'library.js'];
const validSha = /^[a-f0-9]{64}$/;
const itemId = /^[a-z0-9][a-z0-9-]{0,127}$/;
const restrictedHost = /(?:^|\.)(?:localhost|local|internal|test|invalid)$/i;
const sensitiveQuery = /^(?:token|auth|access_token|key|signature|sig|x-amz-.+|x-goog-.+)$/i;
const combinedBookId = 'all-sgk-offline-hki-bdbc394';
const splitBooks = [10, 11, 12].map(grade => ({
    id: `${grade}-sgk-toan-tap-1`, title: `SGK Toán ${grade} · Tập 1`, grades: [grade],
}));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const populated = value => typeof value === 'string' && value.trim().length > 0;

function check(condition, message) {
    if (!condition) throw new Error(message);
}

function hasFields(value, required, optional = []) {
    return value && typeof value === 'object' && !Array.isArray(value)
        && required.every(field => Object.hasOwn(value, field))
        && Object.keys(value).every(field => required.includes(field) || optional.includes(field));
}

function checkApproval(approval, id) {
    check(hasFields(approval, ['by', 'date', 'evidence'])
        && populated(approval.by) && populated(approval.evidence)
        && typeof approval.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(approval.date)
        && new Date(approval.date + 'T00:00:00Z').toJSON()?.slice(0, 10) === approval.date,
    `Thiếu người duyệt, ngày duyệt hoặc căn cứ của ${id}.`);
}

function officialLink(official, id) {
    check(hasFields(official, ['url', 'host']) && populated(official.url) && populated(official.host),
        `Thiếu nguồn HTTPS chính thức của ${id}.`);
    let link;
    try { link = new URL(official.url); }
    catch { throw new Error(`Địa chỉ nguồn của ${id} không hợp lệ.`); }
    const hostname = link.hostname.toLowerCase();
    check(link.protocol === 'https:' && !link.username && !link.password && !link.port
        && hostname === official.host && hostname.includes('.') && !hostname.endsWith('.')
        && !isIP(hostname.replace(/^\[|\]$/g, '')) && !restrictedHost.test(hostname)
        && !(hostname.endsWith('.chatgpt.site') && hostname.startsWith('toan-thd-thu-'))
        && ![...link.searchParams.keys()].some(key => sensitiveQuery.test(key))
        && !(hostname === 'github.com' && /^\/tronghieu8598\/toanthd(?:\/|$)/i.test(link.pathname)),
    `Nguồn của ${id} phải là liên kết HTTPS chính thức đã duyệt, truy cập được ngoài hệ thống nội bộ.`);
    return link.href;
}

async function readMedia(permission, source, kind, id) {
    check(hasFields(permission, ['sha256', 'evidence'])
        && typeof permission.sha256 === 'string' && validSha.test(permission.sha256)
        && populated(permission.evidence), `Thiếu SHA-256 hoặc căn cứ công bố ${kind} của ${id}.`);
    const folder = kind === 'cover' ? 'covers' : 'previews';
    const extension = kind === 'cover' ? 'jpg' : 'mp4';
    const pattern = new RegExp(`^/studio/${folder}/[a-z0-9-]+\\.${extension}$`);
    check(typeof source === 'string' && pattern.test(source), `Danh mục chưa có ${kind} hợp lệ cho ${id}.`);
    const requested = path.join(mediaDir, folder, path.posix.basename(source));
    const stat = await lstat(requested);
    check(stat.isFile() && stat.size > 8 && stat.size <= 2_000_000
        && path.dirname(await realpath(requested)) === path.join(await realpath(mediaDir), folder),
    `Tệp ${kind} của ${id} nằm ngoài đúng thư mục hoặc vượt dung lượng.`);
    const bytes = await readFile(requested);
    const signatureOk = kind === 'cover' ? bytes.readUInt16BE(0) === 0xffd8
        : bytes.toString('ascii', 4, 8) === 'ftyp';
    check(signatureOk && sha256(bytes) === permission.sha256,
        `Tệp ${kind} của ${id} khác phiên bản đã duyệt.`);
    return {name: `${id}-${kind}-${permission.sha256.slice(0, 12)}.${extension}`, bytes};
}

export async function planPublicEdition(approvals) {
    check(hasFields(approvals, ['format', 'approved']) && approvals.format === 'toanthd.public-approvals/1'
        && Array.isArray(approvals.approved), 'Danh sách duyệt công khai sai định dạng.');
    const [sourceCatalog, cards, math] = await Promise.all([
        readJson(path.join(root, 'data', 'digital-library', 'catalog.json')),
        readJson(path.join(root, 'data', 'digital-library', 'generated', 'items.json')),
        readJson(path.join(root, 'data', 'curriculum', 'kntt-math.json')),
    ]);
    const originals = new Map([...sourceCatalog.filter(item => item.id !== combinedBookId), ...splitBooks]
        .map(item => [item.id, item]));
    const used = new Set();
    const items = [];
    const media = [];
    for (const entry of approvals.approved) {
        check(hasFields(entry, ['id', 'approval', 'official'], ['cover', 'preview'])
            && typeof entry.id === 'string' && itemId.test(entry.id) && !used.has(entry.id),
        'Mỗi mục duyệt cần một mã duy nhất và đúng trường dữ liệu.');
        const {id} = entry;
        used.add(id);
        const original = originals.get(id);
        const card = cards[id] ?? original;
        check(original,
            `Mã ${id} chưa có trong danh mục bài được hỗ trợ cho đợt công khai này.`);
        checkApproval(entry.approval, id);
        const publicItem = {
            id,
            title: card.title,
            description: card.description || original.description || '',
            grades: original.grades,
            chapter: card.chapterNumber ?? null,
            href: officialLink(entry.official, id),
        };
        for (const kind of ['cover', 'preview']) {
            if (!Object.hasOwn(entry, kind)) continue;
            const source = kind === 'cover' ? card.cover : card.preview?.src;
            const file = await readMedia(entry[kind], source, kind, id);
            media.push(file);
            publicItem[kind] = 'media/' + file.name;
        }
        items.push(publicItem);
    }
    return {catalog: {chapters: math, items}, media};
}

export async function buildPublicEdition({out, approvals = approvalFile, preview = false}) {
    const {catalog, media} = await planPublicEdition(await readJson(approvals));
    check(preview || catalog.items.length, 'Chưa có học liệu được duyệt công khai. Dùng --preview để xem giao diện.');
    const destination = path.resolve(out);
    const parent = await realpath(path.dirname(destination));
    const relativeToAppPublic = path.relative(await realpath(path.join(root, 'public')), parent);
    check(path.isAbsolute(relativeToAppPublic) || relativeToAppPublic === '..'
        || relativeToAppPublic.startsWith('..' + path.sep),
    'Đặt đầu ra bên ngoài thư mục public của ứng dụng nội bộ.');
    const shell = new Map(await Promise.all(shellFiles.map(async file => [file, await readFile(path.join(sourceDir, file), 'utf8')])));
    await mkdir(destination);
    if (media.length) await mkdir(path.join(destination, 'media'));
    await Promise.all([
        writeFile(path.join(destination, 'catalog.js'), `window.toanThdPublicCatalog = ${JSON.stringify(catalog)};\n`, {flag: 'wx'}),
        ...media.map(file => writeFile(path.join(destination, 'media', file.name), file.bytes, {flag: 'wx'})),
        ...shellFiles.filter(file => file !== 'index.html')
            .map(file => writeFile(path.join(destination, file), shell.get(file), {flag: 'wx'})),
    ]);
    const index = shell.get('index.html').replace('<!-- ROBOTS -->', preview ? '<meta name="robots" content="noindex">' : '');
    await writeFile(path.join(destination, 'index.html'), index, {flag: 'wx'});
    return {directory: destination, items: catalog.items.length, media: media.length, preview};
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
    try {
        const {values} = parseArgs({options: {out: {type: 'string'}, approvals: {type: 'string'}, preview: {type: 'boolean'}}});
        check(values.out, 'Dùng --out <thư mục mới> và thêm --preview khi thử giao diện.');
        console.log(await buildPublicEdition(values));
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
