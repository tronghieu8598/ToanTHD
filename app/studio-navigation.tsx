'use client';

import { useRef } from 'react';
import { GraduationCap, LogOut, Menu, Search, type LucideIcon } from 'lucide-react';

export type NavigationItem = { key: string; label: string; icon: LucideIcon };

const mainLabels: Record<string, string> = {
    home: 'Hôm nay', digital: 'Học liệu', bank: 'Ngân hàng', exams: 'Đề đã lưu', classes: 'Lớp học', sessions: 'Phiên kiểm tra',
};

export function StudioNavigation({ items, view, teacherName, sample, onSelect, onSearch, onLogout }: {
    items: NavigationItem[];
    view: string;
    teacherName: string;
    sample: boolean;
    onSelect: (key: string) => void;
    onSearch: () => void;
    onLogout: () => void;
}) {
    const menu = useRef<HTMLDetailsElement>(null);
    const last = items.some(item => item.key === 'classes') ? 'classes' : 'sessions';
    const primaryKeys = ['home', 'digital', 'bank', 'exams', last];
    const primary = primaryKeys.map(key => items.find(item => item.key === key)).filter((item): item is NavigationItem => !!item);
    const more = items.filter(item => !primaryKeys.includes(item.key));

    function select(key: string) {
        if (menu.current) menu.current.open = false;
        onSelect(key);
    }

    return <header className="studio-topbar">
        <button type="button" className="studio-brand" onClick={() => select('home')} aria-label="Toán THĐ, về Hôm nay">
            <span className="studio-brand-mark">∑</span><strong>Toán THĐ</strong><small>Studio</small>
        </button>
        <nav className="studio-main-nav" aria-label="Điều hướng chính">
            {primary.map(({ key, icon: Icon }) => <button type="button" key={key} onClick={() => select(key)} aria-current={view === key ? 'page' : undefined}>
                <Icon size={17} aria-hidden="true" /><span>{mainLabels[key]}</span>
            </button>)}
        </nav>
        <div className="studio-top-actions">
            <button type="button" className="icon-btn" title="Tìm học liệu (Ctrl+K)" aria-label="Tìm học liệu" onClick={onSearch}><Search size={19} /></button>
            <a href="/hoc-sinh" className="icon-btn" target="_blank" rel="noopener noreferrer" title="Màn hình học sinh" aria-label="Màn hình học sinh"><GraduationCap size={20} /></a>
            <details className="studio-menu" ref={menu} onKeyDown={event => {
                if (event.key === 'Escape' && menu.current?.open) {
                    menu.current.open = false;
                    menu.current.querySelector('summary')?.focus();
                }
            }}>
                <summary title="Công cụ và tài khoản" aria-label="Công cụ và tài khoản"><Menu size={19} /></summary>
                <div className="studio-menu-panel">
                    <div className="studio-menu-user"><strong>{teacherName}</strong>{sample && <small>Dữ liệu minh họa</small>}</div>
                    {more.map(({ key, label, icon: Icon }) => <button type="button" key={key} aria-current={view === key ? 'page' : undefined} onClick={() => select(key)}>
                        <Icon size={17} /><span>{label}</span>
                    </button>)}
                    <button type="button" onClick={() => { if (menu.current) menu.current.open = false; onLogout(); }}><LogOut size={17} /> Đăng xuất</button>
                </div>
            </details>
        </div>
    </header>;
}
