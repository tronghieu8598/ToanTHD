'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type JsonRecord = Record<string, unknown>;
type ReleaseFile = { path: string; bytes: number; sha256: string; ready: boolean };
type Summary = { version: string; activeVersion: string | null; total: number; readyCount: number; ready: boolean };
type Release = Summary & { files: ReleaseFile[] };
type Selection = { name: string; byPath: Map<string, Blob> };
type Session = 'checking' | 'signin' | 'denied' | 'setup' | 'ready' | 'error';

const endpoint = '/api/teacher/library-release';
const versionPattern = /^[a-f0-9]{12,64}$/;
const hashPattern = /^[a-f0-9]{64}$/;
const sizeFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

class RequestError extends Error {
    constructor(readonly status: number, message: string) { super(message); }
}

async function requestJson(path: string, init?: RequestInit) {
    const response = await fetch(path, {
        ...init,
        cache: 'no-store',
        credentials: 'same-origin',
        signal: AbortSignal.timeout(init?.method === 'PUT' ? 180_000 : 60_000),
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
        const message = isRecord(data) && typeof data.error === 'string' ? data.error : `Máy chủ trả mã ${response.status}.`;
        throw new RequestError(response.status, message);
    }
    if (!isRecord(data)) throw new Error('Máy chủ trả dữ liệu không hợp lệ.');
    return data;
}

function readSummary(data: JsonRecord): Summary {
    const { version, activeVersion, total, readyCount, ready } = data;
    if (typeof version !== 'string' || !versionPattern.test(version) ||
        (activeVersion !== null && (typeof activeVersion !== 'string' || !versionPattern.test(activeVersion))) ||
        !isCount(total) || !total || !isCount(readyCount) || readyCount > total || ready !== (readyCount === total)) {
        throw new Error('Biên nhận học liệu thiếu phiên bản hoặc có số tệp sai.');
    }
    return { version, activeVersion, total, readyCount, ready };
}

async function readRelease(): Promise<Release> {
    const data = await requestJson(endpoint);
    const summary = readSummary(data);
    if (!Array.isArray(data.files) || data.files.length !== summary.total) throw new Error('Danh mục học liệu thiếu tệp.');
    const files = data.files.map((item: unknown): ReleaseFile => {
        if (!isRecord(item) || typeof item.path !== 'string' || !item.path || !isCount(item.bytes) || !item.bytes ||
            typeof item.sha256 !== 'string' || !hashPattern.test(item.sha256) || typeof item.ready !== 'boolean') {
            throw new Error('Danh mục học liệu có tệp thiếu thông tin.');
        }
        return { path: item.path, bytes: item.bytes, sha256: item.sha256, ready: item.ready };
    });
    if (new Set(files.map(file => file.path)).size !== files.length || files.filter(file => file.ready).length !== summary.readyCount) {
        throw new Error('Danh mục học liệu có tệp bị trùng hoặc có số tệp đã nhận sai.');
    }
    return { ...summary, files };
}

function prepareFolder(files: FileList, expected: ReleaseFile[]): Selection {
    const byPath = new Map<string, Blob>();
    const expectedByPath = new Map(expected.map(file => [file.path, file]));
    const name = files[0]?.webkitRelativePath.split('/')[0];
    if (!name) throw new Error('Hãy chọn thư mục đã giải nén có chứa các tệp trong gói học liệu.');
    for (const file of Array.from(files)) {
        const prefix = name + '/';
        const path = file.webkitRelativePath.startsWith(prefix) ? file.webkitRelativePath.slice(prefix.length) : '';
        const expectedFile = expectedByPath.get(path);
        if (!expectedFile || byPath.has(path)) throw new Error(`Tệp ngoài danh mục hoặc bị trùng · ${path || file.name}`);
        if (file.size !== expectedFile.bytes) throw new Error(`Sai dung lượng tệp · ${path}`);
        byPath.set(path, file);
    }
    const missing = expected.filter(file => !byPath.has(file.path));
    if (missing.length) throw new Error(`Thiếu ${missing.length} tệp, bắt đầu từ ${missing[0].path}.`);
    return { name, byPath };
}

async function prepareArchive(archive: File, expected: ReleaseFile[]): Promise<Selection> {
    const maxBytes = expected.reduce((total, file) => total + file.bytes, 0) + 1_000_000;
    if (archive.size > maxBytes) throw new Error('Tệp ZIP lớn hơn dung lượng của gói học liệu.');
    const expectedByPath = new Map(expected.map(file => [file.path, file.bytes]));
    const seen = new Set<string>();
    let invalid = '';
    const { unzipSync } = await import('fflate');
    const files = unzipSync(new Uint8Array(await archive.arrayBuffer()), {
        filter: entry => {
            const bytes = expectedByPath.get(entry.name);
            if (bytes !== entry.originalSize || seen.has(entry.name)) {
                invalid ||= entry.name;
                return false;
            }
            seen.add(entry.name);
            return true;
        },
    });
    if (invalid) throw new Error(`Tệp ZIP có mục sai dung lượng, trùng hoặc ngoài danh mục · ${invalid}`);
    const byPath = new Map<string, Blob>();
    for (const item of expected) {
        const bytes = files[item.path];
        if (!bytes || bytes.byteLength !== item.bytes) throw new Error(`Tệp ZIP thiếu dữ liệu khớp với ${item.path}.`);
        byPath.set(item.path, new Blob([new Uint8Array(bytes)], {type: 'application/octet-stream'}));
    }
    return {name: archive.name, byPath};
}

const isActive = (release: Summary) => release.activeVersion === release.version && release.ready;
const sizeLabel = (bytes: number) => bytes < 1_000_000 ? `${sizeFormat.format(bytes / 1000)} KB` : `${sizeFormat.format(bytes / 1_000_000)} MB`;

export default function LibraryReleasePanel() {
    const [session, setSession] = useState<Session>('checking');
    const [release, setRelease] = useState<Release | null>(null);
    const [selection, setSelection] = useState<Selection | null>(null);
    const [readyCount, setReadyCount] = useState(0);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const releasing = useRef(false);

    const checkSession = useCallback(async () => {
        setSession('checking');
        setError('');
        try {
            const { auth } = await requestJson('/api/teacher/bootstrap');
            if (!isRecord(auth) || auth.role !== 'admin') return setSession('denied');
            if (auth.custom_password !== true) return setSession('setup');
            const latest = await readRelease();
            setRelease(latest);
            setReadyCount(latest.readyCount);
            setSelection(null);
            setSession('ready');
        } catch (cause) {
            setSession(cause instanceof RequestError && cause.status === 401 ? 'signin' : 'error');
            if (!(cause instanceof RequestError && cause.status === 401) && cause instanceof Error) setError(cause.message);
        }
    }, []);
    useEffect(() => { void checkSession(); }, [checkSession]);

    function selectFolder(files: FileList | null) {
        setError('');
        setMessage('');
        setSelection(null);
        if (!release || !files?.length) return;
        try { setSelection(prepareFolder(files, release.files)); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Không đọc được thư mục học liệu.'); }
    }

    async function selectArchive(file?: File) {
        if (!release || !file) return;
        setSelection(null);
        setError('');
        setBusy(true);
        setMessage('Đang kiểm tra gói ZIP…');
        try { setSelection(await prepareArchive(file, release.files)); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Không đọc được gói ZIP.'); }
        finally { setBusy(false); setMessage(''); }
    }

    async function publish() {
        if (!release || releasing.current || session !== 'ready' || (!selection && !release.ready)) return;
        releasing.current = true;
        setBusy(true);
        setError('');
        setMessage('Đang kiểm tra các tệp trên kho…');
        let currentPath = '';
        try {
            const latest = await readRelease();
            if (latest.version !== release.version) throw new Error('Bản phát hành đã đổi. Kiểm tra lại phiên để lấy danh mục mới.');
            setRelease(latest);
            let verified = latest.readyCount;
            setReadyCount(verified);
            const headers = { 'X-ToanTHD-Library-Version': latest.version };
            for (const item of latest.files) {
                if (item.ready) continue;
                currentPath = item.path;
                const file = selection?.byPath.get(item.path);
                if (!file) throw new Error('Chọn lại gói học liệu để bổ sung tệp còn thiếu.');
                setMessage(`Đang nạp ${verified + 1}/${latest.total} · ${item.path}`);
                const result = await requestJson(`${endpoint}/files/${item.path.split('/').map(encodeURIComponent).join('/')}`, {
                    method: 'PUT',
                    headers: { ...headers, 'Content-Type': 'application/octet-stream' },
                    body: file,
                });
                if (result.ready !== true || result.version !== latest.version || result.path !== item.path ||
                    result.bytes !== item.bytes || result.sha256 !== item.sha256) {
                    throw new Error('Biên nhận tệp chưa khớp dung lượng và SHA-256.');
                }
                setReadyCount(++verified);
            }
            currentPath = '';
            setMessage('Đang kích hoạt và đối chiếu học liệu…');
            const receipt = await requestJson(endpoint + '/activate', { method: 'POST', headers });
            const summary = readSummary(receipt);
            if (!isActive(summary) || summary.version !== latest.version || summary.total !== latest.total || typeof receipt.replayed !== 'boolean') {
                throw new Error('Biên nhận kích hoạt chưa khớp bản học liệu đã nạp.');
            }
            const confirmed = await readRelease();
            if (!isActive(confirmed) || confirmed.version !== latest.version || confirmed.total !== latest.total) {
                throw new Error('Chưa đọc lại được bản học liệu vừa kích hoạt.');
            }
            setRelease(confirmed);
            setReadyCount(confirmed.readyCount);
            setMessage('Đã nạp, kích hoạt và đối chiếu đủ tệp học liệu.');
        } catch (cause) {
            const detail = cause instanceof Error ? cause.message : 'Máy chủ chưa phản hồi.';
            setError(currentPath ? `Dừng ở ${currentPath} · ${detail}` : detail);
            setMessage('');
            if (cause instanceof RequestError && cause.status === 401) setSession('signin');
        } finally {
            releasing.current = false;
            setBusy(false);
        }
    }

    return <main className="release-page">
        <a className="release-back" href="/">Toán THĐ Studio</a>
        <section className="release-card" aria-labelledby="release-heading">
            <h1 id="release-heading">Nạp học liệu</h1>
            {session === 'checking' && <p role="status">Đang kiểm tra phiên quản trị…</p>}
            {session !== 'checking' && session !== 'ready' && <>
                <p>{session === 'signin' ? 'Đăng nhập tài khoản quản trị Toán THĐ để nạp học liệu.'
                    : session === 'setup' ? 'Vào Cài đặt tài khoản trên Toán THĐ Studio để đặt mật khẩu quản trị riêng.'
                    : session === 'denied' ? 'Phiên hiện tại cần chuyển sang tài khoản quản trị.'
                    : 'Chưa tải được danh mục học liệu.'}</p>
                <div className="release-actions">
                    <a href="/" target="_blank" rel="noopener">Mở Toán THĐ Studio</a>
                    <button type="button" className="release-secondary" onClick={() => { void checkSession(); }}>Kiểm tra lại phiên</button>
                </div>
            </>}
            {session === 'ready' && release && <>
                <p>Bản học liệu <code>{release.version.slice(0, 12)}</code> · {release.total} tệp · {sizeLabel(release.files.reduce((total, file) => total + file.bytes, 0))}</p>
                {isActive(release) ? <p>Đang sử dụng bản này trong <a href="/hoc-lieu-so">kho học liệu</a>.</p> : <>
                    {!release.ready && <>
                        <label className="release-file-label" htmlFor="library-release-archive">Gói học liệu ZIP</label>
                        <input id="library-release-archive" className="release-file" type="file" accept=".zip,application/zip"
                            disabled={busy} onChange={event => void selectArchive(event.currentTarget.files?.[0])} />
                        <details>
                            <summary>Chọn thư mục đã giải nén</summary>
                            <label className="release-file-label" htmlFor="library-release-folder">Thư mục gói học liệu đã giải nén</label>
                            <input id="library-release-folder" className="release-file" type="file" {...{ webkitdirectory: '' }}
                                multiple disabled={busy} onChange={event => selectFolder(event.currentTarget.files)} />
                        </details>
                        {selection && <p>Đã kiểm tra đủ {selection.byPath.size} tệp trong <strong>{selection.name}</strong>.</p>}
                    </>}
                    <div className="release-actions">
                        <button type="button" onClick={() => { void publish(); }} disabled={busy || (!selection && !release.ready)}>
                            {busy ? 'Đang xử lý…' : release.ready ? 'Kích hoạt bản học liệu' : readyCount > 0 ? 'Tiếp tục nạp và kích hoạt' : 'Nạp và kích hoạt'}
                        </button>
                        {error && <button type="button" className="release-secondary" disabled={busy}
                            onClick={() => { void checkSession(); }}>Kiểm tra lại phiên</button>}
                    </div>
                </>}
                <div className="release-progress">
                    <progress max={release.total} value={readyCount} aria-label="Tệp học liệu đã đối chiếu" />
                    <span>{readyCount}/{release.total} tệp đã đối chiếu</span>
                </div>
            </>}
            {message && <p role="status">{message}</p>}
            {error && <p className="release-error" role="alert">{error}</p>}
        </section>
    </main>;
}
