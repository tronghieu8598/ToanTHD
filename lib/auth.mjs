import {pbkdf2Sync} from 'node:crypto';
import {COURSE_DOCUMENT_SQL} from './course-bank.mjs';
import {staffPermissions} from './access.mjs';

const cookieName = 'toanthd_teacher';
const encoder = new TextEncoder();
const workFactor = 600000;
const hex = bytes => [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('');
const derive = (password, salt, iterations = workFactor) => pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
export const normalizeUsername = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
export const validStaffPassword = value => typeof value === 'string' && value.length >= 12 && value.length <= 200 && value !== 'toanthd-demo';
export function newStaffPassword(password) {
  const salt = crypto.randomUUID();
  return {salt, hash: derive(password, salt), epoch: crypto.randomUUID()};
}

export function publicAccount(row) {
  const grants = JSON.parse(row.permissions);
  return {
    id: row.id, username: row.username, display_name: row.display_name, enabled: row.enabled === 1,
    must_change_password: row.must_change_password === 1, revision: row.revision,
    permissions: Object.fromEntries(staffPermissions.map(key => [key, grants[key] === true])),
    allowed_class_ids: JSON.parse(row.allowed_class_ids),
    selected_class_ids: row.selected_class_ids == null ? null : JSON.parse(row.selected_class_ids),
  };
}

export function createAuth({env, database, first, must}) {
  const read = async key => (await first('SELECT value FROM workspace_settings WHERE key=?', key))?.value;
  const equal = async (a, b) => {
    const [x, y] = await Promise.all([a, b].map(s => crypto.subtle.digest('SHA-256', encoder.encode(String(s)))));
    const aa = new Uint8Array(x), bb = new Uint8Array(y);
    let diff = 0;
    for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
    return diff === 0;
  };
  const sign = async value => {
    must(env.AUTH_SECRET, 'Chưa có khóa cục bộ. Chạy bước cài đặt.', 503);
    const key = await crypto.subtle.importKey('raw', encoder.encode(env.AUTH_SECRET), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
    return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  };
  const hasReal = async () => !!(await first(`
    SELECT EXISTS(SELECT 1 FROM documents WHERE is_sample=0 AND id NOT IN (${COURSE_DOCUMENT_SQL}))
      OR EXISTS(SELECT 1 FROM classrooms WHERE is_sample=0)
      OR EXISTS(SELECT 1 FROM teacher_accounts)
      OR EXISTS(SELECT 1 FROM saved_exams)
      OR EXISTS(SELECT 1 FROM workspace_settings WHERE key='backup_has_real' AND value='1') AS n
  `))?.n;
  const custom = async () => !!(await read('password_hash')) || !!(env.TEACHER_PASSWORD && env.TEACHER_PASSWORD !== 'toanthd-demo');
  const verifyAdmin = async password => {
    const row = await first(`SELECT
      (SELECT value FROM workspace_settings WHERE key='password_hash') AS hash,
      (SELECT value FROM workspace_settings WHERE key='password_salt') AS salt,
      (SELECT value FROM workspace_settings WHERE key='password_iterations') AS iterations,
      COALESCE((SELECT value FROM workspace_settings WHERE key='auth_epoch'),'1') AS epoch`);
    const iterations = Number(row.iterations) === workFactor ? workFactor : 100000;
    const valid = row.hash ? await equal(derive(password, row.salt, iterations), row.hash)
      : !!env.TEACHER_PASSWORD && await equal(password, env.TEACHER_PASSWORD);
    return {valid, epoch: row.epoch};
  };

  async function issue(scope, url, epoch, id = null) {
    const currentEpoch = epoch ?? ((await read('auth_epoch')) || '1');
    const payload = [Date.now() + 43200000, scope, currentEpoch, ...(id ? [id] : [])].join('.');
    const secure = new URL(url).protocol === 'https:' ? '; Secure' : '';
    return `${cookieName}=${payload}.${await sign(payload)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}`;
  }
  async function login(username, password, url) {
    const handle = username === undefined ? 'admin' : normalizeUsername(username);
    const message = 'Tên đăng nhập hoặc mật khẩu chưa đúng.';
    must(typeof password === 'string' && password.length > 0 && password.length <= 200, message, 401);
    if (handle === 'admin') {
      const checked = await verifyAdmin(password);
      must(checked.valid, message, 401);
      return issue('password', url, checked.epoch);
    }
    const row = await first('SELECT id,password_salt,password_hash,auth_epoch,enabled FROM teacher_accounts WHERE username=?', handle);
    const hash = derive(password, row?.password_salt || 'missing-staff-account');
    const valid = await equal(hash, row?.password_hash || 'invalid');
    must(row?.enabled === 1 && valid, message, 401);
    return issue('account', url, row.auth_epoch, row.id);
  }

  async function requireTeacher(request) {
    const value = (request.headers.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1) || '';
    const parts = value.split('.');
    const [expires, scope, epoch, id] = parts;
    const signature = parts.at(-1);
    const validParts = scope === 'account' ? parts.length === 5 : parts.length === 4 && ['demo', 'password'].includes(scope);
    must(validParts && Number(expires) > Date.now() && epoch && signature, 'Vui lòng đăng nhập không gian giáo viên.', 401);
    must(await equal(signature, await sign(parts.slice(0, -1).join('.'))), 'Phiên đăng nhập không hợp lệ.', 401);
    if (scope === 'account') {
      const row = await first('SELECT * FROM teacher_accounts WHERE id=?', id);
      must(row?.enabled === 1 && row.auth_epoch === epoch, 'Tài khoản đã đổi mật khẩu hoặc bị khóa. Vui lòng đăng nhập lại.', 401);
      const account = publicAccount(row);
      const classIds = (account.selected_class_ids || []).filter(cid => account.allowed_class_ids.includes(cid));
      return {scope, role: 'teacher', id, epoch, account, permissions: account.permissions, classIds,
        setupRequired: account.must_change_password || account.selected_class_ids === null};
    }
    must(epoch === ((await read('auth_epoch')) || '1'), 'Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.', 401);
    must(scope !== 'demo' || env.DEMO_MODE === 'true' && !await hasReal(), 'Đăng nhập bằng tài khoản để xem dữ liệu thật.', 401);
    return {scope, role: scope === 'demo' ? 'demo' : 'admin', id: null, epoch, account: null, permissions: {}, classIds: [], setupRequired: false};
  }

  const requireReal = async auth => {
    must(auth.role === 'teacher' || (auth.scope === 'password' && await custom()),
      'Đăng nhập quản trị và đặt mật khẩu riêng trong mục Cài đặt trước khi lưu dữ liệu thật.', 428);
  };
  const info = async auth => ({
    scope: auth?.scope || null, role: auth?.role || null,
    custom_password: auth?.role === 'teacher' || await custom(),
    demo_available: env.DEMO_MODE === 'true' && !await hasReal(),
    ...(auth && {
      user: auth.account ? {id: auth.id, username: auth.account.username, display_name: auth.account.display_name} : null,
      permissions: auth.permissions, setup_required: auth.setupRequired,
      must_change_password: !!auth.account?.must_change_password,
    }),
  });

  async function change(auth, body, url) {
    must(auth.role !== 'demo', 'Đăng nhập bằng mật khẩu hiện tại trước khi thay mật khẩu.', 403);
    must(typeof body.old_password === 'string' && body.old_password.length <= 200, 'Mật khẩu hiện tại chưa đúng.');
    if (auth.role === 'teacher') {
      const row = await first('SELECT password_hash,password_salt FROM teacher_accounts WHERE id=? AND auth_epoch=? AND enabled=1', auth.id, auth.epoch);
      must(row && await equal(derive(body.old_password, row.password_salt), row.password_hash), 'Mật khẩu hiện tại chưa đúng.');
      must(validStaffPassword(body.new_password) && body.new_password !== body.old_password, 'Mật khẩu mới cần từ 12 đến 200 ký tự và khác mật khẩu hiện tại.');
      const {salt, hash, epoch} = newStaffPassword(body.new_password);
      const result = await database().prepare(`
        UPDATE teacher_accounts SET password_hash=?,password_salt=?,auth_epoch=?,must_change_password=0,revision=revision+1
        WHERE id=? AND auth_epoch=? AND enabled=1
      `).bind(hash, salt, epoch, auth.id, auth.epoch).run();
      must(result.meta?.changes === 1, 'Tài khoản vừa thay đổi. Vui lòng đăng nhập lại.', 409);
      return issue('account', url, epoch, auth.id);
    }
    const checked = await verifyAdmin(body.old_password);
    must(checked.valid && checked.epoch === auth.epoch, 'Mật khẩu hiện tại chưa đúng.');
    must(typeof body.new_password === 'string' && body.new_password.length >= 8 && body.new_password.length <= 200 && body.new_password !== 'toanthd-demo',
      'Mật khẩu mới cần từ 8 đến 200 ký tự và khác mật khẩu mẫu.');
    const {salt, hash, epoch} = newStaffPassword(body.new_password);
    const put = (k, v) => database().prepare('INSERT INTO workspace_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k, v);
    const guard = database().prepare(`INSERT INTO workspace_settings(key,value)
      VALUES('auth_epoch',CASE WHEN COALESCE((SELECT value FROM workspace_settings WHERE key='auth_epoch'),'1')=? THEN ? ELSE NULL END)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(auth.epoch, epoch);
    try {
      await database().batch([guard, put('password_hash', hash), put('password_salt', salt), put('password_iterations', String(workFactor))]);
    } catch (error) {
      if (String(error.message).includes('NOT NULL constraint failed')) must(false, 'Mật khẩu vừa thay đổi. Vui lòng đăng nhập lại.', 409);
      throw error;
    }
    return issue('password', url, epoch);
  }

  return {equal, login, issue, requireTeacher, requireReal, info, change, hasReal};
}
