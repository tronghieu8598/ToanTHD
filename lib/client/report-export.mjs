import {analyzeSession, answerText, kindNames, statusNames, questionPoints, responseState} from '../analytics.mjs';
import {sourceOf} from './importers.mjs';

const states={full:'Trọn câu',partial:'Một phần',wrong:'Sai',blank:'Bỏ trống'};
const time=value=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'';
const members=students=>students.map(s=>`${s.ordinal}. ${s.name}`).join('\n');

function sheet(book,name,columns,rows){
  const s=book.addWorksheet(name,{views:[{state:'frozen',ySplit:1}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}});
  s.columns=columns.map(([header,width=20,numFmt])=>({header,width,style:numFmt?{numFmt}:{}}));
  for(const row of rows)s.addRow(row.map(value=>value??null));
  s.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,s.rowCount),column:columns.length}};
  s.eachRow((row,i)=>{row.alignment={vertical:'top',wrapText:true};row.font={name:'Calibri',size:11,color:{argb:'FF203D35'}};if(i===1){row.font={name:'Calibri',bold:true,size:11,color:{argb:'FFFFFFFF'}};row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF245B45'}};row.height=30;}else if(i%2===0)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F6ED'}};});
  return s;
}

export async function createReportWorkbook(detail,options={}){
  const module=options.Excel||await import('exceljs/dist/exceljs.min.js'),Excel=module.default||module;
  const book=new Excel.Workbook(),a=analyzeSession(detail),s=detail.session;
  book.creator='Toán THĐ';book.created=new Date(a.generatedAt);book.modified=new Date(a.generatedAt);
  const text=detail.questions.map(q=>sourceOf(q));
  sheet(book,'Tổng quan',[['Thông tin',32],['Giá trị',90]],
    [['Phiên',s.title],['Lớp (khi tạo phiên)',s.class_label],['Mã phiên',s.code],['Trạng thái',s.state==='open'?'Đang mở':'Đã đóng'],['Xuất lúc (giờ Việt Nam)',time(a.generatedAt)],['Cách chấm',a.mode==='exam-1246'?'Cấu trúc 12–4–6':'Luyện tập, các câu cùng trọng số'],['Mẫu thống kê','Chỉ tính bài đã nộp; bài đang làm/chưa vào không mang điểm 0.'],['Học sinh trong danh sách',a.students.length],['Đã nộp',a.n],['Đang làm',a.working],['Chưa vào',a.absent],['Điểm trung bình',a.stats.mean],['Trung vị',a.stats.median],['Thấp nhất',a.stats.min],['Cao nhất',a.stats.max],['Độ lệch chuẩn (tổng thể)',a.stats.sd],...a.thresholds.map(t=>[`Số bài ≥ ${t.value}`,t.count]),['Điểm cần đối chiếu',a.mismatches.length],['Ghi chú điểm','Tổng điểm là điểm đã lưu. Chi tiết từng câu được tính từ đáp án và cách chấm đã chụp trong phiên.'],['Ghi chú nội dung','Công thức xuất dạng LaTeX. Ảnh không nhúng vào Excel; mở phần xem câu trong ứng dụng để đối chiếu.'],['Quyền truy cập','Báo cáo giáo viên có họ tên và đáp án; chia sẻ đúng phạm vi lớp.']]);
  sheet(book,'Bảng điểm',[['STT',8],['Họ và tên',28],['Trạng thái',16],['Đã trả lời đủ',17],['Số câu',10],['Điểm / 10',13,'0.00'],['Nộp lúc (VN)',24],...detail.questions.map(q=>[`Câu ${q.original_number} · ${q.lesson_title} · ${q.edition||''} (điểm)`,24,'0.0000'])],a.students.map(r=>[r.student.ordinal,r.student.name,statusNames[r.status],r.answered,detail.questions.length,r.score,time(r.attempt?.submitted_at),...detail.questions.map(q=>r.status==='submitted'?questionPoints(q,r.attempt.answers[q.id],a.mode,detail.questions.length,r.attempt.answers):null)]));
  sheet(book,'Phổ điểm',[['Khoảng điểm',22],['Số bài',14],['Tỷ lệ bài có điểm',24,'0.0%']],a.histogram.map(b=>[b.label,b.count,a.stats.validScores?b.count/a.stats.validScores:null]));
  sheet(book,'Từng câu',[['Thứ tự trong đề',13],['Số câu gốc',12],['Bài',30],['Tài liệu',30],['Phiên bản',18],['Dạng',20],['Nội dung (LaTeX)',60],['Đáp án',28],['Số bài đã nộp',14],['Trọn câu',12],['Một phần',12],['Sai có trả lời',16],['Bỏ trống cả câu',18],['Tỷ lệ trọn câu',18,'0.0%'],['Điểm TB câu',16,'0.0000'],['Điểm tối đa',15,'0.0000'],['Phương án sai nhiều nhất',24],['Lời giải (LaTeX)',60],['Số ảnh nguồn',14]],a.items.map((item,i)=>{const q=item.q;return[i+1,q.original_number,q.lesson_title,q.document_title,q.edition,kindNames[q.kind],text[i].prompt,answerText(q,q.correct),item.n,item.full,item.partial,item.wrong,item.blank,item.fullRate,item.meanPoints,item.maxPoints,item.topWrong.join(', '),text[i].solution,text[i].images?.length||0];}));
  const selections=[];
  for(const [index,item] of a.items.entries()){
    const q=item.q,base=[index+1,q.original_number,q.lesson_title,q.document_title,q.edition];
    if(q.kind==='mcq'){
      for(const c of item.choices)selections.push([...base,c.key,c.correct?'Đúng':'Sai',c.count,item.n?c.count/item.n:null,members(c.students)]);
      const blank=item.responses.filter(r=>r.state==='blank').map(r=>r.student);selections.push([...base,'Bỏ trống','',blank.length,item.n?blank.length/item.n:null,members(blank)]);
    }else if(q.kind==='tf'){
      for(const part of item.parts)for(const [label,key] of [['Đúng','yes'],['Sai','no'],['Bỏ trống','blank']])selections.push([...base,`${part.key}) ${label}`,key==='blank'?'':(key==='yes')===part.correct?'Đúng':'Sai',part[key].length,item.n?part[key].length/item.n:null,members(part[key])]);
    }else for(const group of item.groups)selections.push([...base,group.key==='blank'?'Bỏ trống':group.variants.join(' | '),group.key==='blank'?'':group.correct?'Đúng':'Sai',group.students.length,item.n?group.students.length/item.n:null,members(group.students)]);
  }
  sheet(book,'Lựa chọn',[['Thứ tự',10],['Số câu gốc',12],['Bài',30],['Tài liệu',30],['Phiên bản',18],['Lựa chọn / biến thể',35],['Đánh giá',15],['Số em',12],['Tỷ lệ bài đã nộp',20,'0.0%'],['Danh sách học sinh',45]],selections);
  const responses=[];
  for(const r of a.students)if(r.attempt)for(const [i,q] of detail.questions.entries())responses.push([r.student.ordinal,r.student.name,statusNames[r.status],i+1,q.original_number,q.lesson_title,q.document_title,q.edition,answerText(q,r.attempt.answers[q.id],r.attempt.answers),answerText(q,q.correct),r.status==='submitted'?states[responseState(q,r.attempt.answers[q.id],r.attempt.answers)]:'Tạm thời, chưa chấm',r.status==='submitted'?questionPoints(q,r.attempt.answers[q.id],a.mode,detail.questions.length,r.attempt.answers):null,questionPoints(q,q.correct,a.mode,detail.questions.length)]);
  sheet(book,'Chi tiết trả lời',[['STT',8],['Họ và tên',28],['Trạng thái',16],['Thứ tự trong đề',14],['Số câu gốc',12],['Bài',30],['Tài liệu',30],['Phiên bản',18],['Đã trả lời',32],['Đáp án',32],['Đánh giá',24],['Điểm câu',14,'0.0000'],['Điểm tối đa',15,'0.0000']],responses);
  return book;
}

