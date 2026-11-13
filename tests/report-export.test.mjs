import test from 'node:test';
import assert from 'node:assert/strict';
import Excel from 'exceljs';
import {DOMParser} from 'linkedom';
import {unzipSync,strFromU8} from 'fflate';
import {createReportWorkbook,createClassroomWorkbook} from '../lib/client/report-export.mjs';
import {reportFixture} from './fixtures/report.mjs';
// Browser DOMParser normalizes fragments into body; match that contract here.
globalThis.DOMParser=class{parseFromString(s,type){return new DOMParser().parseFromString(type==='text/html'?'<html><body>'+s+'</body></html>':s,type);}};

test('v0.4: XLSX round trip keeps six sheets, numbers/zero/blanks, frozen labels, partial TF and original question identities',async()=>{
  const d=reportFixture(),book=await createReportWorkbook(d,{Excel}),bytes=await book.xlsx.writeBuffer(),copy=new Excel.Workbook();await copy.xlsx.load(bytes);
  assert.deepEqual(copy.worksheets.map(s=>s.name),['Tổng quan','Bảng điểm','Phổ điểm','Từng câu','Lựa chọn','Chi tiết trả lời']);
  const grades=copy.getWorksheet('Bảng điểm');assert.equal(grades.rowCount,7);assert.equal(grades.getCell('F2').value,10);assert.equal(grades.getCell('F4').value,0);assert.equal(grades.getCell('F6').value,null);assert.equal(grades.getCell('H6').value,null);assert.equal(grades.getCell('F7').value,null);
  const questions=copy.getWorksheet('Từng câu');assert.equal(questions.getCell('B2').value,137);assert.equal(questions.getCell('B5').value,137);assert.equal(questions.getCell('C5').value,'Bài 2');assert.equal(questions.getCell('N3').value,.25);assert.equal(questions.getCell('L3').value,0);assert.equal(questions.getCell('M3').value,1);
  assert.equal(copy.getWorksheet('Chi tiết trả lời').rowCount,21);assert.equal(copy.getWorksheet('Chi tiết trả lời').getCell('K18').value,'Tạm thời, chưa chấm');
  const choices=copy.getWorksheet('Lựa chọn');assert.equal(choices.rowCount,25);assert.ok(choices.getCell('J2').value.includes('Học sinh minh họa 2'));
  assert.equal(grades.views[0].ySplit,1);assert.ok(grades.autoFilter);assert.equal(grades.getCell('F2').numFmt,'0.00');
});
test('v0.4: workbook exports allowlisted content without credentials/formulas and empty aggregates remain blank',async()=>{
  const d=reportFixture();d.roster[0].name='=HYPERLINK("https://example.invalid","x")';d.questions[0].source={...d.questions[0],prompt:'Tính $\\frac{1}{2}$',images:[]};
  const book=await createReportWorkbook(d,{Excel}),bytes=await book.xlsx.writeBuffer(),copy=new Excel.Workbook();await copy.xlsx.load(bytes);
  assert.equal(copy.getWorksheet('Bảng điểm').getCell('B2').value,d.roster[0].name);assert.equal(copy.getWorksheet('Từng câu').getCell('G2').value,'Tính $\\frac{1}{2}$');
  const xml=Object.entries(unzipSync(new Uint8Array(bytes))).filter(([name])=>name.endsWith('.xml')).map(([,v])=>strFromU8(v)).join('');
  assert.ok(!xml.includes('never-export-'));assert.ok(!/<f[\s>]/.test(xml));assert.ok(!xml.includes('<v>NaN</v>'));
  d.attempts=[];const empty=await createReportWorkbook(d,{Excel});assert.equal(empty.getWorksheet('Tổng quan').getCell('B13').value,null);assert.equal(empty.getWorksheet('Phổ điểm').getCell('C2').value,null);assert.equal(empty.getWorksheet('Chi tiết trả lời').rowCount,1);
});
test('v0.6: classroom multi-session gradebook workbook exports student averages and per-session scores',async()=>{
  const summary={classroom:{id:'demo-11a1',label:'11A1',school_year:'2026-2027'},generated_at:Date.now(),sessions:[{id:'s1',code:'ABC234',title:'Phiên 1',scoring_mode:'practice',minutes:15,state:'closed',created_at:Date.now()}],rows:[{student:{id:'st1',ordinal:1,name:'Nguyễn Văn A'},submitted_count:1,working_count:0,absent_count:0,mean_score:8.5,sessions:{s1:{status:'submitted',score:8.5}}}]};
  const book=await createClassroomWorkbook(summary,{Excel}),bytes=await book.xlsx.writeBuffer(),copy=new Excel.Workbook();await copy.xlsx.load(bytes);
  assert.deepEqual(copy.worksheets.map(s=>s.name),['Sổ điểm lớp','Danh sách phiên']);
  const sheet=copy.getWorksheet('Sổ điểm lớp');
  assert.equal(sheet.getCell('B2').value,'Nguyễn Văn A');
  assert.equal(sheet.getCell('F2').value,8.5);
  assert.equal(sheet.getCell('G2').value,8.5);
});
