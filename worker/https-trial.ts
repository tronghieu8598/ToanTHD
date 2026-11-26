/// <reference types="vite/client" />

import sample from '../data/https-trial-library.json';
import montyHall from '../data/https-trial-sources/monty-hall.html?raw';
import capSoNhan from '../data/https-trial-sources/cap-so-nhan.html?raw';
import pdf from '../data/https-trial-sources/giao-an-cap-so-nhan.json';
import {publishedLibraryPrefix} from '../lib/library-hosted.mjs';

declare global {
  namespace Cloudflare {
    interface Env { THD_HTTPS_FIXTURE?: string; }
  }
}

type SampleAccount = { label: string; id: string; username: string; salt: string; hash: string; epoch: string };
const workspaceMarker = 'https_trial_fixtures_v1';
const libraryMarker = 'https_trial_assets_v3';
let initialized = false;

export async function initializeHttpsTrial(env: Cloudflare.Env) {
  if (initialized || !env.DB || !env.BUCKET || !env.THD_HTTPS_FIXTURE) return;
  const db = env.DB, bucket = env.BUCKET;
  const {results} = await db.prepare('SELECT key FROM workspace_settings WHERE key IN (?,?)')
    .bind(workspaceMarker, libraryMarker).all<{key: string}>();
  const markers = new Set(results.map(row => row.key));
  if (!markers.has(workspaceMarker)) await seedWorkspace(db, env.THD_HTTPS_FIXTURE);
  if (!markers.has(libraryMarker)) {
    const prefix = publishedLibraryPrefix + 'https-mau/xac-suat/';
    const answerJson = JSON.stringify({answer: sample.answer});
    // The sandboxed page can show the answer without a second authenticated request.
    const html = sample.html.join('\n').replace('{{answerJson}}', () => answerJson.replaceAll('<', '\\u003c'));
    await Promise.all([
      bucket.put(prefix + 'index.html', html),
      bucket.put(prefix + 'dap-an.json', answerJson),
      bucket.put(publishedLibraryPrefix + '12-monty-hall-game-577dcd0/index.html', montyHall),
      bucket.put(publishedLibraryPrefix + 'e-learning-csn/index.html', capSoNhan),
      bucket.put(publishedLibraryPrefix + '11-giaoan-sp1-adc1846.pdf', Uint8Array.from(atob(pdf.base64), value => value.charCodeAt(0))),
    ]);
    await db.prepare('INSERT OR IGNORE INTO workspace_settings(key,value) VALUES (?,?)')
      .bind(libraryMarker, '1').run();
  }
  initialized = true;
}

async function seedWorkspace(db: D1Database, fixture: string) {
  const accounts = JSON.parse(fixture) as SampleAccount[];
  const roomId = 'https-mau-12';
  const classes = JSON.stringify([roomId]);
  const now = Date.now();
  const statements = [
    db.prepare('INSERT OR IGNORE INTO classrooms (id,label,grade,school_year,is_sample) VALUES (?,?,12,?,1)')
      .bind(roomId, '12 · Lớp thử HTTPS', '2026–2027'),
  ];
  for (const account of accounts) {
    statements.push(db.prepare(`INSERT OR IGNORE INTO teacher_accounts
      (id,username,display_name,password_salt,password_hash,auth_epoch,must_change_password,permissions,allowed_class_ids,selected_class_ids)
      VALUES (?,?,?,?,?,?,0,?,?,?)`).bind(account.id, account.username, 'Giáo viên mẫu ' + account.label,
      account.salt, account.hash, account.epoch, JSON.stringify({upload_library:true}), classes, classes));
  }
  const uploads = [
    {id:'upload-11111111-1111-4111-8111-111111111111', title:'Bản riêng của giáo viên A', visibility:'private'},
    {id:'upload-11111111-1111-4111-8111-111111111112', title:'Bài mẫu chia sẻ toàn tổ', visibility:'team'},
  ];
  for (const asset of uploads) {
    const html = '<!doctype html><html lang="vi"><meta charset="utf-8"><h1>' + asset.title + '</h1><p>Đây là tệp dùng để thử quyền xem.</p></html>';
    const bytes = new TextEncoder().encode(html);
    statements.push(db.prepare(`INSERT OR IGNORE INTO library_uploads
      (id,owner_key,title,grade,chapter_number,visibility,mime,filename,byte_length,created_at)
      VALUES (?,?,?,12,6,?,'text/html','bai-mau.html',?,?)`).bind(asset.id, accounts[0].id, asset.title, asset.visibility, bytes.length, now));
    statements.push(db.prepare('INSERT OR IGNORE INTO library_upload_chunks(upload_id,position,data) VALUES (?,0,?)')
      .bind(asset.id,btoa(String.fromCharCode(...bytes))));
  }
  statements.push(db.prepare('INSERT OR IGNORE INTO workspace_settings(key,value) VALUES (?,?)').bind(workspaceMarker,'1'));
  await db.batch(statements);
}
