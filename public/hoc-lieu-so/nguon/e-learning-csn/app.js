(function () {
  "use strict";
  const C = window.COURSE_CONFIG;
  const KEY = C.courseId + ":state:v44";
  const M = [
    ["Khởi động",1,4,"2 phút"],["Nhận biết cấp số nhân",5,12,"4 phút"],
    ["Số hạng tổng quát",13,20,"5 phút"],["Tổng n số hạng đầu",21,29,"6 phút"],
    ["Mô hình tăng – giảm",30,33,"4 phút"],["Tổng kết – đánh giá",34,35,"4 phút"]
  ];
  const rawSlides = [
    [0,"cover","Cấp số nhân","Một quy luật nhỏ có thể tạo nên những thay đổi lớn đến đâu?","Chào em. Trong bài học này, chúng ta sẽ khám phá cấp số nhân qua những tình huống rất gần gũi: hạt thóc trên bàn cờ, quả bóng nảy, sự tăng trưởng và sự suy giảm. Em có thể học theo tốc độ của mình, thử lại khi chưa đúng, và nhận phản hồi ngay sau mỗi câu trả lời."],
    [0,"chess","Thử thách bàn cờ","Mỗi ô có số hạt gấp đôi ô ngay trước. Hãy kéo thanh trượt và dự đoán.","Hãy quan sát bàn cờ. Ô đầu tiên có một hạt thóc. Sang mỗi ô tiếp theo, số hạt lại gấp đôi: một, hai, bốn, tám, rồi mười sáu. Em hãy kéo thanh trượt để nhìn lượng hạt tăng nhanh đến mức nào."],
    [0,"pattern","Phát hiện quy luật nhân","Hiệu thay đổi nhưng tỉ số giữa hai số hạng liên tiếp giữ nguyên.","Ta vừa gặp dãy một, hai, bốn, tám, mười sáu. Hiệu giữa hai số liên tiếp không cố định, nhưng tỉ số luôn bằng hai. Nói cách khác, mỗi số hạng được tạo ra bằng cách nhân số đứng trước với cùng một số."],
    [0,"roadmap","Mục tiêu và lộ trình","Bốn câu hỏi sẽ dẫn dắt toàn bộ bài học.","Trong bài học, em sẽ lần lượt trả lời bốn câu hỏi: Làm sao nhận biết một cấp số nhân? Làm sao tìm số hạng thứ n? Khi nào cần tính tổng? Và làm sao dùng cấp số nhân để mô hình hóa một tình huống thực tế?"],
    [1,"sequences","Khám phá hai dãy số","Chọn một phép toán duy nhất để biến mỗi số hạng thành số kế tiếp.","Bây giờ, em hãy tìm quy luật cho hai dãy số. Lưu ý rằng một quy luật đúng phải giải thích được tất cả các bước, chứ không chỉ đúng với hai số hạng đầu. Hãy chọn công bội cho cả hai dãy."],
    [1,"qconcept","Công bội xuất hiện","Cùng một phép nhân được lặp lại ở mọi bước.","Dãy thứ nhất được tạo bằng cách nhân ba ở mỗi bước, nên công bội là ba. Dãy thứ hai có công bội âm một phần hai. Vì công bội âm, dấu của các số hạng đổi luân phiên; vì độ lớn nhỏ hơn một, giá trị tuyệt đối của chúng giảm dần."],
    [1,"definition","Định nghĩa cấp số nhân","Dãy số được xác định bởi số hạng đầu và một công bội cố định.","Ta đi đến định nghĩa. Một dãy số là cấp số nhân nếu, kể từ số hạng thứ hai, mỗi số hạng bằng số hạng ngay trước nhân với cùng một hằng số q. Hằng số q được gọi là công bội."],
    [1,"qroles","Công bội q điều khiển dãy số","Bấm từng giá trị q để quan sát hành vi của dãy.","Công bội q quyết định cách dãy số thay đổi. Khi q lớn hơn một, độ lớn thường tăng. Khi q nằm giữa không và một, dãy giảm dần về không. Khi q âm, dấu có thể đổi luân phiên. Em hãy bấm từng giá trị để quan sát."],
    [1,"example","Ví dụ: tìm số còn thiếu","Tìm q · kiểm tra quy luật · tính tiếp.","Ta xét dãy hai, năm, hai mươi lăm phần hai. Lấy năm chia hai, ta được công bội năm phần hai. Kiểm tra với cặp tiếp theo vẫn đúng. Vì vậy, để tìm số còn thiếu, ta tiếp tục nhân với năm phần hai."],
    [1,"guided","Luyện tập có hướng dẫn","Với 16, 24, … hãy điền tiếp đến u₅.","Đến lượt em. Với dãy bắt đầu bởi mười sáu và hai mươi bốn, công bội là ba phần hai. Hãy lần lượt nhân với ba phần hai để điền đúng u ba, u bốn và u năm. Cả ba ô phải đúng thì em mới hoàn thành nhiệm vụ."],
    [1,"quiz","Kiểm tra 1 · Nhận diện","Chọn dãy có cùng công bội ở mọi bước.","Hãy chọn dãy có cùng một công bội ở mọi bước. Đừng chỉ kiểm tra cặp số đầu tiên. Nếu chưa đúng, em sẽ nhận được gợi ý theo lỗi và có thể thử lại cho đến khi tìm được đáp án.","q1"],
    [1,"quiz","Kiểm tra 2 · Tính tiếp","Xác định đúng vị trí của từng số hạng.","Với cấp số nhân bắt đầu bằng mười sáu và hai mươi bốn, em hãy tính tiếp rồi xác định đúng cặp u bốn, u năm. Hãy viết đủ các vị trí ra nháp nếu cần.","q2"],
    [2,"bounce","Mô phỏng quả bóng nảy","Quan sát chuyển động, đọc dữ liệu và tìm quy luật truy hồi của độ cao.","Quả bóng được thả từ độ cao ba mét. Sau mỗi lần chạm đất, độ cao mới bằng ba phần năm độ cao trước đó. Chú ý: H không là độ cao ban đầu, còn h một mới là độ cao sau lần nảy thứ nhất."],
    [2,"steps","Từ truy hồi đến công thức","Chọn n, đếm số mũi tên nhân q rồi tự xác định số mũ.","Từ u một sang u hai, ta nhân một lần với q. Từ u một đến u ba, ta nhân hai lần. Như vậy, từ u một đến u n có đúng n trừ một khoảng, nên q mang số mũ n trừ một."],
    [2,"unformula","Số hạng tổng quát","Biết u₁, q và n là tìm được bất kì số hạng nào.","Công thức số hạng tổng quát là: u n bằng u một nhân q mũ n trừ một. Em có thể kiểm tra nhanh bằng cách thay n bằng một. Khi đó q mũ không bằng một, và ta nhận lại đúng u một."],
    [2,"explorer","Phòng thí nghiệm u₁ · q · n","Điều chỉnh tham số và quan sát bảng số cùng đồ thị điểm.","Đây là phòng thí nghiệm nhỏ của em. Hãy thay đổi u một, q và n, rồi quan sát dãy số cùng đồ thị. Em nên thử q bằng hai, một phần hai và âm một phần hai để so sánh tốc độ tăng, giảm và quy luật đổi dấu."],
    [2,"exponent","Ví dụ: tìm u₉","Hãy đếm khoảng và chọn số mũ trước khi xem kết luận.","Với dãy tám, mười hai, mười tám, công bội là ba phần hai. Ta cần tìm u chín. Có chín vị trí nhưng chỉ có tám khoảng từ u một đến u chín, vì vậy số mũ phải là tám."],
    [2,"population","Mô hình tăng dân số","Tự xác định công bội và số thời đoạn trước khi tính.","Tăng một phẩy một phần trăm mỗi năm nghĩa là sau mỗi năm, dân số bằng một trăm linh một phẩy một phần trăm của năm trước. Vì thế q bằng một phẩy không một một. Từ đầu năm hai nghìn lẻ một đến đầu năm hai nghìn không trăm mười có chín lần tăng."],
    [2,"quiz","Kiểm tra 3 · Dùng uₙ","Xác định số mũ trước rồi mới tính.","Cho u một bằng năm và q bằng hai. Em hãy xác định số lần nhân từ u một đến u bảy, rồi chọn giá trị đúng của u bảy. Nếu sai, hãy đọc phản hồi và thử lại.","q3"],
    [2,"quiz","Kiểm tra 4 · Tăng trưởng","Chọn đúng q và đếm đúng số thời đoạn.","Bài toán tăng dân số có hai điểm dễ nhầm: đổi phần trăm thành công bội, và đếm số thời đoạn. Từ đầu năm hai nghìn không trăm hai mươi mốt đến đầu năm hai nghìn không trăm bốn mươi có mười chín lần tăng.","q4"],
    [3,"classify","Khi nào cần tính tổng?","Kéo từng tình huống vào nhóm số hạng uₙ hoặc tổng Sₙ.","Trước khi tính, em cần xác định đề bài hỏi một vị trí hay tổng của nhiều vị trí. Một giá trị riêng lẻ dùng u n. Tổng lũy kế qua nhiều số hạng dùng S n. Hãy phân loại đúng cả bốn tình huống."],
    [3,"derivation","Tự dựng công thức Sₙ","Nhân với q, căn thẳng cột rồi trừ hai hàng.","Ta sẽ tự dựng công thức tổng. Trước hết, viết S n theo hàng ngang. Sau đó nhân cả hai vế với q và căn thẳng các số hạng cùng bậc. Khi trừ hai hàng, các hạng tử ở giữa triệt tiêu, chỉ còn hai hạng tử ở hai đầu."],
    [3,"sumformula","Công thức tổng n số hạng đầu","Nhớ tách riêng trường hợp q = 1.","Khi q khác một, S n bằng u một nhân một trừ q mũ n, rồi chia cho một trừ q. Có thể viết công thức tương đương bằng cách đổi dấu cả tử và mẫu. Riêng q bằng một, mọi số hạng đều bằng u một, nên S n bằng n nhân u một."],
    [3,"symmetry","Khám phá tính chất đối xứng","Khảo sát ba dãy đơn giản rồi tự chọn tính chất tổng quát.","Trong một cấp số nhân, hai số hạng nằm đối xứng qua u k có tích bằng bình phương của u k. Hai vế thực chất đều bằng u một bình phương nhân q mũ hai k trừ hai."],
    [3,"tower","Ví dụ: tổng diện tích tòa tháp","Chín tầng tạo thành cấp số nhân hữu hạn.","Diện tích tầng đầu là một nghìn mét vuông, và mỗi tầng sau bằng hai phần ba tầng ngay dưới. Vì đề hỏi tổng diện tích của chín tầng, ta dùng tổng hữu hạn S chín, không dùng tổng vô hạn."],
    [3,"chesssum","Luyện tập: 10 ô bàn cờ","Ô thứ 10 và tổng 10 ô là hai đại lượng khác nhau.","Hãy phân biệt thật rõ: số hạt ở riêng ô thứ mười là u mười, bằng năm trăm mười hai. Còn tổng số hạt trên mười ô đầu là S mười, bằng một nghìn không trăm hai mươi ba."],
    [3,"cost","Vận dụng: tổng chi trong 10 năm","Giá từng năm là uₙ; tổng tiền đã chi là Sₙ.","Năm đầu chi năm trăm nghìn đồng và mỗi năm tăng hai mươi phần trăm. Số tiền của một năm cụ thể là u n. Nếu hỏi tổng tiền đã chi trong mười năm, ta phải dùng S mười."],
    [3,"quiz","Kiểm tra 5 · Tính Sₙ","Xác định u₁, q, n rồi mới chọn công thức.","Với dãy hai, sáu, mười tám, hãy xác định u một, q và n trước. Sau đó áp dụng công thức tổng để tính S sáu. Chú ý đừng nhầm số hạng cuối với tổng của sáu số hạng.","q5"],
    [3,"quiz","Kiểm tra 6 · Chọn uₙ hay Sₙ","Đây là tổng hữu hạn của 9 tầng.","Bài toán hỏi tổng diện tích của chín tầng, vì vậy ta cần S chín. Hãy chọn kết quả của tổng hữu hạn và dùng giới hạn ba nghìn mét vuông để kiểm tra tính hợp lí.","q6"],
    [4,"modeling","Quy trình mô hình hóa 4 bước","Mốc đầu · công bội · số thời đoạn · đại lượng cần tìm.","Khi mô hình hóa bằng cấp số nhân, em hãy đi theo bốn bước. Một: xác định đại lượng và mốc đầu. Hai: tìm công bội. Ba: đếm số thời đoạn. Bốn: chọn u n hoặc S n, rồi kiểm tra đơn vị và phép làm tròn."],
    [4,"decay","Hai bài toán suy giảm","Mất 1/5 thì còn 4/5 · 64 ngày gồm 8 chu kì.","Với bài toán suy giảm, mất một phần năm nghĩa là còn bốn phần năm, nên q bằng bốn phần năm. Với bài toán theo chu kì, cần đổi tổng thời gian thành số chu kì trước khi đặt số mũ. Sáu mươi tư ngày gồm tám chu kì, mỗi chu kì tám ngày."],
    [4,"compare","Tăng trưởng và suy giảm","Cùng công thức, q khác nhau tạo hành vi khác nhau.","Cùng một công thức nhưng các giá trị q tạo ra hành vi rất khác. q bằng một phẩy hai làm độ lớn tăng. q bằng không phẩy tám làm dãy tiến về không. q bằng âm không phẩy tám vừa làm dấu đổi luân phiên, vừa làm độ lớn giảm."],
    [4,"quiz","Kiểm tra 7 · Chu kì bán rã","Đổi thời gian thành số chu kì và làm tròn ở bước cuối.","Có một trăm sáu mươi miligam I-ốt một trăm ba mươi mốt, và sau mỗi tám ngày lượng chất còn một nửa. Em hãy đổi sáu mươi tư ngày thành số chu kì, tính kết quả chính xác, rồi chỉ làm tròn ở bước cuối.","q7"],
    [5,"summary","Sơ đồ tổng kết","Bốn câu hỏi kiểm soát mọi bài toán cấp số nhân.","Trước khi kết thúc, hãy ghi nhớ bốn câu hỏi tự kiểm soát. u một là gì? q bằng bao nhiêu? Có bao nhiêu thời đoạn? Và đề bài đang hỏi một số hạng u n hay tổng S n?"],
    [5,"results","Kết quả và lộ trình tiếp theo","Hệ thống tổng hợp điểm, gợi ý học bù và tài liệu tham khảo.","Em đã đi đến cuối bài sau khi hoàn thành đúng tất cả các câu kiểm tra bắt buộc. Hãy xem lại kết quả theo từng nhóm kiến thức. Nếu muốn luyện thêm, em có thể đặt lại phần đánh giá và thực hiện một lần nữa."]
  ];
  const S = rawSlides.map((x,i)=>({id:i+1,module:x[0],type:x[1],title:x[2],lead:x[3],narration:x[4],quizId:x[5]}));

  const Q = {
    q1:{n:1,group:"Nhận biết",q:"Dãy nào sau đây là một cấp số nhân?",a:[
      ["[[2,4,6,8]]","Các hiệu bằng 2 nhưng tỉ số không cố định. Đây là cấp số cộng."],
      ["[[3,-6,12,-24]]","Đúng. Mỗi số hạng bằng số trước nhân [[-2]]."],
      ["[[1,1,2,3]]","Tỉ số lần lượt là [[1]], [[2]] và [[\\frac{3}{2}]], nên không cố định."],
      ["[[5,10,20,35]]","Hai bước đầu nhân 2 nhưng [[\\frac{35}{20}\\ne2]]."]],c:1,sol:"[[\\frac{-6}{3}=\\frac{12}{-6}=\\frac{-24}{12}=-2]]. Vì tỉ số không đổi nên B đúng.",back:7},
    q2:{n:2,group:"Nhận biết",q:"Với cấp số nhân [[16,24,\\ldots]], cặp [[(u_4,u_5)]] bằng:",a:[
      ["[[(36,54)]]","Đây là cặp [[(u_3,u_4)]]; em bị lệch một vị trí."],
      ["[[(54,81)]]","Đúng. [[q=\\frac{3}{2};\\ u_3=36,\\ u_4=54,\\ u_5=81]]."],
      ["[[(48,72)]]","Em đang dùng quy luật cộng, không phải cùng một phép nhân."],
      ["[[(64,96)]]","Các giá trị không thu được bằng cách liên tiếp nhân [[\\frac{3}{2}]]."]],c:1,sol:"[[q=\\frac{24}{16}=\\frac{3}{2}]]. Viết đủ năm vị trí được [[16,24,36,54,81]].",back:10},
    q3:{n:3,group:"Số hạng [[u_n]]",q:"Cho [[u_1=5]], [[q=2]]. Giá trị của [[u_7]] là:",a:[
      ["[[160]]","[[160=5\\cdot2^5]], thiếu một lần nhân."],["[[320]]","Đúng. [[u_7=5\\cdot2^6=320]]."],
      ["[[640]]","Em dùng số mũ [[n]] thay cho [[n-1]]."],["[[35]]","Em đang nhân 5 với 7; cần dùng lũy thừa của [[q]]."]],c:1,sol:"Từ [[u_1]] đến [[u_7]] có 6 khoảng, nên [[u_7=5\\cdot2^6=320]].",back:14},
    q4:{n:4,group:"Số hạng [[u_n]]",q:"Đầu 2021 có 25 triệu người, tăng [[0{,}5\\%]]/năm. Đầu 2040 xấp xỉ:",a:[
      ["[[25{,}500]] triệu","Cách này chỉ cộng một lượng cố định, không phải tăng trưởng lũy thừa."],
      ["[[27{,}485]] triệu","Đúng. [[25\\cdot1{,}005^{19}\\approx27{,}485]]."],
      ["[[27{,}622]] triệu","Kết quả này dùng 20 khoảng; đúng ra chỉ có 19."],
      ["[[27{,}375]] triệu","Em đang dùng tăng tuyến tính thay cho tăng lũy thừa."]],c:1,sol:"[[q=1{,}005]]; số khoảng là [[2040-2021=19]]. Kết quả [[\\approx27{,}485]] triệu.",back:18},
    q5:{n:5,group:"Tổng [[S_n]]",q:"Tổng 6 số hạng đầu của [[2,6,18,\\ldots]] bằng:",a:[
      ["[[364]]","Em đã thiếu hệ số hoặc dừng sớm."],["[[728]]","Đúng. [[S_6=2\\cdot\\frac{3^6-1}{3-1}=728]]."],
      ["[[486]]","[[486]] là [[u_6]], chỉ là số hạng cuối."],["[[1456]]","Giá trị gấp đôi tổng đúng; em đã nhân thừa [[u_1]]."]],c:1,sol:"[[u_1=2,\\ q=3,\\ n=6]]. Do đó [[S_6=2\\cdot\\frac{3^6-1}{3-1}=728]].",back:23},
    q6:{n:6,group:"Tổng [[S_n]]",q:"Tháp 9 tầng: [[1000\\,\\mathrm{m}^2]], tầng sau bằng [[\\frac{2}{3}]] tầng trước. Tổng gần nhất:",a:[
      ["[[3000\\,\\mathrm{m}^2]]","[[3000\\,\\mathrm{m}^2]] là tổng vô hạn; tháp chỉ có 9 tầng."],["[[2922\\,\\mathrm{m}^2]]","Đúng. [[S_9\\approx2921{,}96\\,\\mathrm{m}^2]]."],
      ["[[3333\\,\\mathrm{m}^2]]","Giá trị lớn hơn cả giới hạn vô hạn [[3000\\,\\mathrm{m}^2]] nên vô lí."],["[[26\\,\\mathrm{m}^2]]","Đây gần với một tầng cuối, không phải tổng chín tầng."]],c:1,sol:"Dùng tổng hữu hạn [[S_9=1000\\cdot\\frac{1-(\\frac{2}{3})^9}{1-\\frac{2}{3}}\\approx2922\\,\\mathrm{m}^2]].",back:25},
    q7:{n:7,group:"Mô hình hóa",q:"160 mg Iodine-131, cứ 8 ngày còn một nửa. Sau 64 ngày, làm tròn đến mg:",a:[
      ["[[10\\,\\mathrm{mg}]]","10 mg mới tương ứng 4 chu kì, tức 32 ngày."],["[[1\\,\\mathrm{mg}]]","Đúng. [[160\\cdot(\\frac{1}{2})^8=0{,}625\\,\\mathrm{mg}]], làm tròn là 1 mg."],
      ["[[20\\,\\mathrm{mg}]]","20 mg tương ứng 3 chu kì, tức 24 ngày."],["[[0\\,\\mathrm{mg}]]","[[0{,}625\\,\\mathrm{mg}]] chưa bằng 0; làm tròn đến mg được 1."]],c:1,sol:"[[\\frac{64}{8}=8]] chu kì; [[160\\cdot(\\frac{1}{2})^8=0{,}625\\,\\mathrm{mg}]]; làm tròn ở bước cuối được 1 mg.",back:31}
  };

  const defaults={slide:0,visited:[0],started:false,completed:false,quiz:{},audioDone:{},settings:{captions:true,autoNarrate:true,largeText:false,reducedMotion:false},x:{chess:8,qa:"",qb:"",qrole:"2",guided:["","",""],guidedChecked:false,bounceRule:"",step:5,stepChoice:"",exponentChoice:"",popQ:"",popIntervals:"",symmetrySeen:[],symmetryChoice:"",explore:{u1:2,q:1.5,n:8},derive:0,model:0,decay:"ice",compare:"1.2",classify:{},classifyChecked:false,pending:""}};
  const copy=o=>JSON.parse(JSON.stringify(o));
  const merge=(a,b)=>b&&typeof b==="object"?{...a,...b,settings:{...a.settings,...(b.settings||{})},x:{...a.x,...(b.x||{})},quiz:{...(b.quiz||{})},audioDone:{...(b.audioDone||{})},visited:Array.isArray(b.visited)?b.visited:a.visited}:a;
  let state=copy(defaults),ui={menu:false,settings:false,toast:"",speaking:false,paused:false,audioProgress:0,audioDuration:0,bounceRunning:false,timer:null,speechTimer:null,bounceTimer:null,teacherMode:false,teacherSnapshot:null};
  let narrationAudio=null;
  let connected=window.ScormBridge.init();
  try{state=merge(state,JSON.parse(localStorage.getItem(KEY)||"null"));}catch(_){}
  state=merge(state,window.ScormBridge.restore());
  const app=document.getElementById("app");
  const okCount=()=>Object.keys(Q).filter(k=>state.quiz[k]?.correct).length;
  const score=()=>Math.round(okCount()/7*100);
  const maxVisited=()=>Math.max(...state.visited,0);
  const moduleStart=m=>S.findIndex(s=>s.module===m);
  const moduleEnd=m=>{let x=0;S.forEach((s,i)=>{if(s.module===m)x=i});return x};
  function activityGate(index=state.slide){
    const s=S[index];
    if(s.type==="sequences"){
      const correct=Number(state.x.qa==="mul3")+Number(state.x.qb==="mulneg");
      return {unlocked:correct===2,message:`Hoàn thành đúng cả hai quy luật (${correct}/2) để tiếp tục.`};
    }
    if(s.type==="guided"){
      const correct=state.x.guided.map(String).map(x=>x.trim()).filter((x,i)=>x===["36","54","81"][i]).length;
      return {unlocked:correct===3&&state.x.guidedChecked,message:`Điền đúng và kiểm tra đủ ba số hạng (${correct}/3) để tiếp tục.`};
    }
    if(s.type==="classify"){
      const answer={a:"un",b:"sn",c:"un",d:"sn"};
      const correct=Object.keys(answer).filter(k=>state.x.classify[k]===answer[k]).length;
      return {unlocked:correct===4&&state.x.classifyChecked,message:`Kéo đủ bốn thẻ, bấm Kiểm tra và phân loại đúng (${correct}/4).`};
    }
    if(s.type==="bounce"){
      return {unlocked:state.x.bounceRule==="recursive",message:"Chạy mô phỏng và chọn đúng quy luật truy hồi của độ cao."};
    }
    if(s.type==="steps"){
      return {unlocked:state.x.stepChoice==="n-1",message:"Đếm số lần nhân q và chọn đúng số mũ trước khi tiếp tục."};
    }
    if(s.type==="exponent"){
      return {unlocked:state.x.exponentChoice==="8",message:"Chọn đúng số mũ trong công thức tính u₉."};
    }
    if(s.type==="population"){
      const correct=Number(state.x.popQ==="1.011")+Number(state.x.popIntervals==="9");
      return {unlocked:correct===2,message:`Xác định đúng công bội và số thời đoạn (${correct}/2).`};
    }
    if(s.type==="symmetry"){
      const seen=Array.isArray(state.x.symmetrySeen)?state.x.symmetrySeen.length:0;
      return {unlocked:seen===3&&state.x.symmetryChoice==="product",message:`Khảo sát đủ ba dãy (${seen}/3) và chọn đúng tính chất đối xứng.`};
    }
    if(s.type==="quiz"){
      return {unlocked:Boolean(state.quiz[s.quizId]?.correct),message:"Trả lời đúng câu hỏi để mở nút Tiếp tục."};
    }
    return {unlocked:true,message:""};
  }
  function gateStatus(index=state.slide){
    const task=activityGate(index),heard=Boolean(state.audioDone[index]);
    const messages=[];
    if(!heard)messages.push("Nghe hết thuyết minh của slide ít nhất một lần");
    if(!task.unlocked)messages.push(task.message);
    return {unlocked:heard&&task.unlocked,message:messages.join(" · ")+"."};
  }
  function save(force=false){if(ui.teacherMode&&!force)return;state.score=score();try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}window.ScormBridge.save({slide:state.slide,visited:state.visited,quiz:state.quiz,audioDone:state.audioDone,settings:state.settings,score:state.score,completed:state.completed})}
  function go(i,force=false,playOnArrival=false){
    const n=Math.max(0,Math.min(S.length-1,i)),bypass=force||ui.teacherMode;
    if(!bypass&&n>state.slide&&!gateStatus().unlocked){toast(gateStatus().message);return}
    if(!bypass&&n>maxVisited()+1){toast("Hãy hoàn thành màn hình hiện tại trước.");return}
    stopSpeech();clearTimeout(ui.bounceTimer);state.slide=n;
    if(!ui.teacherMode){
      if(!state.visited.includes(n))state.visited.push(n);
      state.visited.sort((a,b)=>a-b);
      save();
    }
    ui.menu=false;render();
    if(playOnArrival)playNarration(false);else scheduleNarration();
    scrollTo({top:0,behavior:state.settings.reducedMotion?"auto":"smooth"});
  }
  function toggleTeacherMode(){
    stopSpeech(false);
    if(ui.teacherMode){
      state=copy(ui.teacherSnapshot||state);
      ui.teacherMode=false;
      ui.teacherSnapshot=null;
      ui.menu=false;
      save(true);
      render();
      toast("Đã thoát chế độ giáo viên và khôi phục tiến độ học.");
      return;
    }
    ui.teacherSnapshot=copy(state);
    ui.teacherMode=true;
    ui.menu=false;
    render();
    toast("Đã bật chế độ giáo viên. Có thể mở tự do mọi slide.");
  }
  function toast(t){ui.toast=t;clearTimeout(ui.timer);ui.timer=setTimeout(()=>{ui.toast="";render()},2600);render()}
  function updateAudioControls(){
    const play=app?.querySelector('[data-a="audioplay"]'),pause=app?.querySelector('[data-a="audiopause"]');
    if(play){
      play.classList.toggle("speaking",ui.speaking);
      play.disabled=ui.speaking;
      play.querySelector("[data-audio-play-label]").textContent=ui.paused?"Tiếp tục":"Nghe";
    }
    if(pause)pause.disabled=!ui.speaking;
    const pct=ui.audioDuration?Math.min(100,ui.audioProgress/ui.audioDuration*100):0;
    const fill=app?.querySelector("[data-audio-progress]");
    if(fill)fill.style.width=`${pct}%`;
    const time=app?.querySelector("[data-audio-time]");
    if(time)time.textContent=`${formatTime(ui.audioProgress)} / ${formatTime(ui.audioDuration)}`;
  }
  function formatTime(value){const n=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;return `${Math.floor(n/60)}:${String(n%60).padStart(2,"0")}`}
  function mp3Path(index=state.slide){return `audio/slide-${String(S[index].id).padStart(2,"0")}.mp3`}
  function stopSpeech(update=true){
    clearTimeout(ui.speechTimer);
    if(narrationAudio){
      narrationAudio.pause();
      narrationAudio.removeAttribute("src");
      narrationAudio.load();
      narrationAudio=null;
    }
    ui.speaking=false;
    ui.paused=false;
    ui.audioProgress=0;
    ui.audioDuration=0;
    if(update)updateAudioControls();
  }
  function bindAudioEvents(audio,index,auto){
    audio.onloadedmetadata=()=>{ui.audioDuration=Number.isFinite(audio.duration)?audio.duration:0;updateAudioControls()};
    audio.ontimeupdate=()=>{ui.audioProgress=audio.currentTime||0;ui.audioDuration=Number.isFinite(audio.duration)?audio.duration:ui.audioDuration;updateAudioControls()};
    audio.onplay=()=>{ui.speaking=true;ui.paused=false;updateAudioControls()};
    audio.onpause=()=>{if(!audio.ended){ui.speaking=false;ui.paused=true;updateAudioControls()}};
    audio.onended=()=>{
      if(narrationAudio===audio)narrationAudio=null;
      state.audioDone[index]=true;
      ui.speaking=false;ui.paused=false;ui.audioProgress=ui.audioDuration;
      save();render();
    };
    audio.onerror=()=>{
      if(narrationAudio===audio)narrationAudio=null;
      ui.speaking=false;ui.paused=false;updateAudioControls();
      if(!auto)toast("Không tìm thấy file MP3 của slide này. Hãy kiểm tra lại thư mục audio.");
    };
  }
  function playNarration(auto=false,restart=false){
    if(auto&&!state.settings.autoNarrate)return;
    let audio=narrationAudio;
    if(!audio||audio.__slide!==state.slide){
      stopSpeech(false);
      audio=new Audio(mp3Path());
      audio.__slide=state.slide;
      audio.preload="auto";
      narrationAudio=audio;
      bindAudioEvents(audio,state.slide,auto);
    }
    if(restart){try{audio.currentTime=0}catch(_){}ui.audioProgress=0}
    audio.play().catch(()=>{ui.speaking=false;ui.paused=true;updateAudioControls();if(!auto)toast("Trình duyệt đang chặn tự phát. Hãy bấm nút Nghe để bắt đầu.")});
  }
  function pauseNarration(){if(narrationAudio&&!narrationAudio.paused)narrationAudio.pause()}
  function replayNarration(){playNarration(false,true)}
  function scheduleNarration(delay=420){clearTimeout(ui.speechTimer);if(state.started&&state.settings.autoNarrate)ui.speechTimer=setTimeout(()=>playNarration(true),delay)}
  const fmt=n=>!Number.isFinite(n)?"—":Math.abs(n)>=1000||(Math.abs(n)>0&&Math.abs(n)<.01)?n.toExponential(2):Number(n.toFixed(3)).toLocaleString("vi-VN");
  const texNum=n=>{
    const value=Number(n);
    if(!Number.isFinite(value))return "\\text{—}";
    const absolute=Math.abs(value);
    if(absolute>=1000||(absolute>0&&absolute<.01)){
      const [coefficient,exponent]=value.toExponential(2).split("e");
      return `${coefficient.replace(".", "{,}")}\\times10^{${Number(exponent)}}`;
    }
    return String(Number(value.toFixed(3))).replace(".", "{,}");
  };
  const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const renderTex=(source,displayMode=false)=>{
    try{
      if(!window.katex)throw new Error("KaTeX chưa được tải");
      return window.katex.renderToString(String(source),{
        displayMode,
        throwOnError:false,
        strict:"ignore",
        trust:false,
        output:"htmlAndMathml"
      });
    }catch(_){
      return `<span class="math-fallback">${escapeHtml(source)}</span>`;
    }
  };
  const math=(source,extra="")=>`<span class="math-render inline-math ${extra}">${renderTex(source,false)}</span>`;
  const eq=(source,extra="")=>`<div class="equation math-render display-math ${extra}">${renderTex(source,true)}</div>`;
  const frac=(a,b)=>`\\frac{${a}}{${b}}`;
  const board=(source,caption="",extra="")=>`<div class="formula-board center ${extra}">${eq(source)}${caption?`<p>${caption}</p>`:""}</div>`;
  const subscriptMap={"₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9","ₙ":"n","ₖ":"k"};
  const renderUnicodeSymbols=text=>String(text).replace(/([uShH])([₀₁₂₃₄₅₆₇₈₉ₙₖ]+)/g,(_,name,index)=>math(`${name}_{${[...index].map(char=>subscriptMap[char]||char).join("")}}`));
  const rich=text=>String(text).split(/\[\[([\s\S]*?)\]\]/g).map((part,index)=>index%2?math(part):renderUnicodeSymbols(part)).join("");

  function sidebar(s){
    const pct=Math.round((maxVisited()+1)/35*100);
    return `<aside class="sidebar ${ui.menu?"open":""}"><div class="brand"><button class="brand-mark teacher-secret ${ui.teacherMode?"teacher-active":""}" data-a="teachersecret" aria-label="Biểu tượng bài học">q</button><div class="brand-copy"><strong>Cấp số nhân</strong><span>Toán 11 · HTML5</span></div></div><div class="side-progress"><div class="side-progress-top"><span>Tiến độ học</span><b>${pct}%</b></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div><nav class="module-nav">${M.map((m,i)=>{const lock=!ui.teacherMode&&moduleStart(i)>maxVisited()+1,done=maxVisited()>=moduleEnd(i);return `<button class="module-button ${s.module===i?"active":""} ${lock?"locked":""}" data-a="module" data-v="${i}" ${lock?"disabled":""}><span class="module-num">0${i+1}</span><span class="module-copy"><strong>${m[0]}</strong><small>Slide ${m[1]}–${m[2]} · ${m[3]}</small></span><span class="module-check">${ui.teacherMode?"↗":done?"✓":lock?"○":""}</span></button>`}).join("")}</nav><div class="side-footer"><span>${ui.teacherMode?"Chế độ giáo viên":connected?"LMS đã kết nối":"Chế độ độc lập"}</span><button class="icon-button" data-a="settings">⚙</button></div></aside>`;
  }
  function teacherToolbar(){
    if(!ui.teacherMode)return "";
    const options=S.map((slide,index)=>`<option value="${index}" ${index===state.slide?"selected":""}>${slide.id}. ${slide.title}</option>`).join("");
    return `<div class="teacher-toolbar" role="group" aria-label="Điều hướng giáo viên"><span class="teacher-badge">GV</span><label><span class="sr-only">Chọn slide</span><select data-teacher-slide aria-label="Chọn slide">${options}</select></label><button class="teacher-exit" data-a="teachertoggle">Thoát</button></div>`;
  }
  function top(s){return `<header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" data-a="menu">☰</button><div class="crumbs"><small>Học phần ${s.module+1} · ${M[s.module][0]} · ${C.buildVersion}</small><strong>${s.id}. ${rich(s.title)}</strong></div></div><div class="topbar-actions">${teacherToolbar()}<span class="version-chip">${C.buildVersion}</span><span class="time-chip">◷ ${C.estimatedMinutes} phút</span><span class="status-chip"><i class="status-dot ${connected?"online":""}"></i>${connected?"Đang ghi nhận":"Tự lưu trên máy"}</span><button class="icon-button" data-a="full" aria-label="Toàn màn hình">⛶</button><button class="icon-button" data-a="settings" aria-label="Cài đặt">⚙</button></div></header>`}
  function header(s){return `<div class="slide-kicker">Slide ${s.id} · Học phần ${s.module+1}</div><h1 class="slide-title" id="slide-title">${rich(s.title)}</h1><p class="slide-lead">${rich(s.lead)}</p>`}
  function audioControls(){
    const done=Boolean(state.audioDone[state.slide]),status=done?"Đã nghe đủ":ui.speaking?"Đang phát":ui.paused?"Đang tạm dừng":"Chưa nghe hết";
    return `<section class="audio-controls" aria-label="Điều khiển thuyết minh"><div class="audio-buttons"><button class="audio-button play ${ui.speaking?"speaking":""}" data-a="audioplay" ${ui.speaking?"disabled":""} aria-label="Nghe hoặc tiếp tục thuyết minh"><span aria-hidden="true">▶</span><span data-audio-play-label>${ui.paused?"Tiếp tục":"Nghe"}</span></button><button class="audio-button" data-a="audiopause" ${ui.speaking?"":"disabled"} aria-label="Tạm dừng thuyết minh"><span aria-hidden="true">Ⅱ</span><span>Tạm dừng</span></button><button class="audio-button" data-a="audioreplay" aria-label="Nghe lại từ đầu"><span aria-hidden="true">↺</span><span>Nghe lại</span></button></div><div class="audio-track"><div class="audio-track-top"><strong>${status}</strong><span data-audio-time>${formatTime(ui.audioProgress)} / ${formatTime(ui.audioDuration)}</span></div><div class="audio-progress"><i data-audio-progress style="width:${ui.audioDuration?Math.min(100,ui.audioProgress/ui.audioDuration*100):0}%"></i></div></div><span class="heard-badge ${done?"done":""}">${done?"✓ Đã nghe đủ":"Chưa nghe đủ"}</span></section>`;
  }
  function nav(){
    const gate=gateStatus(),canAdvance=ui.teacherMode||gate.unlocked;
    const right=state.slide===34
      ?`<span class="finish-note">${ui.teacherMode?"Đang xem slide cuối":state.audioDone[34]?"✓ Đã nghe slide cuối":"Hãy nghe hết slide cuối"}</span>`
      :canAdvance
        ?`<button class="nav-button next ${ui.teacherMode?"teacher-next":""}" data-a="next"><span class="label">${ui.teacherMode?"Slide sau":"Tiếp tục"}</span> →</button>`
        :`<div class="navigation-lock" role="status"><span aria-hidden="true">🔒</span><span>${rich(gate.message)}</span></div>`;
    return `<div class="navigation"><button class="nav-button prev" data-a="prev" ${state.slide===0?"disabled":""}>← <span class="label">Trang trước</span></button>${audioControls()}<span class="page-counter">${state.slide+1} / 35${ui.teacherMode?" · GV":""}</span>${right}</div>`;
  }
  function settings(){const sw=(k,t,d)=>`<div class="setting-row"><div><strong>${t}</strong><small>${d}</small></div><label class="switch"><input type="checkbox" data-a="setting" data-v="${k}" ${state.settings[k]?"checked":""}><span></span></label></div>`;return `<div class="modal-backdrop" data-a="close"><section class="modal"><div class="modal-head"><h2>Cài đặt học tập</h2><button class="icon-button" data-a="close">×</button></div><div class="setting-list">${sw("autoNarrate","Tự động thuyết minh","Tự phát file MP3 tương ứng khi chuyển slide.")}${sw("captions","Hiện phụ đề","Hiển thị toàn bộ lời thuyết minh dưới mỗi màn hình.")}${sw("largeText","Cỡ chữ lớn","Tăng cỡ chữ toàn bài.")}${sw("reducedMotion","Giảm chuyển động","Tắt chuyển động không thiết yếu.")}<div class="setting-row"><div><strong>Nguồn thuyết minh</strong><small>35 bản thu MP3 riêng; các nút Nghe, Tạm dừng và Nghe lại nằm dưới slide.</small></div><span class="pill teal">MP3 ngoại tuyến</span></div><div class="setting-row"><div><strong>Xóa tiến độ</strong><small>Đưa bài về trạng thái ban đầu, gồm cả dấu đã nghe.</small></div><button class="secondary-button" data-a="reset">Đặt lại</button></div></div></section></div>`}
  function render(){const s=S[state.slide];document.documentElement.style.setProperty("--scale",state.settings.largeText?"1.1":"1");document.body.classList.toggle("reduced-motion",state.settings.reducedMotion);document.body.classList.toggle("teacher-mode",ui.teacherMode);app.innerHTML=`<div class="app">${sidebar(s)}<main class="main">${top(s)}<section class="workspace"><article class="slide-card"><div class="slide-inner">${s.type==="cover"?cover():header(s)+`<div class="slide-content">${view(s)}</div>`}</div></article>${state.settings.captions?`<details class="narration" ${state.slide===0?"open":""}><summary>▤ Phụ đề thuyết minh</summary><p>${s.narration}</p></details>`:""}${nav()}</section></main>${ui.settings?settings():""}${ui.toast?`<div class="toast">${rich(ui.toast)}</div>`:""}</div>`;bind();draw()}
  function cover(){const resume=state.started&&maxVisited()>0,ready=gateStatus(0).unlocked;return `<div class="cover"><section><div class="competition">${C.competition}</div><h1>${C.title}</h1><p class="cover-subtitle">${C.subtitle}</p><div class="cover-meta"><span class="pill teal">${C.subject}</span><span class="pill version-pill">${C.buildVersion} · ${C.buildDate}</span><span class="pill">${C.estimatedMinutes} phút</span><span class="pill">${C.scormVersion}</span><span class="pill orange">${C.license}</span></div><div class="button-row" style="margin-top:1.4rem"><button class="primary-button" data-a="${resume?"resume":"start"}" ${!resume&&!ready?"disabled":""}>▶ ${resume?"Tiếp tục bài học":ready?"Bắt đầu học":"Nghe hết giới thiệu để bắt đầu"}</button></div></section><aside class="author-card"><h2>Thông tin bài dự thi</h2><div class="author-grid">${[["Tác giả",C.author],["Email",C.email],["Đơn vị",C.organization],["Thời gian",C.date],["Phiên bản",`${C.buildVersion} · ${C.buildDate}`],["Học liệu mở",C.license]].map(x=>`<div class="author-row"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("")}</div><div class="resume-note">${resume?`Đã lưu đến slide ${maxVisited()+1}. Điểm: ${okCount()}/7.`:"Bài học tự lưu tiến độ; mỗi slide chỉ mở trang kế tiếp sau khi nghe hết thuyết minh."}</div></aside></div>`}
  function view(s){return (V[s.type]||(()=>board("u_{n+1}=u_nq"))) (s)}

  function grainPile(index){
    const visual=Math.min(28,Math.pow(2,Math.min(index,5)));
    return `<div class="grain-pile density-${Math.min(index,5)}">${Array.from({length:visual},(_,j)=>{
      const angle=(j*137.5+index*23)*Math.PI/180;
      const radius=Math.sqrt((j+.65)/visual)*38;
      const x=50+Math.cos(angle)*radius;
      const y=53+Math.sin(angle)*radius*.76;
      const rotate=(j*31+index*17)%170-85;
      return `<i class="grain grain-${(j+index)%3}" style="--gx:${x.toFixed(1)}%;--gy:${y.toFixed(1)}%;--gr:${rotate}deg"></i>`;
    }).join("")}</div>`;
  }
  function chess(){
    const n=+state.x.chess;
    const cells=Array.from({length:64},(_,i)=>{
      const revealed=i<n,cellValue=i<=52?Math.pow(2,i).toLocaleString("vi-VN"):`2 mũ ${i}`;
      return `<div class="chess-cell ${revealed?"revealed":""} ${i===n-1?"active":""}" aria-label="Ô ${i+1}${revealed?`: ${cellValue} hạt thóc`:""}" title="${revealed?`${cellValue} hạt thóc`:`Ô ${i+1}`}">${revealed?grainPile(i):""}${i===n-1?`<span class="chess-cell-index">${i+1}</span>`:""}</div>`;
    }).join("");
    const exact=n<=53?`\\text{${Math.pow(2,n-1).toLocaleString("vi-VN")}}`:`2^{${n-1}}`;
    const [coefficient,power]=Math.pow(2,n-1).toExponential(3).split("e+");
    const coefficientTex=coefficient.replace(".", "{,}");
    return `<div class="chess-wrap"><div class="chess-board">${cells}</div><div><div class="formula-board"><span class="mini-label">Quy luật</span>${eq("1,\\ 2,\\ 4,\\ 8,\\ \\ldots,\\ 2^{n-1}","small")}<p>Mỗi ô đã mở thể hiện một cụm hạt tăng dần; từ ô 6, mật độ được nén để vẫn nhìn rõ trên bàn cờ.</p><div class="slider-wrap"><span>Ô</span><input id="chess" type="range" min="1" max="64" value="${n}" aria-label="Chọn ô bàn cờ"><span class="value-badge">${n}</span></div></div><div class="grid-2" style="margin-top:.9rem"><div class="metric"><small>Số hạt ở ô ${n}</small><strong>${math(exact)}</strong></div><div class="metric"><small>Dạng gần đúng</small><strong>${math(`${coefficientTex}\\times10^{${power}}`)}</strong></div></div></div></div>`;
  }
  function pattern(){return `<div class="grid-2"><div class="formula-board"><span class="mini-label">Quan sát dãy</span><div class="sequence-row compact-sequence">${[1,2,4,8,16].map((v,i)=>`${i?`<span class="arrow">${math("\\times2")}</span>`:""}<span class="term">${math(String(v))}</span>`).join("")}</div>${eq("u_{n+1}=2u_n")}</div><div class="grid-2"><div class="info-card warm"><strong>Hiệu: 1, 2, 4, 8</strong><p>Không cố định.</p></div><div class="info-card accent"><strong>Tỉ số: 2, 2, 2, 2</strong><p>Luôn bằng nhau.</p></div><div class="info-card blue" style="grid-column:1/-1"><strong>Dấu hiệu</strong><p>Cùng một phép nhân xuất hiện giữa mọi cặp liên tiếp.</p></div></div></div>`}
  function roadmap(){return `<div class="step-flow">${[["Nhận biết",`Dãy có cùng ${math("q")}?`],["Tìm số hạng",`Có bao nhiêu lần nhân để đến ${math("u_n")}?`],["Tính tổng",`Một vị trí hay ${math("S_n")}?`],["Mô hình hóa","Tăng/giảm theo tỉ lệ?"]].map((x,i)=>`<div class="step-card"><span class="step-number">${i+1}</span><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join("")}</div><div class="info-card accent" style="margin-top:1rem"><strong>Đích đến</strong><p>Hoàn thành đúng 7/7 câu bắt buộc; mỗi câu được thử lại đến khi đạt.</p></div>`}
  function sequences(){
    const correctA=state.x.qa==="mul3",correctB=state.x.qb==="mulneg",good=correctA&&correctB;
    const row=terms=>`<div class="sequence-row sequence-discovery">${terms.map(term=>`<span class="term">${math(term)}</span>`).join('<span class="arrow question-arrow">?</span>')}</div>`;
    const button=(action,selected,value,expression)=>`<button class="operation-button ${selected===value?"selected":""}" data-a="${action}" data-v="${value}">${math(expression)}</button>`;
    const status=!state.x.qa||!state.x.qb
      ?`<div class="feedback compact"><h3>Chọn một quy luật cho mỗi dãy</h3><p>Phân biệt rõ dấu phép toán: ${math("\\times3")} là nhân với 3, còn ${math("+3")} là cộng thêm 3.</p></div>`
      :good
        ?`<div class="feedback success compact"><h3>✓ Chính xác cả hai dãy</h3><p>Dãy A luôn nhân với ${math("3")}; dãy B luôn nhân với ${math("-\\frac{1}{2}")}.</p></div>`
        :`<div class="feedback error compact"><h3>Chưa đúng ở ${correctA||correctB?"một dãy":"cả hai dãy"}</h3><p>Hãy thử phép toán đã chọn với mọi cặp liên tiếp, không chỉ cặp đầu tiên.</p></div>`;
    return `<div class="grid-2 sequence-activity"><section class="formula-board"><span class="mini-label">Dãy A</span>${row(["1","3","9","27","81"])}<p class="task-prompt">Phép toán nào biến mỗi số thành số kế tiếp?</p><div class="operation-options">${button("rulea",state.x.qa,"mul3","\\times3")}${button("rulea",state.x.qa,"add3","+3")}${button("rulea",state.x.qa,"mul2","\\times2")}</div></section><section class="formula-board"><span class="mini-label">Dãy B</span>${row(["2","-1","\\frac{1}{2}","-\\frac{1}{4}","\\frac{1}{8}"])}<p class="task-prompt">Chọn cùng một phép toán đúng cho mọi bước.</p><div class="operation-options">${button("ruleb",state.x.qb,"mulneg","\\times\\left(-\\frac{1}{2}\\right)")}${button("ruleb",state.x.qb,"sub3","-3")}${button("ruleb",state.x.qb,"mulhalf","\\times\\frac{1}{2}")}</div></section></div><div style="margin-top:1rem">${status}</div>`;
  }
  function qconcept(){
    const ratio=(top,bottom,result)=>`<div class="ratio-card">${math(`\\frac{${top}}{${bottom}}=${result}`,"ratio-fraction")}</div>`;
    return `<div class="grid-2 q-concept-grid"><section class="formula-board"><span class="mini-label">Dãy A · 1, 3, 9, 27</span><div class="ratio-list">${ratio("3","1","3")}${ratio("9","3","3")}${ratio("27","9","3")}</div><div class="q-result"><span>Các tỉ số đều bằng</span><strong>${math("q=3")}</strong></div></section><section class="formula-board"><span class="mini-label">Dãy B · 2, −1, 1/2, −1/4</span><div class="ratio-list">${ratio("-1","2","-\\frac{1}{2}")}${ratio("\\frac{1}{2}","-1","-\\frac{1}{2}")}${ratio("-\\frac{1}{4}","\\frac{1}{2}","-\\frac{1}{2}")}</div><div class="q-result"><span>Các tỉ số đều bằng</span><strong>${math("q=-\\frac{1}{2}")}</strong></div></section></div>${board("u_{n+1}=u_n\\,q","Công bội q là tỉ số không đổi giữa hai số hạng liên tiếp.","q-definition")}`;
  }
  function definition(){return `${board("u_{n+1}=u_n\\,q,\\qquad n\\ge1","Mỗi số hạng từ số thứ hai bằng số ngay trước nhân cùng hằng số q.")}<div class="grid-3" style="margin-top:1rem"><div class="info-card"><strong>${math("u_1")}</strong><p>Số hạng đầu</p></div><div class="info-card accent"><strong>${math("q")}</strong><p>Công bội</p></div><div class="info-card blue"><strong>${math("u_n")}</strong><p>Số hạng thứ n</p></div></div><div class="info-card warm" style="margin-top:1rem"><strong>Lưu ý</strong><p>Chỉ dùng ${math("q=\\frac{u_{n+1}}{u_n}")} khi ${math("u_n\\ne0")}.</p></div>`}
  function qroles(){
    const D={"2":[["1","2","4","8","16"],"Tăng nhanh"],".5":[["8","4","2","1","\\frac{1}{2}"],"Giảm về 0"],"-.5":[["8","-4","2","-1","\\frac{1}{2}"],"Đổi dấu, độ lớn giảm"],"1":[["3","3","3","3","3"],"Không đổi"],"0":[["3","0","0","0","0"],`Sau ${math("u_1")} đều bằng 0`]},k=state.x.qrole,d=D[k];
    const buttons=[["2","q=2"],[".5","q=\\frac{1}{2}"],["-.5","q=-\\frac{1}{2}"],["1","q=1"],["0","q=0"]];
    return `<div class="button-row">${buttons.map(item=>`<button class="${k===item[0]?"primary-button":"secondary-button"}" data-a="qrole" data-v="${item[0]}">${math(item[1])}</button>`).join("")}</div><div class="formula-board" style="margin-top:1rem"><div class="sequence-row qrole-sequence">${d[0].map(value=>`<span class="term ${String(value).startsWith("-")?"negative":""}">${math(value)}</span>`).join(`<span class="arrow">${math("\\times q")}</span>`)}</div><p><strong>${d[1]}.</strong> Công bội quyết định độ lớn và quy luật dấu.</p></div>`;
  }
  function example(){
    const terms=["2","5","\\frac{25}{2}","\\frac{125}{4}","?"];
    const cards=[["Tìm công bội","q=\\frac{5}{2}"],["Kiểm tra","5\\cdot\\frac{5}{2}=\\frac{25}{2}"],["Tính tiếp","\\frac{125}{4}\\cdot\\frac{5}{2}=\\frac{625}{8}"]];
    return `<div class="sequence-row example-sequence" style="justify-content:center">${terms.map((value,index)=>`${index?`<span class="arrow">${math("\\times\\frac{5}{2}")}</span>`:""}<span class="term ${value==="?"?"active":""}">${math(value)}</span>`).join("")}</div><div class="grid-3" style="margin-top:1rem">${cards.map((item,index)=>`<div class="info-card ${index===2?"accent":index===1?"blue":""}"><span class="mini-label">Bước ${index+1}</span><strong style="margin-top:.4rem">${item[0]}</strong><p>${math(item[1])}</p></div>`).join("")}</div>`;
  }
  function guided(){
    const v=state.x.guided.map(String),correct=v.map(x=>x.trim()).filter((x,i)=>x===["36","54","81"][i]).length;
    const checked=state.x.guidedChecked,good=checked&&correct===3;
    const arrow=`<span class="arrow">${math("\\times\\frac{3}{2}")}</span>`;
    return `<div class="formula-board"><div class="sequence-row guided-sequence" style="justify-content:center"><span class="term">${math("16")}</span>${arrow}<span class="term">${math("24")}</span>${arrow}${v.map((x,i)=>`<input class="term guided" data-i="${i}" value="${x}" inputmode="numeric" aria-label="${["u ba","u bốn","u năm"][i]}">${i<2?arrow:""}`).join("")}</div><div class="button-row" style="justify-content:center"><button class="primary-button" data-a="checkguided">Kiểm tra</button><button class="ghost-button" data-a="hint">? Gợi ý</button></div></div><div class="feedback ${good?"success":checked?"error":""}" style="margin-top:1rem;min-height:0"><h3>${good?"✓ Chính xác":checked?`Đúng ${correct}/3 số hạng`:`Điền ${math("u_3")}, ${math("u_4")}, ${math("u_5")}`}</h3><p>${good?"36, 54, 81. Em đã hoàn thành nhiệm vụ và mở khóa trang tiếp theo.":checked?`Một hoặc nhiều vị trí chưa đúng. Hãy nhân lần lượt với ${math("\\frac{3}{2}")} rồi kiểm tra lại.`:`Mỗi ô bằng ô trước nhân ${math("\\frac{3}{2}")}. Sau khi điền, bấm Kiểm tra.`}</p></div>`;
  }
  function quiz(s){
    const q=Q[s.quizId],e=state.quiz[s.quizId]||{selected:null,attempts:0,correct:false,submitted:false};
    const retry=e.submitted&&!e.correct,lock=e.correct;
    const fb=e.submitted?q.a[e.selected][1]:"Chọn một phương án rồi bấm Nộp đáp án. Em được thử lại cho đến khi đúng.";
    const action=lock?'<span class="unlock-badge">✓ Đã mở khóa trang tiếp theo</span>':retry?`<button class="secondary-button" data-a="retry" data-q="${s.quizId}">↺ Thử lại</button>`:`<button class="primary-button" data-a="submit" data-q="${s.quizId}" ${e.selected===null?"disabled":""}>Nộp đáp án</button>`;
    return `<div class="quiz-shell"><section class="quiz-question"><span class="pill teal">${rich(q.group)}</span><h3 style="margin-top:.8rem">Câu ${q.n}. ${rich(q.q)}</h3><div class="choices">${q.a.map((x,i)=>{const sel=e.selected===i,st=e.submitted&&sel?(i===q.c?"correct":"wrong"):sel?"selected":"";return `<button class="choice-button ${st}" data-a="select" data-q="${s.quizId}" data-v="${i}" ${lock?"disabled":""}><span class="choice-letter">${"ABCD"[i]}</span><span>${rich(x[0])}</span></button>`}).join("")}</div><div class="button-row" style="margin-top:.85rem">${action}</div></section><aside class="feedback ${e.submitted?(e.correct?"success":"error"):""}"><h3>${e.submitted?(e.correct?"✓ Chính xác":"Chưa chính xác"):"Phản hồi tự động"}</h3><p>${rich(fb)}</p>${e.submitted&&(e.correct||e.attempts>=2)?`<div class="solution"><span class="mini-label">Phân tích</span><p>${rich(q.sol)}</p></div>`:""}<div class="attempt-count">Lượt đã thử: <strong>${e.attempts}</strong> · Không giới hạn lượt</div></aside></div>`;
  }
  function bounce(){
    const heights=[3,1.8,1.08,.648,.3888],rule=state.x.bounceRule;
    const motionPath="M 70 40 C 110 95 125 255 170 310 C 225 310 240 148 315 148 C 390 148 405 310 455 310 C 510 310 520 213 580 213 C 640 213 650 310 705 310 C 755 310 765 252 815 252 C 865 252 875 310 915 310 C 950 310 955 275 985 275 C 1015 275 1020 310 1045 310";
    const options=[
      ["add",math("h_{n+1}=h_n+\\frac{3}{5}")],
      ["recursive",math("h_{n+1}=\\frac{3}{5}h_n")],
      ["shift",math("h_n=3\\left(\\frac{3}{5}\\right)^{n-1}")]
    ];
    const feedback=rule==="recursive"
      ?`<div class="feedback success compact"><h3>✓ Đúng quy luật</h3><p>Mỗi độ cao bằng ${math("\\frac{3}{5}")} lần độ cao trước. Ở slide kế tiếp, ta khái quát quy luật này thành công thức của ${math("u_n")}.</p></div>`
      :rule?`<div class="feedback error compact"><h3>Chưa đúng</h3><p>Hãy kiểm tra ${math("\\frac{1{,}8}{3}=\\frac{1{,}08}{1{,}8}=\\frac{3}{5}")} và chú ý mốc ${math("h_0=3")}.</p></div>`
      :`<div class="feedback compact"><h3>Liên kết sang hoạt động sau</h3><p>Từ dữ liệu mô phỏng, hãy chọn hệ thức tạo độ cao kế tiếp. Đây chính là bước chuyển từ truy hồi sang số hạng tổng quát.</p></div>`;
    const guideLines=[[40,0,"3"],[148,1,"1,8"],[213,2,"1,08"],[252,3,"0,648"]];
    return `<div class="bounce-lab"><section class="bounce-stage" aria-label="Mô phỏng quả bóng nảy theo đúng đường quỹ đạo nét đứt"><svg class="bounce-svg" viewBox="0 0 1080 360" role="img" aria-label="Quỹ đạo quả bóng với độ cao giảm còn ba phần năm sau mỗi lần nảy"><defs><radialGradient id="ballGradient" cx="30%" cy="25%"><stop offset="0" stop-color="#fff6cf"/><stop offset=".16" stop-color="#f9c84c"/><stop offset=".72" stop-color="#ef7839"/><stop offset="1" stop-color="#bd421f"/></radialGradient><filter id="ballShadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#17324d" flood-opacity=".25"/></filter></defs><g class="height-guides">${guideLines.map(item=>`<line x1="54" x2="1045" y1="${item[0]}" y2="${item[0]}"/><text x="58" y="${Math.max(18,item[0]-7)}"><tspan>h</tspan><tspan baseline-shift="sub" font-size="13">${item[1]}</tspan><tspan> = ${item[2]} m</tspan></text>`).join("")}</g><line class="svg-ground" x1="45" x2="1060" y1="310" y2="310"/><text class="ground-label" x="950" y="338">Mặt đất</text><path class="motion-path" d="${motionPath}"/><g class="svg-ball" ${ui.bounceRunning?"":'transform="translate(70 40)"'} filter="url(#ballShadow)"><circle r="18" fill="url(#ballGradient)" stroke="#a93c20" stroke-width="2"/><path d="M -16 -6 Q 0 4 16 -6 M -12 12 Q 0 -5 12 -13" fill="none" stroke="#8d351f" stroke-width="2.2" stroke-linecap="round"/><circle cx="-6" cy="-8" r="3.2" fill="rgba(255,255,255,.65)"/>${ui.bounceRunning?`<animateMotion dur="6s" path="${motionPath}" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".22 .08 .2 1"/>`:""}</g></svg></section><section class="bounce-panel"><div class="formula-board"><span class="mini-label">Dữ kiện mô phỏng</span><div class="bounce-data">${heights.map((h,i)=>`<div><span>${math(`h_${i}`)}</span><strong>${String(Number(h.toFixed(4))).replace(".",",")} m</strong></div>`).join("")}</div><div class="button-row"><button class="primary-button" data-a="bounceplay" ${ui.bounceRunning?"disabled":""}>▶ ${ui.bounceRunning?"Đang mô phỏng":"Chạy mô phỏng"}</button><button class="ghost-button" data-a="bouncereset">↺ Đặt lại</button></div></div><div class="info-card accent"><strong>Quan sát có mục đích</strong><p>Quả bóng chạy ngay trên đường nét đứt. Hãy so sánh các đỉnh quỹ đạo liên tiếp.</p></div></section></div><section class="bounce-question"><div><span class="mini-label">Câu hỏi kết nối</span><h3>Hệ thức nào mô tả đúng độ cao sau mỗi lần nảy?</h3></div><div class="bounce-options">${options.map(x=>`<button class="choice-button ${rule===x[0]?(x[0]==="recursive"?"correct":"wrong"):""}" data-a="bouncerule" data-v="${x[0]}">${x[1]}</button>`).join("")}</div>${feedback}</section>`;
  }
  function steps(){
    const n=+state.x.step,choice=state.x.stepChoice,correct=choice==="n-1";
    const choices=[["n-1","n-1"],["n","n"],["n+1","n+1"]];
    const feedback=!choice
      ?`<div class="feedback compact"><h3>Đến lượt em</h3><p>Đếm số mũi tên ${math("\\times q")} từ ${math("u_1")} đến ${math(`u_${n}`)} rồi chọn biểu thức đúng.</p></div>`
      :correct
        ?`<div class="feedback success compact"><h3>✓ Đúng: có ${n-1} lần nhân</h3><p>Vì vậy số mũ của ${math("q")} bằng ${math("n-1")}.</p></div>`
        :`<div class="feedback error compact"><h3>Chưa đúng</h3><p>Có ${n} mốc nhưng số khoảng giữa các mốc ít hơn một. Hãy đếm lại các mũi tên.</p></div>`;
    return `<div class="connection-banner"><span>Từ Slide 13</span><strong>Quy luật truy hồi lặp lại cùng một phép nhân. Bây giờ em hãy tự tìm số lần nhân.</strong></div><section class="formula-board step-builder"><div class="step-builder-head"><div><span class="mini-label">Chọn số hạng cần tìm</span><strong>Từ ${math("u_1")} đến ${math(`u_${n}`)}</strong></div><div class="slider-wrap"><span>${math("n")}</span><input id="step" type="range" min="2" max="8" value="${n}" aria-label="Chọn chỉ số n"><span class="value-badge">${n}</span></div></div><div class="sequence-row step-chain">${Array.from({length:n},(_,i)=>`${i?`<span class="arrow multiplication-arrow">${math("\\times q")}</span>`:""}<span class="term ${i===n-1?"active":""}">${math(`u_${i+1}`)}</span>`).join("")}</div><div class="step-question"><h3>Số mũ của ${math("q")} phải là biểu thức nào?</h3><div class="operation-options">${choices.map(x=>`<button class="operation-button ${choice===x[0]?(correct?"correct":"wrong"):""}" data-a="stepchoice" data-v="${x[0]}">${math(x[1])}</button>`).join("")}</div></div></section><div style="margin-top:1rem">${feedback}</div>${correct?board("u_n=u_1q^{n-1}","Kết luận chỉ xuất hiện sau khi em đếm đúng.","revealed-conclusion"):""}`;
  }
  function unformula(){return `${board("u_n=u_1q^{n-1}")}<div class="grid-3" style="margin-top:1rem"><div class="info-card"><strong>${math("u_1")}</strong><p>Mốc đầu</p></div><div class="info-card accent"><strong>${math("q")}</strong><p>Hệ số nhân</p></div><div class="info-card blue"><strong>${math("n-1")}</strong><p>Số khoảng</p></div></div><div class="info-card warm" style="margin-top:1rem"><strong>Kiểm tra bằng số lần nhân</strong><p>Từ ${math("u_1")} đến ${math("u_n")} có ${math("n-1")} khoảng. Nếu ${math("q=0")}, đọc riêng ${math("u_1")}; từ ${math("u_2")} trở đi các số hạng đều bằng 0.</p></div>`}
  function explorer(){
    const p=state.x.explore,terms=Array.from({length:p.n},(_,i)=>p.u1*Math.pow(p.q,i));
    const controls=[["u1","u_1",-5,5,1],["q","q",-2,2,.25],["n","n",3,12,1]];
    return `<div class="grid-2"><div><div class="control-grid">${controls.map(control=>`<div class="control"><label><span>${math(control[1])}</span><strong>${math(texNum(p[control[0]]))}</strong></label><input class="explore" data-k="${control[0]}" type="range" min="${control[2]}" max="${control[3]}" step="${control[4]}" value="${p[control[0]]}"></div>`).join("")}</div><div class="formula-board" style="margin-top:1rem">${eq(`u_{${p.n}}=${texNum(p.u1)}\\left(${texNum(p.q)}\\right)^{${p.n-1}}`,"small")}<p>Giá trị: <strong>${math(texNum(terms.at(-1)))}</strong></p></div><div class="sequence-row explorer-sequence">${terms.slice(0,8).map(value=>`<span class="term ${value<0?"negative":""}">${math(texNum(value))}</span>`).join("")}</div></div><div class="canvas-card"><span class="mini-label">Đồ thị điểm ${math("(k,u_k)")}</span><canvas id="plot" class="plot"></canvas></div></div>`;
  }
  function exponent(){
    const choice=state.x.exponentChoice,correct=choice==="8",yrs=Array.from({length:9},(_,i)=>i+1);
    const feedback=!choice
      ?`<div class="feedback compact"><h3>Chưa hiển thị kết luận</h3><p>Quan sát 9 mốc và đếm các khoảng từ ${math("u_1")} đến ${math("u_9")}.</p></div>`
      :correct
        ?`<div class="feedback success compact"><h3>✓ Có 8 khoảng</h3><p>Mỗi khoảng ứng với một lần nhân ${math("\\frac{3}{2}")}; số mũ đúng là 8.</p></div>`
        :`<div class="feedback error compact"><h3>Chưa chính xác</h3><p>Đừng đếm số mốc. Hãy đếm tám đoạn nối nằm giữa chín mốc.</p></div>`;
    return `<section class="formula-board"><div class="example-data"><span class="mini-label">Dữ kiện</span><div class="example-data-chips"><span>${math("u_1=8")}</span><span>${math("q=\\frac{3}{2}")}</span><span>Cần tìm ${math("u_9")}</span></div></div><div class="timeline interactive-timeline">${yrs.map((v,i)=>`${i?`<span class="timeline-gap"><i>${math("\\times q")}</i></span>`:""}<span class="timeline-point">${math(`u_${v}`)}</span>`).join("")}</div><div class="step-question"><h3>Trong ${math("u_9=8\\left(\\frac{3}{2}\\right)^{?}")}, số mũ bằng bao nhiêu?</h3><div class="operation-options">${["8","9","10"].map(v=>`<button class="operation-button ${choice===v?(correct?"correct":"wrong"):""}" data-a="exponentchoice" data-v="${v}">${math(v)}</button>`).join("")}</div></div></section><div style="margin-top:1rem">${feedback}</div>${correct?`<div class="formula-board center revealed-conclusion exponent-conclusion">${eq("u_9=8\\left(\\frac{3}{2}\\right)^8","small")}${eq("=\\frac{6561}{32}","small")}<p>Kết luận sau khi đếm đúng số khoảng.</p></div>`:""}`;
  }
  function population(){
    const years=Array.from({length:10},(_,i)=>2001+i),q=state.x.popQ,intervals=state.x.popIntervals;
    const correctQ=q==="1.011",correctIntervals=intervals==="9",good=correctQ&&correctIntervals;
    const feedback=!q||!intervals
      ?`<div class="feedback compact"><h3>Hoàn thành hai lựa chọn</h3><p>Tăng ${math("1{,}1\\%")} nghĩa là giữ lại 100% lượng cũ rồi cộng thêm 1,1%. Sau đó đếm khoảng giữa hai mốc năm.</p></div>`
      :good
        ?`<div class="feedback success compact"><h3>✓ Đúng cả hai dữ kiện</h3><p>Công bội là ${math("1{,}011")} và có ${math("9")} lần tăng.</p></div>`
        :`<div class="feedback error compact"><h3>Cần kiểm tra lại</h3><p>${correctQ?"Công bội đã đúng.":"Công bội phải lớn hơn 1 nhưng chỉ lớn hơn một lượng 0,011."} ${correctIntervals?"Số thời đoạn đã đúng.":"Từ đầu 2001 đến đầu 2010 có 9 khoảng."}</p></div>`;
    const chooser=(action,selected,items)=>`<div class="operation-options">${items.map(x=>`<button class="operation-button ${selected===x[0]?(x[2]?"correct":"wrong"):""}" data-a="${action}" data-v="${x[0]}">${x[3]?x[1]:math(x[1])}</button>`).join("")}</div>`;
    return `<div class="timeline interactive-timeline year-timeline">${years.map((v,i)=>`${i?'<span class="timeline-gap"></span>':""}<span class="timeline-point">${v}</span>`).join("")}</div><div class="grid-2 discovery-panels"><section class="formula-board"><span class="mini-label">Bước 1 · Chọn công bội</span><h3>Tăng ${math("1{,}1\\%")} mỗi năm thì ${math("q")} bằng:</h3>${chooser("popq",q,[["1.011","1{,}011",correctQ],[".011","0{,}011",false],["1.11","1{,}11",false]])}</section><section class="formula-board"><span class="mini-label">Bước 2 · Đếm thời đoạn</span><h3>Từ đầu 2001 đến đầu 2010 có:</h3>${chooser("popintervals",intervals,[["9","9 lần tăng",correctIntervals,true],["10","10 lần tăng",false,true],["11","11 lần tăng",false,true]])}</section></div><div style="margin-top:1rem">${feedback}</div>${good?`<div class="formula-board center revealed-conclusion population-conclusion">${eq("1{,}5\\cdot1{,}011^9\\approx1{,}655","small")}<p>Kết quả: khoảng 1,655 triệu người.</p></div>`:""}`;
  }
  function classify(){
    const items=[["a","Giá của riêng năm thứ 10","un"],["b","Tổng tiền đã trả trong 10 năm","sn"],["c","Số hạt ở riêng ô thứ 20","un"],["d","Tổng số hạt từ ô 1 đến ô 20","sn"]],p=state.x.classify,checked=state.x.classifyChecked;
    const rest=items.filter(x=>!p[x[0]]),assigned=items.length-rest.length,correct=items.filter(x=>p[x[0]]===x[2]).length;
    const card=(x,placed=false)=>{
      const evaluated=checked&&placed,kind=evaluated?(x[2]===p[x[0]]?"correct":"wrong"):"";
      return `<button class="scenario drag-card ${kind} ${state.x.pending===x[0]?"selected":""}" draggable="true" data-drag-id="${x[0]}" data-a="classcard" data-v="${x[0]}"><span class="drag-handle" aria-hidden="true">⠿</span><span>${x[1]}</span>${placed?'<small>Kéo để đổi nhóm</small>':"<small>Kéo thẻ vào một trong hai vùng</small>"}</button>`;
    };
    const zone=(k,title,detail)=>`<section class="drop-zone ${state.x.pending?"tap-ready":""}" data-drop="${k}" data-a="classtarget" data-v="${k}" tabindex="0"><div class="drop-zone-head"><span class="drop-symbol">${k==="un"?"1":"∑"}</span><div><h3>${title}</h3><p>${detail}</p></div></div><div class="drop-zone-body">${items.filter(x=>p[x[0]]===k).map(x=>card(x,true)).join("")||'<span class="drop-placeholder">Thả thẻ vào đây</span>'}</div></section>`;
    const result=checked?(correct===4
      ?`<div class="feedback success compact"><h3>✓ Chính xác 4/4</h3><p>Em đã phân biệt đúng giá trị tại một vị trí với tổng lũy kế.</p></div>`
      :`<div class="feedback error compact"><h3>Đúng ${correct}/4 tình huống</h3><p>Thẻ viền cam đang ở sai nhóm. Hãy kéo lại rồi kiểm tra lần nữa.</p></div>`)
      :`<div class="feedback compact"><h3>${assigned<4?`Đã phân loại ${assigned}/4 thẻ`:"Đã xếp đủ 4 thẻ"}</h3><p>${assigned<4?"Kéo đủ bốn thẻ vào hai vùng. Trên màn hình cảm ứng, chạm thẻ rồi chạm vùng đích.":"Bấm Kiểm tra để nhận phản hồi."}</p></div>`;
    return `<section class="drag-instructions"><div><span>1</span><p><strong>Đọc cụm từ khóa.</strong> “Riêng năm/riêng ô” là một vị trí; “tổng trong/từ…đến…” là cộng nhiều vị trí.</p></div><div><span>2</span><p><strong>Kéo và thả.</strong> Đưa mỗi thẻ vào nhóm ${math("u_n")} hoặc ${math("S_n")}.</p></div><div><span>3</span><p><strong>Kiểm tra.</strong> Chỉ khi đúng 4/4, hoạt động mới hoàn thành.</p></div></section><section class="drag-bank"><div class="drag-bank-head"><span class="mini-label">Ngân hàng tình huống</span><span>${rest.length} thẻ chưa xếp</span></div><div class="drag-card-grid">${rest.map(x=>card(x)).join("")||'<span class="pill teal">Đã kéo đủ bốn thẻ</span>'}</div></section><div class="classification">${zone("un",`${math("u_n")} · Một vị trí`,"Giá trị tại đúng một mốc hoặc một ô")}${zone("sn",`${math("S_n")} · Tổng nhiều vị trí`,"Cộng liên tiếp từ mốc đầu đến mốc n")}</div><div class="classification-footer"><button class="primary-button" data-a="checkclassify" ${assigned<4?"disabled":""}>Kiểm tra 4 thẻ</button><button class="ghost-button" data-a="resetclassify" ${assigned===0?"disabled":""}>↺ Xếp lại</button>${result}</div>`;
  }
  function derivation(){
    const n=+state.x.derive;
    const row=(label,expression,visible=true)=>`<div class="derive-row" style="opacity:${visible?1:.25}"><span class="derive-label">${math(label)}</span>${eq(expression,"small derive-expression")}</div>`;
    const labels=[`Nhân hai vế với ${math("q")}`,"Trừ hai hàng",`Chia cho ${math("1-q")}`,"Đã hoàn thành"];
    return `<div class="derivation">${row("S_n=","u_1+u_1q+u_1q^2+\\cdots+u_1q^{n-1}")}${row("qS_n=","u_1q+u_1q^2+\\cdots+u_1q^{n-1}+u_1q^n",n>=1)}${row("(1-q)S_n=","u_1-u_1q^n",n>=2)}${row("S_n=",frac("u_1(1-q^n)","1-q"),n>=3)}</div><div class="button-row" style="margin-top:1rem"><button class="primary-button" data-a="derive" ${n>=3?"disabled":""}>${labels[n]}</button><button class="ghost-button" data-a="derivereset">↺ Làm lại</button></div>`;
  }
  function sumformula(){
    return `<div class="grid-2"><div class="formula-board center"><span class="pill teal" style="justify-self:center">${math("q\\ne1")}</span>${eq(`S_n=${frac("u_1(1-q^n)","1-q")}`,"small")}${eq(`S_n=${frac("u_1(q^n-1)","q-1")}`,"small")}</div><div class="formula-board center"><span class="pill orange" style="justify-self:center">${math("q=1")}</span>${eq("S_n=nu_1")}<p>Mọi số hạng đều bằng ${math("u_1")}.</p></div></div><div class="info-card warm" style="margin-top:1rem"><strong>Không thế ${math("q=1")} vào phân thức</strong><p>Mẫu bằng 0; hãy dùng trường hợp riêng ${math("S_n=nu_1")}.</p></div>`;
  }
  function symmetry(){
    const seen=Array.isArray(state.x.symmetrySeen)?state.x.symmetrySeen:[],choice=state.x.symmetryChoice,allSeen=seen.length===3,correct=choice==="product";
    const samples=[
      ["a",["2","6","18"],"2\\cdot18=36","6^2=36"],
      ["b",["3","-6","12"],"3\\cdot12=36","(-6)^2=36"],
      ["c",["8","4","2"],"8\\cdot2=16","4^2=16"]
    ];
    const cards=samples.map(x=>{const open=seen.includes(x[0]);return `<button class="symmetry-sample ${open?"opened":""}" data-a="symprobe" data-v="${x[0]}"><span class="mini-label">Dãy ${x[0].toUpperCase()}</span><span class="sample-sequence">${math(x[1].join(",\\ "))}</span>${open?`<span class="sample-calculation">${math(x[2])}<i>=</i>${math(x[3])}</span>`:'<span class="sample-action">Bấm để so sánh hai tích</span>'}</button>`}).join("");
    const hypotheses=[
      ["sum","u_{k-1}+u_{k+1}=2u_k"],
      ["product","u_{k-1}\\cdot u_{k+1}=u_k^2"],
      ["double","u_{k-1}\\cdot u_{k+1}=2u_k"]
    ];
    const feedback=!allSeen
      ?`<div class="feedback compact"><h3>Đã khảo sát ${seen.length}/3 dãy</h3><p>Bấm từng dãy để so sánh tích hai số ngoài với bình phương số ở giữa.</p></div>`
      :!choice
        ?`<div class="feedback compact"><h3>Hãy nêu dự đoán</h3><p>Cả ba ví dụ đều cho cùng một kiểu đẳng thức. Chọn tính chất phù hợp.</p></div>`
        :correct
          ?`<div class="feedback success compact"><h3>✓ Dự đoán chính xác</h3><p>Tích hai số hạng đối xứng bằng bình phương số hạng ở giữa.</p></div>`
          :`<div class="feedback error compact"><h3>Chưa phù hợp với ba ví dụ</h3><p>Ở dãy 2, 6, 18: ${math("2\\cdot18=6^2=36")}. Hãy đối chiếu lại.</p></div>`;
    return `<div class="symmetry-lab"><section class="symmetry-samples">${cards}</section><section class="formula-board hypothesis-panel"><span class="mini-label">Bước 2 · Chọn tính chất tổng quát</span><h3>Với ba số hạng liên tiếp của một cấp số nhân:</h3><div class="hypothesis-options">${hypotheses.map(x=>`<button class="choice-button ${choice===x[0]?(correct?"correct":"wrong"):""}" data-a="symchoice" data-v="${x[0]}" ${allSeen?"":"disabled"}>${math(x[1])}</button>`).join("")}</div></section></div><div style="margin-top:1rem">${feedback}</div>${correct?`<div class="grid-2 proof-reveal">${board("u_{k-1}\\cdot u_{k+1}=u_k^2","Tính chất vừa khám phá.")}${board("u_1^2q^{2k-2}=u_1^2q^{2k-2}","Hai vế có cùng dạng tổng quát.")}</div>`:""}`;
  }
  function tower(){
    const floors=Array.from({length:9},(_,i)=>`<div class="tower-floor" style="width:${92*Math.pow(2/3,i/2)}%" title="Tầng ${i+1}"></div>`).join("");
    return `<div class="tower-wrap"><div class="tower">${floors}</div><div class="tower-formulas"><div class="formula-board center"><span class="mini-label">Dữ kiện</span><div class="tower-data"><span>${math("u_1=1000")}</span><span>${math("q=\\frac{2}{3}")}</span><span>${math("n=9")}</span></div></div><div class="formula-board center tower-total" style="margin-top:1rem"><span class="mini-label">Tổng diện tích</span>${eq("S_9\\approx2921{,}96\\,\\mathrm{m}^2","small")}${eq("\\approx2922\\,\\mathrm{m}^2","small")}</div><div class="info-card warm" style="margin-top:1rem"><strong>Kiểm tra hợp lí</strong><p>Tổng hữu hạn phải nhỏ hơn ${math("3000\\,\\mathrm{m}^2")}.</p></div></div></div>`;
  }
  function chesssum(){
    const terms=Array.from({length:10},(_,i)=>2**i);
    return `<div class="bars">${terms.map((value,index)=>`<div class="bar" style="height:${Math.max(3,value/512*100)}%"><span>${index+1}</span></div>`).join("")}</div><div class="grid-2" style="margin-top:1.6rem"><div class="metric"><small>Ô thứ 10 · ${math("u_{10}")}</small><strong>${math("2^9=512\\ \\text{hạt}")}</strong></div><div class="metric"><small>Tổng 10 ô · ${math("S_{10}")}</small><strong>${math("2^{10}-1=1023\\ \\text{hạt}")}</strong></div></div>`;
  }
  function cost(){
    const terms=Array.from({length:10},(_,i)=>500000*1.2**i),sum=terms.reduce((x,y)=>x+y,0);
    const total=String(Math.round(sum)).replace(/\B(?=(\d{3})+(?!\d))/g,"\\,");
    return `<div class="grid-2"><div class="bars">${terms.map((value,index)=>`<div class="bar" style="height:${value/terms.at(-1)*100}%"><span>${index+1}</span></div>`).join("")}</div><div class="cost-formulas">${board("u_n=500\\,000\\cdot1{,}2^{n-1}","Giá từng năm")}${board(`S_{10}\\approx${total}\\ \\text{đồng}`,"Tổng 10 năm","spaced-board")}</div></div>`;
  }
  function modeling(){
    const n=+state.x.model;
    const steps=[
      ["Chọn đại lượng",`Mỗi số hạng biểu diễn gì? Mốc ${math("u_1")} ở đâu?`],
      ["Tìm công bội",`Tăng ${math("r\\%")}: ${math(`q=1+${frac("r","100")}`)}. Giảm ${math("r\\%")}: ${math(`q=1-${frac("r","100")}`)}.`],
      ["Đếm thời đoạn","Đếm khoảng giữa hai mốc, không đếm số mốc."],
      ["Chọn công thức",`Một vị trí dùng ${math("u_n")}; tổng lũy kế dùng ${math("S_n")}.`]
    ];
    return `<div class="step-flow">${steps.map((step,index)=>`<button class="step-card ${index===n?"active":""}" data-a="model" data-v="${index}"><span class="step-number">${index+1}</span><h3>${step[0]}</h3><p>${step[1]}</p></button>`).join("")}</div><div class="feedback success" style="margin-top:1rem;min-height:0"><h3>Bước ${n+1} · ${steps[n][0]}</h3><p>${steps[n][1]} Sau khi tính, kiểm tra đơn vị, làm tròn và độ hợp lí.</p></div>`;
  }
  function decay(){
    const topic=state.x.decay;
    const ice=board("q=1-\\frac{1}{5}=\\frac{4}{5}","Mất một phần năm thì còn bốn phần năm.")+board("1\\cdot\\left(\\frac{4}{5}\\right)^6=0{,}262144\\ \\text{tấn}","Khối lượng còn lại sau 6 giờ.");
    const iodine=board("\\frac{64}{8}=8","Có 8 chu kì bán rã.")+board("160\\cdot\\left(\\frac{1}{2}\\right)^8=0{,}625\\,\\mathrm{mg}\\approx1\\,\\mathrm{mg}","Chỉ làm tròn ở bước cuối.");
    return `<div class="button-row"><button class="${topic==="ice"?"primary-button":"secondary-button"}" data-a="decay" data-v="ice">Tảng băng</button><button class="${topic==="iodine"?"primary-button":"secondary-button"}" data-a="decay" data-v="iodine">Chu kì bán rã</button></div><div class="grid-2 decay-equations" style="margin-top:1rem">${topic==="ice"?ice:iodine}</div><div class="info-card warm" style="margin-top:1rem"><strong>Quy tắc chống sai</strong><p>Giảm ${math("r\\%")} dùng ${math(`q=1-${frac("r","100")}`)}. Với chu kì, đổi thời gian thành số chu kì trước.</p></div>`;
  }
  function compare(){
    const key=state.x.compare,q=+key,terms=Array.from({length:9},(_,i)=>2*q**i);
    const choices=[["1.2","q=1{,}2"],[".8","q=0{,}8"],["-.8","q=-0{,}8"]];
    const qTex=String(q).replace("-", "-").replace(".", "{,}");
    return `<div class="button-row">${choices.map(item=>`<button class="${key===item[0]?"primary-button":"secondary-button"}" data-a="compare" data-v="${item[0]}">${math(item[1])}</button>`).join("")}</div><div class="grid-2" style="margin-top:1rem"><div class="canvas-card"><span class="mini-label">${q>1?"Tăng trưởng":q>0?"Suy giảm dương":"Đổi dấu, độ lớn giảm"}</span><canvas id="compareplot" class="plot"></canvas></div><div><div class="sequence-row compare-sequence">${terms.map(value=>`<span class="term ${value<0?"negative":""}">${math(texNum(value))}</span>`).join("")}</div>${board(`u_n=2\\left(${qTex}\\right)^{n-1}`,q>1?"Độ lớn tăng.":q>0?"Các số hạng tiến về 0.":"Dấu luân phiên, độ lớn tiến về 0.")}</div></div>`;
  }
  function summary(){
    return `<div class="grid-2">${board("u_{n+1}=u_nq","Nhận biết")}${board("u_n=u_1q^{n-1}","Số hạng thứ n")}${board(`S_n=${frac("u_1(1-q^n)","1-q")}`,"Tổng n số hạng")}${board(`q=1\\pm${frac("r","100")}`,"Tăng hoặc giảm r%")}</div><div class="info-card accent" style="margin-top:1rem"><strong>Bốn câu tự kiểm soát</strong><p>${math("u_1")} là gì? · ${math("q")} bằng bao nhiêu? · Có bao nhiêu thời đoạn? · Đề hỏi ${math("u_n")} hay ${math("S_n")}?</p></div>`;
  }
  function results(){
    const sc=score(),pass=okCount()===7;
    const groups=[["Nhận biết",["q1","q2"]],[`Số hạng ${math("u_n")}`,["q3","q4"]],[`Tổng ${math("S_n")}`,["q5","q6"]],["Mô hình hóa",["q7"]]];
    return `<div class="results-grid"><div class="formula-board center"><div class="score-ring" style="--score:${sc}"><div class="score-copy"><strong>${okCount()}/7</strong><span>${sc}% · ${pass?"Hoàn thành":"Cần củng cố"}</span></div></div><span class="pill ${pass?"teal":"orange"}" style="justify-self:center">${pass?"Hoàn thành đầy đủ 7/7":"Chưa hoàn thành đủ 7/7"}</span></div><div><div class="mastery-list">${groups.map(group=>{const achieved=group[1].filter(key=>state.quiz[key]?.correct).length,percent=Math.round(achieved/group[1].length*100);return `<div class="mastery-row"><strong>${group[0]}</strong><div class="mastery-track"><div class="mastery-fill" style="width:${percent}%"></div></div><span>${achieved}/${group[1].length}</span></div>`}).join("")}</div><div class="button-row" style="margin-top:1rem">${pass?'<button class="primary-button" data-a="complete">Ghi nhận hoàn thành</button>':'<button class="primary-button" data-a="remediate">Đi đến phần cần ôn</button>'}<button class="secondary-button" data-a="resetquiz">↺ Làm lại đánh giá</button></div><div class="references" style="margin-top:1rem"><div class="reference-item"><span>1</span><p>Tài liệu chuyên đề “Cấp số nhân” do tác giả cung cấp; nội dung được biên soạn lại theo mục tiêu bài học.</p></div><div class="reference-item"><span>2</span><p>Quyết định 2915/QĐ-BGDĐT ngày 17/09/2021 về Thể lệ Cuộc thi Thiết kế bài giảng điện tử.</p></div><div class="reference-item"><span>3</span><p>Minh họa, biểu đồ và mô phỏng được dựng mới bằng HTML/CSS/Canvas; giấy phép ${C.license}.</p></div></div></div></div>`;
  }

  const V={chess,pattern,roadmap,sequences,qconcept,definition,qroles,example,guided,quiz,bounce,steps,unformula,explorer,exponent,population,classify,derivation,sumformula,symmetry,tower,chesssum,cost,modeling,decay,compare,summary,results};

  function moveClassify(id,target){
    if(!id||!["un","sn"].includes(target))return;
    state.x.classify[id]=target;
    state.x.pending="";
    state.x.classifyChecked=false;
    save();render();
  }
  function bind(){
    app.querySelectorAll("[data-a]").forEach(el=>el.addEventListener("click",act));
    const teacherSelect=app.querySelector("[data-teacher-slide]");
    if(teacherSelect)teacherSelect.addEventListener("change",e=>go(+e.target.value,true,true));
    app.querySelectorAll(".guided").forEach(el=>el.addEventListener("input",e=>{state.x.guided[+e.target.dataset.i]=e.target.value;state.x.guidedChecked=false;save()}));
    const chessSlider=document.getElementById("chess");
    if(chessSlider)chessSlider.addEventListener("change",e=>{state.x.chess=+e.target.value;save();render()});
    const stepSlider=document.getElementById("step");
    if(stepSlider)stepSlider.addEventListener("change",e=>{state.x.step=+e.target.value;state.x.stepChoice="";save();render()});
    app.querySelectorAll(".explore").forEach(el=>el.addEventListener("change",e=>{state.x.explore[e.target.dataset.k]=+e.target.value;save();render()}));
    app.querySelectorAll("[data-drag-id]").forEach(card=>{
      card.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",card.dataset.dragId);e.dataTransfer.effectAllowed="move";card.classList.add("dragging")});
      card.addEventListener("dragend",()=>{card.classList.remove("dragging");app.querySelectorAll(".drag-over").forEach(x=>x.classList.remove("drag-over"))});
    });
    app.querySelectorAll("[data-drop]").forEach(zone=>{
      zone.addEventListener("dragover",e=>{e.preventDefault();e.dataTransfer.dropEffect="move";zone.classList.add("drag-over")});
      zone.addEventListener("dragleave",()=>zone.classList.remove("drag-over"));
      zone.addEventListener("drop",e=>{e.preventDefault();zone.classList.remove("drag-over");moveClassify(e.dataTransfer.getData("text/plain"),zone.dataset.drop)});
      zone.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&state.x.pending){e.preventDefault();moveClassify(state.x.pending,zone.dataset.drop)}});
    });
  }
  function act(e){const el=e.target.closest("[data-a]");if(!el)return;const a=el.dataset.a,v=el.dataset.v,qid=el.dataset.q;
    if(a==="menu"){ui.menu=!ui.menu;render()}else if(a==="settings"){ui.settings=true;render()}else if(a==="close"){if(e.target===el||el.tagName==="BUTTON"){ui.settings=false;render()}}
    else if(a==="teachersecret"||a==="teachertoggle")toggleTeacherMode()
    else if(a==="start"){if(gateStatus(0).unlocked){state.started=true;save();go(1,false,true)}else toast(gateStatus(0).message)}else if(a==="resume")go(maxVisited(),true,true);else if(a==="prev")go(state.slide-1,true,ui.teacherMode);else if(a==="next")go(state.slide+1,false,true);else if(a==="module")go(moduleStart(+v),ui.teacherMode,ui.teacherMode);else if(a==="full"){document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.()}
    else if(a==="audioplay")playNarration(false);else if(a==="audiopause")pauseNarration();else if(a==="audioreplay")replayNarration();else if(a==="setting"){state.settings[v]=el.checked;if(v==="autoNarrate"&&!el.checked)pauseNarration();save();render();if(v==="autoNarrate"&&el.checked)scheduleNarration(180)}else if(a==="reset"){stopSpeech();try{localStorage.removeItem(KEY)}catch(_){}state=copy(defaults);ui.settings=false;save();render();toast("Đã xóa tiến độ.")}
    else if(a==="rulea"){state.x.qa=v;save();render()}else if(a==="ruleb"){state.x.qb=v;save();render()}else if(a==="qrole"){state.x.qrole=v;save();render()}
    else if(a==="checkguided"){state.x.guidedChecked=true;const good=state.x.guided.map(String).map(x=>x.trim()).join(",")==="36,54,81";save();toast(good?"Chính xác: 36, 54, 81. Trang tiếp theo đã được mở.":"Chưa đúng. Hãy nhân lần lượt với [[\\frac{3}{2}]] rồi kiểm tra lại.")}else if(a==="hint")toast("[[q=\\frac{24}{16}=\\frac{3}{2}]]; bắt đầu từ [[u_3=24\\cdot\\frac{3}{2}]].")
    else if(a==="select"){const z=state.quiz[qid]||{selected:null,attempts:0,correct:false,submitted:false};if(!z.correct){z.selected=+v;z.submitted=false;state.quiz[qid]=z;save();render()}}
    else if(a==="submit"){const z=state.quiz[qid];if(z&&z.selected!==null&&!z.correct){z.attempts++;z.correct=z.selected===Q[qid].c;z.submitted=true;save();render()}}
    else if(a==="retry"){const z=state.quiz[qid];if(z&&!z.correct){z.selected=null;z.submitted=false;save();render()}}
    else if(a==="bounceplay"){clearTimeout(ui.bounceTimer);ui.bounceRunning=true;render();ui.bounceTimer=setTimeout(()=>{ui.bounceRunning=false;render()},6200)}else if(a==="bouncereset"){clearTimeout(ui.bounceTimer);ui.bounceRunning=false;render()}else if(a==="bouncerule"){state.x.bounceRule=v;save();render()}
    else if(a==="stepchoice"){state.x.stepChoice=v;save();render()}else if(a==="exponentchoice"){state.x.exponentChoice=v;save();render()}else if(a==="popq"){state.x.popQ=v;save();render()}else if(a==="popintervals"){state.x.popIntervals=v;save();render()}
    else if(a==="symprobe"){const seen=Array.isArray(state.x.symmetrySeen)?state.x.symmetrySeen:[];if(!seen.includes(v))state.x.symmetrySeen=[...seen,v];save();render()}else if(a==="symchoice"){state.x.symmetryChoice=v;save();render()}
    else if(a==="classcard"){state.x.pending=state.x.pending===v?"":v;render()}else if(a==="classtarget"){if(state.x.pending)moveClassify(state.x.pending,v)}else if(a==="checkclassify"){if(Object.keys(state.x.classify).length===4){state.x.classifyChecked=true;save();render()}}else if(a==="resetclassify"){state.x.classify={};state.x.pending="";state.x.classifyChecked=false;save();render()}
    else if(a==="derive"){state.x.derive=Math.min(3,state.x.derive+1);save();render()}else if(a==="derivereset"){state.x.derive=0;save();render()}else if(a==="model"){state.x.model=+v;save();render()}else if(a==="decay"){state.x.decay=v;save();render()}else if(a==="compare"){state.x.compare=v;save();render()}
    else if(a==="complete"){if(okCount()===7&&state.audioDone[34]){state.completed=true;save();toast("Kết quả hoàn thành đã được ghi nhận.")}else toast("Hãy hoàn thành 7/7 câu và nghe hết thuyết minh slide cuối.")}else if(a==="remediate"){const miss=Object.keys(Q).find(k=>!state.quiz[k]?.correct);go(S.findIndex(s=>s.id===(miss?Q[miss].back:7)),true)}else if(a==="resetquiz"){state.quiz={};state.completed=false;save();toast("Đã đặt lại 7 câu đánh giá.");go(S.findIndex(s=>s.quizId==="q1"),true)}
  }
  function draw(){const type=S[state.slide].type;if(type==="explorer"){const p=state.x.explore,vals=Array.from({length:p.n},(_,i)=>p.u1*p.q**i);plot(document.getElementById("plot"),vals,"#159e91")}if(type==="compare"){const q=+state.x.compare,vals=Array.from({length:9},(_,i)=>2*q**i);plot(document.getElementById("compareplot"),vals,q<0?"#ed7446":"#2b73c9")}}
  function plot(c,a,color){if(!c)return;const r=Math.max(1,devicePixelRatio||1),w=Math.max(300,c.getBoundingClientRect().width),h=Math.max(220,c.getBoundingClientRect().height);c.width=w*r;c.height=h*r;const x=c.getContext("2d");x.scale(r,r);const pad={l:42,r:20,t:18,b:32},iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;let min=Math.min(0,...a),max=Math.max(0,...a);if(min===max){min--;max++}const m=(max-min)*.1;min-=m;max+=m;const X=i=>pad.l+(a.length===1?iw/2:i/(a.length-1)*iw),Y=v=>pad.t+(max-v)/(max-min)*ih;x.strokeStyle="#d8e5ea";x.lineWidth=1;for(let i=0;i<=4;i++){const y=pad.t+i/4*ih;x.beginPath();x.moveTo(pad.l,y);x.lineTo(w-pad.r,y);x.stroke()}x.strokeStyle="#7d919e";x.beginPath();x.moveTo(pad.l,Y(0));x.lineTo(w-pad.r,Y(0));x.moveTo(pad.l,pad.t);x.lineTo(pad.l,h-pad.b);x.stroke();x.strokeStyle=color;x.lineWidth=2.2;x.beginPath();a.forEach((v,i)=>i?x.lineTo(X(i),Y(v)):x.moveTo(X(i),Y(v)));x.stroke();a.forEach((v,i)=>{x.fillStyle="#fff";x.beginPath();x.arc(X(i),Y(v),5,0,Math.PI*2);x.fill();x.strokeStyle=color;x.lineWidth=3;x.stroke();x.fillStyle="#657788";x.font="11px Segoe UI";x.textAlign="center";x.fillText(i+1,X(i),h-12)})}
  addEventListener("keydown",e=>{if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName))return;if(e.key==="ArrowRight")go(state.slide+1,false,true);if(e.key==="ArrowLeft")go(state.slide-1,true,ui.teacherMode);if(e.key.toLowerCase()==="m"){ui.menu=!ui.menu;render()}if(e.key.toLowerCase()==="f"){document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.()}if(e.key.toLowerCase()==="r")replayNarration();if(e.key===" "){e.preventDefault();ui.speaking?pauseNarration():playNarration(false)}});
  addEventListener("resize",()=>{clearTimeout(window.__rs);window.__rs=setTimeout(draw,100)});addEventListener("beforeunload",()=>{stopSpeech(false);save();window.ScormBridge.finish()});
  render();
})();
