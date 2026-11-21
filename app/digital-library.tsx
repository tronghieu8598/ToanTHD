'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ClipboardList, Download, ExternalLink, Info, LockKeyhole, Maximize2, Plus, Search, Trash2, Users, X,
} from 'lucide-react';
import { libraryResources, releasedLibraryResources, chapterRoman, mathChapters, mathGrades, resourceKinds, normalizeLibraryText, type LibraryResource, type LibraryVisibility, type MathGrade, type ResourceKind } from '../lib/client/library-catalog';
import { StudioCover, resourceMeta } from './studio-cover';
import { libraryReleaseStatusPath, resourceFitsRoom } from '../lib/library-resources.mjs';
import { StudioPlanStatus, StudioRoomPicker } from './studio-plan';
import type { StudioPlan } from './use-studio-plan';
import { LibraryUploadDialog, type LibraryUploads, type UploadAction } from './library-uploads';
import { LibraryResourceCard } from './library-preview';

type Kind = 'all' | ResourceKind;
const filters: { kind: Kind; label: string }[] = [
  { kind: 'all', label: 'Tất cả' }, { kind: 'lesson', label: 'Bài giảng' },
  { kind: 'book', label: 'SGK' }, { kind: 'elearning', label: 'E-learning' },
  { kind: 'document', label: 'Tài liệu' }, { kind: 'archive', label: 'Gói tài nguyên' },
];
function readableBytes(size: number) {
  return size >= 1000000 ? `${(size / 1000000).toLocaleString('vi-VN', {maximumFractionDigits: 1})} MB`
    : `${Math.max(1, Math.round(size / 1000)).toLocaleString('vi-VN')} KB`;
}

type LibraryScope = 'team' | 'mine' | 'trash';
const getChapter = (resource: LibraryResource) => resource.chapterNumber ?? 0;
const chapterLabel = (grade: MathGrade, value: number) => value ? mathChapters(grade)[value - 1] : 'Tài liệu dùng chung';
const isGrade = (value: number): value is MathGrade => mathGrades.some(grade => grade === value);
const isPdf = (item: LibraryResource) => item.upload?.mime === 'application/pdf' || item.url.endsWith('.pdf');

