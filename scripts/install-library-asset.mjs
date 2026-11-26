import {createHash, randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {constants, copyFile, mkdir, rename, rm, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import manifest from '../data/digital-library/large-assets.json' with {type: 'json'};

const root = fileURLToPath(new URL('../', import.meta.url));
const asset = manifest.sgk_offline;
const target = path.resolve(root, asset.path);

async function verify(file) {
    if ((await stat(file)).size !== asset.bytes) throw new Error('Dung lượng SGK offline không khớp danh mục.');
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    if (hash.digest('hex') !== asset.sha256) throw new Error('SHA-256 của SGK offline không khớp danh mục.');
}

try {
    const input = process.argv[2];
    if (!input || process.argv.length !== 3) throw new Error('Dùng npm run library:install-asset -- <đường dẫn tệp HTML SGK offline>.');
    const source = path.resolve(input);
    await verify(source);
    if (source !== target) {
        await mkdir(path.dirname(target), {recursive: true});
        const temporary = target + '.' + randomUUID() + '.tmp';
        try {
            await copyFile(source, temporary, constants.COPYFILE_EXCL);
            await verify(temporary);
            await rename(temporary, target);
        } finally {
            await rm(temporary, {force: true});
        }
    }
    console.log('SGK offline đã có đúng dung lượng và SHA-256.');
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
