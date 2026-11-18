'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ClipboardList, Plus, Trash2, Users, X } from 'lucide-react';
import { libraryById, resourceKinds, type LibraryResource, type ResourceKind } from '../lib/client/library-catalog';
import { StudioCover, resourceMeta } from './studio-cover';

export type PlanRoom = { id: string; label: string; grade?: number | string };

type StoredPlan = { roomId: string; resources: Record<string, string[]> };
const emptyPlan: StoredPlan = { roomId: '', resources: {} };

function readPlan(key: string): StoredPlan | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const value = JSON.parse(raw);
        if (!value || typeof value !== 'object') return null;
        const resources = Object.fromEntries(Object.entries(value.resources || {}).flatMap(([id, items]) => {
            if (!Array.isArray(items)) return [];
            return [[id, [...new Set(items.filter(item => typeof item === 'string' && (libraryById.has(item) || /^upload-[0-9a-f-]{36}$/.test(item))))]]];
        }));
        return { roomId: typeof value.roomId === 'string' ? value.roomId : '', resources };
    } catch { return null; }
}

export function resourceFitsRoom(resource: LibraryResource, room: PlanRoom) {
    const grade = Number(room.grade) || Number(room.label.trim().match(/^(10|11|12)(?!\d)/)?.[1]);
    return !grade || resource.grades.includes(grade);
}

export function useStudioPlan(accountId: string, rooms: PlanRoom[], uploads: LibraryResource[]) {
    const key = accountId ? `toanthd-studio-plan:${accountId}` : '';
    const [saved, setSaved] = useState<{ key: string; value: StoredPlan } | null>(null);
    const value = saved?.key === key ? saved.value : emptyPlan;
    const room = rooms.find(item => item.id === value.roomId) ?? rooms[0];
    const ids = room && Array.isArray(value.resources[room.id]) ? value.resources[room.id] : [];
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

    function commit(next: StoredPlan) {
        if (!key) return false;
        setSaved({ key, value: next });
        try {
            localStorage.setItem(key, JSON.stringify(next));
            return true;
        } catch { return false; }
    }

    function chooseRoom(id: string) {
        if (rooms.some(item => item.id === id)) commit({ ...(readPlan(key) ?? value), roomId: id });
    }

    function update(resource: LibraryResource, add: boolean) {
        if (!room || (add && !resourceFitsRoom(resource, room))) return false;
        const current = readPlan(key) ?? value;
        const previous = Array.isArray(current.resources[room.id]) ? current.resources[room.id] : [];
        const next = add ? [...new Set([...previous, resource.id])] : previous.filter(id => id !== resource.id);
        return commit({ roomId: room.id, resources: { ...current.resources, [room.id]: next } });
    }

    return { room, rooms, ids, items, chooseRoom, update };
}

export type StudioPlan = ReturnType<typeof useStudioPlan>;

export function StudioRoomPicker({ plan }: { plan: StudioPlan }) {
    if (!plan.room) return null;
    return <label className="studio-room-picker">
        <Users size={16} aria-hidden="true" />
        <select aria-label="Lớp đang dạy" value={plan.room.id} onChange={event => plan.chooseRoom(event.target.value)}>
            {plan.rooms.map(room => <option key={room.id} value={room.id}>{room.label}</option>)}
        </select>
    </label>;
}

export function StudioToday({ plan, onBrowse, onOpen, onPlan, onCompose }: {
    plan: StudioPlan;
    onBrowse: (kind: 'all' | ResourceKind) => void;
    onOpen: (resource: LibraryResource) => void;
    onPlan: () => void;
    onCompose?: () => void;
}) {
    const first = plan.items[0];
    const day = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const categories = ['lesson', 'book', 'document'] as const;
    return <section aria-labelledby="studio-today-title">
        <header className="studio-page-heading">
            <div><h1 id="studio-today-title">Hôm nay<span>.</span></h1><p>{day}</p></div>
            <div className="studio-page-actions">
                <StudioRoomPicker plan={plan} />
                {onCompose && <button type="button" className="btn secondary" onClick={onCompose}><Plus size={16} /> Soạn đề</button>}
            </div>
        </header>
        <section className="studio-hero" aria-labelledby="studio-lesson-title">
            <div className="studio-hero-copy">
                {plan.room && <p className="studio-hero-class">Lớp {plan.room.label}</p>}
                <h2 id="studio-lesson-title">{first ? first.title : <>Chuẩn bị<br /><em>tiết dạy.</em></>}</h2>
                <button type="button" className="studio-hero-open" onClick={() => first ? onOpen(first) : onBrowse('all')}>
                    <span><ArrowRight size={20} /></span>{first ? 'Mở tiết học' : 'Chọn học liệu'}
                </button>
                {!!plan.items.length && <p className="studio-hero-meta">{plan.items.length} học liệu trong tiết</p>}
            </div>
            <img className="studio-hero-art" src="/studio/hero.webp" alt="" />
        </section>
        <div className="studio-section-heading">
            <h2>{first ? 'Trong tiết học' : 'Học liệu'}</h2>
            <button type="button" className="text-btn" onClick={first ? onPlan : () => onBrowse('all')}>
                {first ? `Kế hoạch (${plan.items.length})` : 'Mở thư viện'} <ArrowRight size={15} />
            </button>
        </div>
        <div className="studio-today-grid">
            {first ? plan.items.slice(0, 3).map(resource => <button type="button" className="studio-today-tile" key={resource.id} onClick={() => onOpen(resource)}>
                <StudioCover kind={resource.kind} chapter={resource.chapter} cover={resource.cover} arrow />
                <strong>{resource.title}</strong>
            </button>) : categories.map(kind => <button type="button" className="studio-today-tile" key={kind} onClick={() => onBrowse(kind)}>
                <StudioCover kind={kind} chapter={kind === 'lesson' ? 'C1 - Đạo hàm' : ''} arrow />
                <strong>{resourceKinds[kind]}</strong>
            </button>)}
        </div>
    </section>;
}

export function StudioPlanDialog({ plan, onClose, onBrowse, onOpen, onRemove }: {
    plan: StudioPlan;
    onClose: () => void;
    onBrowse: () => void;
    onOpen: (resource: LibraryResource) => void;
    onRemove: (resource: LibraryResource) => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, []);
    return <dialog ref={dialog} className="studio-plan-dialog" aria-labelledby="studio-plan-title" onCancel={event => { event.preventDefault(); onClose(); }}
        onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
        <section className="studio-plan-surface">
            <header><h2 id="studio-plan-title"><ClipboardList size={19} /> Kế hoạch tiết học</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng kế hoạch"><X size={20} /></button></header>
            <div className="studio-plan-body">
                <StudioRoomPicker plan={plan} />
                {plan.items.length ? <ol className="studio-plan-items">
                    {plan.items.map(resource => <li key={resource.id}>
                        <button type="button" className="studio-plan-resource" onClick={() => onOpen(resource)}>
                            <strong>{resource.title}</strong><small>{resourceMeta(resource)}</small>
                        </button>
                        <button type="button" className="icon-btn" onClick={() => onRemove(resource)} aria-label={`Bỏ ${resource.title} khỏi kế hoạch`}><Trash2 size={17} /></button>
                    </li>)}
                </ol> : <p className="studio-plan-empty">{plan.room ? 'Chưa có học liệu trong tiết này.' : 'Chưa có lớp để lập kế hoạch.'}</p>}
            </div>
            <footer><button type="button" className="btn primary" onClick={onBrowse}><Plus size={16} /> Thêm học liệu</button></footer>
        </section>
    </dialog>;
}
