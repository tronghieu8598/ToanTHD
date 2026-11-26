'use client';

import {useEffect, useState} from 'react';
import {Archive, BookOpen, Check, ClipboardList, Copy, Eye, EyeOff, History, KeyRound, Plus, Search, ShieldCheck, Upload, Users} from 'lucide-react';
import {adminApi, Dialog} from './admin-panels';
import {normalizeLibraryText} from '../lib/client/library-catalog';

type Room = {id: string; label: string; school_year: string; grade: number; is_sample?: number};
type Rights = {author_exams: boolean; edit_bank: boolean; manage_rosters: boolean; upload_library: boolean};
type Account = {
  id: string; username: string; display_name: string; enabled: boolean; must_change_password: boolean;
  revision: number; permissions: Rights; allowed_class_ids: string[]; selected_class_ids: string[] | null;
};
type AccountDraft = Omit<Account,'id'|'revision'|'must_change_password'|'selected_class_ids'> & {
  id?: string; revision?: number; temporary_password: string;
};
type Profile = {classes: Room[]; selected_class_ids: string[]};
type Exam = {
  id: string; title: string; question_count: number; minutes: number; mode: string; scoring_mode: string; archived_at: number | null;
  visibility: 'private' | 'team'; revision: number; owned: boolean; can_manage: boolean; can_share: boolean;
};
type AccountEvent = {account_id: string; account_username: string; actor: string; created_at: number; actions: string[]};
const eventLabels: Record<string,string> = {
  created: 'Cấp tài khoản', identity: 'Cập nhật tên', permissions: 'Đổi quyền', classes: 'Đổi lớp được cấp',
  locked: 'Khóa tài khoản', enabled: 'Mở khóa', password_reset: 'Đặt lại mật khẩu tạm',
};

const rightsLabels: [keyof Rights,string][] = [
  ['author_exams','Soạn và lưu đề'],
  ['upload_library','Đăng học liệu'],
  ['edit_bank','Biên tập ngân hàng câu hỏi'],
  ['manage_rosters','Quản lý lớp và danh sách học sinh'],
];
const basicRights: Rights = {author_exams:false, edit_bank:false, manage_rosters:false, upload_library:false};
const contentRights: Rights = {...basicRights, author_exams:true, upload_library:true};
function temporaryPassword() {
  return 'Thd!' + Array.from(crypto.getRandomValues(new Uint8Array(12)), value => value.toString(16).padStart(2, '0')).join('');
}
const classLabel = (room: Room) => room.label + ' · ' + room.school_year;
const toggle = (ids: string[], id: string) => ids.includes(id) ? ids.filter(value => value !== id) : [...ids,id];

function RoomPicker({rooms, selected, onChange, label}: {
  rooms: Room[]; selected: string[]; onChange: (ids: string[]) => void; label: string;
}) {
  return <fieldset className="staff-room-fieldset">
    <legend>{label}</legend>
    {rooms.length ? <div className="staff-room-grid">{rooms.map(room =>
      <label key={room.id} className={selected.includes(room.id) ? 'checked' : ''}>
        <input type="checkbox" checked={selected.includes(room.id)} onChange={() => onChange(toggle(selected,room.id))} />
        <span><b>{room.label}</b><small>{room.school_year}{room.is_sample ? ' · Minh họa' : ''}</small></span>
      </label>
    )}</div> : <p className="staff-muted">Chưa có lớp trong danh sách.</p>}
  </fieldset>;
}