export function DigitalLibrary({ initialKind = 'all', embedded = false, plan, onPlan, onAddToPlan, openId, onOpenHandled, focusSearch, onSearchFocused, uploads, canUpload }: {
  initialKind?: Kind;
  embedded?: boolean;
  plan?: StudioPlan;
  onPlan?: () => void;
  onAddToPlan?: (item: LibraryResource) => void;
  openId?: string | null;
  onOpenHandled?: () => void;
  focusSearch?: boolean;
  onSearchFocused?: () => void;
  uploads?: LibraryUploads;
  canUpload?: boolean;
}) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [grade, setGrade] = useState<MathGrade>(() => { const value = Number(plan?.room?.grade); return isGrade(value) ? value : 12; });
  const [chapter, setChapter] = useState<number | null>(null);
  const [scope, setScope] = useState<LibraryScope>('team');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [changeBusy, setChangeBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [actionError, setActionError] = useState('');
  const [selected, setSelected] = useState<LibraryResource | null>(null);
  const [preview, setPreview] = useState<LibraryResource | null>(null);
  const [wide, setWide] = useState(false);
  const [fileState, setFileState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const viewerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const quickDialog = useRef<HTMLDialogElement>(null);
  const previewOpener = useRef<HTMLButtonElement>(null);
  const activeClip = useRef<(() => void) | null>(null);
  const [library, setLibrary] = useState<{base:string; isolated:boolean} | null>(null);
  const [releasedIds, setReleasedIds] = useState<string[] | null>(releasedLibraryResources.length ? null : []);
  const catalog = useMemo(() => {
    const activeIds = new Set(releasedIds);
    return [...libraryResources, ...releasedLibraryResources.filter(item => activeIds.has(item.id)), ...(uploads?.items ?? [])];
  }, [releasedIds, uploads?.items]);
  const resourceUrl = (item: LibraryResource) => !item.upload && library ? new URL(item.url, library.base).href : item.url;
  const downloadUrl = (item: LibraryResource) => item.upload ? item.url + '&download=1' : resourceUrl(item);

  useEffect(() => {
    if (!releasedLibraryResources.length) return;
    const ctrl = new AbortController();
    fetch(libraryReleaseStatusPath, {signal: ctrl.signal, cache: 'no-store'})
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (ctrl.signal.aborted) return;
        const ids = data && typeof data === 'object' && 'resourceIds' in data ? data.resourceIds : null;
        setReleasedIds(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []);
      }).catch(() => { if (!ctrl.signal.aborted) setReleasedIds([]); });
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/local/library', {signal:ctrl.signal}).then(res => {
      if (!res.ok) throw new Error('No local library server');
      return res.json();
    }).then(data => {
      if (!data || typeof data !== 'object' || !('base' in data) || typeof data.base !== 'string') throw new Error('Invalid library address');
      const base = new URL(data.base);
      if (base.hostname !== window.location.hostname || base.protocol !== window.location.protocol) throw new Error('Invalid library origin');
      setLibrary({base:base.origin, isolated:base.origin !== window.location.origin});
    }).catch(() => {
      if (!ctrl.signal.aborted) setLibrary({base:window.location.origin, isolated:false});
    });
    return () => ctrl.abort();
  }, []);

  useEffect(() => { setKind(initialKind); setChapter(null); }, [initialKind]);
  useEffect(() => {
    const viewport = window.matchMedia('(min-width: 1240px)');
    const resize = () => setWide(viewport.matches);
    resize();
    viewport.addEventListener('change', resize);
    return () => viewport.removeEventListener('change', resize);
  }, []);
  useEffect(() => {
    if (!focusSearch) return;
    searchRef.current?.focus();
    onSearchFocused?.();
  }, [focusSearch, onSearchFocused]);
  useEffect(() => {
    if (!openId) return;
    const item = catalog.find(value => value.id === openId && !value.upload?.deletedAt);
    if (item && item.kind !== 'archive') {
      setFileState('loading');
      setSelected(item);
    }
    if (!item && releasedIds === null) return;
    onOpenHandled?.();
  }, [catalog, openId, onOpenHandled, releasedIds]);
  useEffect(() => {
    if (!embedded && releasedIds !== null) {
      const id = new URLSearchParams(window.location.search).get('tai-lieu');
      const resource = catalog.find(item => !item.upload && item.id === id);
      if (resource && resource.kind !== 'archive') setSelected(resource);
    }
  }, [catalog, embedded, releasedIds]);
  useEffect(() => {
    if (!preview) return;
    if (wide) {
      previewRef.current?.focus({ preventScroll: true });
      return;
    }
    const dialog = quickDialog.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, [preview, wide]);
  useEffect(() => {
    if (!selected || (!selected.upload && !library)) return;
    const ctrl = new AbortController();
    setFileState('loading');
    fetch(resourceUrl(selected), { method: 'HEAD', signal: ctrl.signal })
      .then(res => { if (!ctrl.signal.aborted) setFileState(res.ok ? 'ready' : 'missing'); })
      .catch(() => { if (!ctrl.signal.aborted) setFileState('missing'); });
    return () => ctrl.abort();
  }, [selected, library]);
  useEffect(() => {
    if (!selected) return;
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [selected]);

  function closeViewer() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setSelected(null);
    if (!embedded && window.location.search.includes('tai-lieu=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement === viewerRef.current) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    void viewerRef.current?.requestFullscreen?.().catch(() => {});
  }
  function openResource(item: LibraryResource) {
    if (item.kind === 'archive') {
      window.open(resourceUrl(item), '_blank', 'noopener,noreferrer');
      return;
    }
    setFileState('loading');
    setSelected(item);
    if (!embedded) window.history.replaceState(null, '', '/hoc-lieu-so?'+new URLSearchParams({'tai-lieu':item.id}));
  }
  function closePreview() {
    quickDialog.current?.close();
    setPreview(null);
    if (preview) previewOpener.current?.focus({ preventScroll: true });
    previewOpener.current = null;
  }
  const allChapters = mathChapters(grade).map((name, index) => ({name, value: index + 1}));
  const chapterOptions = [...allChapters, {name: chapterLabel(grade, 0), value: 0}];
  const matching = useMemo(() => catalog.filter(item => {
    if (!item.grades.includes(grade)) return false;
    if (scope === 'trash') { if (!item.upload?.deletedAt || !item.upload.canManage) return false; }
    else if (item.upload?.deletedAt) return false;
    if (scope === 'mine' && !item.upload?.owned) return false;
    if (scope === 'team' && item.upload?.visibility === 'private') return false;
    if (kind !== 'all' && item.kind !== kind) return false;
    const name = chapterLabel(grade, getChapter(item));
    const roman = getChapter(item) ? 'Chương ' + chapterRoman[getChapter(item)] : '';
    const haystack = normalizeLibraryText([item.title, item.chapter, name, roman, item.description, item.sourcePath].join(' '));
    return normalizeLibraryText(search.trim()).split(/\s+/).every(word => haystack.includes(word));
  }), [catalog, kind, grade, scope, search]);
  const counts = new Map<number, number>();
  for (const item of matching) counts.set(getChapter(item), (counts.get(getChapter(item)) || 0) + 1);
  const activeChapter = chapter ?? (chapterOptions.find(value => counts.has(value.value))?.value ?? 1);
  const acrossChapters = !!search.trim() || scope === 'trash';
  const resources = acrossChapters ? matching : matching.filter(item => getChapter(item) === activeChapter);
  const visibleGroups = acrossChapters ? chapterOptions.filter(value => counts.has(value.value)) : chapterOptions.filter(value => value.value === activeChapter);
  useEffect(() => {
    if (!preview) return;
    const next = resources.find(item => item.id === preview.id);
    if (next !== preview) setPreview(next ?? null);
  }, [preview, resources]);
  useEffect(() => {
    if (selected?.upload && !catalog.some(item => item.id === selected.id && !item.upload?.deletedAt)) setSelected(null);
  }, [catalog, selected]);

  const alreadyAdded = !!preview && !!plan?.ids.includes(preview.id);
  const canAdd = !!preview && !preview.upload?.deletedAt && !!plan?.room && preview.kind !== 'archive' && resourceFitsRoom(preview, plan.room);
  const upload = preview?.upload;
  function chooseScope(next: LibraryScope) { closePreview(); setScope(next); setChapter(null); setKind('all'); setSearch(''); setActionError(''); setFeedback(''); }
  async function manage(action: UploadAction, visibility?: LibraryVisibility) {
    if (!uploads || !preview || !upload || changeBusy) return;
    setChangeBusy(true);
    setActionError('');
    setFeedback('');
    try {
      const item = await uploads.change(preview, action, visibility);
      if (action === 'trash' || action === 'restore' || (scope === 'team' && visibility === 'private')) closePreview();
      else setPreview(item);
      setFeedback(action === 'trash' ? 'Đã chuyển vào Thùng rác.' : action === 'restore' ? (item.upload?.visibility === 'private' ? 'Đã khôi phục vào học liệu riêng tư.' : 'Đã khôi phục vào kho của tổ.') :
        visibility === 'team' ? 'Đã chia sẻ với tổ.' : 'Đã chuyển sang riêng tư.');
    } catch (error) { setActionError((error as Error).message); }
    finally { setChangeBusy(false); }
  }
  const quick = preview && <>
    <header><span>Xem nhanh</span><button type="button" className="icon-btn" aria-label="Đóng xem nhanh" onClick={closePreview}><X size={17} /></button></header>
    <div className="studio-preview-body">
      {!upload?.deletedAt && <StudioCover kind={preview.kind} chapter={preview.chapter} cover={preview.cover} />}
      <small>{resourceMeta(preview)}</small>
      <h2 id="studio-preview-title">{preview.title}</h2>
      {getChapter(preview) > 0 && <p>Chương {chapterRoman[getChapter(preview)]} · {chapterLabel(grade, getChapter(preview))}</p>}
      <p className="studio-preview-detail">{readableBytes(preview.bytes)}{!preview.offline && ' · Có thành phần cần mạng'}</p>
      {upload && <p className="studio-sharing-label">{upload.visibility === 'private' ? <LockKeyhole size={14} /> : <Users size={14} />}
        {upload.visibility === 'private' ? 'Riêng tư' : 'Chia sẻ với tổ'} · {upload.owned ? 'Của bạn' : upload.ownerName}</p>}
      {actionError && <p className="studio-inline-error" role="alert">{actionError} <button type="button" className="text-btn" onClick={() => void uploads?.refresh()}>Tải lại kho</button></p>}
    </div>
    <footer>
      {upload?.deletedAt ? <>
        {upload.restorePrivate && <p>Học liệu sẽ được khôi phục ở chế độ riêng tư.</p>}
        <button type="button" className="btn primary" onClick={() => void manage('restore')} disabled={changeBusy}>Khôi phục học liệu</button>
      </> : <>
      <button type="button" className="btn primary" onClick={() => openResource(preview)}>
        {preview.kind === 'archive' ? <><Download size={16} /> Tải gói tài nguyên</> : <>Mở học liệu <ArrowRight size={16} /></>}
      </button>
      {plan?.room && preview.kind !== 'archive' && (alreadyAdded ? <>
        <p className="studio-in-plan" role="status"><Check size={15} /> Đã có trong tiết {plan.room.label}</p>
        <button type="button" className="btn secondary" onClick={onPlan}>Xem kế hoạch <ArrowRight size={15} /></button>
      </> : canAdd ? <button type="button" className="btn secondary" disabled={!plan.canEdit} onClick={() => onAddToPlan?.(preview)}><Plus size={15} /> Thêm vào tiết {plan.room.label}</button>
        : <p>Chọn lớp khối {preview.grades.join(' hoặc ')} để thêm vào tiết học.</p>)}
      {upload?.canManage && <details className="studio-resource-manage">
        <summary>Quản lý học liệu</summary>
        {upload.owned && <button type="button" className="text-btn" disabled={changeBusy} onClick={() => void manage('visibility', upload.visibility === 'private' ? 'team' : 'private')}>
          {upload.visibility === 'private' ? 'Chia sẻ với tổ' : 'Chuyển sang riêng tư'}</button>}
        <button type="button" className="text-btn studio-danger" disabled={changeBusy} onClick={() => void manage('trash')}><Trash2 size={14} /> Chuyển vào Thùng rác</button>
        <small>Có thể khôi phục trong Thùng rác.</small>
      </details>}
      </>}
    </footer>
  </>;

  return <section className={'dl-root studio-library studio-library-v13' + (embedded ? ' dl-embedded' : '')}>
    <header className="studio-page-heading">
      <div><h1>Học liệu<span>.</span></h1></div>
      <div className="studio-page-actions">
        {plan && <><StudioRoomPicker plan={plan} />
          <button type="button" className="btn secondary" onClick={onPlan}><ClipboardList size={16} /> Kế hoạch ({plan.items.length})</button></>}
        {canUpload && uploads && <button type="button" className="btn primary" onClick={() => setUploadOpen(true)}><Plus size={17} /> Đăng học liệu</button>}
      </div>
    </header>
    {plan && <StudioPlanStatus plan={plan} />}
    {uploads && (canUpload || uploads.items.some(item => item.upload?.canManage)) && <nav className="studio-library-scopes" aria-label="Khu vực học liệu">
      <button type="button" aria-pressed={scope === 'team'} onClick={() => chooseScope('team')}><BookOpen size={16} /> Kho học liệu</button>
      <button type="button" aria-pressed={scope === 'mine'} onClick={() => chooseScope('mine')}><LockKeyhole size={15} /> Của tôi</button>
      <button type="button" aria-pressed={scope === 'trash'} onClick={() => chooseScope('trash')}><Trash2 size={15} /> Thùng rác</button>
    </nav>}
    {uploads?.error && <p className="studio-inline-error" role="alert">{uploads.error} <button type="button" className="text-btn" onClick={() => void uploads.refresh()}>Tải lại</button></p>}
    {feedback && <p className="studio-library-feedback" role="status"><Check size={16} /> {feedback}</p>}
    <div className="studio-library-toolbar studio-library-filters">
      <div className="studio-grade-tabs" role="group" aria-label="Khối lớp">
        {mathGrades.map(value => <button type="button" key={value} aria-pressed={grade === value} onClick={() => { setGrade(value); setChapter(null); closePreview(); }}>Toán {value}</button>)}
      </div>
      <div className="studio-library-search"><Search size={17} />
        <input ref={searchRef} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={`Tìm trong Toán ${grade}…`} aria-label="Tìm kiếm học liệu" />
        {search && <button type="button" className="icon-btn" aria-label="Xóa tìm kiếm" onClick={() => { setSearch(''); searchRef.current?.focus(); }}><X size={15} /></button>}
      </div>
      <select value={kind} onChange={event => { setKind(event.target.value as Kind); setChapter(null); }} aria-label="Loại học liệu">
        {filters.map(filter => <option key={filter.kind} value={filter.kind}>{filter.kind === 'all' ? 'Mọi loại học liệu' : filter.label}</option>)}
      </select>
    </div>
    <div className={'studio-library-layout studio-chapter-layout' + (preview && wide ? ' has-preview' : '') + (scope === 'trash' ? ' no-chapter-nav' : '')}>
      {scope !== 'trash' && <nav className="studio-chapter-nav" aria-label={`Mục lục Toán ${grade}`}>
        <header><BookOpen size={16} /><span>KẾT NỐI TRI THỨC</span></header>
        <label className="studio-chapter-mobile">Chương<select aria-label="Chọn chương học liệu" value={acrossChapters ? 'search' : activeChapter}
          onChange={event => { setSearch(''); setChapter(Number(event.target.value)); closePreview(); }}>
          {acrossChapters && <option value="search" disabled>Kết quả mọi chương</option>}
          {chapterOptions.map(value => <option key={value.value} value={value.value}>{value.value ? `Chương ${chapterRoman[value.value]} · ` : ''}{value.name}</option>)}
        </select></label>
        <div className="studio-chapter-entries">{chapterOptions.map(value => <button type="button" key={value.value}
          aria-current={!acrossChapters && activeChapter === value.value ? 'true' : undefined}
          onClick={() => { setSearch(''); setChapter(value.value); closePreview(); }}>
          <span className="studio-chapter-roman">{value.value ? chapterRoman[value.value] : <BookOpen size={14} />}</span>
          <span>{value.name}</span><small>{counts.get(value.value) ?? '–'}</small>
        </button>)}</div>
      </nav>}
      <div className="studio-chapter-content">
        <header className="studio-chapter-heading">
          <div>
            <small>{scope === 'trash' ? `TOÁN ${grade} · CÓ THỂ KHÔI PHỤC` : `TOÁN ${grade}${!acrossChapters && activeChapter ? ' / CHƯƠNG ' + chapterRoman[activeChapter] : ''}`}</small>
            <h2>{scope === 'trash' ? 'Thùng rác' : acrossChapters ? 'Kết quả tìm kiếm' : chapterLabel(grade, activeChapter)}</h2>
          </div>
          <p className="studio-results-count" role="status">{resources.length} học liệu</p>
        </header>
        {resources.length ? visibleGroups.map(group => <section className="studio-chapter-group" key={group.value}>
          {acrossChapters && <h3>{group.value ? `Chương ${chapterRoman[group.value]} · ` : ''}{group.name}</h3>}
          <div className="studio-library-grid">{resources.filter(item => getChapter(item) === group.value).map(item => <LibraryResourceCard
            key={item.id} item={item} activeClip={activeClip} expanded={wide ? preview?.id === item.id : undefined} popup={wide ? undefined : 'dialog'}
            onOpen={event => { activeClip.current?.(); previewOpener.current = event.currentTarget; setActionError(''); setPreview(item); }} />)}</div>
        </section>) : <div className="studio-library-empty"><BookOpen size={27} /><p>{scope === 'trash' && !search.trim() ? 'Chưa có học liệu trong Thùng rác ở khối này.' :
          search.trim() || kind !== 'all' ? 'Không tìm thấy học liệu phù hợp.' : scope === 'mine' ? 'Bạn chưa đăng học liệu ở chương này.' : 'Chưa có học liệu ở chương này.'}</p>
          {search.trim() || kind !== 'all' ? <button type="button" className="text-btn" onClick={() => { setSearch(''); setKind('all'); }}>Đặt lại bộ lọc</button> :
            canUpload && scope !== 'trash' ? <button type="button" className="btn secondary sm" onClick={() => setUploadOpen(true)}><Plus size={15} /> Đăng học liệu</button> : null}
        </div>}
      </div>
      {preview && wide && <aside className="studio-preview" ref={previewRef} tabIndex={-1} aria-labelledby="studio-preview-title"
        onKeyDown={event => { if (event.key === 'Escape') closePreview(); }}>{quick}</aside>}
    </div>
    {preview && !wide && <dialog ref={quickDialog} className="studio-quick-dialog" aria-labelledby="studio-preview-title"
      onCancel={event => { event.preventDefault(); closePreview(); }}><div className="studio-preview">{quick}</div></dialog>}
    {uploadOpen && uploads && <LibraryUploadDialog grade={grade} chapter={activeChapter} onClose={() => setUploadOpen(false)}
      onCreate={async draft => {
        await uploads.create(draft);
        chooseScope(draft.visibility === 'private' ? 'mine' : 'team');
        setGrade(draft.grade); setChapter(draft.chapter); setUploadOpen(false);
        setFeedback(draft.visibility === 'private' ? 'Đã lưu riêng tư trong Của tôi.' : 'Đã đăng học liệu vào kho của tổ.');
      }} />}
    {selected && <dialog ref={dialogRef} className="dl-dialog-backdrop" aria-label={'Xem '+selected.title} onCancel={event => {event.preventDefault(); closeViewer();}} onMouseDown={event => {if(event.currentTarget===event.target) closeViewer()}}>
      <div className="dl-viewer" ref={viewerRef} role="dialog" aria-modal="true" aria-label={'Xem '+selected.title}>
        <header className="dl-viewer-head">
          <button className="dl-back" onClick={closeViewer}><ArrowLeft size={17}/> <span>Thư viện</span></button>
          <div className="dl-viewer-name"><small>{resourceKinds[selected.kind]} · {selected.grade?`Toán ${selected.grade}`:'Toán THPT'}</small><b title={selected.title}>{selected.title}</b></div>
          <div className="dl-viewer-actions">
            {document.fullscreenEnabled && <button title="Toàn màn hình" aria-label="Toàn màn hình" onClick={toggleFullscreen}><Maximize2 size={18}/></button>}
            {(selected.upload || isPdf(selected)) && <a href={downloadUrl(selected)} download={selected.upload ? undefined : ''} aria-label="Tải xuống"><Download size={17}/><span>Tải xuống</span></a>}
            <a href={resourceUrl(selected)} target="_blank" rel="noopener noreferrer" title="Mở tài nguyên trong tab riêng"><ExternalLink size={17}/><span>Mở tab riêng</span></a>
            <button aria-label="Đóng" title="Đóng" onClick={closeViewer}><X size={20}/></button>
          </div>
        </header>
        <div className="dl-frame-wrap">
          {fileState === 'missing' ? <div className="dl-file-issue"><Info size={28}/><h3>Chưa tìm thấy tệp học liệu</h3><p>{selected.upload ? 'Tệp có thể đã được gỡ hoặc đổi phạm vi chia sẻ.' : 'Hãy kiểm tra thư mục học liệu đi kèm bản cài đặt.'}</p><button onClick={closeViewer}>Quay về thư viện</button></div>
          : fileState === 'loading' ? <div className="dl-frame-loading" role="status">Đang kiểm tra tệp học liệu...</div>
          : selected.upload?.mime.startsWith('image/') ? <img className="dl-uploaded-image" src={resourceUrl(selected)} alt={selected.title} />
          : isPdf(selected) ? <iframe key={selected.id} className="dl-resource-frame" src={resourceUrl(selected)} title={selected.title} />
          : <iframe key={selected.id} className="dl-resource-frame" src={resourceUrl(selected)} title={selected.title}
               sandbox={selected.upload ? 'allow-scripts' : 'allow-scripts allow-forms allow-modals allow-downloads allow-pointer-lock' + (library?.isolated ? ' allow-same-origin' : '')}
               allow="fullscreen" referrerPolicy="no-referrer" />}
        </div>
        <div className="dl-viewer-note"><Info size={14}/><span>{selected.upload ? selected.upload.mime === 'text/html' ? 'Tệp HTML đăng tải chạy độc lập, không kết nối dịch vụ bên ngoài.' : selected.upload.filename : 'Chọn “Mở tab riêng” để trình chiếu trong cửa sổ độc lập.'}</span></div>
      </div>
    </dialog>}
  </section>;
}

export default DigitalLibrary;
