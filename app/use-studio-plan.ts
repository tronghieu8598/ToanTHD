'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { libraryById, type LibraryResource } from '../lib/client/library-catalog';
import { libraryUploadId, resourceFitsRoom } from '../lib/library-resources.mjs';

type PlanRoom = { id: string; label: string; grade?: number | string };
type StoredPlan = { roomId: string; resources: Record<string, string[]> };
type RemotePlan = { account_id: string; classroom_id: string; exists: boolean; resource_ids: string[] };
type PlanChange = { action: 'add' | 'remove'; resource_id: string } | { action: 'import'; resource_ids: string[] };
const emptyPlan: StoredPlan = { roomId: '', resources: {} };

function readPlan(key: string): StoredPlan | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const value = JSON.parse(raw);
        if (!value || typeof value !== 'object') return null;
        const resources = Object.fromEntries(Object.entries(value.resources || {}).flatMap(([id, items]) => {
            if (!Array.isArray(items)) return [];
            return [[id, [...new Set(items.filter(item => typeof item === 'string' && (libraryById.has(item) || libraryUploadId.test(item))))]]];
        }));
        return { roomId: typeof value.roomId === 'string' ? value.roomId : '', resources };
    } catch { return null; }
}

function idsFor(plan: StoredPlan | null, roomId: string) {
    const ids = plan?.resources[roomId];
    return Array.isArray(ids) ? ids : [];
}

async function requestPlan(accountId: string, roomId: string, change?: PlanChange): Promise<RemotePlan> {
    const route = '/api/teacher/studio-plan';
    const response = await fetch(change ? route : route + '?classroom_id=' + encodeURIComponent(roomId), {
        cache: 'no-store', signal: AbortSignal.timeout(12000),
        ...(change && {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
            ...change, account_id: accountId, classroom_id: roomId,
        })}),
    }).catch(() => { throw new Error('Chưa kết nối được với máy chủ kế hoạch.'); });
    const data = await response.json().catch(() => null) as (Partial<RemotePlan> & {error?: string}) | null;
    if (!response.ok) throw new Error(data?.error || 'Máy chủ chưa xử lý được kế hoạch.');
    if (data?.account_id !== accountId || data.classroom_id !== roomId || typeof data.exists !== 'boolean' || !Array.isArray(data.resource_ids)) {
        throw new Error('Tài khoản hoặc lớp đã thay đổi. Hãy tải lại trang.');
    }
    return {account_id: data.account_id, classroom_id: data.classroom_id, exists: data.exists, resource_ids: data.resource_ids};
}

export function useStudioPlan(accountId: string, rooms: PlanRoom[], uploads: LibraryResource[], synchronized: boolean) {
    const key = accountId ? `toanthd-studio-plan:${accountId}` : '';
    const [saved, setSaved] = useState<{ key: string; value: StoredPlan } | null>(null);
    const [remote, setRemote] = useState<{ scope: string; plan: RemotePlan | null; error: string } | null>(null);
    const [pending, setPending] = useState(new Set<string>());
    const writes = useRef(new Set<string>());
    const active = useRef('');
    const readVersion = useRef(0);
    const localReady = !!key && saved?.key === key;
    const value = localReady ? saved.value : emptyPlan;
    const room = rooms.find(item => item.id === value.roomId) ?? rooms[0];
    const roomId = room?.id ?? '';
    const scope = synchronized && localReady && roomId ? JSON.stringify([accountId, roomId]) : '';
    const current = remote?.scope === scope ? remote : null;
    const error = current?.error ?? '';
    const canEdit = !!room && localReady && (!synchronized || !!current?.plan && !pending.has(scope));
    const loading = !!key && !!room && (!localReady || synchronized && !current?.plan && !error);
    const ids = synchronized ? current?.plan?.resource_ids ?? [] : idsFor(value, roomId);
    const items = ids.map(id => libraryById.get(id) ?? uploads.find(item => item.id === id && !item.upload?.deletedAt))
        .filter((resource): resource is LibraryResource => !!resource);

    useEffect(() => {
        if (!key) { setSaved(null); return; }
        const refresh = () => setSaved({ key, value: readPlan(key) ?? emptyPlan });
        const onStorage = (event: StorageEvent) => { if (event.key === key || event.key === null) refresh(); };
        refresh();
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [key]);

    const refresh = useCallback(async () => {
        if (!scope || writes.current.has(scope)) return;
        const version = ++readVersion.current;
        setRemote(previous => previous?.scope === scope && previous.error ? {...previous, error: ''} : previous);
        try {
            let plan = await requestPlan(accountId, roomId);
            if (version !== readVersion.current) return;
            const oldIds = plan.exists ? [] : idsFor(readPlan(key), roomId);
            if (oldIds.length) plan = await requestPlan(accountId, roomId, {action: 'import', resource_ids: oldIds});
            if (version === readVersion.current) setRemote({scope, plan, error: ''});
        } catch (e) {
            if (version === readVersion.current) setRemote({scope, plan: null, error: (e as Error).message});
        }
    }, [scope, accountId, roomId, key]);

    useEffect(() => {
        active.current = scope;
        if (!scope) { setRemote(null); return; }
        void refresh();
        window.addEventListener('focus', refresh);
        window.addEventListener('online', refresh);
        return () => {
            active.current = '';
            ++readVersion.current;
            window.removeEventListener('focus', refresh);
            window.removeEventListener('online', refresh);
        };
    }, [scope, refresh]);

    function store(next: StoredPlan) {
        setSaved({ key, value: next });
        try {
            localStorage.setItem(key, JSON.stringify(next));
            return true;
        } catch { return false; }
    }

    function chooseRoom(id: string) {
        if (key && rooms.some(item => item.id === id)) store({ ...(readPlan(key) ?? value), roomId: id });
    }

    async function update(resource: LibraryResource, add: boolean) {
        if (!room || !canEdit) throw new Error('Chờ tải hoặc lưu xong kế hoạch của lớp.');
        if (add && (resource.kind === 'archive' || !resourceFitsRoom(resource, room))) throw new Error('Học liệu chưa phù hợp với lớp này.');
        if (!synchronized) {
            const local = readPlan(key) ?? value;
            const previous = idsFor(local, roomId);
            const next = add ? [...new Set([...previous, resource.id])] : previous.filter(id => id !== resource.id);
            if (!store({ roomId, resources: { ...local.resources, [roomId]: next } })) {
                throw new Error('Trình duyệt chưa lưu được kế hoạch.');
            }
            return;
        }

        if (writes.current.has(scope)) throw new Error('Đang lưu kế hoạch của lớp.');
        writes.current.add(scope);
        setPending(new Set(writes.current));
        ++readVersion.current;
        let retryRead = false;
        try {
            const plan = await requestPlan(accountId, roomId, {action: add ? 'add' : 'remove', resource_id: resource.id});
            if (active.current === scope) setRemote({scope, plan, error: ''});
        } catch (e) {
            retryRead = true;
            throw e;
        } finally {
            writes.current.delete(scope);
            setPending(new Set(writes.current));
            if (retryRead && active.current === scope) void refresh();
        }
    }

    return { room, rooms, ids, items, canEdit, loading, error, chooseRoom, update, refresh };
}

export type StudioPlan = ReturnType<typeof useStudioPlan>;