export function AccountsPanel({rooms, customPassword, onSettings}: {
  rooms: Room[]; customPassword: boolean; onSettings: () => void;
}) {
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [draft,setDraft]=useState<AccountDraft|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [formError,setFormError]=useState('');
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState('');
  const [query,setQuery]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [issued,setIssued]=useState<{username:string; password:string} | null>(null);
  const [copied,setCopied]=useState(false);
  const [auditOpen,setAuditOpen]=useState(false);
  const [auditLoading,setAuditLoading]=useState(false);
  const [auditError,setAuditError]=useState('');
  const [events,setEvents]=useState<AccountEvent[]>([]);
  async function load(){
    setLoading(true);setError('');
    try{const data=await adminApi('teacher/accounts');setAccounts(data.accounts);}
    catch(error){setError((error as Error).message);}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  async function openAudit() {
    setAuditOpen(true);setAuditLoading(true);setAuditError('');
    try { setEvents((await adminApi('teacher/accounts/audit')).events); }
    catch (error) { setAuditError((error as Error).message); }
    finally { setAuditLoading(false); }
  }
  function open(account?: Account){
    setFormError('');setNotice('');setShowPassword(false);
    setDraft(account ? {...account,temporary_password:''} : {
      username:'',display_name:'',enabled:true,permissions:basicRights,
      allowed_class_ids:[],temporary_password:'',
    });
  }
  async function save(event: React.FormEvent){
    event.preventDefault();
    if(!draft)return;
    setBusy(true);setFormError('');
    try{
      const {temporary_password,...fields}=draft;
      await adminApi('teacher/accounts',{...fields,...(!fields.id||temporary_password?{temporary_password}:{})});
      setDraft(null);
      setNotice(fields.id?'Đã cập nhật tài khoản.':'Đã cấp tài khoản giáo viên.');
      if (temporary_password) { setIssued({username:fields.username.trim().toLowerCase(),password:temporary_password}); setCopied(false); setShowPassword(false); }
      await load();
    }catch(error){setFormError((error as Error).message);}
    finally{setBusy(false);}
  }
  const visible = accounts.filter(account => normalizeLibraryText(account.display_name + ' ' + account.username).includes(normalizeLibraryText(query.trim())));
  const pending = accounts.filter(account=>account.enabled && (account.must_change_password || account.selected_class_ids === null)).length;
  return <section className="studio-accounts">
    <div className="studio-page-heading">
      <div><div className="eyebrow">KHÔNG GIAN QUẢN TRỊ</div><h1>Tài khoản giáo viên<span>.</span></h1></div>
      <div className="studio-page-actions">
        {customPassword && <a className="btn secondary" href="/quan-tri/nap-hoc-lieu"><Upload size={16} /> Nạp học liệu</a>}
        <button type="button" className="btn secondary" disabled={!customPassword} onClick={()=>void openAudit()}><History size={16}/> Nhật ký</button>
        <button type="button" className="btn primary" disabled={!customPassword} onClick={()=>open()}><Plus size={16}/> Cấp tài khoản</button>
      </div>
    </div>
    {!customPassword && <div className="card staff-empty"><ShieldCheck size={24}/><h2>Đặt mật khẩu quản trị riêng</h2>
      <p>Hoàn tất bước này trước khi thêm tài khoản giáo viên.</p><button type="button" className="btn secondary" onClick={onSettings}>Mở cài đặt mật khẩu</button></div>}
    {notice && <p role="status" className="staff-success"><Check size={16}/>{notice}</p>}
    {error && <p role="alert" className="form-error">{error} <button type="button" className="text-btn" onClick={()=>void load()}>Tải lại</button></p>}
    {loading && <p className="staff-muted" role="status">Đang tải tài khoản…</p>}
    {!loading && customPassword && !accounts.length && <div className="card staff-empty"><Users size={24}/><h2>Chưa có tài khoản giáo viên</h2>
      <p>Thêm tài khoản, đặt mật khẩu tạm và chọn các lớp được phép sử dụng.</p></div>}
    {!!accounts.length && <div className="studio-accounts-bar">
      <div><b>{accounts.length} giáo viên</b><span>{pending ? pending + ' chờ thiết lập' : 'Tài khoản và phạm vi lớp'}</span></div>
      <label className="studio-library-search"><Search size={16} /><input type="search" aria-label="Tìm giáo viên" placeholder="Tìm tên hoặc tên đăng nhập…" value={query} onChange={e=>setQuery(e.target.value)} /></label>
    </div>}
    {!loading && !!accounts.length && !visible.length && <p className="card staff-empty">Không tìm thấy giáo viên phù hợp.</p>}
    <div className="staff-list">{visible.map(account=>{
      const assigned=rooms.filter(room=>account.allowed_class_ids.includes(room.id));
      const teaching=assigned.filter(room=>account.selected_class_ids?.includes(room.id));
      const rights=rightsLabels.filter(([key])=>account.permissions[key]).map(([,label])=>label);
      const waiting=account.enabled && (account.must_change_password || account.selected_class_ids === null);
      return <article className="card staff-row" key={account.id}>
        <div className="staff-row-icon"><Users size={20}/></div>
        <div className="staff-row-main">
          <h2>{account.display_name} <span className={'staff-badge '+(waiting?'waiting':account.enabled?'':'locked')}>{waiting?'Chờ thiết lập':account.enabled?'Hoạt động':'Đã khóa'}</span></h2>
          <p><b>@{account.username}</b> · {assigned.length?assigned.map(room=>room.label).join(', '):'Chưa cấp lớp'}</p>
          {account.enabled && !waiting && <small>Lớp đang dạy {teaching.length ? teaching.map(room=>room.label).join(', ') : 'chưa chọn'}</small>}
          <div className="studio-account-rights">{rights.length ? rights.map(right=><span key={right}>{right}</span>) : <span>Giao đề đã lưu</span>}</div>
        </div>
        <button type="button" className="btn secondary" disabled={!customPassword} onClick={()=>open(account)}>Sửa quyền</button>
      </article>;
    })}</div>
    {auditOpen && <Dialog title="Nhật ký tài khoản" onClose={()=>setAuditOpen(false)}>
      <div className="staff-dialog-form">
        {auditLoading ? <p role="status">Đang tải nhật ký…</p> : auditError ? <p role="alert" className="form-error">{auditError}
          <button type="button" className="text-btn" onClick={()=>void openAudit()}>Tải lại</button></p>
          : !events.length ? <p>Chưa có thay đổi tài khoản kể từ khi bật nhật ký.</p>
          : <ol className="staff-audit-list">{events.map((event,index)=><li key={event.account_id+'-'+event.created_at+'-'+index}>
            <div><b>{event.actions.map(action=>eventLabels[action] || action).join(' · ')}</b><span>@{event.account_username}</span></div>
            <small>{new Date(event.created_at).toLocaleString('vi-VN')} · {event.actor}</small>
          </li>)}</ol>}
      </div>
    </Dialog>}
    {draft && <Dialog title={draft.id?'Cập nhật tài khoản giáo viên':'Cấp tài khoản giáo viên'} onClose={()=>{if(!busy)setDraft(null);}} wide>
      <form className="staff-dialog-form" onSubmit={save}>
        <div className="studio-account-step"><span>1</span><b>Thông tin đăng nhập</b></div>
        <div className="form-grid two">
          <label>Tên hiển thị<input value={draft.display_name} required maxLength={100}
            onChange={e=>setDraft({...draft,display_name:e.target.value})}/></label>
          <label>Tên đăng nhập<input value={draft.username} required minLength={3} maxLength={32}
            autoComplete="off" autoCapitalize="none" spellCheck={false}
            onChange={e=>setDraft({...draft,username:e.target.value})}/></label>
        </div>
        <div className="studio-password-row"><label>{draft.id?'Mật khẩu tạm mới (nếu đặt lại)':'Mật khẩu tạm'}<input type={showPassword?'text':'password'} value={draft.temporary_password}
          required={!draft.id} minLength={12} maxLength={200} autoComplete="new-password"
          onChange={e=>setDraft({...draft,temporary_password:e.target.value})}/></label>
          <button type="button" className="btn secondary" onClick={()=>setDraft({...draft,temporary_password:temporaryPassword()})}><KeyRound size={14}/> Tạo mật khẩu</button>
          <button type="button" className="icon-btn" aria-label={showPassword?'Ẩn mật khẩu':'Hiện mật khẩu'} onClick={()=>setShowPassword(value=>!value)}>
            {showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
        <p className="staff-muted">Giáo viên đổi mật khẩu tạm khi đăng nhập lần đầu.</p>
        <div className="studio-account-step"><span>2</span><b>Phạm vi lớp và công việc</b></div>
        <RoomPicker rooms={rooms} selected={draft.allowed_class_ids} label="Các lớp được cấp"
          onChange={ids=>setDraft({...draft,allowed_class_ids:ids})}/>
        {!draft.id && <div className="studio-account-presets" role="group" aria-label="Mẫu quyền giáo viên">
          <button type="button" className="btn secondary sm" onClick={()=>setDraft({...draft,permissions:basicRights})}>Chỉ giao đề</button>
          <button type="button" className="btn secondary sm" onClick={()=>setDraft({...draft,permissions:contentRights})}>Soạn đề và đăng học liệu</button>
        </div>}
        <fieldset className="staff-rights">
          <legend>Quyền bổ sung</legend>
          {rightsLabels.map(([key,label])=><label key={key}><input type="checkbox" checked={draft.permissions[key]}
            onChange={e=>setDraft({...draft,permissions:{...draft.permissions,[key]:e.target.checked}})}/>{label}</label>)}
        </fieldset>
        <label className="staff-check"><input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>
          Cho phép đăng nhập
        </label>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" disabled={busy} onClick={()=>setDraft(null)}>Hủy</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy?'Đang lưu…':draft.id?'Lưu thay đổi':'Tạo tài khoản'}</button>
        </div>
      </form>
    </Dialog>}
    {issued && <Dialog title="Thông tin bàn giao tài khoản" onClose={()=>setIssued(null)}>
      <div className="staff-dialog-form">
        <p>Gửi riêng thông tin này cho giáo viên. Mật khẩu tạm sẽ không hiển thị lại khi đóng.</p>
        <label>Tên đăng nhập<input readOnly value={issued.username}/></label>
        <div className="studio-password-row"><label>Mật khẩu tạm<input readOnly type={showPassword?'text':'password'} value={issued.password}/></label>
          <button type="button" className="icon-btn" aria-label={showPassword?'Ẩn mật khẩu':'Hiện mật khẩu'} onClick={()=>setShowPassword(value=>!value)}>
            {showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={async()=>{
            try { await navigator.clipboard.writeText('Tên đăng nhập: '+issued.username+'\nMật khẩu tạm: '+issued.password); setCopied(true); }
            catch { setShowPassword(true); }
          }}><Copy size={15}/> {copied?'Đã sao chép':'Sao chép thông tin'}</button>
          <button type="button" className="btn primary" onClick={()=>setIssued(null)}>Hoàn tất</button>
        </div>
      </div>
    </Dialog>}
  </section>;
}

function StaffPasswordForm({first, onSaved}: {first:boolean;onSaved:()=>Promise<void>}) {
  const [old,setOld]=useState('');
  const [password,setPassword]=useState('');
  const [repeat,setRepeat]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  async function save(event:React.FormEvent){
    event.preventDefault();setError('');setMessage('');
    if(password!==repeat){setError('Hai lần nhập mật khẩu mới chưa khớp.');return;}
    setBusy(true);
    try{
      await adminApi('teacher/password',{old_password:old,new_password:password});
      setOld('');setPassword('');setRepeat('');setMessage('Đã đổi mật khẩu. Các phiên đăng nhập trước đã hết hiệu lực.');
      await onSaved();
    }catch(error){setError((error as Error).message);}
    finally{setBusy(false);}
  }
  return <section className="card staff-settings-card"><KeyRound size={22}/>
    <h2>{first?'Đổi mật khẩu tạm':'Đổi mật khẩu'}</h2>
    <p className="staff-muted">{first?'Đặt mật khẩu riêng trước khi dùng tài khoản.':'Mật khẩu mới cần ít nhất 12 ký tự.'}</p>
    <form onSubmit={save}>
      <label>{first?'Mật khẩu tạm':'Mật khẩu hiện tại'}<input type="password" required value={old} autoComplete="current-password"
        onChange={e=>setOld(e.target.value)}/></label>
      <label>Mật khẩu mới<input type="password" required minLength={12} maxLength={200} value={password}
        autoComplete="new-password" onChange={e=>setPassword(e.target.value)}/></label>
      <label>Nhập lại mật khẩu mới<input type="password" required minLength={12} maxLength={200} value={repeat}
        autoComplete="new-password" onChange={e=>setRepeat(e.target.value)}/></label>
      {error&&<p className="form-error" role="alert">{error}</p>}
      {message&&<p role="status" className="staff-success">{message}</p>}
      <button type="submit" className="btn primary" disabled={busy}>{busy?'Đang lưu…':'Lưu mật khẩu mới'}</button>
    </form>
  </section>;
}

export function StaffSettings({name, first, mustChange, onSaved, onLogout}: {
  name:string;first:boolean;mustChange:boolean;onSaved:()=>Promise<void>;onLogout:()=>void;
}) {
  const [profile,setProfile]=useState<Profile|null>(null);
  const [selected,setSelected]=useState<string[]>([]);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    if(mustChange)return;
    let active=true;
    setProfile(null);setError('');
    adminApi('teacher/profile').then(data=>{
      if(active){setProfile(data as Profile);setSelected(data.selected_class_ids);}
    }).catch(error=>{if(active)setError(error.message);});
    return()=>{active=false;};
  },[mustChange,reload]);
  async function save(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try{
      await adminApi('teacher/profile',{class_ids:selected});
      setNotice('Đã lưu danh sách lớp giảng dạy.');
      await onSaved();
    }catch(error){setError((error as Error).message);}
    finally{setBusy(false);}
  }
  return <>
    <div className="page-heading">
      <div><div className="eyebrow">TÀI KHOẢN GIÁO VIÊN</div>
        <h1>{first?'Thiết lập lần đầu':'Cài đặt tài khoản'}</h1>
        <p>{first?'Xin chào '+name+'. '+(mustChange?'Bước 1/2 · Đổi mật khẩu tạm.':'Bước 2/2 · Chọn lớp thầy cô đang dạy.'):'Cập nhật mật khẩu và danh sách lớp dùng để giao đề.'}</p>
      </div>
      {first&&<button type="button" className="btn secondary" onClick={onLogout}>Đăng xuất</button>}
    </div>
    <div className={'staff-settings-grid '+(first?'first-setup':'')}>
      {!mustChange && <section className="card staff-settings-card"><Users size={22}/><h2>Lớp giảng dạy</h2>
        <p className="staff-muted">Khi giao đề, danh sách chỉ hiện các lớp được chọn ở đây.</p>
        {profile ? <form onSubmit={save}>
          <RoomPicker rooms={profile.classes} selected={selected} onChange={setSelected} label="Chọn trong các lớp quản trị đã cấp"/>
          {!profile.classes.length && <p className="staff-muted">Quản trị chưa cấp lớp cho tài khoản. Có thể chọn lớp sau tại đây.</p>}
          {notice&&<p className="staff-success" role="status">{notice}</p>}
          <button className="btn primary" disabled={busy||profile.classes.length>0&&!selected.length}>
            {busy?'Đang lưu…':first?'Hoàn tất thiết lập':'Lưu danh sách lớp'}
          </button>
        </form> : !error && <p role="status" className="staff-muted">Đang tải danh sách lớp…</p>}
        {error&&<p className="form-error" role="alert">{error} <button type="button" className="text-btn" onClick={()=>setReload(n=>n+1)}>Tải lại danh sách</button></p>}
      </section>}
      {(!first||mustChange)&&<StaffPasswordForm first={mustChange} onSaved={onSaved}/>}
    </div>
  </>;
}

export function SavedExamsPanel({rooms, canAuthor, onBank, onSettings, onAssigned}: {
  rooms: Room[]; canAuthor: boolean; onBank:()=>void; onSettings:()=>void; onAssigned:(id:string)=>Promise<void>;
}) {
  const [exams,setExams]=useState<Exam[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [selected,setSelected]=useState<Exam|null>(null);
  const [roomId,setRoomId]=useState('');
  const [minutes,setMinutes]=useState(15);
  const [busy,setBusy]=useState(false);
  const [formError,setFormError]=useState('');
  const [tab,setTab]=useState<'mine'|'team'>(canAuthor?'mine':'team');
  const [editing,setEditing]=useState<{exam:Exam; copy:boolean; title:string; minutes:number}|null>(null);
  async function load(){
    setLoading(true);setError('');
    try{setExams((await adminApi('teacher/exams')).exams);}
    catch(error){setError((error as Error).message);}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  function open(exam:Exam){setSelected(exam);setRoomId(rooms[0]?.id||'');setMinutes(exam.minutes);setFormError('');}
  async function assign(event:React.FormEvent){
    event.preventDefault();
    if(!selected)return;
    setBusy(true);setFormError('');
    try{
      const created=await adminApi('teacher/exams/assign',{exam_id:selected.id,classroom_id:roomId,minutes});
      setSelected(null);
      await onAssigned(created.id);
    }catch(error){setFormError((error as Error).message);}
    finally{setBusy(false);}
  }
  async function updateExam(exam:Exam, action:'archive'|'visibility'){
    setBusy(true);setNotice('');setError('');
    try{
      const visibility=exam.visibility==='private'?'team':'private';
      await adminApi('teacher/exams/'+action,{id:exam.id,revision:exam.revision,
        ...(action==='archive'?{archived:!exam.archived_at}:{visibility})});
      setNotice(action==='visibility'?(visibility==='team'?'Đã chia sẻ đề với tổ.':'Đã chuyển đề về riêng tư.'):
        exam.archived_at?'Đã khôi phục đề.':'Đã lưu trữ đề.');
      await load();
    }catch(error){setError((error as Error).message);}
    finally{setBusy(false);}
  }
  async function saveDraft(event:React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);setFormError('');
    try {
      const {exam,copy,title,minutes}=editing;
      if (copy) {
        await adminApi('teacher/exams',{source_exam_id:exam.id,title,minutes});
        setTab('mine');
      } else {
        await adminApi('teacher/exams/details',{id:exam.id,revision:exam.revision,title,minutes});
      }
      setEditing(null);
      setNotice(copy?'Đã lưu bản sao riêng trong Đề của tôi.':'Đã lưu thay đổi bản nháp.');
      await load();
    } catch (error) { setFormError((error as Error).message); }
    finally { setBusy(false); }
  }
  const visible = exams.filter(exam=>tab==='mine'?exam.owned:exam.visibility==='team');
  function edit(exam:Exam,copy:boolean) {
    setFormError('');
    setEditing({exam,copy,title:copy?exam.title.slice(0,150)+' · Bản sao':exam.title,minutes:exam.minutes});
  }
  return <>
    <div className="page-heading">
      <div><h1>Đề đã lưu</h1></div>
      {canAuthor&&<button type="button" className="btn primary" onClick={onBank}><Plus size={16}/> Soạn đề từ ngân hàng</button>}
    </div>
    {!rooms.length&&<div className="card staff-empty"><Users size={22}/><h2>Chưa có lớp để giao đề</h2>
      <p>Chọn lớp đang dạy trong cài đặt tài khoản.</p><button type="button" className="btn secondary" onClick={onSettings}>Mở cài đặt</button></div>}
    {notice&&<p className="staff-success" role="status">{notice}</p>}
    {error&&<p className="form-error" role="alert">{error} <button type="button" className="text-btn" onClick={()=>void load()}>Tải lại</button></p>}
    {loading&&<p role="status" className="staff-muted">Đang tải đề…</p>}
    <nav className="studio-library-scopes" aria-label="Kho đề đã lưu">
      <button type="button" aria-pressed={tab==='mine'} onClick={()=>setTab('mine')}>Đề của tôi</button>
      <button type="button" aria-pressed={tab==='team'} onClick={()=>setTab('team')}>Đề của tổ</button>
    </nav>
    {!loading&&!visible.length&&!error&&<div className="card staff-empty"><BookOpen size={24}/>
      <h2>{tab==='mine'?'Chưa có đề của bạn':'Chưa có đề chia sẻ'}</h2></div>}
    <div className="staff-list">{visible.map(exam=><article className="card staff-row" key={exam.id}>
      <div className="staff-row-icon"><ClipboardList size={20}/></div>
      <div className="staff-row-main"><h2>{exam.title} <span className={'staff-badge '+(exam.archived_at?'locked':'')}>
        {exam.archived_at?'Đã lưu trữ':exam.visibility==='private'?'Riêng tư':'Chia sẻ với tổ'}</span></h2>
        <p>{exam.question_count} câu · {exam.minutes} phút · {exam.scoring_mode==='exam-1246'?'Cấu trúc 12–4–6':'Luyện tập'}</p>
        <small>{exam.mode==='paper'?'Phiếu trả lời theo tài liệu giấy':'Đề đầy đủ trên thiết bị học sinh'}</small>
      </div>
      <div className="toolbar-actions">
        {(exam.can_manage || canAuthor && !exam.archived_at) && <details className="staff-exam-actions">
          <summary>Tùy chọn</summary>
          <div>
            {exam.can_share && !exam.archived_at && <>
              {exam.visibility==='private' && <button type="button" className="text-btn" disabled={busy} onClick={()=>edit(exam,false)}>Sửa tên và thời lượng</button>}
              <button type="button" className="text-btn" disabled={busy} onClick={()=>void updateExam(exam,'visibility')}>
                {exam.visibility==='private'?'Chia sẻ với tổ':'Chuyển về riêng tư'}</button>
            </>}
            {canAuthor && !exam.archived_at && <button type="button" className="text-btn" disabled={busy} onClick={()=>edit(exam,true)}><Copy size={14}/> Sao chép riêng</button>}
            {exam.can_manage && <button type="button" className="text-btn" disabled={busy} onClick={()=>void updateExam(exam,'archive')}>
              <Archive size={14}/>{exam.archived_at?'Khôi phục':'Lưu trữ'}</button>}
          </div>
        </details>}
        {!exam.archived_at&&<button type="button" className="btn primary" disabled={!rooms.length||busy} onClick={()=>open(exam)}>Giao cho lớp</button>}
      </div>
    </article>)}</div>
    {editing&&<Dialog title={editing.copy?'Sao chép đề riêng':'Sửa tên và thời lượng'} onClose={()=>{if(!busy)setEditing(null);}}>
      <form className="staff-dialog-form" onSubmit={saveDraft}>
        <label>Tên đề<input required maxLength={160} value={editing.title}
          onChange={e=>setEditing({...editing,title:e.target.value})}/></label>
        <label>Thời gian làm bài (phút)<input type="number" min="1" max="180" required value={editing.minutes}
          onChange={e=>setEditing({...editing,minutes:Number(e.target.value)})}/></label>
        {formError&&<p className="form-error" role="alert">{formError}</p>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" disabled={busy} onClick={()=>setEditing(null)}>Hủy</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy?'Đang lưu…':editing.copy?'Lưu bản sao':'Lưu thay đổi'}</button>
        </div>
      </form>
    </Dialog>}
    {selected&&<Dialog title="Giao đề cho lớp" onClose={()=>{if(!busy)setSelected(null);}}>
      <form className="staff-dialog-form" onSubmit={assign}>
        <p><b>{selected.title}</b> · {selected.question_count} câu</p>
        <label>Lớp giảng dạy<select required value={roomId} onChange={e=>setRoomId(e.target.value)}>
          {rooms.map(room=><option key={room.id} value={room.id}>{classLabel(room)}</option>)}
        </select></label>
        <label>Thời gian làm bài (phút)<input type="number" min="1" max="180" required value={minutes}
          onChange={e=>setMinutes(Number(e.target.value))}/></label>
        {formError&&<p className="form-error" role="alert">{formError}</p>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" disabled={busy} onClick={()=>setSelected(null)}>Hủy</button>
          <button type="submit" className="btn primary" disabled={busy||!roomId}>{busy?'Đang mở…':'Mở phiên kiểm tra'}</button>
        </div>
      </form>
    </Dialog>}
  </>;
}
