import {createHash} from 'node:crypto';
import {copyFile, mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {zipSync} from 'fflate';
import {libraryPath, validLibraryPath} from '../lib/library-http.mjs';

const root = path.resolve(import.meta.dirname, '..');
const sourceDir = 'data/digital-library/src';
const generatedDir = 'data/digital-library/generated';
const curated = 'library-item.json';
const kinds = new Set(['lesson', 'book', 'document', 'elearning', 'archive']);
const grades = [10, 11, 12];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const read = file => readFile(path.join(root, file));

function ensure(ok, message) {
    if (!ok) throw new Error(message);
}

async function* manifests(directory = sourceDir) {
    const entries = await readdir(path.join(root, directory), {withFileTypes: true});
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
        const file = directory + '/' + entry.name;
        if (entry.isDirectory()) yield* manifests(file);
        if (entry.isFile() && entry.name === curated) yield file;
    }
}

async function compile() {
    const curriculum = JSON.parse(await read('data/curriculum/kntt-math.json'));
    const edition = JSON.parse(await read('data/digital-library/catalog.json'));
    const original = new Map(edition.map(item => [item.id, item]));
    const observed = new Set(), releasePaths = new Set();
    const result = {items: {}, files: [], media: new Map()};
    for await (const file of manifests()) {
        const item = JSON.parse(await read(file));
        const folder = path.posix.dirname(file);
        const {format, id, kind, grade, chapterNumber, title, description, cover, preview, files} = item;
        ensure(format === 'toanthd.library-item/2' && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id)
            && !observed.has(id) && original.has(id), file + ' · Mã học liệu thiếu, sai hoặc trùng.');
        const gradeFolder = grade === null ? 'chung' : String(grade);
        const chapterFolder = chapterNumber === null ? 'chung' : 'C' + String(chapterNumber).padStart(2, '0');
        ensure(folder === `${sourceDir}/${gradeFolder}/${chapterFolder}/${id}`
            && (grade === null || grades.includes(grade))
            && (chapterNumber === null || (Number.isInteger(chapterNumber)
                && chapterNumber >= 1 && curriculum[grade]?.[chapterNumber - 1])),
        file + ' · Sai thư mục khối/chương theo mục lục.');
        ensure(kinds.has(kind) && kind === original.get(id).kind && grade === original.get(id).grade
            && typeof title === 'string' && title.trim() === title && title.length >= 1 && title.length <= 180
            && typeof description === 'string' && description.length <= 1000, file + ' · Sai thông tin học liệu.');
        observed.add(id);
        const card = {title, description, ...(chapterNumber !== null && {chapterNumber})};
        ensure(typeof cover === 'string' && (/^\/studio\/covers\/[a-z0-9-]+\.jpg$/.test(cover) || cover === 'cover.jpg'),
            file + ' · Sai đường dẫn bìa JPG.');
        const poster = await read(cover.startsWith('/') ? 'public' + cover : folder + '/' + cover);
        ensure(poster.length >= 4 && poster.length <= 2_000_000 && poster[0] === 255
            && poster[1] === 216 && poster.at(-2) === 255 && poster.at(-1) === 217,
        file + ' · Bìa phải là ảnh JPEG dưới 2 MB.');
        card.cover = cover;
        if (cover === 'cover.jpg') {
            card.cover = `/studio/covers/${id}-${sha256(poster).slice(0, 12)}.jpg`;
            result.media.set('public' + card.cover, poster);
        }
        if (preview) {
            const {durationSeconds, filename} = preview;
            ensure(Number.isFinite(durationSeconds) && durationSeconds >= 5 && durationSeconds <= 10
                && filename === 'preview.mp4', file + ' · Đoạn xem trước phải là MP4 từ 5 đến 10 giây.');
            const clip = await read(folder + '/' + filename);
            ensure(clip.length >= 12 && clip.length <= 2_000_000 && clip.toString('ascii', 4, 8) === 'ftyp',
                file + ' · Đoạn xem trước phải là MP4 dưới 2 MB.');
            card.preview = {durationSeconds, src: `/studio/previews/${id}-${sha256(clip).slice(0, 12)}.mp4`};
            result.media.set('public' + card.preview.src, clip);
        }
        result.items[id] = card;
        ensure(Array.isArray(files), file + ' · Thiếu danh sách tệp nguồn.');
        const entry = original.get(id).url.slice(libraryPath.length);
        for (const relative of files) {
            ensure(typeof relative === 'string' && validLibraryPath(relative) && !relative.startsWith('/')
                && /^[a-z0-9_.\/-]+$/i.test(relative) && !relative.includes('//')
                && !releasePaths.has(relative) && (relative === entry
                    || (entry.endsWith('/index.html') && relative.startsWith(entry.slice(0, -'index.html'.length)))),
            file + ' · Đường dẫn tệp sai phạm vi hoặc trùng: ' + relative);
            const bytes = await read('public' + libraryPath + relative);
            if (relative === entry) {
                ensure(bytes.length === original.get(id).bytes, file + ' · Dung lượng tệp gốc khác danh mục.');
            }
            result.files.push({path: relative, bytes: bytes.length, sha256: sha256(bytes)});
            releasePaths.add(relative);
        }
        ensure(!files.length || files.includes(entry), file + ' · Gói thiếu tệp mở học liệu.');
    }
    ensure(observed.size === original.size, 'Có học liệu chưa có tệp nguồn riêng.');
    const resources = edition.filter(item => releasePaths.has(item.url.slice(libraryPath.length)));
    const payload = {resources, files: result.files};
    const release = {format: 'toanthd.library-release/1', version: sha256(json(payload)).slice(0, 16), ...payload};
    result.media.set(generatedDir + '/items.json', json(result.items));
    result.media.set(generatedDir + '/library-release.json', json(release));
    return {release, outputs: result.media};
}

const {positionals, values} = parseArgs({allowPositionals: true, options: {out: {type: 'string'}}});
const [command = 'check'] = positionals;
ensure(positionals.length <= 1 && ['build', 'check', 'stage'].includes(command), 'Dùng library-catalog.mjs build|check|stage.');
const {release, outputs} = await compile();
for (const [file, bytes] of outputs) {
    if (command === 'build') {
        await mkdir(path.dirname(path.join(root, file)), {recursive: true});
        await writeFile(path.join(root, file), bytes);
    } else {
        const installed = await read(file).catch(() => null);
        ensure(installed?.equals(bytes), file + ' chưa đồng bộ. Chạy npm run library:build.');
    }
}
if (command === 'stage') {
    ensure(values.out, 'Thêm --out <thư mục bàn giao>.');
    const output = path.resolve(values.out, 'hoc-lieu-' + release.version);
    const zipEntries = {};
    for (const file of release.files) {
        const dest = path.join(output, file.path);
        await mkdir(path.dirname(dest), {recursive: true});
        await copyFile(path.join(root, 'public' + libraryPath + file.path), dest);
        zipEntries[file.path] = await readFile(dest);
    }
    await writeFile(output + '.zip', zipSync(zipEntries));
    console.log(output);
    console.log(output + '.zip');
}
console.log(`${release.version} · ${release.resources.length} học liệu · ${release.files.length} tệp nguồn`);
