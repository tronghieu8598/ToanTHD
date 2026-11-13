import {staffPermissions} from './access.mjs';
import {newStaffPassword, normalizeUsername, publicAccount, validStaffPassword} from './auth.mjs';

export async function handleAccounts(path, request, ctx) {
  if (!['teacher/accounts', 'teacher/accounts/audit', 'teacher/profile'].includes(path)) return null;
  const {auth, authTools, first, all, database, must, json, readBody} = ctx;
  const selectClasses = ids => all(
    'SELECT id,label,grade,school_year,is_sample FROM classrooms WHERE id IN (SELECT value FROM json_each(?)) ORDER BY school_year DESC,label',
    JSON.stringify(ids),
  );
  const validateIds = ids => {
    must(Array.isArray(ids) && ids.length <= 300 && ids.every(id => typeof id === 'string' && id.length > 0 && id.length <= 160),
      'Danh sách lớp không hợp lệ.');
    must(new Set(ids).size === ids.length, 'Danh sách lớp bị trùng.');
    return ids;
  };

  if (path === 'teacher/profile') {
    must(auth.role === 'teacher', 'Mục chọn lớp dành cho tài khoản giáo viên.', 403);
    const available = await selectClasses(auth.account.allowed_class_ids);
    if (request.method === 'GET') {
      return json({
        classes: available, selected_class_ids: auth.classIds,
        setup_required: auth.setupRequired, must_change_password: auth.account.must_change_password,
      });
    }
    must(request.method === 'POST', 'Phương thức không được hỗ trợ.', 405);
    const body = await readBody(request, 65000);
    const selected = validateIds(body.class_ids);
    const allowed = new Set(available.map(c => c.id));
    must(selected.every(id => allowed.has(id)), 'Có lớp chưa được quản trị cấp cho tài khoản này.', 403);
    must(selected.length > 0 || available.length === 0, 'Hãy chọn ít nhất một lớp thầy cô đang dạy.');
    const result = await database().prepare(`
      UPDATE teacher_accounts SET selected_class_ids=?,revision=revision+1
      WHERE id=? AND enabled=1 AND revision=?
    `).bind(JSON.stringify(selected), auth.id, auth.account.revision).run();
    must(result.meta?.changes === 1, 'Danh sách lớp vừa thay đổi. Tải lại cài đặt rồi lưu lại.', 409);
    return json({ok: true, selected_class_ids: selected});
  }

  must(auth.role === 'admin', 'Chỉ quản trị được quản lý tài khoản.', 403);
  if (path === 'teacher/accounts/audit') {
    must(request.method === 'GET', 'Phương thức không được hỗ trợ.', 405);
    await authTools.requireReal(auth);
    const events = await all(`SELECT account_id,account_username,actor,created_at,actions
      FROM account_audit ORDER BY created_at DESC, rowid DESC LIMIT 50`);
    return json({events: events.map(event => ({...event, actions: JSON.parse(event.actions)}))});
  }
  if (request.method === 'GET') {
    return json({accounts: (await all('SELECT * FROM teacher_accounts ORDER BY username')).map(publicAccount)});
  }
  must(request.method === 'POST', 'Phương thức không được hỗ trợ.', 405);
  await authTools.requireReal(auth);
  const body = await readBody(request, 70000);
  const username = normalizeUsername(body.username);
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  must(/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) && username !== 'admin',
    'Tên đăng nhập cần 3–32 ký tự, dùng chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.');
  must(displayName.length > 0 && displayName.length <= 100 && !/[\u0000-\u001f]/.test(displayName), 'Tên hiển thị cần từ 1 đến 100 ký tự.');
  const allowedClassIds = validateIds(body.allowed_class_ids);
  must((await selectClasses(allowedClassIds)).length === allowedClassIds.length, 'Có lớp không còn trong danh sách.');
  must(body.permissions && typeof body.permissions === 'object' && !Array.isArray(body.permissions) &&
    Object.entries(body.permissions).every(([key, value]) => staffPermissions.includes(key) && typeof value === 'boolean'),
    'Quyền tài khoản không hợp lệ.');
  const permissions = JSON.stringify(Object.fromEntries(staffPermissions.map(key => [key, body.permissions[key] === true])));
  const enabled = body.enabled === false ? 0 : 1;
  const reset = !body.id || body.temporary_password !== undefined;
  if (reset) must(validStaffPassword(body.temporary_password), 'Mật khẩu tạm cần từ 12 đến 200 ký tự và khác mật khẩu mẫu.');
  const db = database();
  function audit(accountId, actions, onlyOnUpdate = false) {
    const guard = onlyOnUpdate ? ' WHERE changes()=1' : '';
    return db.prepare(`INSERT INTO account_audit(id,account_id,account_username,actor,created_at,actions)
      SELECT ?,?,?,?, ?,?${guard}`).bind(crypto.randomUUID(),accountId,username,'admin',Date.now(),JSON.stringify(actions));
  }
  try {
    if (!body.id) {
      const {salt, hash, epoch} = newStaffPassword(body.temporary_password);
      const id = crypto.randomUUID();
      const insert = db.prepare(`
        INSERT INTO teacher_accounts(id,username,display_name,password_salt,password_hash,auth_epoch,enabled,permissions,allowed_class_ids)
        VALUES(?,?,?,?,?,?,?,?,?)
      `).bind(id, username, displayName, salt, hash, epoch, enabled, permissions, JSON.stringify(allowedClassIds));
      await db.batch([insert, audit(id, ['created'])]);
      return json({id}, 201);
    }
    const existing = await first('SELECT * FROM teacher_accounts WHERE id=?', body.id);
    must(existing, 'Không tìm thấy tài khoản giáo viên.', 404);
    must(existing.revision === body.revision, 'Tài khoản vừa thay đổi. Hãy tải lại trước khi lưu.', 409);
    const before = publicAccount(existing);
    const selected = before.selected_class_ids;
    const allowed = new Set(allowedClassIds);
    const retained = selected === null ? null : JSON.stringify(selected.filter(id => allowed.has(id)));
    const credentials = reset ? newStaffPassword(body.temporary_password) : {
      salt: existing.password_salt, hash: existing.password_hash,
      epoch: enabled === existing.enabled ? existing.auth_epoch : crypto.randomUUID(),
    };
    const actions = [];
    if (username !== existing.username || displayName !== existing.display_name) actions.push('identity');
    if (JSON.stringify(before.permissions) !== permissions) actions.push('permissions');
    const previousClasses = new Set(before.allowed_class_ids);
    if (allowed.size !== previousClasses.size || allowedClassIds.some(id => !previousClasses.has(id))) actions.push('classes');
    if (enabled !== existing.enabled) actions.push(enabled ? 'enabled' : 'locked');
    if (reset) actions.push('password_reset');
    const update = db.prepare(`
      UPDATE teacher_accounts SET username=?,display_name=?,password_salt=?,password_hash=?,auth_epoch=?,
        enabled=?,must_change_password=?,permissions=?,allowed_class_ids=?,selected_class_ids=?,revision=revision+1
      WHERE id=? AND revision=?
    `).bind(username, displayName, credentials.salt, credentials.hash, credentials.epoch,
      enabled, reset ? 1 : existing.must_change_password, permissions, JSON.stringify(allowedClassIds), retained,
      existing.id, existing.revision);
    const [result] = actions.length ? await db.batch([update, audit(existing.id, actions, true)]) : [await update.run()];
    must(result.meta?.changes === 1, 'Tài khoản vừa thay đổi. Hãy tải lại trước khi lưu.', 409);
    return json({id: existing.id});
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed: teacher_accounts.username')) {
      must(false, 'Tên đăng nhập này đã được sử dụng.', 409);
    }
    throw error;
  }
}
