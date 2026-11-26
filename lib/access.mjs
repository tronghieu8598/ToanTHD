// Staff capabilities are independent of the classes a teacher is allowed to teach.
export const staffPermissions = ['author_exams', 'edit_bank', 'manage_rosters', 'upload_library'];

export function can(auth, permission) {
  return auth.role !== 'teacher' || auth.permissions[permission] === true;
}

export function canUseClass(auth, id) {
  return auth.role !== 'teacher' || auth.classIds.includes(id);
}

export function canUseSession(auth, session) {
  return auth.role !== 'teacher' || (session.owner_teacher_id === auth.id && canUseClass(auth, session.classroom_id));
}

export function teacherWriteGuard(auth) {
  return auth.role === 'teacher'
    ? {sql: 'EXISTS(SELECT 1 FROM teacher_accounts WHERE id=? AND revision=? AND enabled=1)', args: [auth.id, auth.account.revision]}
    : {sql: '1=1', args: []};
}

const teacherRoutes = new Set([
  'teacher/bootstrap', 'teacher/profile', 'teacher/password',
  'teacher/exams', 'teacher/exams/assign', 'teacher/session',
  'teacher/extend', 'teacher/close', 'teacher/device-reset', 'teacher/session-entry-codes', 'teacher/grade-free',
  'teacher/library', 'teacher/library/file', 'teacher/library/change',
  'teacher/studio-plan',
]);
const authorRoutes = new Set([
  'teacher/bank/select', 'teacher/bank/variant', 'teacher/sessions', 'teacher/sessions/clone',
  'teacher/exams/archive', 'teacher/exams/visibility', 'teacher/exams/details',
]);
const editorRoutes = new Set([
  'teacher/render', 'teacher/documents', 'teacher/documents/version', 'teacher/lessons',
  'teacher/questions', 'teacher/questions/history', 'teacher/questions/archive',
  'teacher/questions/resolve-key', 'teacher/bank/export',
]);

export function requireTeacherRoute(auth, path, method, must) {
  if (auth.role !== 'teacher') return;
  if (auth.setupRequired) {
    must(['teacher/bootstrap', 'teacher/profile', 'teacher/password'].includes(path), 'Hoàn tất thiết lập tài khoản trước khi sử dụng.', 403);
    return;
  }
  let allowed = teacherRoutes.has(path);
  if (path === 'teacher/exams' && method === 'POST') allowed = can(auth, 'author_exams');
  if (path === 'teacher/bank') allowed = can(auth, 'author_exams') || can(auth, 'edit_bank');
  if (authorRoutes.has(path)) allowed = can(auth, 'author_exams');
  if (editorRoutes.has(path)) allowed = can(auth, 'edit_bank');
  if (path === 'teacher/classroom-summary') allowed = can(auth, 'manage_rosters');
  if (path === 'teacher/import/preview' || path === 'teacher/import/commit') {
    allowed = can(auth, 'edit_bank') || can(auth, 'manage_rosters');
  }
  must(allowed, 'Tài khoản chưa được cấp quyền cho chức năng này.', 403);
}
