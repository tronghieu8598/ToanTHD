'use client';

import {useState, type FormEvent} from 'react';
import {Copy} from 'lucide-react';

export type IssuedEntryCodes = {
    codes: {ordinal: number; code: string}[];
    expires_at: number;
};

export function StudentEntryCodePanel({initial, onIssue, onCopy}: {
    initial?: IssuedEntryCodes;
    onIssue?: (ordinal?: number) => Promise<IssuedEntryCodes>;
    onCopy: (code: string) => Promise<void>;
}) {
    const [issued, setIssued] = useState(initial);
    const [ordinal, setOrdinal] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function issue(event: FormEvent) {
        event.preventDefault();
        if (!onIssue || busy) return;
        setBusy(true);
        setError('');
        try { setIssued(await onIssue(ordinal ? Number(ordinal) : undefined)); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa phát được mã cá nhân.'); }
        finally { setBusy(false); }
    }

    return <div className="modal-content">
        <p>Gửi riêng từng mã cho đúng học sinh theo STT. Mã dùng một lần và hết hạn tối đa sau 15 phút.</p>
        {onIssue && <form onSubmit={issue}>
            <label>STT cần cấp mã
                <input type="number" min="1" max="999" step="1" value={ordinal}
                    onChange={event => setOrdinal(event.target.value)} placeholder="Để trống để phát cho cả lớp" disabled={busy} />
            </label>
            <p>Mã mới thay thế mã cũ của các em chưa vào bài.</p>
            <button type="submit" className="btn primary" disabled={busy}>
                {busy ? 'Đang cấp mã…' : ordinal ? 'Cấp mã cho STT này' : 'Cấp mã cho học sinh chưa vào'}
            </button>
        </form>}
        {error && <p role="alert" className="form-error">{error}</p>}
        {issued && (issued.codes.length ? <>
            <p role="status">{issued.codes.length} mã hết hạn lúc {new Date(issued.expires_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}.</p>
            <div className="table-wrap">
                <table>
                    <thead><tr><th scope="col">STT</th><th scope="col">Mã cá nhân</th><th scope="col">Sao chép</th></tr></thead>
                    <tbody>{issued.codes.map(({ordinal, code}) => <tr key={ordinal}>
                        <td>{ordinal}</td><td><code>{code}</code></td>
                        <td><button type="button" className="btn secondary sm" onClick={() => void onCopy(code)} aria-label={`Sao chép mã STT ${ordinal}`}><Copy size={15} /> Sao chép</button></td>
                    </tr>)}</tbody>
                </table>
            </div>
        </> : <p role="status">Các học sinh trong phạm vi này đã vào bài hoặc phiên vừa đóng.</p>)}
    </div>;
}
