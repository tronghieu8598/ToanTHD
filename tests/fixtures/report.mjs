import {gradeAttempt} from '../../lib/grading.mjs';
export function reportFixture(){
  const metadata={document_title:'Tài liệu minh họa',edition:'2026 v1',lesson_title:'Bài 1',lesson_id:'l1'};
  const questions=[
    {...metadata,id:'mc',kind:'mcq',original_number:137,prompt:'<p>Tính 1 + 1.</p>',choices:['1','2','3','4'].map((text,i)=>({key:'ABCD'[i],text})),correct:'B',solution:'<p>1 + 1 = 2.</p>'},
    {...metadata,id:'tf',kind:'tf',original_number:140,prompt:'<p>Xét từng ý.</p>',choices:'abcd'.split('').map(key=>({key,text:'Ý '+key})),correct:[true,false,true,false],solution:'<p>Đối chiếu bốn ý.</p>'},
    {...metadata,id:'short',kind:'short',original_number:145,prompt:'<p>Tính một nửa.</p>',choices:[],correct:'1/2',solution:'<p>Bằng 0,5.</p>'},
    {...metadata,lesson_id:'l2',lesson_title:'Bài 2',id:'dup',kind:'mcq',original_number:137,prompt:'<p>Số chẵn?</p>',choices:['1','2','3','5'].map((text,i)=>({key:'ABCD'[i],text})),correct:'B',solution:'<p>2 chẵn.</p>'}
  ];
  const roster=Array.from({length:6},(_,i)=>({id:'s'+(i+1),ordinal:i+1,name:'Học sinh minh họa '+(i+1)}));
  const answers=[{mc:'B',tf:[true,false,true,false],short:'0,5',dup:'B'},{mc:'A',tf:[true,null,true,null],short:'1/2',dup:'B'},{},{mc:'B',tf:[true,false,false,true],short:'0.5'}, {mc:'C',tf:[false,null,null,null],short:'1/0'}];
  const at=Date.UTC(2026,10,5,3);
  const attempts=answers.map((answers,i)=>({id:'a'+(i+1),student_id:roster[i].id,answers,submitted_at:i<4?at+i:null,score:i<4?gradeAttempt(questions,answers).score:null,updated_at:at,last_seen_at:at,save_revision:1,token:'never-export-attempt-token'}));
  return {generated_at:at,session:{id:'rpt-test',code:'REP234',title:'Báo cáo kiểm thử',class_label:'11A1',state:'open',scoring_mode:'practice',created_at:at-900000,closes_at:at+900000,AUTH_SECRET:'never-export-secret'},questions,roster,attempts};
}