export async function createClassroomWorkbook(summary,options={}){
  const module=options.Excel||await import('exceljs/dist/exceljs.min.js'),Excel=module.default||module;
  const book=new Excel.Workbook(),cl=summary.classroom,sessions=summary.sessions||[];
  book.creator='Toán THĐ';book.created=new Date(summary.generated_at||Date.now());
  sheet(book,'Sổ điểm lớp',[['STT',8],['Họ và tên',28],['Số bài đã nộp',15],['Đang làm',12],['Vắng / Chưa vào',16],['Điểm TB các phiên',18,'0.00'],...sessions.map(s=>[`${s.title} (${s.code})`,22,'0.00'])],
    summary.rows.map(r=>[r.student.ordinal,r.student.name,r.submitted_count,r.working_count,r.absent_count,r.mean_score,...sessions.map(s=>{const cell=r.sessions[s.id];return cell?.status==='submitted'?cell.score:null;})]));
  sheet(book,'Danh sách phiên',[['Mã phiên',14],['Tên phiên',36],['Cách chấm',22],['Thời lượng (phút)',18],['Trạng thái',16],['Tạo lúc (VN)',24]],
    sessions.map(s=>[s.code,s.title,s.scoring_mode==='exam-1246'?'Cấu trúc 12–4–6':'Luyện tập',s.minutes,s.state==='open'?'Đang mở':'Đã đóng',time(s.created_at)]));
  return book;
}

export async function downloadSessionReport(detail){
  const book=await createReportWorkbook(detail),buffer=await book.xlsx.writeBuffer();
  const blob=new Blob([new Uint8Array(buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const href=URL.createObjectURL(blob),safe=value=>String(value||'').replace(/[^\p{L}\p{N}_-]+/gu,'_');
  const filename=`ToanTHD_${safe(detail.session.class_label)}_${safe(detail.session.code)}.xlsx`,anchor=document.createElement('a');
  anchor.href=href;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();
  return {href,filename};
}

export async function downloadClassroomReport(summary){
  const book=await createClassroomWorkbook(summary),buffer=await book.xlsx.writeBuffer();
  const blob=new Blob([new Uint8Array(buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const href=URL.createObjectURL(blob),safe=value=>String(value||'').replace(/[^\p{L}\p{N}_-]+/gu,'_');
  const filename=`ToanTHD_So_diem_${safe(summary.classroom.label)}_${safe(summary.classroom.school_year)}.xlsx`,anchor=document.createElement('a');
  anchor.href=href;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();
  return {href,filename};
}
