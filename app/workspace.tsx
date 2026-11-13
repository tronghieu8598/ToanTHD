'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, LayoutDashboard, Library, Users, ClipboardList, ArrowUpRight, ArrowRight, Plus, Check, CheckCircle2, ChevronDown, Search, Clock, Monitor, GraduationCap, Download, Info, Wifi, FileText, X, Copy, Eye, ShieldCheck, RotateCw, AlertCircle, HelpCircle, Sparkles, ArrowUpDown, ClockPlus, SlidersHorizontal, Ellipsis, ListChecks } from 'lucide-react';
import { answeredCount } from '../lib/grading.mjs';
import { canAutoGrade, canEnterSession } from '../lib/course-bank.mjs';
import { DocumentsPanel, ClassesPanel, SettingsPanel, QuestionEditor, HistoryDialog, ImportDialog, downloadBank, adminApi } from './admin-panels';
import { AccountsPanel, SavedExamsPanel, StaffSettings } from './staff-panels';
import { Pencil, History as HistoryIcon, Archive as ArchiveIcon, Settings as SettingsIcon, Upload } from 'lucide-react';
import { NetworkPanel, ShareDialog } from './lan-panels';
import { createAttemptSync, readPending } from '../lib/client/attempt-sync.mjs';
import { ReportPanel } from './report-panels';
import { BackupPanel } from './backup-panel';
import { Rich } from './rich-content';
import DigitalLibrary from './digital-library';
import { BookText } from 'lucide-react';
import { StudioNavigation, type NavigationItem } from './studio-navigation';
import { StudioPlanDialog, StudioToday, useStudioPlan } from './studio-plan';
import { useLibraryUploads } from './library-uploads';
import { chapterRoman, mathChapters, type LibraryResource, type MathGrade, type ResourceKind } from '../lib/client/library-catalog';
type Any = Record<string, any>;
type Q = Any & {
    id: string;
    kind: string;
    original_number: number;
    prompt: string;
    choices: Any[];
    variant?: {key: string; number: number};
    variant_available?: boolean;
    variant_count?: number;
};
type GeneratedQuestion = Q & {variant: NonNullable<Q['variant']>};
const variantLabel = (number: number) => 'Biến thể ' + String(number).padStart(2, '0');
const variantAnswer = (q: Q) => q.kind === 'free' ? 'Tự luận · Giáo viên chấm tay' : q.kind === 'tf' ? q.correct.map((v: boolean, i: number) => 'abcd'[i] + ') ' + (v ? 'Đúng' : 'Sai')).join(' · ') : String(q.correct);
const labels: Any = { exams: 'Đề đã lưu', accounts: 'Tài khoản & Phân quyền', home: 'Tổng quan', digital: 'Học liệu số', bank: 'Ngân hàng câu hỏi', sessions: 'Phiên kiểm tra', classes: 'Danh sách & Sổ điểm', guide: 'Hướng dẫn', documents: 'Tài liệu & Phiên bản', settings: 'Cài đặt tài khoản', network: 'Kết nối LAN / QR', backup: 'Sao lưu & Phục hồi' };
const kinds: Any = { mcq: 'Trắc nghiệm', tf: 'Đúng / Sai', short: 'Trả lời ngắn', free: 'Tự luận' };
const kindShort: Any = { mcq: 'TN', tf: 'Đ/S', short: 'TLN', free: 'TL' };
const kindOrder: Any = { mcq: 1, tf: 2, short: 3, free: 4 };
const courseSource = '@course';
function bankSource(source: string): Record<string, string> {
    return source === courseSource ? {course: '1'} : source ? {document_id: source} : {};
}
const sourceForGrade = (documents: Any[], grade: string) => documents.some(d => d.is_bundled && String(d.grade) === grade) ? courseSource : '';
const stages = [
    ['Nền móng & dữ liệu mẫu', 'Cơ sở dữ liệu SQLite cục bộ, 30 câu minh họa và luồng làm bài offline.'],
    ['Ngân hàng & đề cương 10–11–12', 'Tích hợp 5.837 câu từ đề cương gốc, 75 bài, 1.988 hình SVG đóng gói tại máy.'],
    ['Làm bài LAN/QR & chống mất bài', 'Quét mã QR qua Wi-Fi nội bộ, tự đồng bộ bản nháp và cho phép đổi thiết bị.'],
    ['Thống kê, Sổ điểm & Chữa bài', 'Phân tích phổ điểm, trình chiếu có bút vẽ, sổ điểm lớp nhiều phiên và xuất Excel.'],
    ['Sao lưu gọn & Phục hồi an toàn', 'Sao lưu JSON tham chiếu dấu vân tay (<3 MB), giữ 2 bản dự phòng và sao lưu toàn thư mục.'],
    ['Sẵn sàng vận hành thực tế', 'Chốt đáp án câu cần đối chiếu, gia hạn giờ làm bài, nhân bản đề sang lớp khác và chấm tự luận.']
];
async function api(path: string, method = 'GET', body?: Any, token?: string): Promise<Any> {
    const r = await fetch('/api/' + path, { method, cache: 'no-store', signal: AbortSignal.timeout(12000), headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { 'Authorization': 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const d = (await r.json().catch(() => ({ error: 'Máy chủ trả về dữ liệu không hợp lệ.' }))) as Any;
    if (!r.ok) {
        const e: any = new Error(d.error || 'Không thực hiện được.');
        e.status = r.status; e.code = d.code;
        throw e;
    }
    return d;
}
const fmt = (n: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n);
const date = (n: number) => new Date(n).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
function storeGet(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function storeSet(key: string, value: string) { try { localStorage.setItem(key, value); return true; } catch { return false; } }
function storeRemove(key: string) { try { localStorage.removeItem(key); } catch { } }
function Brand() {
    return <div className="brand"><span className="brand-mark">∑</span><div><b>Toán THĐ<span className="version">v0.14</span></b><small>THPT Trịnh Hoài Đức</small></div></div>;
}
function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode; }) {
    return <div className="empty"><span className="empty-icon"><ClipboardList size={26} /></span><h3>{title}</h3><p>{text}</p>{action}</div>;
}
function Pill({ children, tone = 'green' }: { children: React.ReactNode; tone?: string; }) {
    return <span className={'pill ' + tone}>{children}</span>;
}
function Modal({ title, children, onClose, focusOnOpen = false }: { title: string; children: React.ReactNode; onClose: () => void; focusOnOpen?: boolean; }) {
    const closeButton = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!focusOnOpen) return;
        const opener = document.activeElement;
        closeButton.current?.focus();
        return () => { if (opener instanceof HTMLElement) opener.focus(); };
    }, [focusOnOpen]);
    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, [onClose]);
    return <div className="modal-shade" onClick={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}><header><h2>{title}</h2><button ref={closeButton} className="icon-btn" aria-label="Đóng" onClick={onClose}><X size={20} /></button></header>{children}</section></div>;
}
function QuestionBody({ q, answer, onChange, readOnly = false }: { q: Q; answer?: any; onChange?: (a: any) => void; readOnly?: boolean; }) {
    return <>
        <Rich html={q.prompt} />
        {q.kind === 'mcq' && <div className="choices">{q.choices.map(c => <button disabled={readOnly} aria-pressed={answer === c.key} key={c.key} className={'choice ' + (answer === c.key ? 'chosen' : '')} onClick={() => onChange?.(c.key)}><span className="choice-key">{c.key}</span><Rich html={c.text} />{answer === c.key && <CheckCircle2 size={18} />}</button>)}</div>}
        {q.kind === 'tf' && <div className="tf-list">{q.choices.map((c, i) => <div className="tf-row" key={c.key}><b>{c.key})</b><Rich html={c.text} /><div className="tf-buttons">{[true, false].map(v => <button key={String(v)} disabled={readOnly} aria-pressed={answer?.[i] === v} className={answer?.[i] === v ? 'active' : ''} onClick={() => { const next = [...(answer || [null, null, null, null])]; next[i] = v; onChange?.(next); }}>{v ? 'Đúng' : 'Sai'}</button>)}</div></div>)}</div>}
        {q.kind === 'short' && <label className="short-field">Câu trả lời ngắn<input disabled={readOnly} maxLength={80} inputMode="decimal" placeholder="Nhập số, ví dụ: 0,5 hoặc 1/2" value={answer || ''} onChange={e => onChange?.(e.target.value)} /></label>}
        {q.kind === 'free' && !readOnly && <label className="short-field free-field">Bài làm tự luận (ghi đáp số tóm tắt hoặc làm trên giấy)<textarea disabled={readOnly} rows={3} maxLength={500} placeholder="Nhập đáp số / ghi chú ngắn gọn hoặc trình bày trực tiếp trên giấy…" value={typeof answer === 'string' ? answer : ''} onChange={e => onChange?.(e.target.value)} /></label>}
        {q.kind === 'free' && readOnly && typeof answer === 'string' && answer.trim() && <div className="free-answer-box"><b>Ghi chú của học sinh:</b> <p>{answer}</p></div>}
    </>;
}

