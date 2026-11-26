// Author-written demonstration questions only; never substitute these for a source document.
const m = (content) => `<math xmlns="http://www.w3.org/1998/Math/MathML">${content}</math>`;
const v = (name) => `<mover accent="true"><mi>${name}</mi><mo>→</mo></mover>`;
const frac = (a,b) => `<mfrac><mn>${a}</mn><mn>${b}</mn></mfrac>`;
const p = (text) => `<p>${text}</p>`;
const expr = (text) => m(`<mrow>${text}</mrow>`);
const q = (lesson, n, kind, prompt, choices, correct, solution) => ({
  id:`${lesson}:q${String(n).padStart(3,'0')}:r1`, lesson_id:lesson,
  original_number:n, revision:1, kind, prompt:p(prompt), choices, correct, solution:p(solution),
});
const mc = (lesson,n,prompt,options,answer,solution) => q(lesson,n,'mcq',prompt,options.map((text,i)=>({key:'ABCD'[i],text})),answer,solution);
const tf = (lesson,n,prompt,options,answer,solution) => q(lesson,n,'tf',prompt,options.map((text,i)=>({key:'abcd'[i],text})),answer,solution);
const sh = (lesson,n,prompt,answer,solution) => q(lesson,n,'short',prompt,[],answer,solution);
export const documents = [
  {id:'demo10-2026-v1',grade:10,title:'Toán 10 · Vectơ',edition:'Minh họa 2026 · v1',is_sample:1},
  {id:'demo11-2026-v1',grade:11,title:'Toán 11 · Lượng giác',edition:'Minh họa 2026 · v1',is_sample:1},
  {id:'demo12-2026-v1',grade:12,title:'Toán 12 · Vectơ không gian',edition:'Minh họa 2026 · v1',is_sample:1},
];
export const lessons = [
  {id:'d10-b1',document_id:documents[0].id,chapter:'Chương IV. Vectơ',title:'Tổng và hiệu hai vectơ'},
  {id:'d10-b2',document_id:documents[0].id,chapter:'Chương IV. Vectơ',title:'Tích vô hướng của hai vectơ'},
  {id:'d11-b1',document_id:documents[1].id,chapter:'Chương I. Hàm số lượng giác',title:'Giá trị lượng giác'},
  {id:'d11-b2',document_id:documents[1].id,chapter:'Chương I. Hàm số lượng giác',title:'Phương trình lượng giác cơ bản'},
  {id:'d12-b1',document_id:documents[2].id,chapter:'Chương II. Vectơ và tọa độ',title:'Vectơ trong không gian'},
  {id:'d12-b2',document_id:documents[2].id,chapter:'Chương II. Vectơ và tọa độ',title:'Tọa độ của vectơ'},
];
export const questions = [
  mc('d10-b1',1,`Cho ba điểm A, B, C. Tổng ${expr(v('AB')+'<mo>+</mo>'+v('BC'))} bằng vectơ nào?`,['AC','CA','BA','CB'].map(s=>m(v(s))),'A','Áp dụng quy tắc ba điểm: vectơ AB + vectơ BC = vectơ AC.'),
  mc('d10-b1',3,'Cho hình bình hành ABCD. Tổng vectơ AB và vectơ AD bằng vectơ nào?',['BD','AC','CA','DB'].map(s=>m(v(s))),'B','Theo quy tắc hình bình hành, vectơ AB + vectơ AD = vectơ AC.'),
  mc('d10-b1',7,`Hiệu ${expr(v('AB')+'<mo>−</mo>'+v('AC'))} bằng vectơ nào?`,['BC','CA','CB','BA'].map(s=>m(v(s))),'C','Vectơ AB − vectơ AC = vectơ CB.'),
  mc('d10-b1',12,'Vectơ nào sau đây luôn là vectơ không?',['AB','AC','BC','AA'].map(s=>m(v(s))),'D','Vectơ có điểm đầu trùng điểm cuối là vectơ không.'),
  tf('d10-b1',15,'Xét các khẳng định sau với ba điểm A, B, C bất kỳ.',['Vectơ AB = −vectơ BA.','Vectơ AA là vectơ không.','Tổng vectơ AB và vectơ BA là vectơ không.','Vectơ AB + vectơ BC = vectơ AB.'],[true,true,true,false],'Ba khẳng định đầu đúng. Tổng vectơ AB và vectơ BC bằng vectơ AC, không phải luôn bằng vectơ AB.'),
  mc('d10-b2',1,`Cho hai vectơ có độ dài 2 và 3, góc giữa chúng bằng 60°. Tích vô hướng bằng bao nhiêu?`,['3','6','−3','0'],'A','Tích vô hướng bằng 2 × 3 × cos 60° = 3.'),
  mc('d10-b2',4,`Cho ${expr('<mo>|</mo>'+v('a')+'<mo>|</mo><mo>=</mo><mn>5</mn>')}. Tích vô hướng của vectơ a với chính nó bằng bao nhiêu?`,['5','10','25','0'],'C','Vectơ a · vectơ a = |vectơ a|² = 25.'),
  mc('d10-b2',8,'Hai vectơ khác vectơ không và vuông góc với nhau có tích vô hướng bằng bao nhiêu?',['1','0','−1','Không xác định'],'B','Tích vô hướng bằng tích hai độ dài nhân cos 90° = 0.'),
  sh('d10-b2',11,'Cho vectơ a = (1; 2), vectơ b = (3; −1). Tính a · b.','1','a · b = 1 × 3 + 2 × (−1) = 1.'),
  tf('d10-b2',16,'Cho vectơ a = (2; −1), vectơ b = (1; 2).',['a · b = 0.','Độ dài của vectơ a bằng √5.','a + b = (3; 1).','a = b.'],[true,true,true,false],'a · b = 2 − 2 = 0; |a| = √5; a + b = (3; 1); hai vectơ khác nhau.'),
  mc('d11-b1',1,`Giá trị của ${expr('<mi>sin</mi><mfrac><mi>π</mi><mn>6</mn></mfrac>')} bằng`,[m(frac(1,2)),m('<msqrt><mn>3</mn></msqrt>'),m(frac(3,2)),'1'],'A','sin(π/6) = sin 30° = 1/2.'),
  mc('d11-b1',5,`Giá trị của ${expr('<mi>cos</mi><mi>π</mi>')} bằng`,['0','1','−1','1/2'],'C','cos π = cos 180° = −1.'),
  mc('d11-b1',9,'Góc 180° có số đo radian bằng',['π/2','π','2π','π/3'],'B','180° tương ứng với π radian.'),
  sh('d11-b1',14,`Tính ${expr('<mi>cos</mi><mn>0</mn>')}.`,'1','cos 0 = 1.'),
  tf('d11-b1',20,'Xét tính đúng sai của các khẳng định sau.',['sin 0 = 0.','cos 0 = 0.','sin(π/2) = 1.','tan(π/4) = 1.'],[true,false,true,true],'cos 0 = 1 nên ý b sai. Các giá trị ở a, c, d đều đúng.'),
  mc('d11-b2',2,`Nghiệm của phương trình ${expr('<mi>sin</mi><mi>x</mi><mo>=</mo><mn>0</mn>')} là (k ∈ ℤ)`,['x = kπ','x = π/2 + kπ','x = π/4 + kπ','x = π/2 + 2kπ'],'A','sin x = 0 khi và chỉ khi x = kπ, k nguyên.'),
  mc('d11-b2',6,`Nghiệm của phương trình ${expr('<mi>cos</mi><mi>x</mi><mo>=</mo><mn>1</mn>')} là (k ∈ ℤ)`,['x = π + 2kπ','x = π/2 + kπ','x = kπ','x = 2kπ'],'D','cos x = 1 khi và chỉ khi x = 2kπ, k nguyên.'),
  sh('d11-b2',10,'Phương trình sin x = 0 có bao nhiêu nghiệm thuộc đoạn [0; 2π]?','3','Các nghiệm là 0, π, 2π. Vì khoảng xét là đoạn đóng nên có 3 nghiệm.'),
  mc('d11-b2',13,'Nghiệm của phương trình tan x = 1 là (k ∈ ℤ)',['x = π/4 + kπ','x = −π/4 + kπ','x = kπ','x = π/4 + 2kπ'],'A','tan x = tan(π/4) khi và chỉ khi x = π/4 + kπ.'),
  tf('d11-b2',21,'Xét các khẳng định sau.',['x = 0 là nghiệm của sin x = 0.','x = π là nghiệm của sin x = 0.','x = π/2 là nghiệm của sin x = 0.','x = 2π là nghiệm của cos x = 1.'],[true,true,false,true],'sin(π/2) = 1 nên ý c sai. Ba khẳng định còn lại đúng.'),
  mc('d12-b1',1,`Cho hình hộp ABCD.A′B′C′D′. Tổng ${expr(v('AB')+'<mo>+</mo>'+v('AD')+'<mo>+</mo>'+v('AA′'))} bằng`,['AC′','A′C','BD′','AB′'].map(s=>m(v(s))),'A','Áp dụng quy tắc hình hộp: vectơ AB + vectơ AD + vectơ AA′ = vectơ AC′.'),
  mc('d12-b1',4,'Hai vectơ khác vectơ không và ngược hướng có góc giữa chúng bằng',['0°','90°','180°','60°'],'C','Hai vectơ ngược hướng có góc bằng 180°.'),
  sh('d12-b1',6,'Hai vectơ a, b vuông góc với nhau và có độ dài lần lượt là 3 và 4. Tính độ dài a + b.','5','|a + b|² = |a|² + |b|² + 2a · b = 9 + 16 = 25, do đó |a + b| = 5.'),
  mc('d12-b1',10,'Cho vectơ a = 2b, với b khác vectơ không. Hai vectơ a và b',['Cùng hướng','Ngược hướng','Vuông góc','Không cùng phương'],'A','Hệ số 2 dương nên vectơ a và b cùng hướng.'),
  tf('d12-b1',18,'Với các vectơ a, b bất kỳ, xét các khẳng định sau.',['a + b = b + a.','a + vectơ không = a.','2a = a + a.','|−a| = −|a| luôn đúng.'],[true,true,true,false],'Độ dài không âm; |−a| = |a|. Ý d không đúng với vectơ khác vectơ không.'),
  mc('d12-b2',2,'Trong không gian Oxyz, cho A(1; 2; 3), B(3; 1; 5). Tọa độ vectơ AB là',['(2; −1; 2)','(−2; 1; −2)','(4; 3; 8)','(2; 1; 2)'],'A','Vectơ AB = (3 − 1; 1 − 2; 5 − 3) = (2; −1; 2).'),
  mc('d12-b2',5,'Độ dài của vectơ a = (1; 2; 2) bằng',['5','9','3','√5'],'C','|a| = √(1² + 2² + 2²) = 3.'),
  mc('d12-b2',8,'Cho vectơ a = (1; 0; 1), vectơ b = (0; 2; 1). Tính a · b.',['0','1','2','3'],'B','a · b = 1 × 0 + 0 × 2 + 1 × 1 = 1.'),
  sh('d12-b2',12,'Tính độ dài của vectơ a = (2; −1; 2).','3','|a| = √(4 + 1 + 4) = 3.'),
  tf('d12-b2',22,'Cho A(0; 0; 0), B(1; 2; 3). Xét các khẳng định sau.',['Vectơ AB = (1; 2; 3).','Vectơ BA = (−1; −2; −3).','Trung điểm của AB là (1; 1; 1).','Độ dài AB bằng √14.'],[true,true,false,true],'Trung điểm của AB là (1/2; 1; 3/2), nên ý c sai. Các ý còn lại đúng.'),
];
export const classrooms = [
  {id:'demo-11a1',label:'11A1',grade:11,school_year:'2026–2027',is_sample:1},
  {id:'demo-11a8',label:'11A8',grade:11,school_year:'2026–2027',is_sample:1},
  {id:'demo-12a8',label:'12A8',grade:12,school_year:'2026–2027',is_sample:1},
];
export const students = classrooms.flatMap(c => Array.from({length:12},(_,i)=>({id:`${c.id}-s${i+1}`,classroom_id:c.id,ordinal:i+1,name:`Học sinh minh họa ${String(i+1).padStart(2,'0')}`})));
