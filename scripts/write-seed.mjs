import {writeFileSync} from 'node:fs';
import * as demo from '../data/demo.mjs';
const value = v => typeof v === 'number' ? String(v) : `'${String(typeof v === 'object' ? JSON.stringify(v) : v).replaceAll("'", "''")}'`;
const insert = (table,rows) => rows.map(original => {
  const row=table==='questions'?{...original,choices:JSON.stringify(original.choices),correct:JSON.stringify(original.correct)}:original;
  return `INSERT OR IGNORE INTO ${table} (${Object.keys(row).join(', ')}) VALUES (${Object.values(row).map(value).join(', ')});`;
});
const names = ['documents','lessons','questions','classrooms','students'];
writeFileSync(new URL('../data/demo-seed.sql',import.meta.url), names.flatMap(n=>insert(n,demo[n])).join('\n')+'\n');
writeFileSync(new URL('../data/demo.json',import.meta.url),JSON.stringify(Object.fromEntries(names.map(n=>[n,demo[n]])),null,2)+'\n');
console.log('Đã tạo dữ liệu minh họa: 30 câu, 3 lớp, 36 học sinh giả định.');
