import {canUseClass, teacherWriteGuard} from './access.mjs';
import {bundledLibraryCatalog, releasedLibraryCatalog, libraryReleaseIdsKey, resourceFitsRoom} from './library-resources.mjs';
import {readableUpload} from './library-uploads.mjs';

const bundled = new Map(bundledLibraryCatalog.map(resource => [resource.id, resource]));
const staged = new Map(releasedLibraryCatalog.map(resource => [resource.id, resource]));
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 160;

function readableResources(ids, room, owner, released) {
    const officialIds = ids.filter(id => {
        const resource = bundled.get(id) ?? (released.has(id) ? staged.get(id) : undefined);
        return resource && resource.kind !== 'archive' && resourceFitsRoom(resource, room);
    });
    return {
        sql: `SELECT requested.value AS id FROM json_each(?) requested
            WHERE requested.value IN (SELECT value FROM json_each(?))
            OR EXISTS(SELECT 1 FROM library_uploads u WHERE u.id=requested.value
                AND ${readableUpload} AND u.grade=? AND u.mime<>'application/zip')
            ORDER BY requested.key`,
        args: [JSON.stringify(ids), JSON.stringify(officialIds), owner, room.grade],
    };
}

const appendResource = `DO UPDATE SET resource_ids=json_insert(studio_plans.resource_ids, '$[#]', json_extract(excluded.resource_ids,'$[0]'))
    WHERE NOT EXISTS(SELECT 1 FROM json_each(studio_plans.resource_ids) WHERE value=json_extract(excluded.resource_ids,'$[0]'))`;

export async function handleStudioPlan(request, ctx) {
    const {auth, authTools, all, first, database, must, json, readBody} = ctx;
    const {method} = request;
    must(method === 'GET' || method === 'POST', 'Phương thức không được hỗ trợ.', 405);
    must(auth.role !== 'demo', 'Đăng nhập tài khoản của tổ để đồng bộ kế hoạch.', 403);
    await authTools.requireReal(auth);

    const owner = auth.id ?? 'admin';
    const body = method === 'POST' ? await readBody(request) : null;
    const classroomId = body ? body.classroom_id : new URL(request.url).searchParams.get('classroom_id');
    must(validId(classroomId), 'Chọn lớp để mở kế hoạch.');
    must(canUseClass(auth, classroomId), 'Lớp không thuộc danh sách giảng dạy của tài khoản.', 403);
    const room = await first('SELECT id, label, grade FROM classrooms WHERE id=?', classroomId);
    must(room, 'Lớp không tồn tại.', 404);
    const published = staged.size ? await first('SELECT value FROM workspace_settings WHERE key=?', libraryReleaseIdsKey) : null;
    const released = new Set(published ? JSON.parse(published.value) : []);

    async function readPlan() {
        const saved = await first('SELECT resource_ids FROM studio_plans WHERE owner_key=? AND classroom_id=?', owner, classroomId);
        const ids = saved ? JSON.parse(saved.resource_ids) : [];
        const visible = readableResources(ids, room, owner, released);
        const rows = ids.length ? await all(visible.sql, ...visible.args) : [];
        return {account_id: owner, classroom_id: classroomId, exists: !!saved, resource_ids: rows.map(row => row.id)};
    }
    if (!body) return json(await readPlan());

    // A stale tab may still be showing a different account after another login.
    must(body.account_id === owner, 'Tài khoản đã thay đổi. Hãy tải lại trang.', 409);
    const action = body.action;
    must(['add', 'remove', 'import'].includes(action), 'Thao tác kế hoạch không hợp lệ.');
    const ids = action === 'import' ? body.resource_ids : [body.resource_id];
    must(Array.isArray(ids) && ids.every(validId), 'Mã học liệu không hợp lệ.');
    const guard = teacherWriteGuard(auth);
    const access = `${guard.sql} AND EXISTS(SELECT 1 FROM classrooms WHERE id=? AND grade=?)`;
    const accessArgs = [...guard.args, classroomId, room.grade];

    if (action === 'remove') {
        await database().prepare(`UPDATE studio_plans SET resource_ids=(
                SELECT json_group_array(id) FROM (SELECT value AS id FROM json_each(studio_plans.resource_ids) WHERE value<>? ORDER BY key))
            WHERE owner_key=? AND classroom_id=? AND ${access}`)
            .bind(body.resource_id, owner, classroomId, ...accessArgs).run();
    } else {
        const eligible = readableResources([...new Set(ids)], room, owner, released);
        const onConflict = action === 'add' ? appendResource : 'DO NOTHING';
        await database().prepare(`WITH eligible AS (${eligible.sql}),
                chosen AS (SELECT json_group_array(id) AS ids, COUNT(*) AS n FROM eligible)
            INSERT INTO studio_plans(owner_key,classroom_id,resource_ids)
            SELECT ?,?,ids FROM chosen WHERE n>0 AND ${access}
            ON CONFLICT(owner_key,classroom_id) ${onConflict}`)
            .bind(...eligible.args, owner, classroomId, ...accessArgs).run();
    }

    const plan = await readPlan();
    if (action === 'add') must(plan.resource_ids.includes(body.resource_id), 'Học liệu chưa khả dụng cho lớp này. Hãy kiểm tra lại quyền xem và khối lớp.', 404);
    if (action === 'remove') must(!plan.resource_ids.includes(body.resource_id), 'Quyền hoặc kế hoạch vừa thay đổi. Hãy tải lại.', 409);
    return json(plan);
}
