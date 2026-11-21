'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ChapterScope = {
    code: string;
    grade: number;
    documentId: string;
    variantsVersion: string | null;
    lessons: { id: string; count: number }[];
};

type JsonRecord = Record<string, unknown>;
type Pack = { chapter: ChapterScope; body: string; questions: number; assets: number; sourceVersion: string };
type Batch = { name: string; source: string; packs: Pack[] };
type Receipt = { scope: string; questions: number; added: number; changed: number; unchanged: number; variants: number };
type Session = 'checking' | 'signin' | 'denied' | 'setup' | 'ready' | 'error';

const packLimit = 5_000_000;
const batchFormat = 'toanthd.bank-release-batch/1';
const packFormat = 'toanthd.bank-release/1';
const sha256Hex = /^[0-9a-f]{64}$/;
const numberFormat = new Intl.NumberFormat('vi-VN');
const order = [12, 10, 11];

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

class RequestError extends Error {
    constructor(readonly status: number, message: string) { super(message); }
}

async function requestJson(path: string, body?: string): Promise<JsonRecord> {
    const response = await fetch(`/api/teacher/${path}`, {
        cache: 'no-store',
        credentials: 'same-origin',
        signal: AbortSignal.timeout(60_000),
        ...(body !== undefined && { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }),
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
        throw new RequestError(response.status, isRecord(data) && typeof data.error === 'string'
            ? data.error : `Máy chủ trả mã ${response.status}.`);
    }
    if (!isRecord(data)) throw new Error('Máy chủ trả dữ liệu không hợp lệ.');
    return data;
}

async function prepareBatch(file: File, scopes: ChapterScope[]): Promise<Batch> {
    if (file.size > packLimit * scopes.length + 1024) throw new Error('Tệp ngân hàng vượt dung lượng cho phép.');
    let data: unknown;
    try { data = JSON.parse(await file.text()); }
    catch { throw new Error('Tệp ngân hàng không phải JSON hợp lệ.'); }
    if (!isRecord(data) || data.format !== batchFormat || !Array.isArray(data.packs) || !data.packs.length || data.packs.length > scopes.length) {
        throw new Error('Chọn tệp lô ngân hàng có định dạng toanthd.bank-release-batch/1.');
    }

    let source = '';
    const seen = new Set<string>();
    const chapterByCode = new Map(scopes.map(chapter => [chapter.code, chapter]));
    const packs = data.packs.map((pack: unknown, index): Pack => {
        if (!isRecord(pack) || pack.format !== packFormat || typeof pack.scope !== 'string') {
            throw new Error(`Gói thứ ${index + 1} không đúng định dạng chương.`);
        }
        const scope = pack.scope;
        const chapter = chapterByCode.get(scope);
        if (!chapter || seen.has(scope)) throw new Error(`${scope} bị trùng hoặc chưa được cấu hình.`);
        seen.add(scope);
        if (typeof pack.source_commit !== 'string' || !/^[a-f0-9]{40}$/.test(pack.source_commit) ||
            (source && source !== pack.source_commit) || typeof pack.source_version !== 'string' ||
            !/^[A-Za-z0-9+.-]{1,100}$/.test(pack.source_version)) {
            throw new Error(`${scope} có phiên bản nguồn không hợp lệ hoặc khác các chương trong lô.`);
        }
        source = pack.source_commit;
        if (pack.variants_version !== chapter.variantsVersion) throw new Error(`${scope} có phiên bản biến thể khác bản web.`);
        const docs = pack.documents;
        const document: unknown = Array.isArray(docs) ? docs[0] : null;
        if (!Array.isArray(docs) || docs.length !== 1 || !isRecord(document) || document.id !== chapter.documentId ||
            document.grade !== chapter.grade || document.is_sample !== 0 || (document.parent_id ?? null) !== null) {
            throw new Error(`${scope} có tài liệu ngoài phạm vi.`);
        }

        const expectedByLesson = new Map(chapter.lessons.map(({ id, count }) => [id, count]));
        const lessons = pack.lessons;
        const lessonIds = new Set<string>();
        if (!Array.isArray(lessons) || lessons.length !== chapter.lessons.length || lessons.some((lesson: unknown) => {
            if (!isRecord(lesson) || typeof lesson.id !== 'string' || lesson.document_id !== chapter.documentId ||
                !expectedByLesson.has(lesson.id) || lessonIds.has(lesson.id)) return true;
            lessonIds.add(lesson.id);
            return false;
        })) throw new Error(`${scope} có danh sách bài học sai phạm vi.`);

        const expectedQuestions = chapter.lessons.reduce((total, lesson) => total + lesson.count, 0);
        const questions = pack.questions;
        const questionIds = new Set<string>();
        if (!Array.isArray(questions) || questions.length !== expectedQuestions || questions.some((question: unknown) => {
            if (!isRecord(question) || typeof question.lesson_id !== 'string' || !isCount(question.original_number)) return true;
            const number = question.original_number;
            const lesson = question.lesson_id;
            const expectedId = `${lesson.slice(0, -3)}-q${String(number).padStart(3, '0')}-v4`;
            if (!number || number > (expectedByLesson.get(lesson) ?? 0) || question.id !== expectedId ||
                question.family_id !== expectedId || questionIds.has(expectedId)) return true;
            questionIds.add(expectedId);
            return false;
        })) throw new Error(`${scope} thiếu câu hỏi hoặc có mã câu sai phạm vi.`);

        const assets = pack.assets;
        if (!Array.isArray(assets)) throw new Error(`${scope} thiếu danh mục tệp hình.`);
        const body = JSON.stringify(pack);
        if (new TextEncoder().encode(body).length > packLimit) throw new Error(`${scope} vượt giới hạn 5 MB mỗi chương.`);
        return { chapter, body, questions: expectedQuestions, assets: assets.length, sourceVersion: pack.source_version };
    });
    packs.sort((a, b) => order.indexOf(a.chapter.grade) - order.indexOf(b.chapter.grade) || a.chapter.code.localeCompare(b.chapter.code));
    return { name: file.name, source, packs };
}

function readReceipt(data: JsonRecord, pack: Pack, source: string): Receipt {
    const { release, preview } = data;
    if (!isRecord(release) || !isRecord(preview) || release.scope !== pack.chapter.code ||
        release.source_commit !== source || release.source_version !== pack.sourceVersion ||
        release.variants_version !== pack.chapter.variantsVersion || release.questions !== pack.questions ||
        release.assets !== pack.assets || release.lessons !== pack.chapter.lessons.length || !isCount(release.variants) ||
        (pack.chapter.variantsVersion === null && release.variants !== 0) || !isCount(preview.added) ||
        !isCount(preview.changed) || !isCount(preview.unchanged) || preview.added + preview.changed + preview.unchanged !== pack.questions) {
        throw new Error('Biên nhận không khớp số liệu và phiên bản của gói đã chọn.');
    }
    return { scope: pack.chapter.code, questions: pack.questions, variants: release.variants,
        added: preview.added, changed: preview.changed, unchanged: preview.unchanged };
}

async function verifyBankCounts(batch: Batch, scopes: ChapterScope[]) {
    const totals: { label: string; count: number }[] = [];
    for (const grade of order) {
        const selected = batch.packs.filter(({ chapter }) => chapter.grade === grade);
        if (!selected.length) continue;
        const wholeGrade = selected.length === scopes.filter(chapter => chapter.grade === grade).length;
        const queries = wholeGrade ? [{ filters: { grade: String(grade) }, count: selected.reduce((sum, pack) => sum + pack.questions, 0) }]
            : selected.flatMap(({ chapter }) => chapter.lessons.map(({ id, count }) => ({ filters: { lesson_id: id }, count })));
        let verified = 0;
        for (const { filters, count } of queries) {
            const params = new URLSearchParams(filters);
            params.set('course', '1');
            const [active, archived] = await Promise.all([
                requestJson(`bank?${params}`), requestJson(`bank?${params}&archived=1`),
            ]);
            if (!isCount(active.total) || !isCount(archived.total) || active.total + archived.total !== count) {
                throw new Error(`Số câu đọc lại của ${params.get('lesson_id') ?? `khối ${grade}`} chưa khớp với gói.`);
            }
            verified += count;
        }
        totals.push({ label: wholeGrade ? `Toán ${grade}` : `Toán ${grade} · phần đã chọn`, count: verified });
    }
    return totals;
}

export default function ReleasePanel({ scopes }: { scopes: ChapterScope[] }) {
    const [session, setSession] = useState<Session>('checking');
    const [batch, setBatch] = useState<Batch | null>(null);
    const [reading, setReading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [totals, setTotals] = useState<{ label: string; count: number }[]>([]);
    const readingFile = useRef(0);
    const releasing = useRef(false);

    const checkSession = useCallback(async () => {
        setSession('checking');
        try {
            const { auth } = await requestJson('bootstrap');
            setSession(!isRecord(auth) || auth.role !== 'admin' ? 'denied' : auth.custom_password !== true ? 'setup' : 'ready');
        } catch (cause) {
            setSession(cause instanceof RequestError && cause.status === 401 ? 'signin' : 'error');
        }
    }, []);
    useEffect(() => { void checkSession(); }, [checkSession]);

    async function selectFile(file?: File) {
        const selection = ++readingFile.current;
        setBatch(null);
        setReceipts([]);
        setTotals([]);
        setProgress('');
        setError('');
        setReading(Boolean(file));
        if (!file) return;
        try {
            const next = await prepareBatch(file, scopes);
            if (readingFile.current === selection) setBatch(next);
        } catch (cause) {
            if (readingFile.current === selection) setError(cause instanceof Error ? cause.message : 'Không đọc được tệp.');
        } finally {
            if (readingFile.current === selection) setReading(false);
        }
    }

    async function releaseBatch() {
        if (!batch || session !== 'ready' || releasing.current) return;
        releasing.current = true;
        setBusy(true);
        setError('');
        let current = '';
        try {
            const verified = new Set(receipts.map(({ scope }) => scope));
            for (const pack of batch.packs) {
                current = pack.chapter.code;
                if (verified.has(current)) continue;
                setProgress(`Đang xem trước ${current}…`);
                const stage = await requestJson('bank-release/stage', pack.body);
                const preview = readReceipt(stage, pack, batch.source);
                if (typeof stage.digest !== 'string' || !sha256Hex.test(stage.digest) ||
                    typeof stage.release_digest !== 'string' || !sha256Hex.test(stage.release_digest)) {
                    throw new Error('Máy chủ chưa xác nhận phiên xem trước.');
                }

                setProgress(`Đang kích hoạt ${current} · ${preview.added} thêm, ${preview.changed} sửa, ${preview.unchanged} giữ nguyên…`);
                const body = JSON.stringify({ scope: current, digest: stage.digest });
                const activated = await requestJson('bank-release/activate', body);
                const receipt = readReceipt(activated, pack, batch.source);
                if (activated.release_digest !== stage.release_digest || activated.digest !== stage.digest ||
                    typeof activated.replayed !== 'boolean' || receipt.variants !== preview.variants) {
                    throw new Error('Biên nhận kích hoạt khác phiên xem trước.');
                }
                const replay = await requestJson('bank-release/activate', body);
                if (readReceipt(replay, pack, batch.source).variants !== receipt.variants ||
                    replay.release_digest !== stage.release_digest || replay.digest !== stage.digest || replay.replayed !== true) {
                    throw new Error('Chưa xác nhận được việc kiểm tra lại không tạo thêm dữ liệu.');
                }
                setReceipts(previous => [...previous, receipt]);
                verified.add(current);
            }
            current = '';
            setProgress('Đang đối chiếu số câu trên ngân hàng…');
            setTotals(await verifyBankCounts(batch, scopes));
            setProgress('Đã nạp đủ các chương đã chọn và đối chiếu biên nhận.');
        } catch (cause) {
            const message = cause instanceof Error ? cause.message : 'Máy chủ chưa phản hồi.';
            setError(`${current ? `Dừng ở ${current}` : 'Đối chiếu ngân hàng chưa xong'} · ${message}`);
            setProgress('');
            if (cause instanceof RequestError && cause.status === 401) setSession('signin');
        } finally {
            setBusy(false);
            releasing.current = false;
        }
    }

    return <main className="release-page">
        <a className="release-back" href="/">Toán THĐ Studio</a>
        <section className="release-card" aria-labelledby="release-heading">
            <h1 id="release-heading">Nạp ngân hàng câu hỏi</h1>
            {session === 'checking' && <p role="status">Đang kiểm tra phiên quản trị…</p>}
            {session !== 'checking' && session !== 'ready' && <>
                <p>{session === 'signin' ? 'Đăng nhập tài khoản quản trị Toán THĐ để nạp ngân hàng.'
                    : session === 'setup' ? 'Vào Cài đặt tài khoản trên Toán THĐ Studio để đặt mật khẩu quản trị riêng.'
                    : session === 'denied' ? 'Phiên hiện tại cần chuyển sang tài khoản quản trị.'
                    : 'Chưa kiểm tra được phiên quản trị. Thầy thử lại.'}</p>
                <div className="release-actions">
                    <a href="/" target="_blank" rel="noopener">Mở Toán THĐ Studio</a>
                    <button className="release-secondary" onClick={() => { void checkSession(); }}>Kiểm tra lại phiên</button>
                </div>
            </>}
            {session === 'ready' && <>
                <p>Chọn tệp JSON chứa các chương đã duyệt. Giữ trang mở cho đến khi đối chiếu xong.</p>
                <label className="release-file-label" htmlFor="release-file">Tệp gói ngân hàng</label>
                <input className="release-file" id="release-file" type="file" accept=".json,application/json" disabled={busy}
                    onChange={event => { void selectFile(event.currentTarget.files?.[0]); }} />
                {reading && <p role="status">Đang kiểm tra tệp…</p>}
                {batch && <>
                    <p><strong>{batch.packs.length}</strong> chương · <strong>{numberFormat.format(batch.packs.reduce((sum, pack) => sum + pack.questions, 0))}</strong> câu · Bản nguồn <code>{batch.source.slice(0, 8)}</code></p>
                    <div className="release-actions">
                        <button onClick={() => { void releaseBatch(); }} disabled={busy || totals.length > 0}>
                            {busy ? 'Đang xử lý…' : error && receipts.length ? 'Tiếp tục nạp và đối chiếu' : 'Nạp và đối chiếu'}
                        </button>
                    </div>
                </>}
            </>}
            {progress && <p role="status">{progress}</p>}
            {error && <p className="release-error" role="alert">{error}</p>}
            {batch && (busy || receipts.length > 0) && <div className="release-progress">
                <progress max={batch.packs.length} value={receipts.length} aria-label="Chương đã đối chiếu" />
                <span>{receipts.length}/{batch.packs.length} chương đã đối chiếu</span>
            </div>}
            {totals.length > 0 && <ul className="release-totals" aria-label="Số câu đọc lại từ ngân hàng">
                {totals.map(({ label, count }) => <li key={label}>{label} <strong>{numberFormat.format(count)} câu</strong></li>)}
            </ul>}
            {receipts.length > 0 && <div className="release-receipts">
                <table>
                    <caption>Biên nhận đã kiểm tra</caption>
                    <thead><tr><th scope="col">Chương</th><th scope="col">Số câu</th><th scope="col">Thêm</th><th scope="col">Sửa</th><th scope="col">Giữ nguyên</th><th scope="col">Biến thể</th></tr></thead>
                    <tbody>{receipts.map(receipt => <tr key={receipt.scope}>
                        <th scope="row">{receipt.scope}</th><td>{receipt.questions}</td><td>{receipt.added}</td>
                        <td>{receipt.changed}</td><td>{receipt.unchanged}</td><td>{receipt.variants}</td>
                    </tr>)}</tbody>
                </table>
            </div>}
        </section>
    </main>;
}
