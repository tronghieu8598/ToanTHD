import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {parseCSV,tableToPayload,readFile} from '../lib/client/importers.mjs';
import {normalizeSource,renderSource} from '../lib/content.mjs';

test('CSV handles BOM, quoted newlines/commas, Vietnamese headers and preserves printed numbers',()=>{
 const csv='\uFEFFSố câu,Dạng,Nội dung,A,B,C,D,Đáp án,Lời giải\r\n137,short,"Dòng 1, có phẩy\nDòng 2",,,,,"0,5","$\\frac12$"\r\n';
 const rows=parseCSV(csv);assert.equal(rows[1][2],'Dòng 1, có phẩy\nDòng 2');
 const {payload}=tableToPayload(rows,'bank',{grade:11,title:'Tài liệu',edition:'v1',chapter:'Chương 1',lesson:'Bài 1',is_sample:true});const q=payload.documents[0].lessons[0].questions[0];assert.equal(q.original_number,137);assert.equal(q.correct,'0,5');assert.equal(q._row,2);
 assert.throws(()=>parseCSV('a,b\n"broken'),/chưa đóng/);
});

test('XLSX import reads Unicode strings, rich text and STT without formulas',async()=>{
 const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Danh sách');sheet.addRows([['DANH SÁCH LỚP'],['STT','Họ và tên'],[7,'Nguyễn Văn An'],[15,{richText:[{text:'Trần '},{text:'Thị Bình'}]}]]);
 const file=new File([await book.xlsx.writeBuffer()],'roster.xlsx');const result=await readFile(file,'roster',{});assert.equal(result.tables[0].rows[3][1],'Trần Thị Bình');
 const {payload}=tableToPayload(result.tables[0].rows,'roster',{label:'11A1',grade:11,school_year:'2026-2027',is_sample:true});assert.deepEqual(payload.classrooms[0].students.map(s=>s.ordinal),[7,15]);
 sheet.getCell('A3').value={formula:'1+6',result:7};const invalid=new File([await book.xlsx.writeBuffer()],'invalid.xlsx');await assert.rejects(()=>readFile(invalid,'roster',{}),/công thức Excel/);
});

test('Math rendering is local MathML; imported HTML is text and active LaTeX commands are rejected',()=>{
 const out=renderSource('Tính $\\frac{1}{2}+\\sqrt{9}$. <script>alert(1)</script>');assert.match(out,/<math/);assert.match(out,/<mfrac>/);assert.ok(!out.includes('<script>'));assert.ok(out.includes('&lt;script&gt;'));
 assert.throws(()=>renderSource('$\\href{https://example.com}{x}$'),/không nhận liên kết/);
 assert.throws(()=>normalizeSource({original_number:1,kind:'short',prompt:'P',correct:'1/0'}),/Đáp án ngắn/);
});