function VariantDialog({question, previousKey, onUse, onClose}: {
    question: Q;
    previousKey?: string;
    onUse: (draft: GeneratedQuestion) => void;
    onClose: () => void;
}) {
    const [request, setRequest] = useState<{previousKey?: string; variantKey?: string}>({variantKey: previousKey});
    const [options, setOptions] = useState<{key: string; number: number}[]>([]);
    const [draft, setDraft] = useState<GeneratedQuestion | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        api('teacher/bank/variant', 'POST', {
            question_id: question.id,
            previous_key: request.previousKey,
            variant_key: request.variantKey,
        }).then(result => {
            if (!cancelled) { setDraft(result.question); setOptions(result.variants || []); }
        }).catch(e => {
            if (!cancelled) setError(e.message);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [question.id, request]);

    function reroll() {
        setLoading(true);
        setError('');
        setRequest({previousKey: draft?.variant.key ?? previousKey});
    }

    return <Modal title={'Biến thể Câu ' + question.original_number} onClose={onClose} focusOnOpen>
        <div className="question-modal variant-draft">
            {options.length > 0 && <div className="variant-picker" role="group" aria-label="Chọn biến thể">{options.map(option => <button type="button" key={option.key} disabled={loading} aria-pressed={draft?.variant.key === option.key} onClick={() => { setLoading(true); setError(''); setRequest({variantKey: option.key}); }}>{variantLabel(option.number)}</button>)}</div>}
            <details className="variant-original">
                <summary>Xem đề gốc</summary>
                <Rich html={question.prompt} />
            </details>
            {loading && <p role="status">Đang tải biến thể…</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
            {draft && <>
                <div className="modal-meta"><Pill>{variantLabel(draft.variant.number)}</Pill><small>{question.lesson_title}</small></div>
                {draft.kind === 'short' ? <Rich html={draft.prompt} /> : <QuestionBody q={draft} readOnly />}
                <div className="solution"><b>Đáp án: {variantAnswer(draft)}</b><Rich html={draft.solution} /></div>
            </>}
            <p className="tiny-note">Biến thể dùng chế độ Đề đầy đủ để học sinh thấy đúng bộ số đã chọn.</p>
            <div className="modal-actions">
                <button type="button" className="btn secondary" disabled={loading} onClick={reroll}><RotateCw size={15} /> Đổi bộ số</button>
                <button type="button" className="btn primary" disabled={!draft || loading || !!error} onClick={() => draft && onUse(draft)}><Plus size={15} /> Dùng biến thể</button>
            </div>
        </div>
    </Modal>;
}

function ResolveKeyBox({ q, onResolved, notify }: { q: Q; onResolved: (updated: Q) => void; notify: (s: string) => void }) {
    const [mcqKey, setMcqKey] = useState<string>(typeof q.correct === 'string' && /^[ABCD]$/.test(q.correct) ? q.correct : 'A');
    const [tfKey, setTfKey] = useState<boolean[]>(Array.isArray(q.correct) && q.correct.length === 4 ? q.correct.map(Boolean) : [true, false, true, false]);
    const [shortKey, setShortKey] = useState<string>(q.correct != null ? String(q.correct) : '');
    const [busy, setBusy] = useState(false);
    if (q.kind === 'free') return null;
    async function save(reset = false) {
        setBusy(true);
        try {
            const correct = q.kind === 'mcq' ? mcqKey : q.kind === 'tf' ? tfKey : shortKey;
            const res = await api('teacher/questions/resolve-key', 'POST', { id: q.id, correct, reset });
            onResolved(res.question);
            notify(reset ? 'Đã hoàn tác về trạng thái cần đối chiếu.' : `Đã chốt đáp án Câu ${q.original_number} — sẵn sàng đưa vào đề chấm tự động.`);
        } catch (e: any) {
            notify(e.message);
        } finally {
            setBusy(false);
        }
    }
    return <div className="resolve-key-box">
        <div className="resolve-key-head">
            <b>{q.verified_override ? 'Đáp án đã được giáo viên duyệt' : 'Chốt khóa đáp án để mở khóa chấm tự động'}</b>
            {q.verified_override && <button type="button" className="text-btn danger" disabled={busy} onClick={() => void save(true)}>Hoàn tác về cần đối chiếu</button>}
        </div>
        <div className="resolve-key-controls">
            {q.kind === 'mcq' && <div className="resolve-mcq">{'ABCD'.split('').map(k => <button type="button" key={k} className={'btn ' + (mcqKey === k ? 'primary' : 'secondary')} onClick={() => setMcqKey(k)}>Phương án {k}</button>)}</div>}
            {q.kind === 'tf' && <div className="resolve-tf">{'abcd'.split('').map((k, i) => <div key={k} className="resolve-tf-item"><b>{k})</b><button type="button" className={tfKey[i] ? 'active' : ''} onClick={() => setTfKey(old => old.map((v, idx) => idx === i ? true : v))}>Đúng</button><button type="button" className={!tfKey[i] ? 'active' : ''} onClick={() => setTfKey(old => old.map((v, idx) => idx === i ? false : v))}>Sai</button></div>)}</div>}
            {q.kind === 'short' && <input value={shortKey} onChange={e => setShortKey(e.target.value)} placeholder="Nhập đáp số đúng (VD: 0,5 hoặc 1/2)" />}
            <button type="button" className="btn primary" disabled={busy} onClick={() => void save(false)}><Check size={15} /> {busy ? 'Đang lưu…' : 'Chốt đáp án dùng trên lớp'}</button>
        </div>
    </div>;
}

export default function Workspace({ studentOnly = false }: { studentOnly?: boolean; }) {
    const [digitalKind, setDigitalKind] = useState<'all' | ResourceKind>('all');
    const [libraryOpenId, setLibraryOpenId] = useState<string | null>(null);
    const [focusLibrary, setFocusLibrary] = useState(false);
    const [planOpen, setPlanOpen] = useState(false);
    const [bankChapter, setBankChapter] = useState('all');
    const [requestedView, setView] = useState('home'), [data, setData] = useState<Any | null>(null), [loading, setLoading] = useState(!studentOnly), [authorized, setAuthorized] = useState(false), [username, setUsername] = useState('admin'), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [toast, setToast] = useState(''), [preview, setPreview] = useState<Q | null>(null);
    const [grade, setGrade] = useState('11'), [lesson, setLesson] = useState('all'), [query, setQuery] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState(''), [kind, setKind] = useState('all');
    const [selected, setSelected] = useState<string[]>([]), [title, setTitle] = useState('Kiểm tra trên lớp'), [classroom, setClassroom] = useState('demo-11a1'), [minutes, setMinutes] = useState(15), [mode, setMode] = useState('online'), [allowFree, setAllowFree] = useState(false);
    const [variants, setVariants] = useState(() => new Map<string, GeneratedQuestion>());
    const [variantSource, setVariantSource] = useState<Q | null>(null);
    const [sessionId, setSessionId] = useState(''), [detail, setDetail] = useState<Any | null>(null), [confirmClose, setConfirmClose] = useState(false);
    const [shareSession, setShareSession] = useState<Any | null>(null), [resetDevice, setResetDevice] = useState<Any | null>(null), [scoringMode, setScoringMode] = useState('practice'), [cloneModal, setCloneModal] = useState<Any | null>(null);
    const [documentId, setDocumentId] = useState(courseSource), [showArchived, setShowArchived] = useState(false), [editor, setEditor] = useState<Any | null>(null), [historyQ, setHistoryQ] = useState<Any | null>(null), [importKind, setImportKind] = useState<'bank' | 'roster' | null>(null), [publicMeta, setPublicMeta] = useState<Any | null>(null);
    const [bankPage, setBankPage] = useState(1), [bankStatus, setBankStatus] = useState('all'), [bankRows, setBankRows] = useState<Q[]>([]), [questionCache, setQuestionCache] = useState<Q[]>([]), [bankTotal, setBankTotal] = useState(0), [bankLoading, setBankLoading] = useState(false), [bankError, setBankError] = useState(''), [bankGeneration, setBankGeneration] = useState(0), [quickNumbers, setQuickNumbers] = useState('');
    const isTeacher = data?.auth?.role === 'teacher';
    const isAdmin = data?.auth?.role === 'admin';
    const mayAuthor = !isTeacher || data?.auth?.permissions?.author_exams === true;
    const mayEditBank = !isTeacher || data?.auth?.permissions?.edit_bank === true;
    const mayManageRosters = !isTeacher || data?.auth?.permissions?.manage_rosters === true;
    const maySaveExam = mayAuthor && data?.auth?.scope !== 'demo' && data?.auth?.custom_password;
    const teacherViews = ['home','digital','exams','sessions','settings',...(mayAuthor||mayEditBank?['bank']:[]),
        ...(mayEditBank?['documents']:[]),...(mayManageRosters?['classes']:[])];
    const view = isTeacher && !teacherViews.includes(requestedView) ? 'exams'
        : requestedView === 'accounts' && !isAdmin ? 'home' : requestedView;
    const teacherName = data?.auth?.user?.display_name || 'Nguyễn Trọng Hiếu';
    const planAccount = authorized ? String(data?.auth?.user?.id || data?.auth?.role || '') : '';
    const libraryUploads = useLibraryUploads(authorized && !data?.auth?.setup_required && data?.auth?.role !== 'demo' ? planAccount : '');
    const canUpload = isAdmin ? !!data?.auth?.custom_password : isTeacher && data?.auth?.permissions?.upload_library === true;
    const studioPlan = useStudioPlan(planAccount, data?.classrooms ?? [], libraryUploads.items);
    const clearLibraryOpen = useCallback(() => setLibraryOpenId(null), []);
    const clearLibraryFocus = useCallback(() => setFocusLibrary(false), []);
    const viewEpoch = useRef(0);
    const selectedRef = useRef(selected); selectedRef.current = selected;
    const basketRef = useRef<HTMLElement>(null);
    const [cartExpanded, setCartExpanded] = useState(true);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [replaceExam, setReplaceExam] = useState(false);
    const [bankToolsOpen, setBankToolsOpen] = useState(false);
    const [quickOpen, setQuickOpen] = useState(false);
    useEffect(() => {
        const basket = basketRef.current;
        const layout = basket?.parentElement;
        if (view !== 'bank' || !authorized || !basket || !layout) return;

        let frame = 0;
        function measure() {
            frame = 0;
            const top = Math.max(16, layout!.getBoundingClientRect().top);
            const available = Math.max(220, window.innerHeight - top - 16);
            basket!.style.setProperty('--basket-room', available + 'px');
        }
        const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
        measure();
        window.addEventListener('scroll', schedule, {passive: true});
        window.addEventListener('resize', schedule);
        return () => {
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            cancelAnimationFrame(frame);
        };
    }, [view, authorized]);
    const notify = (text: string) => { setToast(text); setTimeout(() => setToast(''), 3800); };
    async function reload() {
        const epoch = viewEpoch.current;
        try {
            const d = await api('teacher/bootstrap');
            if (epoch !== viewEpoch.current) return;
            setData(d);
            setBankGeneration(n => n + 1);
            setAuthorized(true);
            setError('');
        } catch (e: any) {
            if (epoch !== viewEpoch.current) return;
            if (e.status !== 401) setError(e.message);
            setAuthorized(false);
            setData(null);
        } finally {
            if (epoch === viewEpoch.current) setLoading(false);
        }
    }
    useEffect(() => { if (!studentOnly) void reload(); }, [studentOnly]);
    useEffect(() => { if (!studentOnly) api('public/meta').then(setPublicMeta).catch(() => { }); }, [studentOnly]);
    useEffect(() => {
        if (data && documentId && !data.documents.some((d: Any) => String(d.grade) === grade && (documentId === courseSource ? d.is_bundled : d.id === documentId))) {
            setDocumentId(sourceForGrade(data.documents, grade));
            setLesson('all');
            setBankChapter('all');
        }
    }, [data, grade, documentId]);
    useEffect(() => {
        if (data && !data.classrooms.some((c: Any) => c.id === classroom)) setClassroom(data.classrooms[0]?.id || '');
    }, [data,classroom]);
    useEffect(() => {
        if (!mayEditBank) setShowArchived(false);
    }, [mayEditBank]);
    useEffect(() => { setBankPage(1); }, [grade, documentId, bankChapter, lesson, kind, from, to, query, bankStatus, showArchived]);
    useEffect(() => {
        if (!authorized || view !== 'bank') return;
        let cancelled = false; setBankLoading(true); setBankError(''); setBankRows([]);
        const timer = setTimeout(() => {
            const params = new URLSearchParams({ grade, ...bankSource(documentId), page: String(bankPage), archived: showArchived ? '1' : '0' });
            if (bankChapter !== 'all') params.set('chapter', bankChapter);
            if (lesson !== 'all') params.set('lesson_id', lesson); if (kind !== 'all') params.set('kind', kind); if (bankStatus !== 'all') params.set('status', bankStatus);
            if (from) params.set('from', from); if (to) params.set('to', to); if (query.trim()) params.set('q', query.trim());
            api('teacher/bank?' + params).then(d => {
                if (cancelled) return;
                setBankRows(d.questions); setBankTotal(d.total);
                setQuestionCache(old => {
                    const cache = new Map(old.filter(q => selectedRef.current.includes(q.id)).map(q => [q.id, q]));
                    for (const q of d.questions) cache.set(q.id, q);
                    return [...cache.values()] as Q[];
                });
            }).catch(e => { if (!cancelled) { setBankError(e.message); setBankTotal(0); } }).finally(() => { if (!cancelled) setBankLoading(false); });
        }, 160);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [authorized, view, grade, documentId, bankChapter, lesson, kind, from, to, query, bankStatus, showArchived, bankPage, bankGeneration]);
    async function mutated() { clearSelection(); setEditor(null); setHistoryQ(null); setImportKind(null); await reload(); notify('Đã lưu thay đổi. Các phiên cũ giữ nguyên nội dung và danh sách.'); }
    async function logout() {
        await api('teacher/logout','POST',{}).catch(()=>{});
        clearWorkspace();
        setAuthorized(false); setPassword(''); setError('');
        api('public/meta').then(setPublicMeta).catch(()=>{});
    }
    async function loadDetail(id: string) {
        const epoch = viewEpoch.current;
        try {
            const result = await api('teacher/session?id=' + encodeURIComponent(id));
            if (epoch === viewEpoch.current) setDetail(result);
        } catch (e: any) {
            if (epoch !== viewEpoch.current) return;
            if ([401,403,404].includes(e.status)) {
                setSessionId(''); setDetail(null); setShareSession(null); setPreview(null); setResetDevice(null); setConfirmClose(false);
                await reload();
            }
            notify(e.message);
        }
    }
    useEffect(() => {
        if (sessionId && authorized) {
            void loadDetail(sessionId);
            const timer = setInterval(() => void loadDetail(sessionId), 5000);
            return () => clearInterval(timer);
        }
    }, [sessionId, authorized]);
    useEffect(() => {
        if (authorized && view === 'sessions') {
            void reload();
            const t = setInterval(() => void reload(), 10000);
            return () => clearInterval(t);
        }
    }, [authorized, view]);
    useEffect(() => {
        if (!authorized || !isTeacher || view === 'sessions') return;
        const refresh = () => { if (!document.hidden) void reload(); };
        const timer = setInterval(refresh, 20000);
        window.addEventListener('focus', refresh);
        return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
    }, [authorized,isTeacher,view]);
    const nav = useCallback((value: string) => {
        setView(value);
        setError('');
        if (value !== 'bank') setVariantSource(null);
        if (value !== 'sessions') { setSessionId(''); setDetail(null); }
        if (value !== 'digital') { setLibraryOpenId(null); setFocusLibrary(false); }
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);
    const searchLibrary = useCallback(() => {
        setDigitalKind('all');
        nav('digital');
        setFocusLibrary(true);
    }, [nav]);
    useEffect(() => {
        if (!authorized || !data || data.auth?.setup_required || studentOnly) return;
        function shortcut(event: KeyboardEvent) {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k' || document.querySelector('dialog[open], .modal-shade')) return;
            event.preventDefault();
            searchLibrary();
        }
        window.addEventListener('keydown', shortcut);
        return () => window.removeEventListener('keydown', shortcut);
    }, [authorized, data, searchLibrary, studentOnly]);

    function browseStudio(kind: 'all' | ResourceKind) {
        setPlanOpen(false);
        setDigitalKind(kind);
        nav('digital');
    }
    function openStudioResource(resource: LibraryResource) {
        setPlanOpen(false);
        setLibraryOpenId(resource.id);
        nav('digital');
    }
    function addStudioResource(resource: LibraryResource) {
        const saved = studioPlan.update(resource, true);
        notify(saved ? `Đã thêm vào tiết ${studioPlan.room?.label}.` : 'Trình duyệt chưa lưu được kế hoạch.');
    }
    function composeFromStudio() {
        const room = studioPlan.room;
        if (room) {
            setClassroom(room.id);
            const level = String(room.grade);
            if (['10', '11', '12'].includes(level) && level !== grade) {
                setGrade(level);
                setDocumentId(sourceForGrade(data?.documents || [], level));
                setLesson('all');
                setBankChapter('all');
            }
        }
        nav('bank');
    }
    const richQuestions = useMemo(() => questionCache.map((q: Q): Q => {
        const l = data?.lessons.find((l: Any) => l.id === q.lesson_id), d = data?.documents.find((d: Any) => d.id === l?.document_id);
        return { ...q, lesson_title: l?.title || q.lesson_title, chapter: l?.chapter || q.chapter, document_title: d?.title || q.document_title, grade: d?.grade || q.grade, edition: d?.edition || q.edition, document_id: d?.id || q.document_id, is_sample: d?.is_sample ?? q.is_sample };
    }), [data, questionCache]);
    const filtered = bankRows;
    const isEligible = (q: Any) => canEnterSession(q, { allowFree: allowFree && scoringMode === 'practice' });
    function clearSelection() {
        setSelected([]);
        setVariants(new Map());
        setVariantSource(null);
    }
    function useOriginal(id: string) {
        const original = richQuestions.find(q => q.id === id);
        if (original && !isEligible(original)) setSelected(old => old.filter(value => value !== id));
        setVariants(old => {
            if (!old.has(id)) return old;
            const next = new Map(old);
            next.delete(id);
            return next;
        });
    }
    function unselect(id: string) {
        setSelected(old => old.filter(value => value !== id));
        useOriginal(id);
    }
    function useVariant(source: Q, draft: GeneratedQuestion) {
        if (!isEligible(draft)) {
            notify('Bật Cho phép câu tự luận trong chế độ Luyện tập trước khi chọn biến thể này.');
            return;
        }
        if (!selected.includes(source.id) && selected.length >= 100) {
            notify('Giỏ đã có 100 câu. Hãy bỏ một câu trước khi thêm biến thể.');
            return;
        }
        setQuestionCache(old => [...old.filter(q => q.id !== source.id), source]);
        setSelected(old => [...new Set([...old, source.id])]);
        setVariants(old => new Map(old).set(source.id, draft));
        setMode('online');
        setCartExpanded(true);
        setVariantSource(null);
        notify('Đã chọn ' + variantLabel(draft.variant.number).toLowerCase() + ' cho Câu ' + source.original_number + ' · Đề đầy đủ.');
    }
    const selectMany = (ids: string[], incomingQuestions?: Q[]) => {
        if (incomingQuestions?.length) {
            setQuestionCache(old => {
                const cache = new Map(old.map(q => [q.id, q]));
                for (const q of incomingQuestions) cache.set(q.id, q);
                return [...cache.values()];
            });
        }
        const lookup = new Map([...richQuestions, ...(incomingQuestions || [])].map((q: Any) => [q.id, q]));
        const eligible = ids.filter(id => isEligible(variants.get(id) || lookup.get(id) || {}));
        setSelected(old => [...new Set([...old, ...eligible])].slice(0, 100));
        if (ids.length > 1) {
            const added = Math.min(100 - selected.length, new Set(eligible.filter(id => !selected.includes(id))).size);
            notify(added ? `Đã thêm ${added} câu vào đề.` : 'Không có câu mới để thêm.');
        }
    };
    async function smartSelect(selectMode: string, extra: Any = {}) {
        setBusy(true);
        try {
            const payload: Any = { mode: selectMode, grade, ...bankSource(documentId), allow_free: allowFree && scoringMode === 'practice', ...extra };
            if (bankChapter !== 'all') payload.chapter = bankChapter;
            if (lesson !== 'all') payload.lesson_id = lesson;
            if (kind !== 'all' && selectMode !== 'exam-1246') payload.kind = kind;
            if (bankStatus !== 'all') payload.status = bankStatus;
            if (from) payload.from = from;
            if (to) payload.to = to;
            if (query.trim()) payload.q = query.trim();
            const res = await api('teacher/bank/select', 'POST', payload);
            const qs: Q[] = res.questions || [];
            setQuestionCache(old => {
                const cache = new Map(old.map(q => [q.id, q]));
                for (const q of qs) cache.set(q.id, q);
                return [...cache.values()];
            });
            if (selectMode === 'exam-1246') {
                setScoringMode('exam-1246');
                setAllowFree(false);
                setSelected(qs.map(q => q.id));
                setVariants(new Map());
                notify('Đã bốc tự động đủ cấu trúc 12 TN · 4 Đ/S · 6 TLN (22 câu).');
            } else {
                const before = selectedRef.current;
                const next = [...new Set([...before, ...qs.map(q => q.id)])].slice(0, 100);
                setSelected(next);
                notify(next.length > before.length ? `Đã thêm ${next.length - before.length} câu vào đề.` : 'Không có câu mới để thêm.');
            }
            setQuickOpen(false); setReplaceExam(false); setCartExpanded(true);
        } catch (e: any) {
            notify(e.message);
        } finally {
            setBusy(false);
        }
    }
    function sortSelectedByExam() {
        const lookup = new Map(richQuestions.map(q => [q.id, q]));
        setSelected(old => [...old].sort((a, b) => {
            const qa = lookup.get(a), qb = lookup.get(b);
            if (!qa || !qb) return 0;
            return (kindOrder[qa.kind] || 9) - (kindOrder[qb.kind] || 9) || String(qa.lesson_id).localeCompare(String(qb.lesson_id)) || qa.original_number - qb.original_number;
        }));
        notify('Đã sắp xếp câu hỏi theo thứ tự: Trắc nghiệm → Đúng/Sai → Trả lời ngắn → Tự luận.');
    }
    function clearWorkspace() {
        viewEpoch.current++;
        setData(null); clearSelection(); setQuestionCache([]); setBankRows([]); setDetail(null); setSessionId('');
        setPreview(null); setShareSession(null); setCloneModal(null); setResetDevice(null); setConfirmClose(false);
        setEditor(null); setHistoryQ(null); setImportKind(null); setView('home');
        setPlanOpen(false); setLibraryOpenId(null); setFocusLibrary(false); setBankChapter('all');
        setReviewOpen(false); setQuickOpen(false); setBankToolsOpen(false); setReplaceExam(false);
        setLesson('all'); setDocumentId(courseSource); setBankStatus('all'); setQuery(''); setKind('all'); setFrom(''); setTo(''); setShowArchived(false);
    }
    async function login(e: React.FormEvent) {
        e.preventDefault(); setBusy(true); setError('');
        try { await api('teacher/login', 'POST', { username, password }); clearWorkspace(); await reload(); setPassword(''); }
        catch (e: any) { setError(e.message); }
        finally { setBusy(false); }
    }
    async function showCreatedSession(id: string) {
        await reload();
        setView('sessions');
        setSessionId(id);
        const created = await api('teacher/session?id=' + encodeURIComponent(id));
        setDetail(created);
        setShareSession(created.session);
    }
    async function createSession(e: React.FormEvent) {
        e.preventDefault(); setBusy(true);
        const submit = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const saveExam = submit?.value === 'save-exam';
        try {
            const payload = {title, question_ids:selected, classroom_id:classroom, minutes, mode,
                scoring_mode:scoringMode, allow_free:allowFree && scoringMode === 'practice',
                ...(variants.size ? {question_variants: Object.fromEntries(
                    selected.flatMap(id => {
                        const variant = variants.get(id);
                        return variant ? [[id, variant.variant.key]] : [];
                    })
                )} : {})};
            if (saveExam) {
                await api('teacher/exams','POST',payload);
                setReviewOpen(false);
                nav('exams');
                notify('Đã lưu bản nháp trong Đề của tôi.');
            } else {
                const created = await api('teacher/sessions','POST',payload);
                setReviewOpen(false);
                await showCreatedSession(created.id);
                notify('Đã tạo phiên kiểm tra. Số câu gốc được giữ nguyên.');
            }
        } catch (e: any) { notify(e.message); }
        finally { setBusy(false); }
    }
    async function saveSessionAsExam(id: string) {
        setBusy(true);
        try {
            await api('teacher/exams','POST',{session_id:id});
            notify('Đã lưu bản nháp trong Đề của tôi.');
        } catch (e: any) { notify(e.message); }
        finally { setBusy(false); }
    }
    async function extendSession(id: string, addMinutes: number) {
        setBusy(true);
        try {
            await api('teacher/extend', 'POST', { id, minutes: addMinutes });
            await loadDetail(id);
            await reload();
            notify(`Đã cộng thêm ${addMinutes} phút cho phiên làm bài.`);
        } catch (e: any) { notify(e.message); }
        finally { setBusy(false); }
    }
    async function submitCloneSession(e: React.FormEvent) {
        e.preventDefault(); if (!cloneModal) return; setBusy(true);
        try {
            const res = await api('teacher/sessions/clone', 'POST', { session_id: cloneModal.id, classroom_id: cloneModal.classroom_id, title: cloneModal.title, minutes: Number(cloneModal.minutes) });
            setCloneModal(null);
            await showCreatedSession(res.id);
            notify('Đã nhân bản đề sang lớp mới và mở phiên.');
        } catch (e: any) { notify(e.message); }
        finally { setBusy(false); }
    }
    async function gradeFreeQuestion(attemptId: string, questionId: string, fraction: number | null) {
        try {
            await api('teacher/grade-free', 'POST', { attempt_id: attemptId, question_id: questionId, fraction });
            if (sessionId) await loadDetail(sessionId);
            notify('Đã lưu điểm câu tự luận.');
        } catch (e: any) { notify(e.message); }
    }
    async function copy(text: string) {
        try { await navigator.clipboard.writeText(text); notify('Đã sao chép.'); }
        catch { notify('Trình duyệt chặn sao chép. Có thể chọn trực tiếp mã hoặc đường dẫn.'); }
    }
    if (studentOnly) return <StudentApp />;
    if (loading) return <main className="loading-screen"><Brand /><p>Đang tải dữ liệu cục bộ…</p></main>;
    if (!authorized) {
        return <main className="login-page">
            <div className="login-top"><Brand /><Pill><Monitor size={13} /> Chạy cục bộ · Offline</Pill></div>
            <div className="login-center">
                <section className="login-card">
                    <div className="login-card-head">
                        <Pill tone="sand">TOÁN 10 · 11 · 12 — v0.14</Pill>
                        <h1>Không gian Giáo viên</h1>
                        <p>Quản lý 5.837 câu đề cương, tạo đề giữ nguyên số câu gốc, thu bài qua mạng LAN và thống kê điểm.</p>
                    </div>
                    {publicMeta?.demo_available && <button type="button" className="btn dark wide demo-quick-btn" disabled={busy} onClick={async () => {
                        setBusy(true); setError('');
                        try { await api('teacher/demo', 'POST', {}); clearWorkspace(); await reload(); }
                        catch (e: any) { setError(e.message); }
                        finally { setBusy(false); }
                    }}><Sparkles size={17} /> Mở nhanh · Đề cương & Lớp minh họa <ArrowRight size={16} /></button>}
                    {publicMeta?.demo_available && <div className="login-separator"><span>HOẶC ĐĂNG NHẬP BẰNG MẬT KHẨU</span></div>}
                    <form onSubmit={login}>
                        <label>Tên đăng nhập<input value={username} onChange={e=>setUsername(e.target.value)} required
                            maxLength={32} autoComplete="username" autoCapitalize="none" spellCheck={false} /></label>
                        <label>Mật khẩu<input type="password" autoComplete="current-password" value={password}
                            onChange={e=>setPassword(e.target.value)} maxLength={200} required /></label>
                        {error && <p className="form-error" role="alert">{error}</p>}
                        <button className="btn primary wide" disabled={busy}>{busy ? 'Đang xác thực…' : <>Đăng nhập <ArrowRight size={17} /></>}</button>
                    </form>
                    {publicMeta?.demo_available && !publicMeta.custom_password &&
                        <div className="login-help"><Info size={16}/><span>Lần đầu quản trị dùng <code>admin</code> và mật khẩu <code>toanthd-demo</code>. Đổi mật khẩu trong Cài đặt tài khoản.</span></div>}
                    <div className="login-footer-actions">
                        <a className="btn secondary wide" href="/hoc-sinh"><GraduationCap size={17} /> Mở màn hình học sinh (/hoc-sinh)</a>
                    </div>
                </section>
            </div>
            <footer>Nguyễn Trọng Hiếu · THPT Trịnh Hoài Đức · Toán THĐ v0.14</footer>
        </main>;
    }
    if (isTeacher && data?.auth?.setup_required) {
        return <div className="staff-onboarding"><header><Brand /></header><main>
            <StaffSettings name={teacherName} first mustChange={data.auth.must_change_password}
                onSaved={reload} onLogout={()=>void logout()} />
        </main></div>;
    }
    const documentOptions = (data!.documents as Any[]).filter(d => String(d.grade) === grade);
    const sourceOptions = documentOptions.filter(d => documentId === courseSource ? d.is_bundled : !documentId || d.id === documentId);
    const sourceIds = new Set(sourceOptions.map(d => d.id));
    const gradeLessons = (data!.lessons as Any[]).filter(l => sourceIds.has(l.document_id));
    const chapterOptions = [...new Map(gradeLessons.filter(l => l.chapter).map(l => {
        const n = Number(String(l.id).match(/^dc-\d+-hk[12]-(\d+)[A-Z]/)?.[1]) || 0;
        const fullTitle = n && mathChapters(Number(grade) as MathGrade)[n - 1];
        return [String(l.chapter), {value: String(l.chapter), order: n || 99,
            label: fullTitle ? `Chương ${chapterRoman[n]} · ${fullTitle}` : String(l.chapter)}];
    })).values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'vi'));
    const lessonOptions = gradeLessons.filter(l => bankChapter === 'all' || l.chapter === bankChapter);
    const advancedCount = Number(documentId !== sourceForGrade(documentOptions, grade)) + Number(!!from || !!to) + Number(bankStatus !== 'all') + Number(showArchived);
    const badRange = !!from && !!to && Number(from) > Number(to);
    const classes = data!.classrooms;
    const isSampleWorkspace = data!.documents.every((d: Any) => d.is_sample || d.is_bundled) && classes.every((c: Any) => c.is_sample);
    const selectedQuestions = selected.map(id => variants.get(id) || richQuestions.find((q: Any) => q.id === id)).filter(Boolean) as Q[];
    const selectedCounts = {
        mcq: selectedQuestions.filter(q => q.kind === 'mcq').length,
        tf: selectedQuestions.filter(q => q.kind === 'tf').length,
        short: selectedQuestions.filter(q => q.kind === 'short').length,
        free: selectedQuestions.filter(q => q.kind === 'free').length,
    };
    const navItems: NavigationItem[] = [
        { key: 'home', label: 'Hôm nay', icon: LayoutDashboard },
        { key: 'digital', label: 'Học liệu', icon: BookText },
        { key: 'bank', label: 'Ngân hàng câu hỏi', icon: Library },
        { key: 'exams', label: 'Đề đã lưu', icon: BookOpen },
        { key: 'classes', label: 'Lớp học', icon: Users },
        { key: 'sessions', label: isTeacher ? 'Phiên của tôi' : 'Phiên kiểm tra', icon: ClipboardList },
        { key: 'documents', label: labels.documents, icon: FileText },
        { key: 'accounts', label: labels.accounts, icon: Users },
        { key: 'network', label: labels.network, icon: Wifi },
        { key: 'backup', label: labels.backup, icon: ShieldCheck },
        { key: 'settings', label: labels.settings, icon: SettingsIcon },
        { key: 'guide', label: labels.guide, icon: HelpCircle },
    ].filter(item => isTeacher ? teacherViews.includes(item.key) : item.key !== 'accounts' || isAdmin);

    return <div className="app-shell studio-shell">
        <StudioNavigation items={navItems} view={view} teacherName={teacherName} sample={isSampleWorkspace}
            onSelect={nav} onSearch={searchLibrary} onLogout={() => void logout()} />
        <div className="main-area">
            <main className="workspace">
                {view === 'home' && <StudioToday plan={studioPlan} onBrowse={browseStudio} onOpen={openStudioResource}
                    onPlan={() => setPlanOpen(true)} onCompose={mayAuthor ? composeFromStudio : undefined} />}
                {view === 'digital' && <DigitalLibrary embedded initialKind={digitalKind} plan={studioPlan}
                    onPlan={() => setPlanOpen(true)} onAddToPlan={addStudioResource}
                    openId={libraryOpenId} onOpenHandled={clearLibraryOpen}
                    focusSearch={focusLibrary} onSearchFocused={clearLibraryFocus} uploads={data!.auth.role === 'demo' ? undefined : libraryUploads} canUpload={canUpload} />}
                {view === 'exams' && <SavedExamsPanel rooms={classes} canAuthor={!!maySaveExam}
                    onBank={()=>nav('bank')} onSettings={()=>nav('settings')} onAssigned={showCreatedSession} />}
                {view === 'accounts' && isAdmin && <AccountsPanel rooms={classes} customPassword={data!.auth.custom_password}
                    onSettings={()=>nav('settings')} />}
                {view === 'bank' && <section className="studio-bank">
                    <div className="studio-page-heading">
                        <div><h1>Ngân hàng câu hỏi<span>.</span></h1></div>
                        {mayEditBank && <button type="button" className="btn secondary" disabled={!data!.lessons.some((l: Any) => !data!.documents.find((d: Any) => d.id === l.document_id)?.is_bundled)} onClick={() => setEditor({})}><Plus size={15} /> Soạn câu riêng</button>}
                    </div>
                    <div className={'bank-layout' + (mayAuthor ? '' : ' without-builder')}>
                        <section className="bank-main">
                            <div className="card filter-card studio-bank-filters">
                                <div className="search-field">
                                    <Search size={16} />
                                    <input type="search" aria-label="Tìm câu hỏi" maxLength={200} placeholder="Tìm theo nội dung, công thức hoặc số câu…" value={query} onChange={e => setQuery(e.target.value)} />
                                    {query && <button type="button" className="icon-btn" aria-label="Xóa tìm kiếm" onClick={() => setQuery('')}><X size={15} /></button>}
                                </div>
                                <div className="studio-bank-path">
                                    <label>Khối<select value={grade} onChange={e => { setGrade(e.target.value); setDocumentId(sourceForGrade(data!.documents, e.target.value)); setLesson('all'); setBankChapter('all'); }}>
                                        {['10', '11', '12'].map(g => <option key={g} value={g}>Toán {g}</option>)}</select></label>
                                    <label>Chương<select value={bankChapter} onChange={e => {setBankChapter(e.target.value); setLesson('all');}}>
                                        <option value="all">Tất cả chương</option>{chapterOptions.map(chapter => <option key={chapter.value} value={chapter.value}>{chapter.label}</option>)}</select></label>
                                    <label>Bài học<select value={lesson} onChange={e => setLesson(e.target.value)}>
                                        <option value="all">Tất cả bài</option>{lessonOptions.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
                                </div>
                                <div className="studio-bank-filter-line">
                                    <div className="studio-bank-types" role="group" aria-label="Dạng câu hỏi">
                                        <button type="button" aria-pressed={kind === 'all'} onClick={() => setKind('all')}>Mọi dạng</button>
                                        {Object.entries(kinds).map(([key, label]) => <button type="button" key={key} aria-pressed={kind === key} onClick={() => setKind(key)}>{label}</button>)}
                                    </div>
                                    <button type="button" className="text-btn studio-bank-tool" aria-expanded={bankToolsOpen} aria-controls="bank-tools" onClick={() => setBankToolsOpen(value => !value)}>
                                        <SlidersHorizontal size={15} /> Bộ lọc{advancedCount > 0 && <b>{advancedCount}</b>}
                                    </button>
                                </div>
                                {bankToolsOpen && <div className="studio-bank-extra" id="bank-tools">
                                    <label>Nguồn câu hỏi<select value={documentId} onChange={e => {setDocumentId(e.target.value); setLesson('all'); setBankChapter('all');}}>
                                        {documentOptions.some(d => d.is_bundled) && <option value={courseSource}>Đề cương tích hợp · Cả năm</option>}
                                        <option value="">Tất cả nguồn</option>{documentOptions.map(d => <option key={d.id} value={d.id}>{d.title} · {d.edition}</option>)}</select></label>
                                    <div className="studio-bank-range">
                                        <label>Từ câu<input type="number" min={1} max={99999} value={from} onChange={e => setFrom(e.target.value)} /></label>
                                        <label>Đến câu<input type="number" min={1} max={99999} value={to} onChange={e => setTo(e.target.value)} /></label>
                                    </div>
                                    <label>Trạng thái đáp án<select value={bankStatus} onChange={e => setBankStatus(e.target.value)}>
                                        <option value="all">Tất cả trạng thái</option><option value="auto">Sẵn sàng chấm tự động</option><option value="review">Cần đối chiếu</option><option value="reference">Tự luận · Tham khảo</option></select></label>
                                    {mayEditBank && <label className="archive-filter"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} /> Chỉ xem câu đã lưu trữ</label>}
                                    {mayAuthor && <label className="archive-filter"><input type="checkbox" checked={allowFree && scoringMode === 'practice'} disabled={scoringMode === 'exam-1246'} onChange={e => setAllowFree(e.target.checked)} /> Cho phép chọn câu tự luận</label>}
                                    <div className="studio-bank-extra-actions">
                                        {advancedCount > 0 && <button type="button" className="text-btn" onClick={() => {
                                            if (documentId !== sourceForGrade(documentOptions, grade)) { setDocumentId(sourceForGrade(documentOptions, grade)); setLesson('all'); setBankChapter('all'); }
                                            setFrom(''); setTo(''); setBankStatus('all'); setShowArchived(false);
                                        }}>Đặt lại bộ lọc</button>}
                                        {mayEditBank && <>
                                            <button type="button" className="text-btn" onClick={() => setImportKind('bank')}><Upload size={14} /> Nhập ngân hàng</button>
                                            <button type="button" className="text-btn" disabled={busy || !documentId || documentId === courseSource} title="Chọn một tài liệu cụ thể để xuất" onClick={async () => {
                                                setBusy(true); try { await downloadBank(data!, documentId); } catch (e: any) { notify(e.message); } finally { setBusy(false); }
                                            }}><Download size={14} /> Xuất tài liệu đã chọn</button>
                                        </>}
                                    </div>
                                </div>
                                }
                                {badRange && <p className="form-error">Số câu bắt đầu phải nhỏ hơn hoặc bằng số câu kết thúc.</p>}
                            </div>

                            <div className="studio-bank-results">
                                <div className="studio-bank-result-line">
                                    <b role="status">{bankLoading ? 'Đang tải…' : fmt(bankTotal) + (showArchived ? ' câu đã lưu trữ' : ' câu phù hợp')}</b>
                                    {mayAuthor && !showArchived && <button type="button" className="btn secondary sm" aria-expanded={quickOpen} aria-controls="bank-quick-actions" disabled={busy || badRange || bankLoading || !bankTotal} onClick={() => { setQuickOpen(value => !value); setReplaceExam(false); }}>
                                        <ListChecks size={16} /> Chọn nhanh <ChevronDown size={13} />
                                    </button>}
                                </div>
                                {mayAuthor && quickOpen && !showArchived && !badRange && <div id="bank-quick-actions" className="studio-bank-quick">
                                    <div className="studio-quick-grid">
                                        <button type="button" className="btn secondary sm" disabled={busy || !filtered.length} onClick={() => {
                                            selectMany(filtered.map(q => q.id), filtered); setQuickOpen(false);
                                        }}>Thêm cả trang</button>
                                        <button type="button" className="btn secondary sm" disabled={busy || bankLoading || !bankTotal} onClick={() => void smartSelect('random', {count: 3})}>Ngẫu nhiên 3 câu</button>
                                        <button type="button" className="btn secondary sm" disabled={busy || bankLoading || !bankTotal} onClick={() => void smartSelect('odd')}>Câu lẻ trong bộ lọc</button>
                                        <button type="button" className="btn secondary sm" disabled={busy || bankLoading || !bankTotal} onClick={() => void smartSelect('even')}>Câu chẵn trong bộ lọc</button>
                                        <button type="button" className="btn secondary sm" disabled={busy || bankLoading || !bankTotal} title="Dùng đủ ba dạng câu, giữ các bộ lọc còn lại" onClick={() => selected.length ? setReplaceExam(true) : void smartSelect('exam-1246')}>
                                            <Sparkles size={14} /> Bốc đề 12–4–6
                                        </button>
                                    </div>
                                    {replaceExam && <div className="studio-exam-replace">
                                        <span>Thay {selected.length} câu đang chọn bằng đề tự bốc?</span>
                                        <button type="button" className="text-btn" disabled={busy} onClick={() => setReplaceExam(false)}>Giữ lại</button>
                                        <button type="button" className="btn primary sm" disabled={busy || bankLoading || !bankTotal} onClick={() => void smartSelect('exam-1246')}>Thay bộ câu</button>
                                    </div>}
                                    <div className="studio-quick-numbers">
                                        <input value={quickNumbers} aria-label="Số câu cần thêm" maxLength={200} onChange={e => setQuickNumbers(e.target.value)} placeholder="Số câu gốc: 1-10, 15, 22…" title="Chọn các số câu gốc trong chương và bài đang lọc" />
                                        <button type="button" className="btn secondary sm" disabled={busy || bankLoading || !bankTotal || !quickNumbers.trim()} onClick={() => void smartSelect('numbers', { numbers_spec: quickNumbers })}>Thêm theo số</button>
                                    </div>
                                </div>}
                            </div>

                            {bankError && <div className="bank-error" role="alert">{bankError} <button className="text-btn" onClick={() => setBankGeneration(n => n + 1)}>Tải lại</button></div>}
                            <div className="question-list">
                                {bankLoading ? <div className="card bank-loading">Đang tải danh sách câu hỏi…</div> : !filtered.length ? <div className="card"><Empty title="Chưa có câu hỏi phù hợp" text="Thử chọn chương, bài khác hoặc bỏ bớt bộ lọc." /></div> : filtered.map((q: Q) => {
                                    const eligible = isEligible(variants.get(q.id) || q);
                                    const picked = selected.includes(q.id);
                                    return <article className={'question-card studio-bank-question ' + (picked ? 'selected' : '')} key={q.id}>
                                        <div className="question-top">
                                            <b>Câu {q.original_number}</b>
                                            <Pill tone={q.kind === 'mcq' ? 'gray' : q.kind === 'tf' ? 'violet' : q.kind === 'short' ? 'sand' : 'light'}>{kinds[q.kind]}</Pill>
                                            {q.archived_at ? <Pill tone="gray">Đã lưu trữ</Pill> : q.bank_status === 'review' && <Pill tone="sand">Cần đối chiếu</Pill>}
                                            <span className="q-lesson-tag">{q.lesson_title}</span>
                                        </div>
                                        <div className="q-prompt studio-bank-excerpt"><Rich html={q.prompt} /></div>
                                        <div className="studio-question-actions">
                                            <button type="button" className="text-btn" aria-label={'Xem trước Câu ' + q.original_number + ' — ' + q.lesson_title} onClick={() => setPreview(q)}><Eye size={15} /> Xem trước</button>
                                            {mayAuthor && q.variant_available && (
                                                <button type="button" className="text-btn studio-variant-action" disabled={busy} aria-label={'Biến thể Câu ' + q.original_number} onClick={() => setVariantSource(q)}>
                                                    <Copy size={14} /> {variants.has(q.id) ? variantLabel(variants.get(q.id)!.variant.number) : `Biến thể (${q.variant_count})`}
                                                </button>
                                            )}
                                            {mayEditBank && <details className="studio-question-more">
                                                <summary aria-label={'Quản lý Câu ' + q.original_number}><Ellipsis size={18} /></summary>
                                                <div>
                                                    {!q.bank_origin && <button type="button" className="text-btn" onClick={() => setEditor({ question: q })}><Pencil size={13} /> Sửa câu</button>}
                                                    <button type="button" className="text-btn" onClick={() => setHistoryQ(q)}><HistoryIcon size={13} /> Lịch sử</button>
                                                    <button type="button" className="text-btn" onClick={async () => { try { await adminApi('teacher/questions/archive', { id: q.id, archived: !q.archived_at }); await mutated(); } catch (e: any) { notify(e.message); } }}><ArchiveIcon size={13} />{q.archived_at ? 'Khôi phục' : 'Lưu trữ'}</button>
                                                </div>
                                            </details>}
                                            {mayAuthor && !q.archived_at && <button type="button" className={'btn sm ' + (picked ? 'secondary' : 'primary')} aria-pressed={picked}
                                                aria-label={(picked ? 'Bỏ' : 'Thêm') + ' Câu ' + q.original_number + ' — ' + q.lesson_title}
                                                disabled={!picked && (!eligible || selected.length >= 100)} onClick={() => picked ? unselect(q.id) : selectMany([q.id], [q])}>
                                                {picked ? <><Check size={15} /> Đã chọn</> : <><Plus size={15} /> Thêm</>}
                                            </button>}
                                        </div>
                                    </article>;
                                })}
                            </div>
                            <div className="bank-pagination">
                                <button className="btn secondary" disabled={bankLoading || bankPage <= 1} onClick={() => setBankPage(n => n - 1)}>← Trang trước</button>
                                <span>Trang {bankPage} / {Math.max(1, Math.ceil(bankTotal / 20))} ({fmt(bankTotal)} câu)</span>
                                <button className="btn secondary" disabled={bankLoading || bankPage * 20 >= bankTotal} onClick={() => setBankPage(n => n + 1)}>Trang sau →</button>
                            </div>
                        </section>

                        {mayAuthor && <aside ref={basketRef} tabIndex={-1} className="card builder studio-bank-basket" aria-labelledby="question-basket-heading">
                            <div className="builder-head">
                                <div className="builder-title">
                                    <span className="builder-icon"><ClipboardList size={20} /></span>
                                    <div><h2 id="question-basket-heading">Đề đang soạn</h2><p aria-live="polite">{selected.length} câu đã chọn</p></div>
                                </div>
                                {selected.length > 0 && <div className="structure-pills">
                                    <span className={scoringMode === 'exam-1246' && selectedCounts.mcq !== 12 ? 'warn' : ''}>TN: <b>{selectedCounts.mcq}{scoringMode === 'exam-1246' ? '/12' : ''}</b></span>
                                    <span className={scoringMode === 'exam-1246' && selectedCounts.tf !== 4 ? 'warn' : ''}>Đ/S: <b>{selectedCounts.tf}{scoringMode === 'exam-1246' ? '/4' : ''}</b></span>
                                    <span className={scoringMode === 'exam-1246' && selectedCounts.short !== 6 ? 'warn' : ''}>TLN: <b>{selectedCounts.short}{scoringMode === 'exam-1246' ? '/6' : ''}</b></span>
                                    {selectedCounts.free > 0 && <span>TL: <b>{selectedCounts.free}</b></span>}
                                </div>}
                            </div>
                            <div className="builder-scroll">
                                {!selectedQuestions.length && <p className="studio-basket-empty">Thêm câu từ ngân hàng để bắt đầu soạn đề.</p>}
                                {selectedQuestions.length > 0 && <div className="selected-details">
                                    <button type="button" className="cart-toggle" aria-expanded={cartExpanded}
                                        aria-controls="selected-cart-list" onClick={() => setCartExpanded(open => !open)}>
                                        <span>Danh sách đã chọn</span><ChevronDown size={16} />
                                    </button>
                                    <ol id="selected-cart-list" className="selected-cart-list" hidden={!cartExpanded}
                                        tabIndex={0} aria-label="Danh sách câu đã chọn, cuộn để xem thêm">
                                        {selectedQuestions.map((q, index) => (
                                            <li className="selected-cart-item" key={q.id}>
                                                <span className="cart-idx" aria-hidden="true">{index + 1}</span>
                                                <button type="button" className="cart-item-label" onClick={() => setPreview(q)}>
                                                    <b>Câu {q.original_number} <span>· {kindShort[q.kind] || q.kind}</span></b>
                                                    <small>{q.variant ? variantLabel(q.variant.number) + ' · ' : ''}{q.lesson_title}</small>
                                                </button>
                                                <button type="button" className="icon-btn cart-remove"
                                                    aria-label={`Bỏ Câu ${q.original_number} — ${q.lesson_title}`}
                                                    onClick={() => unselect(q.id)}>
                                                    <X size={16} />
                                                </button>
                                            </li>
                                        ))}
                                    </ol>
                                </div>}
                            </div>
                            <div className="builder-footer">
                                {!!selected.length && <div className="cart-top-actions">
                                    {selected.length > 1 && <button type="button" onClick={sortSelectedByExam}><ArrowUpDown size={13} /> Sắp theo cấu trúc</button>}
                                    <button type="button" onClick={clearSelection}>Bỏ tất cả</button>
                                </div>}
                                <button type="button" className="btn primary wide" disabled={!selected.length || busy} onClick={() => setReviewOpen(true)}>
                                    Rà đề và giao <ArrowRight size={17} />
                                </button>
                            </div>
                        </aside>}
                        {mayAuthor && selected.length > 0 && <button type="button" className="btn primary studio-mobile-basket" onClick={() => {
                            basketRef.current?.scrollIntoView({block: 'start'}); basketRef.current?.focus({preventScroll: true});
                        }}><ClipboardList size={17} /> Đề đang soạn · {selected.length}</button>}
                    </div>
                    {mayAuthor && reviewOpen && <Modal title="Rà đề và giao" focusOnOpen onClose={() => { if (!busy) setReviewOpen(false); }}>
                        <form className="builder-form studio-bank-review" id="session-builder-form" onSubmit={createSession}>
                                    <div className="studio-review-summary">
                                        <ClipboardList size={20} /><b>{selectedQuestions.length} câu</b>
                                        <span>{selectedCounts.mcq} TN · {selectedCounts.tf} Đ/S · {selectedCounts.short} TLN{selectedCounts.free ? ` · ${selectedCounts.free} tự luận` : ''}</span>
                                    </div>
                                    <label>Tên đề hoặc phiên kiểm tra<input maxLength={160} required value={title} onChange={e => setTitle(e.target.value)} /></label>
                                    <div className="filter-row">
                                        <label className="grow">Lớp<select value={classroom} onChange={e => setClassroom(e.target.value)}>{classes.map((c: Any) => <option value={c.id} key={c.id}>{c.label} · {c.school_year}{c.is_sample ? ' · minh họa' : ''}</option>)}</select></label>
                                        <label className="minutes-input">Thời gian<input type="number" min="1" max="180" required value={minutes} onChange={e => setMinutes(Number(e.target.value))} /><small>phút</small></label>
                                    </div>
                                    <label>Cách hiển thị trên máy học sinh</label>
                                    <div className="mode-options">
                                        <button type="button" className={mode === 'online' ? 'active' : ''} onClick={() => setMode('online')}><Monitor size={16} /><b>Đề đầy đủ</b><small>Hiện đề & hình</small></button>
                                        <button type="button" disabled={variants.size > 0} className={mode === 'paper' ? 'active' : ''} onClick={() => setMode('paper')}><BookOpen size={16} /><b>Tài liệu giấy</b><small>Chỉ hiện phiếu đáp án</small></button>
                                    </div>
                                    {variants.size > 0 && <p className="scoring-help">Đề có biến thể dùng Đề đầy đủ. Để giao theo tài liệu giấy, chọn lại câu gốc trong giỏ.</p>}
                                    <label className="scoring-select">Quy tắc chấm điểm
                                        <select value={scoringMode} onChange={e => { setScoringMode(e.target.value); if (e.target.value === 'exam-1246') setAllowFree(false); }}>
                                            <option value="practice">Luyện tập · Các câu cùng trọng số</option>
                                            <option value="exam-1246">Cấu trúc chuẩn 12–4–6 · Thang 10</option>
                                        </select>
                                    </label>
                                    {scoringMode === 'practice' && (
                                        <label className="sample-checkbox compact-check">
                                            <input type="checkbox" checked={allowFree} onChange={e => setAllowFree(e.target.checked)} />
                                            Cho phép chọn câu Tự luận (chấm tay sau khi thu bài)
                                        </label>
                                    )}
                                    <small className="scoring-help">
                                        {scoringMode === 'exam-1246'
                                            ? 'Yêu cầu đúng 12 TN (0,25đ), 4 Đ/S (tối đa 1đ/câu), 6 TLN (0,5đ). Có thể bấm "Tự bốc đề 12–4–6" ở thanh công cụ.'
                                            : 'Tổng quy về thang 10; mỗi ý Đúng/Sai tính 1/4 câu.'}
                                    </small>
                            <div className="modal-actions studio-review-footer">
                                {maySaveExam && <button type="submit" value="save-exam" className="btn secondary"
                                    disabled={!selected.length || busy}><BookOpen size={16}/> Lưu nháp riêng</button>}
                                <button type="submit" className="btn primary" disabled={!selected.length || !classes.length || busy}>
                                    {busy ? 'Đang tạo…' : <>Tạo phiên kiểm tra <ArrowRight size={17} /></>}
                                </button>
                            </div>
                        </form>
                    </Modal>}
                </section>}

                {view === 'sessions' && <>
                    <div className="page-heading">
                        <div>
                            <div className="eyebrow">QUẢN LÝ PHIÊN & BÀI LÀM</div>
                            <h1>{detail && sessionId ? detail.session.title : isTeacher ? 'Phiên của tôi' : 'Các phiên kiểm tra'}</h1>
                            <p>{sessionId ? 'Theo dõi bài nộp, gia hạn thời gian hoặc mở trình chiếu chữa bài.' : 'Chọn một phiên để mở mã QR, theo dõi tiến độ nộp bài, chấm tự luận hoặc trình chiếu chữa bài.'}</p>
                        </div>
                        <div className="toolbar-actions">
                            {sessionId && detail && mayAuthor && <button className="btn secondary" onClick={() => setCloneModal({ id: detail.session.id, title: detail.session.title, classroom_id: classes[0]?.id || detail.session.classroom_id, minutes: detail.session.minutes })}><Copy size={15} /> Giao đề cho lớp khác</button>}
                            {sessionId && detail && maySaveExam && <button className="btn secondary" disabled={busy} onClick={()=>void saveSessionAsExam(detail.session.id)}>
                                <BookOpen size={15}/> Lưu thành đề
                            </button>}
                            <button className="btn secondary" onClick={() => { if (sessionId) void loadDetail(sessionId); else void reload(); }}><RotateCw size={15} /> Làm mới</button>
                        </div>
                    </div>
                    {sessionId && detail ? <>
                        <div className="session-tools">
                            <button className="text-btn" onClick={() => { setSessionId(''); setDetail(null); void reload(); }}>← Tất cả phiên</button>
                            <Pill tone={detail.session.state === 'open' ? 'green' : 'gray'}>{detail.session.state === 'open' ? 'Đang mở' : 'Đã đóng'}</Pill>
                            <span>Lớp <b>{detail.session.class_label}</b> · {detail.questions.length} câu · {detail.session.minutes} phút · {detail.session.scoring_mode === 'exam-1246' ? 'Cấu trúc 12–4–6' : 'Chấm luyện tập'}</span>
                        </div>
                        <div className="join-share card">
                            <div>
                                <span className="eyebrow">MÃ THAM GIA PHIÊN</span>
                                <button className="code-display" onClick={() => void copy(detail.session.code)} title="Sao chép mã">{detail.session.code}<Copy size={18} /></button>
                                <p>Học sinh quét QR qua Wi-Fi nội bộ hoặc mở <code>/hoc-sinh?code={detail.session.code}</code>, nhập STT để làm bài.</p>
                            </div>
                            <div className="session-control-group">
                                <div className="toolbar-actions">
                                    <a className="btn primary" href={'/hoc-sinh?code=' + detail.session.code} target="_blank" rel="noreferrer"><GraduationCap size={17} /> Mở màn hình học sinh <ArrowUpRight size={15} /></a>
                                    <button className="btn secondary" onClick={() => setShareSession(detail.session)}><Wifi size={16} /> QR & Kết nối</button>
                                </div>
                                <div className="extend-bar">
                                    <span><ClockPlus size={14} /> Gia hạn thời gian:</span>
                                    {[3, 5, 10].map(m => <button key={m} type="button" className="btn secondary sm" disabled={busy} onClick={() => void extendSession(detail.session.id, m)}>+{m} phút</button>)}
                                    {detail.session.state === 'open' && <button className="text-btn danger" onClick={() => setConfirmClose(true)}>Đóng phiên & Chấm bài</button>}
                                </div>
                            </div>
                        </div>
                        <ReportPanel
                            key={detail.session.id}
                            detail={detail}
                            onPreview={q => setPreview(q as Q)}
                            onReset={setResetDevice}
                            onGradeFree={gradeFreeQuestion}
                            renderQuestion={(q, answer) => <QuestionBody q={q as Q} answer={answer} readOnly />}
                        />
                    </> : sessionId ? <div className="card"><Empty title="Đang tải dữ liệu phiên…" text="Nếu chưa thấy dữ liệu, hãy bấm Làm mới." /></div> : !data!.sessions.length ? <section className="card"><Empty title="Chưa có phiên kiểm tra" text="Chọn đề đã lưu và giao cho một lớp để tạo phiên đầu tiên." action={<button className="btn primary" onClick={() => nav('exams')}><Plus size={16} /> Tạo phiên đầu tiên</button>} /></section> : (
                        <div className="session-grid">
                            {data!.sessions.map((s: Any) => (
                                <div className="card session-tile" key={s.id}>
                                    <div className="session-tile-top">
                                        <span className="session-icon"><ClipboardList size={21} /></span>
                                        <Pill tone={s.state === 'open' ? 'green' : 'gray'}>{s.state === 'open' ? 'Đang mở' : 'Đã đóng'}</Pill>
                                    </div>
                                    <button type="button" className="session-tile-body" onClick={() => { setDetail(null); setSessionId(s.id); }}>
                                        <h2>{s.title}</h2>
                                        <p>Lớp {s.class_label} · {s.question_count} câu · {s.minutes} phút</p>
                                    </button>
                                    <div className="session-code-row">
                                        <code>{s.code}</code>
                                        <span><b>{s.submitted}</b>/{s.joined} đã nộp</span>
                                    </div>
                                    <div className="session-tile-actions">
                                        <button type="button" className="btn secondary sm" onClick={() => { setDetail(null); setSessionId(s.id); }}>Xem báo cáo</button>
                                        {s.state === 'open' && <button type="button" className="btn secondary sm" onClick={() => setShareSession(s)}>Mã QR</button>}
                                        {mayAuthor && <button type="button" className="text-btn" onClick={() => setCloneModal({ id: s.id, title: s.title, classroom_id: classes[0]?.id || s.classroom_id, minutes: s.minutes })}>Giao lớp khác</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>}

                {view === 'documents' && <DocumentsPanel data={data!} onSaved={() => void mutated()} onBank={id => { const d = data!.documents.find((d: Any) => d.id === id); setGrade(String(d.grade)); setDocumentId(id); setLesson('all'); setBankChapter('all'); setBankToolsOpen(true); nav('bank'); }} />}
                {view === 'classes' && <ClassesPanel data={data!} onSaved={() => void mutated()} onImport={() => setImportKind('roster')} onOpenSession={id => { nav('sessions'); setSessionId(id); }} />}
                {view === 'network' && <NetworkPanel sessions={data!.sessions} onShare={setShareSession} />}
                {view === 'backup' && <BackupPanel data={data!} onRestored={async () => { clearSelection(); setSessionId(''); setDetail(null); await reload(); }} onSettings={() => nav('settings')} onSessions={() => nav('sessions')} />}
                {view === 'settings' && (isTeacher
                    ? <StaffSettings name={teacherName} first={false} mustChange={false} onSaved={reload} onLogout={()=>void logout()}/>
                    : <SettingsPanel data={data!} onSaved={() => void reload()} onLogout={() => void logout()} />)}
                {view === 'guide' && <>
                    <div className="page-heading">
                        <div>
                            <div className="eyebrow">HƯỚNG DẪN VẬN HÀNH · v0.14</div>
                            <h1>Sử dụng tại lớp & Quản lý dữ liệu</h1>
                            <p>Ứng dụng đóng gói sẵn 5.837 câu đề cương Toán 10–11–12 và hoạt động 100% offline tại máy giáo viên.</p>
                        </div>
                    </div>
                    <div className="guide-grid">
                        <section className="card guide-copy">
                            <h2>Quy trình chuẩn cho một tiết kiểm tra</h2>
                            <ol>
                                <li><b>Khởi động máy chủ:</b> Mở <code>Mo_lop_LAN.bat</code> khi muốn học sinh dùng điện thoại qua Wi-Fi nội bộ, hoặc <code>Chay_web.bat</code> khi chỉ dùng trên laptop.</li>
                                <li><b>Chọn câu hoặc bốc đề:</b> Trong <b>Ngân hàng</b>, chọn khối, chương và bài. Gõ <code>Câu 15</code> để tìm đúng số câu gốc. Dùng <b>Chọn nhanh</b> để thêm hàng loạt hoặc bốc đề 12–4–6.</li>
                                <li><b>Dùng biến thể:</b> Mở <b>Biến thể</b> ở câu Toán 12, xem đề và lời giải rồi đưa vào đề đang soạn. Đề có biến thể dùng chế độ <b>Đề đầy đủ</b>.</li>
                                <li><b>Duyệt câu cần đối chiếu:</b> Nếu có quyền biên tập, mở <b>Xem trước → Đáp án và lời giải</b> để chốt đáp án.</li>
                                <li><b>Giao đề:</b> Chọn <b>Rà đề và giao → Tạo phiên kiểm tra</b> rồi chiếu mã QR. Dùng <b>+3 / +5 phút</b> để bù giờ khi cần.</li>
                                <li><b>Chữa bài & Xuất sổ điểm:</b> Đóng phiên, bật <b>Trình chiếu chữa bài</b> (có bút vẽ), chấm nhanh câu tự luận (nếu có) và xuất Excel.</li>
                            </ol>
                            <div className="info-box"><Info size={18} /><p>Dùng <b>Sao lưu toàn bộ thư mục</b> để giữ cả tài khoản, đề đã lưu và học liệu giáo viên đã đăng.</p></div>
                        </section>
                        <section className="card roadmap">
                            <h2>Các năng lực cốt lõi đã hoàn thiện</h2>
                            {stages.map(([a, b]) => <div className="roadmap-item done" key={a}><span><Check size={16} /></span><div><b>{a}</b><p>{b}</p></div></div>)}
                        </section>
                    </div>
                </>}
            </main>
            <footer className="app-footer"><span>Nguyễn Trọng Hiếu · THPT Trịnh Hoài Đức</span><span>Toán THĐ · v0.14 · Chạy cục bộ tại máy</span></footer>
        </div>

        {planOpen && <StudioPlanDialog plan={studioPlan} onClose={() => setPlanOpen(false)}
            onBrowse={() => browseStudio('all')} onOpen={openStudioResource}
            onRemove={resource => {
                if (!studioPlan.update(resource, false)) notify('Trình duyệt chưa lưu được thay đổi kế hoạch.');
            }} />}
        {shareSession && <ShareDialog session={shareSession} onClose={() => setShareSession(null)} />}
        {mayAuthor && cloneModal && <Modal title="Giao lại đề này cho lớp khác" onClose={() => setCloneModal(null)}>
            <form className="modal-content" onSubmit={submitCloneSession}>
                <p>Tạo một phiên kiểm tra mới giữ nguyên bộ câu hỏi và quy tắc chấm của phiên gốc.</p>
                <label>Tên phiên mới<input required maxLength={160} value={cloneModal.title} onChange={e => setCloneModal({ ...cloneModal, title: e.target.value })} /></label>
                <div className="form-grid two">
                    <label>Chọn lớp nhận đề<select value={cloneModal.classroom_id} onChange={e => setCloneModal({ ...cloneModal, classroom_id: e.target.value })}>{classes.map((c: Any) => <option key={c.id} value={c.id}>{c.label} · {c.school_year}</option>)}</select></label>
                    <label>Thời gian làm bài (phút)<input type="number" min="1" max="180" required value={cloneModal.minutes} onChange={e => setCloneModal({ ...cloneModal, minutes: Number(e.target.value) })} /></label>
                </div>
                <div className="modal-actions">
                    <button type="button" className="btn secondary" onClick={() => setCloneModal(null)}>Hủy</button>
                    <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Đang tạo…' : 'Mở phiên cho lớp này'}</button>
                </div>
            </form>
        </Modal>}
        {resetDevice && <Modal title="Cho học sinh đổi thiết bị?" onClose={() => setResetDevice(null)}>
            <div className="modal-content">
                <p><b>{resetDevice.name} · STT {resetDevice.ordinal}</b></p>
                <p>Thiết bị cũ sẽ mất quyền lưu/nộp. Học sinh quét lại QR, nhập cùng STT trên thiết bị mới; bài đã lưu và thời gian còn lại giữ nguyên.</p>
                <div className="modal-actions">
                    <button className="btn secondary" onClick={() => setResetDevice(null)}>Hủy</button>
                    <button className="btn primary" onClick={async () => { try { await api('teacher/device-reset', 'POST', { attempt_id: resetDevice.attempt_id }); setResetDevice(null); await loadDetail(sessionId); notify('Đã cho đổi thiết bị. Học sinh quét QR và vào lại cùng STT.'); } catch (e: any) { notify(e.message); } }}>Cho đổi thiết bị</button>
                </div>
            </div>
        </Modal>}
        {toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}</div>}
        {mayAuthor && view === 'bank' && variantSource && <VariantDialog
            key={variantSource.id}
            question={variantSource}
            previousKey={variants.get(variantSource.id)?.variant.key}
            onClose={() => setVariantSource(null)}
            onUse={draft => useVariant(variantSource, draft)}
        />}
        {preview && <Modal title={'Câu ' + preview.original_number + ' · ' + preview.lesson_title} focusOnOpen onClose={() => setPreview(null)}>
            <div className="question-modal">
                <div className="modal-meta">
                    <Pill tone="gray">{kinds[preview.kind]}</Pill>
                    {preview.variant && <Pill>{variantLabel(preview.variant.number)}</Pill>}
                    {preview.verified_override && <Pill tone="green">Đã chốt đáp án</Pill>}
                    <small>{preview.document_title} · {preview.edition}</small>
                </div>
                <QuestionBody q={preview} readOnly />
                <details className="studio-solution-details" open={mayEditBank && preview.bank_status === 'review' ? true : undefined}>
                <summary>Đáp án và lời giải</summary>
                {(preview.bank_note || preview.bank_status === 'review' || preview.verified_override) && (
                    <div className="bank-review-note">
                        {preview.bank_note && <><b>Ghi chú đối chiếu nguồn</b><p>{preview.bank_note}</p></>}
                        {mayEditBank && <ResolveKeyBox q={preview} notify={notify} onResolved={updated => {
                            setPreview(updated);
                            setBankRows(old => old.map(x => x.id === updated.id ? { ...x, ...updated } : x));
                            setQuestionCache(old => old.map(x => x.id === updated.id ? { ...x, ...updated } : x));
                            void reload();
                        }} />}
                    </div>
                )}
                <div className="solution">
                    <b>Đáp án: {Array.isArray(preview.correct) ? preview.correct.map((v: boolean, i: number) => 'abcd'[i] + ') ' + (v ? 'Đúng' : 'Sai')).join(' · ') : preview.correct ?? 'Chấm tay / xem lời giải'}</b>
                    {preview.answer_unit && <p>Đơn vị đáp số: {preview.answer_unit}</p>}
                    <Rich html={preview.solution} />
                </div>
                <code className="source-id">{preview.id}</code></details>
                {mayAuthor && view === 'bank' && !preview.archived_at && <div className="modal-actions studio-preview-choose">
                    {preview.variant && <button type="button" className="btn secondary" onClick={() => { useOriginal(preview.id); setPreview(null); notify('Đã bỏ biến thể trong đề.'); }}>Dùng lại câu gốc</button>}
                    {!preview.variant && preview.variant_available && <button type="button" className="btn secondary" onClick={() => { setVariantSource(preview); setPreview(null); }}><Copy size={15} /> Xem biến thể</button>}
                    {selected.includes(preview.id) ? <button type="button" className="btn secondary" onClick={() => { unselect(preview.id); setPreview(null); }}><X size={15} /> Bỏ khỏi đề</button>
                    : <button type="button" className="btn primary" disabled={!isEligible(preview) || selected.length >= 100} onClick={() => {
                        selectMany([preview.id], [preview]); setPreview(null); notify('Đã thêm Câu ' + preview.original_number + ' vào đề.');
                    }}><Plus size={15} /> Thêm vào đề</button>}
                </div>}
                {mayAuthor && view === 'bank' && !preview.archived_at && !isEligible(preview) && !selected.includes(preview.id) &&
                    <p className="scoring-help">{preview.kind === 'free' ? 'Mở Bộ lọc và bật “Cho phép chọn câu tự luận” trong chế độ Luyện tập.' : 'Câu gốc cần được đối chiếu đáp án trước khi đưa vào đề.'}</p>}
            </div>
        </Modal>}
        {confirmClose && detail && <Modal title="Đóng phiên kiểm tra?" onClose={() => setConfirmClose(false)}>
            <div className="modal-content">
                <p>Các bài đang làm sẽ được chấm theo những đáp án đã lưu trên máy chủ. Học sinh không thể sửa bài sau khi đóng.</p>
                <div className="modal-actions">
                    <button className="btn secondary" onClick={() => setConfirmClose(false)}>Tiếp tục mở</button>
                    <button className="btn primary" onClick={async () => {
                        try { await api('teacher/close', 'POST', { id: detail.session.id }); setConfirmClose(false); await loadDetail(detail.session.id); await reload(); notify('Đã đóng phiên và chấm các bài đã lưu.'); }
                        catch (e: any) { notify(e.message); }
                    }}>Đóng phiên</button>
                </div>
            </div>
        </Modal>}
        {mayEditBank && editor && <QuestionEditor data={{ ...data!, documents: data!.documents.filter((d: Any) => !d.is_bundled), lessons: data!.lessons.filter((l: Any) => !data!.documents.find((d: Any) => d.id === l.document_id)?.is_bundled) }} question={editor.question} initialSource={editor.source} defaultLesson={data!.lessons.find((l: Any) => l.id === lesson && !data!.documents.find((d: Any) => d.id === l.document_id)?.is_bundled)?.id} onClose={() => setEditor(null)} onSaved={() => void mutated()} />}
        {mayEditBank && historyQ && <HistoryDialog question={historyQ} onClose={() => setHistoryQ(null)} onRestore={source => { setEditor({ question: historyQ, source }); setHistoryQ(null); }} />}
        {importKind && (importKind === 'bank' ? mayEditBank : mayManageRosters) && <ImportDialog kind={importKind} data={data!} onClose={() => setImportKind(null)} onSaved={() => void mutated()} />}
    </div>;
}

function StudentApp() {
    const [code, setCode] = useState(''), [ordinal, setOrdinal] = useState(''), [session, setSession] = useState<Any | null>(null), [name, setName] = useState(''), [attempt, setAttempt] = useState<Any | null>(null), [answers, setAnswers] = useState<Any>({}), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saveStatus, setSaveStatus] = useState('Đã lưu'), [saveError, setSaveError] = useState(false), [confirm, setConfirm] = useState(false), [remaining, setRemaining] = useState(0), [now, setNow] = useState(Date.now()), [blocked, setBlocked] = useState(false), [draftChoice, setDraftChoice] = useState<Any | null>(null), [storageWarning, setStorageWarning] = useState(false);
    const answersRef = useRef<Any>({}), syncRef = useRef<any>(null), autoSubmit = useRef(false), offset = useRef(0), submissionWanted = useRef(false), submitting = useRef(false), tokenRef = useRef('');
    const localKey = (c: string, n: string) => 'toanthd_attempt:' + c.trim().toUpperCase() + ':' + String(Number(n));
    function accept(a: Any, recovered?: Any) {
        syncRef.current?.dispose(); syncRef.current = null; tokenRef.current = a.token;
        setAttempt(a); setCode(a.session.code); setSession(a.session); setOrdinal(String(a.student.ordinal)); setNow(Date.now());
        offset.current = a.server_time - Date.now(); setRemaining(Math.max(0, a.session.closes_at - a.server_time)); setError(''); setBlocked(false); setDraftChoice(null); setSaveError(false);
        submissionWanted.current = !!storeGet('toanthd_submit:' + a.token);
        const pending = readPending(storeGet('toanthd_pending:' + a.token), a);
        let initial = a.answers, dirty = false;
        if (recovered) { initial = recovered; dirty = true; }
        else if (pending && !pending.alreadySaved) {
            if (pending.conflict) { setDraftChoice({ attempt: a, pending }); setBlocked(true); setSaveStatus('Cần đối chiếu bản nháp'); setSaveError(true); }
            else { initial = pending.answers; dirty = true; }
        }
        else storeRemove('toanthd_pending:' + a.token);
        answersRef.current = initial; setAnswers(initial);
        if (!storeSet('toanthd_last_attempt', JSON.stringify({ token: a.token, code: a.session.code })) || !storeSet(localKey(a.session.code, String(a.student.ordinal)), a.token)) setStorageWarning(true);
        if (a.submitted_at) { storeRemove('toanthd_pending:' + a.token); storeRemove('toanthd_submit:' + a.token); submissionWanted.current = false; setSaveStatus('Đã nộp'); return; }
        syncRef.current = createAttemptSync({
            answers: a.answers, revision: a.save_revision,
            save: (next: Any, revision: number) => api('public/save', 'POST', { answers: next, expected_revision: revision }, a.token),
            refresh: () => api('public/attempt', 'GET', undefined, a.token),
            onPending: (value: Any) => { if (!storeSet('toanthd_pending:' + a.token, JSON.stringify(value))) setStorageWarning(true); },
            onAck: () => storeRemove('toanthd_pending:' + a.token),
            onStatus: (status: string, text: string) => { setSaveStatus(text); setSaveError(['offline', 'blocked'].includes(status)); if (status === 'blocked') setBlocked(true); },
            onSettled: accept
        });
        if (dirty) syncRef.current.change(initial); else if (!pending?.conflict) setSaveStatus('Đã lưu trên máy chủ');
    }
    useEffect(() => {
        const c = (new URLSearchParams(window.location.search).get('code') || '').trim().toUpperCase().slice(0, 6); setCode(c);
        const last = storeGet('toanthd_last_attempt'); if (last) { try { const saved = JSON.parse(last); if (!c || saved.code === c) { setLoading(true); api('public/attempt', 'GET', undefined, saved.token).then(a => accept(a)).catch((e: any) => setError(e.message)).finally(() => setLoading(false)); } } catch { } }
        const before = (e: BeforeUnloadEvent) => { if (syncRef.current?.dirty) { e.preventDefault(); e.returnValue = ''; } };
        window.addEventListener('beforeunload', before);
        return () => { syncRef.current?.dispose(); window.removeEventListener('beforeunload', before); };
    }, []);
    useEffect(() => { if (!attempt || attempt.submitted_at) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [attempt?.token, attempt?.submitted_at]);
    useEffect(() => {
        if (!attempt || attempt.submitted_at) return; const left = Math.max(0, attempt.session.closes_at - (now + offset.current)); setRemaining(left);
        if (left === 0 && !autoSubmit.current) { autoSubmit.current = true; void submit(true); }
    }, [now, attempt]);
    useEffect(() => {
        if (!attempt || attempt.submitted_at) return;
        let working = false, cancelled = false;
        const tick = async () => {
            if (working || cancelled || draftChoice) return; working = true;
            try {
                if (submissionWanted.current || Date.now() + offset.current >= attempt.session.closes_at) { await submit(Date.now() + offset.current >= attempt.session.closes_at); return; }
                if (syncRef.current?.dirty && !syncRef.current?.blocked) await syncRef.current.flush();
                const h = await api('public/heartbeat', 'POST', {}, attempt.token);
                if (cancelled) return;
                offset.current = h.server_time - Date.now(); setNow(Date.now());
                if (h.closes_at && attempt.session.closes_at !== h.closes_at) {
                    setAttempt((old: Any) => old ? { ...old, session: { ...old.session, closes_at: h.closes_at } } : old);
                }
                if (h.attempt) accept(h.attempt);
            } catch (e: any) { if (!cancelled && e.status === 401) { syncRef.current?.dispose(); setBlocked(true); setError(e.message); } }
            finally { working = false; }
        };
        const timer = setInterval(() => void tick(), 10000), online = () => void tick(); window.addEventListener('online', online);
        return () => { cancelled = true; clearInterval(timer); window.removeEventListener('online', online); };
    }, [attempt?.token, attempt?.submitted_at, !!draftChoice]);
    async function lookup(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(''); setName(''); try { const s = await api('public/session?code=' + encodeURIComponent(code.toUpperCase())); setSession(s); const result = await api('public/lookup', 'POST', { code, ordinal: Number(ordinal) }); setName(result.name); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }
    async function join() { setBusy(true); setError(''); try { const a = await api('public/join', 'POST', { code, ordinal: Number(ordinal), token: storeGet(localKey(code, ordinal)) }); autoSubmit.current = false; accept(a); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }
    function persist() { return syncRef.current?.flush() || Promise.resolve(); }
    function change(q: Q, value: any) { if (blocked || remaining <= 0) return; const next = { ...answersRef.current, [q.id]: value }; answersRef.current = next; setAnswers(next); syncRef.current?.change(next); }
    async function submit(expired = false) {
        if (!attempt || attempt.submitted_at || submitting.current) return;
        if (blocked && !expired) { setError('Tải lại bài và đối chiếu bản nháp trước khi nộp.'); return; }
        submitting.current = true; submissionWanted.current = true; storeSet('toanthd_submit:' + attempt.token, '1'); setBusy(true); setError(''); setConfirm(false);
        try { if (!expired) await persist(); const a = await api('public/submit', 'POST', {}, attempt.token); accept(a); setSaveError(false); }
        catch (e: any) { setError(e.status ? e.message : 'Chưa nộp được. Giữ trang mở; bài sẽ tự thử gửi lại khi kết nối trở lại.'); if (e.status === 401) { syncRef.current?.dispose(); setBlocked(true); submissionWanted.current = false; storeRemove('toanthd_submit:' + attempt.token); } }
        finally { submitting.current = false; setBusy(false); }
    }
    async function reloadAttempt() { try { setLoading(true); accept(await api('public/attempt', 'GET', undefined, tokenRef.current)); } catch (e: any) { setError(e.message); } finally { setLoading(false); } }
    function reset() { syncRef.current?.dispose(); syncRef.current = null; tokenRef.current = ''; setAttempt(null); setSession(null); setName(''); setOrdinal(''); setError(''); setSaveError(false); setSaveStatus('Đã lưu'); setBlocked(false); setDraftChoice(null); storeRemove('toanthd_last_attempt'); autoSubmit.current = false; submissionWanted.current = false; }
    const completed = attempt ? answeredCount(attempt.questions, answers) : 0;
    const seconds = Math.ceil(remaining / 1000), clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    return <div className="student-shell"><header className="student-header"><Brand /><Pill tone="gray"><GraduationCap size={15} /> Không gian học sinh</Pill></header><main className={'student-main ' + (!attempt ? 'student-lobby' : '')}><div className="student-demo"><Info size={14} /> Kết nối tới máy giáo viên · Giữ trang này khi làm bài</div>{loading ? <Empty title="Đang tiếp tục bài làm…" text="Đọc bài đã lưu trên máy chủ." /> : !attempt ? <><div className="student-welcome"><span className="student-welcome-icon"><GraduationCap size={32} /></span><div className="eyebrow">PHIÊN KIỂM TRA TRÊN LỚP</div><h1>Sẵn sàng làm bài?</h1><p>Nhập mã phiên thầy cung cấp và số thứ tự (STT) của em trong danh sách lớp.</p></div><section className="card join-card"><form onSubmit={lookup}><label>Mã tham gia<input value={code} maxLength={6} autoComplete="off" autoCapitalize="characters" className="code-input" placeholder="VD: ABC234" onChange={e => { setCode(e.target.value.toUpperCase().replace(/\s/g, '')); setName(''); setSession(null); }} required /></label><label>Số thứ tự trong lớp<input value={ordinal} type="number" min="1" max="999" placeholder="VD: 7" onChange={e => { setOrdinal(e.target.value); setName(''); }} required /></label><button className="btn primary wide" disabled={busy}>{busy ? 'Đang tìm…' : <>Kiểm tra tên của em <ArrowRight size={17} /></>}</button></form>{name && session && <div className="student-confirm"><CheckCircle2 size={24} /><div><small>XÁC NHẬN HỌ TÊN</small><b>{name}</b><p>{session.class_label} · STT {ordinal}</p><p>{session.title}</p></div><button className="btn dark wide" disabled={busy} onClick={() => void join()}>Đúng, vào làm bài <ArrowRight size={17} /></button></div>}{error && <p role="alert" className="form-error">{error}</p>}</section><a className="back-teacher" href="/">← Về không gian giáo viên</a></> : attempt.submitted_at ? <section className="card result-card"><div className="result-check"><CheckCircle2 size={44} /></div><Pill>BÀI ĐÃ ĐƯỢC LƯU</Pill><h1>Em đã hoàn thành!</h1><p>{attempt.student.name} · {attempt.session.class_label}</p><div className="result-score"><b>{fmt(attempt.score)}</b><span>/ 10</span></div><p>{attempt.session.title}</p><div className="info-box"><Info size={17} /><p>{attempt.session.scoring_mode === 'exam-1246' ? 'Cấu trúc 12–4–6: trắc nghiệm 0,25; trả lời ngắn 0,5; mỗi câu Đúng/Sai đạt 0/0,1/0,25/0,5/1 điểm theo số ý đúng.' : 'Chấm luyện tập: các câu cùng trọng số; mỗi ý Đúng/Sai bằng 1/4 câu.'} Thầy xem bài của em trong màn hình phiên kiểm tra.</p></div><button className="btn primary" onClick={reset}>Vào phiên khác <ArrowRight size={17} /></button></section> : <><section className="student-title"><div><Pill tone="gray">{attempt.session.class_label} · STT {attempt.student.ordinal}</Pill><h1>{attempt.session.title}</h1><p>{attempt.student.name}</p></div><div className={'countdown ' + (seconds < 60 ? 'urgent' : '')}><Clock size={19} /><b>{clock}</b><small>còn lại</small></div></section><div className="student-progress"><span><b>{completed}/{attempt.questions.length}</b> câu đã trả lời</span><div className="progress-track"><i style={{ width: completed / attempt.questions.length * 100 + '%' }} /></div><button className={'save-status ' + (saveError ? 'error' : '')} onClick={() => void persist().catch(() => { })}>{saveError ? <AlertCircle size={14} /> : <Check size={14} />} {saveStatus}</button></div>{attempt.session.mode === 'paper' && <div className="info-box"><BookOpen size={18} /><p><b>Chế độ tài liệu giấy.</b> Đọc đề trong tài liệu và chọn câu trả lời theo đúng số câu, bài học hiển thị bên dưới.</p></div>}<div className="student-sync-note">{storageWarning && <p className="form-error">Trình duyệt không lưu được bản nháp trên thiết bị. Giữ trang mở và kiểm tra trạng thái đã lưu trên máy chủ.</p>}{blocked && <div className="lan-note"><AlertCircle size={18} /><div><p>{saveStatus}</p><button className="btn secondary" onClick={() => void reloadAttempt()}>Tải lại bài</button><button className="text-btn" onClick={reset}>Vào lại phiên</button></div></div>}{saveError && !blocked && <p role="status">Kết nối chưa ổn định. Giữ trang mở; hệ thống tự thử lưu lại. Hết giờ chỉ chấm phần đã tới máy chủ.</p>}</div><div className="question-jump">{attempt.questions.map((q: Q, i: number) => <a className={answeredCount([q], answers) ? 'answered' : ''} key={q.id} href={'#question-' + i} title={q.lesson_title}>{q.original_number}</a>)}</div>{attempt.questions.map((q: Q, i: number) => <section className="card student-question" id={'question-' + i} key={q.id}><div className="question-top"><b>Câu {q.original_number}</b><Pill tone="gray">{kinds[q.kind]}</Pill><small>{i + 1}/{attempt.questions.length}</small></div><div className="student-source">{q.lesson_title}</div>{attempt.session.mode === 'online' ? <QuestionBody q={q} answer={answers[q.id]} onChange={a => change(q, a)} readOnly={blocked || remaining <= 0} /> : <QuestionBody q={{ ...q, prompt: '', choices: q.kind === 'mcq' ? q.choices.map(c => ({ ...c, text: '' })) : q.kind === 'tf' ? q.choices.map(c => ({ ...c, text: 'Ý ' + c.key })) : [] }} answer={answers[q.id]} onChange={a => change(q, a)} readOnly={blocked || remaining <= 0} />}</section>)}{error && <p className="form-error" role="alert">{error}</p>}<div className="submit-bar"><div><b>{completed}/{attempt.questions.length} câu đã trả lời</b><small>Kiểm tra lại trước khi nộp bài.</small></div><button className="btn primary" disabled={busy || blocked} onClick={() => setConfirm(true)}>{busy ? 'Đang nộp…' : <>Nộp bài <ArrowRight size={18} /></>}</button></div></>}</main><footer className="student-footer">Toán THĐ · Nguyễn Trọng Hiếu · THPT Trịnh Hoài Đức</footer>{draftChoice && <Modal title="Đối chiếu bản nháp trên thiết bị" onClose={() => { }}><div className="modal-content"><p>Máy chủ đã có bản lưu mới hơn trong lúc thiết bị này mất kết nối. Chọn bản muốn tiếp tục; không tự ghi đè bài.</p><p>Bản trên máy chủ: {answeredCount(draftChoice.attempt.questions, draftChoice.attempt.answers)} câu. Bản nháp thiết bị: {answeredCount(draftChoice.attempt.questions, draftChoice.pending.answers)} câu.</p><div className="modal-actions"><button className="btn secondary" onClick={() => { const a = draftChoice.attempt; storeRemove('toanthd_pending:' + a.token); accept(a); }}>Dùng bản trên máy chủ</button><button className="btn primary" onClick={() => { const { attempt: a, pending } = draftChoice; accept(a, pending.answers); }}>Tiếp tục bản nháp thiết bị</button></div></div></Modal>}{confirm && attempt && <Modal title="Nộp bài kiểm tra?" onClose={() => setConfirm(false)}><div className="modal-content"><p>{completed < attempt.questions.length ? `Em còn ${attempt.questions.length - completed} câu chưa trả lời đủ. ` : 'Em đã trả lời tất cả câu. '}Sau khi nộp, em không thể sửa bài.</p><div className="modal-actions"><button className="btn secondary" onClick={() => setConfirm(false)}>Kiểm tra lại</button><button className="btn primary" onClick={() => void submit()}>Xác nhận nộp</button></div></div></Modal>}</div>;
}
