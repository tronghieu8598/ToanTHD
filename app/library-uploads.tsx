'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {FolderOpen, LockKeyhole, Users, X} from 'lucide-react';
import {chapterRoman, mathChapters, mathGrades, type LibraryResource, type LibraryVisibility, type MathGrade} from '../lib/client/library-catalog';

export type UploadDraft = {file: File; title: string; grade: MathGrade; chapter: number; visibility: LibraryVisibility};
export type UploadAction = 'visibility' | 'trash' | 'restore';
const noItems: LibraryResource[] = [];

async function libraryRequest<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch('/api/teacher/library' + path, {cache: 'no-store', ...options});
    const data = await response.json().catch(() => ({})) as T & {error?: string};
    if (!response.ok) throw new Error(data.error || 'Chưa kết nối được với kho học liệu.');
    return data;
}

export function useLibraryUploads(account: string) {
    const [state, setState] = useState<{key: string; items: LibraryResource[]; error: string}>({key: '', items: noItems, error: ''});
    const generation = useRef(0);
    const activeAccount = useRef('');
    const refresh = useCallback(async () => {
        if (!account) return;
        const version = ++generation.current;
        try {
            const data = await libraryRequest<{items: LibraryResource[]}>('');
            if (version === generation.current) setState({key: account, items: data.items, error: ''});
        } catch (error) {
            if (version === generation.current) setState({key: account, items: noItems, error: (error as Error).message});
        }
    }, [account]);
    useEffect(() => {
        activeAccount.current = account;
        void refresh();
        window.addEventListener('focus', refresh);
        return () => {
            ++generation.current;
            activeAccount.current = '';
            window.removeEventListener('focus', refresh);
        };
    }, [account, refresh]);

    function update(item: LibraryResource) {
        if (activeAccount.current !== account) return;
        ++generation.current;
        setState(previous => {
            if (previous.key !== account) return {key: account, items: [item], error: ''};
            const exists = previous.items.some(value => value.id === item.id);
            return {key: account, error: '', items: exists ? previous.items.map(value => value.id === item.id ? item : value) : [item, ...previous.items]};
        });
        void refresh();
    }
    async function create(draft: UploadDraft) {
        const params = new URLSearchParams({grade: String(draft.grade), chapter: String(draft.chapter), visibility: draft.visibility});
        const data = await libraryRequest<{item: LibraryResource}>('?' + params, {method: 'POST', headers: {
            'X-Title': encodeURIComponent(draft.title), 'X-File-Name': encodeURIComponent(draft.file.name),
        }, body: draft.file});
        update(data.item);
        return data.item;
    }
    async function change(item: LibraryResource, action: UploadAction, visibility?: LibraryVisibility) {
        const data = await libraryRequest<{item: LibraryResource}>('/change', {method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: item.id, revision: item.upload?.revision, action, visibility})});
        update(data.item);
        return data.item;
    }
    return {items: state.key === account ? state.items : noItems, error: state.key === account ? state.error : '', refresh, create, change};
}

export type LibraryUploads = ReturnType<typeof useLibraryUploads>;

export function LibraryUploadDialog({grade, chapter, onClose, onCreate}: {
    grade: MathGrade; chapter: number; onClose: () => void; onCreate: (draft: UploadDraft) => Promise<void>;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const [pickedGrade, setGrade] = useState(grade);
    const [pickedChapter, setChapter] = useState(chapter || 1);
    const [title, setTitle] = useState('');
    const [visibility, setVisibility] = useState<LibraryVisibility>('private');
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (busy || !file) return;
        setError('');
        if (file.size > 5_000_000) { setError('Tệp vượt quá 5 MB. Hãy chọn một tệp nhỏ hơn.'); return; }
        setBusy(true);
        try { await onCreate({file, title: title.trim(), grade: pickedGrade, chapter: pickedChapter, visibility}); }
        catch (error) { setError((error as Error).message); }
        finally { setBusy(false); }
    }

    return <dialog ref={ref} className="studio-upload-dialog" aria-labelledby="upload-title"
        onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
        <form onSubmit={submit}>
            <header><div><small>KHO HỌC LIỆU</small><h2 id="upload-title">Đăng học liệu</h2></div>
                <button type="button" className="icon-btn" aria-label="Đóng" onClick={onClose} disabled={busy}><X size={20} /></button></header>
            <label className="studio-upload-file"><FolderOpen size={22} /><span>Chọn tệp học liệu</span>
                <input type="file" accept=".html,.htm,.pdf,.png,.jpg,.jpeg,.webp,.zip" required disabled={busy} onChange={event => {
                    const next = event.target.files?.[0] ?? null;
                    setFile(next);
                    setError('');
                    if (!title.trim() && next) setTitle(next.name.replace(/\.[^.]+$/, '').slice(0, 160));
                }} /><small>PDF, ảnh, HTML độc lập hoặc ZIP · tối đa 5 MB</small>
            </label>
            <label>Tên học liệu<input value={title} maxLength={160} required onChange={event => setTitle(event.target.value)} disabled={busy} /></label>
            <div className="studio-upload-placement">
                <label>Khối<select value={pickedGrade} onChange={event => { setGrade(Number(event.target.value) as MathGrade); setChapter(1); }} disabled={busy}>
                    {mathGrades.map(value => <option key={value} value={value}>Toán {value}</option>)}</select></label>
                <label>Chương<select value={pickedChapter} onChange={event => setChapter(Number(event.target.value))} disabled={busy}>
                    {mathChapters(pickedGrade).map((name, index) => <option key={name} value={index + 1}>Chương {chapterRoman[index + 1]} · {name}</option>)}</select></label>
            </div>
            <fieldset disabled={busy}><legend>Ai có thể xem?</legend>
                <label><input type="radio" name="upload-visibility" checked={visibility === 'private'} onChange={() => setVisibility('private')} />
                    <LockKeyhole size={16} /><span><b>Riêng tư</b><small>Chỉ mình tôi, để thử nghiệm trước.</small></span></label>
                <label><input type="radio" name="upload-visibility" checked={visibility === 'team'} onChange={() => setVisibility('team')} />
                    <Users size={16} /><span><b>Chia sẻ với tổ</b><small>Giáo viên đã đăng nhập đều có thể xem.</small></span></label>
            </fieldset>
            {error && <p className="studio-inline-error" role="alert">{error}</p>}
            <footer><button type="button" className="btn secondary" onClick={onClose} disabled={busy}>Hủy</button>
                <button type="submit" className="btn primary" disabled={busy || !file || !title.trim()}>{busy ? 'Đang lưu…' : visibility === 'team' ? 'Đăng lên kho tổ' : 'Lưu riêng tư'}</button></footer>
        </form>
    </dialog>;
}
