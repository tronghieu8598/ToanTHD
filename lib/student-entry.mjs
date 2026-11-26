const encoder = new TextEncoder();
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codeLength = 10;
const ttlMs = 15 * 60_000;
const failureLimit = 6;
const classFailureLimit = 180;
const failureWindowMs = 90_000;
const incorrectCode = 'Mã vào bài cá nhân chưa đúng hoặc đã hết hạn. Hỏi giáo viên để nhận mã mới.';
const retryLater = 'Đã thử nhiều lần trong phiên. Chờ 90 giây rồi thử lại.';

const normalize = value => typeof value === 'string' && value.length <= 20 ? value.trim().toUpperCase() : '';
const codePattern = new RegExp(`^[${alphabet}]{${codeLength}}$`);
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(codeLength)), byte => alphabet[byte % alphabet.length]).join('');

export function createStudentEntry({env, database, first, all, must, equal}) {
    async function signingKey() {
        must(env.AUTH_SECRET, 'Chưa cấu hình khóa để phát mã vào bài.', 503);
        return crypto.subtle.importKey('raw', encoder.encode(env.AUTH_SECRET), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
    }

    async function hashCode(key, sessionId, ordinal, code) {
        const data = encoder.encode(JSON.stringify(['student-entry-v1', sessionId, ordinal, code]));
        const signature = await crypto.subtle.sign('HMAC', key, data);
        return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
    }

    async function issueCodes(sessionId, ordinals, closesAt, guard, now) {
        const key = await signingKey();
        const entries = await Promise.all(ordinals.map(async ({ordinal, id}) => {
            const code = newCode();
            return {ordinal, student_id: id, code, code_hash: await hashCode(key, sessionId, ordinal, code)};
        }));
        const expiresAt = Math.min(now + ttlMs, closesAt);
        const issued = await all(`
            INSERT INTO student_entry_codes(session_id,ordinal,code_hash,expires_at)
            SELECT ?,json_extract(value,'$.ordinal'),json_extract(value,'$.code_hash'),?
            FROM json_each(?)
            WHERE EXISTS(SELECT 1 FROM sessions WHERE id=? AND state='open' AND closes_at>?)
              AND ${guard.sql}
              AND NOT EXISTS(SELECT 1 FROM attempts WHERE session_id=? AND student_id=json_extract(value,'$.student_id'))
            ON CONFLICT(session_id,ordinal) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at
            RETURNING ordinal
        `, sessionId, expiresAt, JSON.stringify(entries.map(({code, ...fields}) => fields)), sessionId, now, ...guard.args, sessionId);
        const issuedOrdinals = new Set(issued.map(row => row.ordinal));
        return {codes: entries.filter(entry => issuedOrdinals.has(entry.ordinal)).map(({ordinal, code}) => ({ordinal, code})), expires_at: expiresAt};
    }

    async function authorizeCode(sessionId, ordinal, rawCode) {
        const now = Date.now();
        const state = await first(`SELECT
            (SELECT failure_count FROM student_entry_failures WHERE session_id=? AND ordinal=? AND window_ends_at>?) AS failures,
            (SELECT failure_count FROM student_entry_failures WHERE session_id=? AND ordinal=0 AND window_ends_at>?) AS class_failures,
            (SELECT code_hash FROM student_entry_codes WHERE session_id=? AND ordinal=? AND expires_at>?) AS code_hash`,
        sessionId, ordinal, now, sessionId, now, sessionId, ordinal, now);
        must((state?.failures || 0) < failureLimit && (state?.class_failures || 0) < classFailureLimit, retryLater, 429);
        const code = normalize(rawCode);
        if (codePattern.test(code) && state?.code_hash) {
            const digest = await hashCode(await signingKey(), sessionId, ordinal, code);
            if (await equal(digest, state.code_hash)) return {sessionId, ordinal, digest};
        }
        const writes = await database().prepare(`
            INSERT INTO student_entry_failures(session_id,ordinal,failure_count,window_ends_at)
            VALUES(?,?,1,?),(?,0,1,?)
            ON CONFLICT(session_id,ordinal) DO UPDATE SET
              failure_count=CASE WHEN window_ends_at<=? THEN 1 ELSE failure_count+1 END,
              window_ends_at=CASE WHEN window_ends_at<=? THEN excluded.window_ends_at ELSE window_ends_at END
            WHERE window_ends_at<=? OR failure_count<CASE WHEN ordinal=0 THEN ? ELSE ? END
        `).bind(sessionId, ordinal, now + failureWindowMs, sessionId, now + failureWindowMs,
            now, now, now, classFailureLimit, failureLimit).run();
        must(writes.meta?.changes, retryLater, 429);
        must(false, incorrectCode, 403);
    }

    async function renewDevice(session, attempt, ordinal, guard, now, revokedToken) {
        const code = newCode(), digest = await hashCode(await signingKey(), session.id, ordinal, code);
        const expiresAt = Math.min(now + ttlMs, session.closes_at);
        const result = await database().batch([
            database().prepare(`
                UPDATE attempts SET token=?,allow_rejoin=1,last_seen_at=0
                WHERE id=? AND submitted_at IS NULL AND token=? AND ${guard.sql}
                  AND EXISTS(SELECT 1 FROM sessions WHERE id=? AND state='open' AND closes_at>?)
            `).bind(revokedToken, attempt.id, attempt.token, ...guard.args, session.id, now),
            database().prepare(`
                INSERT INTO student_entry_codes(session_id,ordinal,code_hash,expires_at)
                SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM attempts WHERE id=? AND token=?)
                ON CONFLICT(session_id,ordinal) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at
            `).bind(session.id, ordinal, digest, expiresAt, attempt.id, revokedToken),
        ]);
        must(result[0].meta?.changes, 'Bài làm hoặc quyền vừa thay đổi. Làm mới để kiểm tra.', 409);
        return {ok: true, entry_code: code, expires_at: expiresAt};
    }

    function guardClaim(entry, now) {
        return entry ? {
            sql: ' AND EXISTS(SELECT 1 FROM student_entry_codes WHERE session_id=? AND ordinal=? AND code_hash=? AND expires_at>?)',
            args: [entry.sessionId, entry.ordinal, entry.digest, now],
        } : {sql: '', args: []};
    }

    async function claim(statement, entry, token) {
        if (!entry) return statement.run();
        const [result] = await database().batch([
            statement,
            database().prepare(`
                DELETE FROM student_entry_codes WHERE session_id=? AND ordinal=? AND code_hash=?
                AND EXISTS(SELECT 1 FROM attempts WHERE token=?)
            `).bind(entry.sessionId, entry.ordinal, entry.digest, token),
        ]);
        return result;
    }

    return {issueCodes, authorizeCode, renewDevice, guardClaim, claim};
}
