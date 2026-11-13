import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,readdirSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {copyPrevious,separateFolders} from '../scripts/upgrade-local.mjs';

test('Upgrade accepts separate folders on different Windows drives and rejects overlapping roots',()=>{
 assert.ok(separateFolders('C:\\Old\\v02','D:\\ToanTHD_v03',path.win32));
 assert.ok(separateFolders('C:\\Old\\v02','C:\\Old\\v03',path.win32));
 assert.equal(separateFolders('C:\\Old','C:\\Old\\v03',path.win32),false);
 assert.equal(separateFolders('C:\\Old\\v02','C:\\Old',path.win32),false);
 assert.equal(separateFolders('C:\\Old','c:\\OLD',path.win32),false);
 assert.equal(separateFolders('/base','/base/..backup'),false);
});

test('Upgrade v0.1 SQL preserves attempts and freezes the original roster exactly once',()=>{
 const db=new DatabaseSync(':memory:');try{
 const migrations=readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort();
 db.exec(readFileSync(new URL('../drizzle/'+migrations[0],import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('../data/demo-seed.sql',import.meta.url),'utf8'));
 db.prepare('INSERT INTO sessions(id,code,title,classroom_id,mode,minutes,state,created_at,closes_at) VALUES(?,?,?,?,?,?,?,?,?)').run('old-session','OLD234','Đề v0.1','demo-11a1','online',15,'closed',1,2);
 db.prepare('INSERT INTO attempts(id,token,session_id,student_id,answers,submitted_at,earned,score,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run('old-attempt','fixture-token','old-session','demo-11a1-s1','{}',2,1,10,2);
 for(const file of migrations.slice(1))db.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const backfill=readFileSync(new URL('../data/upgrade-v02.sql',import.meta.url),'utf8');db.exec(backfill);
 const original=JSON.parse(db.prepare('SELECT roster_snapshot FROM sessions WHERE id=?').get('old-session').roster_snapshot);
 assert.equal(original.students.length,12);assert.equal(original.students.find(s=>s.ordinal===1).name,'Học sinh minh họa 01');
 db.exec("UPDATE students SET name='Tên mới' WHERE id='demo-11a1-s1'");db.exec(backfill);
 const preserved=JSON.parse(db.prepare('SELECT roster_snapshot FROM sessions WHERE id=?').get('old-session').roster_snapshot);
 assert.equal(preserved.students.find(s=>s.ordinal===1).name,'Học sinh minh họa 01');assert.equal(db.prepare('SELECT score FROM attempts WHERE id=?').get('old-attempt').score,10);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM questions').get().n,30);
 }finally{db.close();}
});

test('Upgrade copy keeps the old folder intact and refuses to overwrite an existing target',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'toanthd-upgrade-')),old=path.join(root,'v01'),next=path.join(root,'v02');
 try{
 mkdirSync(path.join(old,'.wrangler','state','v3','d1'),{recursive:true});mkdirSync(next);
 writeFileSync(path.join(old,'.dev.vars'),'AUTH_SECRET="fixture-only"\n');writeFileSync(path.join(old,'.wrangler','state','v3','d1','data.sqlite'),'fixture database');writeFileSync(path.join(old,'.wrangler','state','v3','d1','data.sqlite-wal'),'fixture WAL');
 await copyPrevious(old,next,{checkPorts:false});
 assert.equal(readFileSync(path.join(next,'.wrangler','state','v3','d1','data.sqlite'),'utf8'),'fixture database');assert.ok(existsSync(path.join(next,'.wrangler','state','v3','d1','data.sqlite-wal')));assert.ok(existsSync(path.join(old,'.dev.vars')));
 await assert.rejects(()=>copyPrevious(old,next,{checkPorts:false}),/đã có cấu hình hoặc dữ liệu/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('Upgrade v0.2 keeps custom password settings, scores, revisions and frozen rosters when adding v0.3 fields',()=>{
 const db=new DatabaseSync(':memory:');try{
  const files=readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort();
  for(const name of files.slice(0,2))db.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../data/demo-seed.sql',import.meta.url),'utf8'));
  const snapshot=JSON.stringify({class_label:'Frozen 11A1',school_year:'2026-2027',students:[{id:'demo-11a1-s1',ordinal:1,name:'Frozen name'}]});
  db.prepare('INSERT INTO sessions(id,code,title,classroom_id,mode,minutes,state,created_at,closes_at,roster_snapshot) VALUES(?,?,?,?,?,?,?,?,?,?)').run('v02-session','PRE234','Existing v0.2','demo-11a1','online',15,'closed',1,2,snapshot);
  db.prepare('INSERT INTO attempts(id,token,session_id,student_id,answers,submitted_at,earned,score,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run('v02-attempt','old-test-token','v02-session','demo-11a1-s1','{"old-question":"A"}',2,1,8.25,2);
  db.prepare('INSERT INTO workspace_settings(key,value) VALUES(?,?)').run('password_hash','fixture-hash-not-a-password');
  db.exec(readFileSync(new URL('../drizzle/'+files[2],import.meta.url),'utf8'));db.exec(readFileSync(new URL('../data/upgrade-v02.sql',import.meta.url),'utf8'));
  const attempt=db.prepare('SELECT * FROM attempts WHERE id=?').get('v02-attempt'),session=db.prepare('SELECT * FROM sessions WHERE id=?').get('v02-session');
  assert.equal(attempt.score,8.25);assert.equal(attempt.answers,'{"old-question":"A"}');assert.equal(attempt.token,'old-test-token');assert.equal(attempt.save_revision,0);assert.equal(attempt.allow_rejoin,0);assert.equal(session.scoring_mode,'practice');assert.equal(session.roster_snapshot,snapshot);assert.equal(db.prepare('SELECT value FROM workspace_settings WHERE key=?').get('password_hash').value,'fixture-hash-not-a-password');
 }finally{db.close();}
});
