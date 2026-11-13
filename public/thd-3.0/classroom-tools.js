(function thdMiniApps(which) {
  "use strict";
  function makeThdMiniModel(environment) {
  "use strict";
  var KEY = "thd_classroom_mini_v1";
  var now = environment.now || Date.now;
  var storage = environment.storage;
  var saved = {};
  try { saved = JSON.parse(storage.getItem(KEY) || "{}"); } catch (_) {}
  if (!saved || typeof saved !== "object") saved = {};
  function integer(value, low, high, fallback) {
    return Number.isInteger(value) && value >= low && value <= high ? value : fallback;
  }
  var oldTimer = saved.timer || {}, oldDraw = saved.draw || {};
  var seconds = integer(oldTimer.seconds, 1, 86400, 60);
  var deadline = Number.isFinite(oldTimer.deadline) && oldTimer.deadline > 0 ? oldTimer.deadline : 0;
  var state = {
    timer: {
      seconds: seconds,
      remaining: Number.isFinite(oldTimer.remaining) ? Math.max(0, Math.min(seconds * 1000, oldTimer.remaining)) : seconds * 1000,
      deadline: deadline, running: !!oldTimer.running && deadline > 0,
      paused: !!oldTimer.paused, finished: !!oldTimer.finished, sound: oldTimer.sound !== false
    },
    draw: {
      from: integer(oldDraw.from, 1, 9999, 1), to: integer(oldDraw.to, 1, 9999, 45),
      unique: !!oldDraw.unique,
      history: Array.isArray(oldDraw.history) ? oldDraw.history.filter(function (entry) {
        return entry && Number.isInteger(entry.value) && entry.value >= 1 && entry.value <= 9999 && Number.isFinite(entry.at);
      }).slice(0, 200) : [],
      used: Array.isArray(oldDraw.used) ? Array.from(new Set(oldDraw.used.filter(function (n) { return Number.isInteger(n) && n >= 1 && n <= 9999; }))).slice(0, 9999) : []
    }
  };
  if (state.draw.to < state.draw.from) state.draw.to = state.draw.from;
  if (state.timer.running) state.timer.paused = false;
  function persist() {
    try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch (_) { return false; }
  }
  function validSeconds(value) {
    var n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 86400) throw new Error("Nhập số giây nguyên từ 1 đến 86400.");
    return n;
  }
  function tick() {
    var timer = state.timer;
    if (!timer.running) return false;
    timer.remaining = Math.max(0, timer.deadline - now());
    if (timer.remaining > 0) return false;
    timer.running = false; timer.paused = false; timer.finished = true; timer.deadline = 0;
    persist();
    return true;
  }
  function setSeconds(value) {
    var n = validSeconds(value), timer = state.timer;
    timer.seconds = n; timer.remaining = n * 1000; timer.deadline = 0;
    timer.running = false; timer.paused = false; timer.finished = false;
    return persist();
  }
  function start(value) {
    var n = validSeconds(value), timer = state.timer;
    tick();
    if (n !== timer.seconds || timer.finished || timer.remaining <= 0) setSeconds(n);
    timer.running = true; timer.paused = false; timer.finished = false;
    timer.deadline = now() + timer.remaining;
    persist();
  }
  function pause() {
    tick();
    if (!state.timer.running) return;
    state.timer.running = false; state.timer.paused = true; state.timer.deadline = 0;
    persist();
  }
  function setSound(enabled) { state.timer.sound = !!enabled; persist(); }
  function setRange(fromValue, toValue, unique) {
    var from = Number(fromValue), to = Number(toValue);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > 9999 || from > to) {
      throw new Error("Nhập khoảng STT hợp lệ từ 1 đến 9999; số đầu không lớn hơn số cuối.");
    }
    state.draw.from = from; state.draw.to = to; state.draw.unique = !!unique;
    persist();
  }
  function draw(from, to, unique) {
    setRange(from, to, unique);
    var settings = state.draw, used = new Set(settings.used), pool = [];
    for (var n = settings.from; n <= settings.to; n++) if (!settings.unique || !used.has(n)) pool.push(n);
    if (!pool.length) throw new Error("Đã chọn hết STT trong khoảng này. Xóa lịch sử để bắt đầu lượt mới.");
    var index = environment.pick(pool.length);
    if (!Number.isInteger(index) || index < 0 || index >= pool.length) throw new Error("Chưa chọn được số; hãy thử lại.");
    var result = pool[index];
    settings.history.unshift({ value: result, at: now() });
    settings.history = settings.history.slice(0, 200);
    if (!used.has(result)) settings.used.push(result);
    persist();
    return result;
  }
  function clearHistory() { state.draw.history = []; state.draw.used = []; persist(); }
  tick();
  return { state: state, tick: tick, setSeconds: setSeconds, start: start, pause: pause,
    setSound: setSound, setRange: setRange, draw: draw, clearHistory: clearHistory, persist: persist };
}

  var host = document.getElementById("__thd_mini_host");
  if (!host) return;
  var existing = window.__THD_MINI_APPS;
  if (existing && existing.host === host && host.isConnected) {
    if (which) existing.toggle(which);
    return;
  }
  if (existing) existing.destroy();
  var root = host.shadowRoot || host.attachShadow({ mode: "open" });
  root.innerHTML = "<style>:host{all:initial;position:fixed;inset:0;z-index:2147483645;pointer-events:none;font:14px/1.4 \"Segoe UI\",Arial,sans-serif;color:#172f48;--navy:#183b62;--teal:#168d8b;--line:#dce7f0;--muted:#758596;--panel:rgba(255,255,255,.985)}\n*{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer}button:disabled{cursor:default;opacity:.5}button:focus-visible,input:focus-visible{outline:3px solid #a5c9f5;outline-offset:2px}button{touch-action:manipulation}svg{display:block;flex-shrink:0}button svg{width:19px;height:19px}\n[hidden]{display:none!important}\n.dock{position:absolute;right:12px;bottom:12px;display:flex;gap:6px;pointer-events:auto}\n.dock-button{position:relative;width:38px;height:38px;display:grid;place-items:center;padding:0;background:#fff;border:1px solid #cfdeeb;border-radius:12px;color:var(--navy);box-shadow:0 3px 11px #183b6224;transition:transform .18s,background .18s,box-shadow .18s;opacity:.85}\n.dock-button[data-app=\"random\"]{color:var(--teal)}\n.dock-button:hover,.dock-button[aria-expanded=\"true\"]{opacity:1;transform:translateY(-2px);background:#eff5fa;box-shadow:0 6px 16px #183b6230}\n.dock-button[aria-expanded=\"true\"]{border-color:#97b3ce}\n.dock-button.has-timer svg{transform:translateY(-3px);width:17px;height:17px}\n.timer-badge{position:absolute;bottom:1px;left:1px;right:1px;text-align:center;font-size:9px;line-height:12px;font-weight:750;font-variant-numeric:tabular-nums;color:var(--navy)}\n.dock-button.timer-done{border-color:#f0b5b4;background:#fff2f1;color:#c94240;animation:finish-pulse .7s ease 3}\n.dock-button.timer-done .timer-badge{color:#c94240}\n.dock-button::after{content:attr(data-label);position:absolute;bottom:47px;right:0;white-space:nowrap;padding:5px 9px;border-radius:7px;background:#183b62;color:#fff;font-size:11px;opacity:0;pointer-events:none;transform:translateY(5px);transition:.16s}\n.dock-button:hover::after,.dock-button:focus-visible::after{opacity:1;transform:translateY(0)}\n.popup{position:absolute;right:12px;bottom:62px;width:318px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 86px);overflow:auto;pointer-events:auto;background:var(--panel);border:1px solid var(--line);border-radius:20px;box-shadow:0 18px 60px #183b6238,0 2px 8px #183b6214;animation:popup-in .22s cubic-bezier(.2,.8,.2,1);transform-origin:bottom right}\n.head{display:flex;align-items:center;gap:10px;padding:15px 17px 12px;border-bottom:1px solid #edf2f7}\n.head-icon{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:#edf4fb;color:var(--navy)}.head-icon svg{width:19px;height:19px}\n.random-popup .head-icon{background:#e8f7f5;color:var(--teal)}\n.head h2{font-size:15px;line-height:1.3;margin:0;font-weight:750;flex:1;letter-spacing:-.2px}\n.icon-button{display:grid;place-items:center;border:0;width:27px;height:27px;padding:0;background:transparent;color:#7c8b9a;border-radius:8px}.icon-button:hover{background:#edf3f8;color:var(--navy)}.icon-button svg{width:16px;height:16px}\n.body{padding:14px 17px 16px}\n.clock-ring{position:relative;margin:0 auto 9px;width:146px;height:146px;display:grid;place-items:center}.clock-ring>svg{position:absolute;width:100%;height:100%;transform:rotate(-90deg)}\n.ring-track{stroke:#eaf0f6;fill:none;stroke-width:6}.ring-progress{stroke:var(--navy);fill:none;stroke-width:6;stroke-linecap:round;transition:stroke-dashoffset .4s linear,stroke .2s}\n.clock-ring.is-finished .ring-progress{stroke:#d34e4c}.clock-ring.is-finished .clock-time{color:#c94240}\n.clock-display{z-index:1;text-align:center;display:flex;align-items:center;flex-direction:column;gap:3px}.clock-status{font-size:11px;color:var(--muted)}.clock-time{font-size:35px;line-height:1.25;font-weight:760;font-variant-numeric:tabular-nums;letter-spacing:-1.2px}.clock-time.long-time{font-size:27px}\n.presets{display:flex;gap:5px;margin-bottom:12px}.preset{flex:1;border:1px solid #e0e9f1;background:#f7fafd;color:#61758b;padding:5px 3px;border-radius:8px;font-size:11px;font-weight:600;transition:.15s}.preset:hover{background:#eaf1f9;color:var(--navy)}.preset[aria-pressed=\"true\"]{background:#e8f0f9;color:var(--navy);border-color:#b1c8df}\n.field-label{display:block;font-size:11px;color:#6d7f91;font-weight:650;margin-bottom:5px}.save-row{display:flex;gap:7px}.field{width:100%;min-width:0;border:1px solid #d7e3ee;border-radius:9px;padding:8px 11px;background:#fafcfe;color:#203b57;height:37px;font-size:14px;font-variant-numeric:tabular-nums}.field:hover{border-color:#b8cde0}.small-button{border:1px solid #b8cce0;background:#edf4fb;color:var(--navy);font-size:12px;font-weight:650;border-radius:9px;padding:7px 13px;white-space:nowrap}.small-button:hover{background:#e2edf7}\n.field-note{color:#8897a6;font-size:10px;margin:5px 0 11px;min-height:14px}.field-note.saved{color:#218877}\n.actions{display:flex;gap:7px}.primary,.secondary{height:39px;display:flex;align-items:center;justify-content:center;gap:7px;border-radius:10px;font-size:12px;font-weight:700;transition:background .15s,transform .15s}.primary{flex:1;border:1px solid var(--navy);background:var(--navy);color:#fff}.primary:hover{background:#245482}.primary:active,.secondary:active{transform:scale(.975)}.secondary{padding:0 12px;border:1px solid #dce6ef;background:#f7fafc;color:#64768a}.secondary:hover{background:#edf3f9}.actions svg{width:16px;height:16px}\n.sound-row{display:flex;justify-content:flex-end;margin-top:10px}.check-label{display:flex;align-items:center;gap:6px;color:#7c8c9c;font-size:11px;cursor:pointer}.check-label input{accent-color:var(--navy);width:13px;height:13px;margin:0}\n.range-row{display:flex;gap:9px;margin-bottom:9px}.range-row label{flex:1;min-width:0}.unique-row{margin-bottom:7px}.random-popup .check-label input{accent-color:var(--teal)}\n.student{position:relative;padding:7px 0 15px;text-align:center;overflow:hidden;border-radius:12px}.student-label{font-size:10px;font-weight:700;color:#8aa1ad;letter-spacing:1.6px}.student-number{font-size:60px;line-height:1.25;font-weight:800;color:var(--teal);font-variant-numeric:tabular-nums;letter-spacing:-1.5px}.student-caption{font-size:10px;color:#8999a5;margin-top:1px}.student.is-shuffling .student-number{animation:shuffle-wiggle .14s ease infinite}.student.is-picked .student-number{animation:pick-pop .38s cubic-bezier(.2,.8,.2,1)}\n.random-primary{background:var(--teal);border-color:var(--teal);width:100%}.random-primary:hover{background:#107b79}.random-primary svg{width:17px;height:17px}.random-primary.is-shuffling svg{animation:dice-spin .55s linear infinite}\n.history-head{display:flex;align-items:center;justify-content:space-between;gap:7px;margin:15px 0 7px}.history-title{font-size:11px;font-weight:700;color:#687b8c}.history-title span{font-weight:500;color:#99a7b3;margin-left:4px}.clear-button{border:0;background:none;padding:3px 0 3px 8px;font-size:10px;font-weight:600;color:#8a99a7}.clear-button:hover{color:#c54e4c}.history{display:flex;flex-wrap:wrap;gap:5px;max-height:94px;overflow:auto;scrollbar-width:thin}.history-chip{display:flex;align-items:center;justify-content:center;border-radius:7px;background:#f0f5f8;color:#748a99;font-size:10px;font-weight:600;padding:5px 8px;min-width:49px}.history-chip:first-child{background:#e1f3ef;color:#117e73}.history-empty{font-size:10px;color:#a1adb7;padding:3px 0 7px}\n.error{font-size:11px;line-height:1.5;color:#c34946;border-radius:8px;background:#fff3f0;padding:8px 10px;margin-top:9px}.toast{position:absolute;right:12px;bottom:62px;z-index:2;pointer-events:none;display:flex;align-items:center;gap:8px;padding:10px 15px;border:1px solid #efd3ce;background:#fff8f5;color:#b74743;box-shadow:0 8px 24px #183b6224;border-radius:12px;font-size:13px;font-weight:700;animation:popup-in .2s ease}.toast svg{width:19px;height:19px}\n@keyframes popup-in{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}\n@keyframes pick-pop{0%{transform:scale(.75);opacity:.4}65%{transform:scale(1.13)}100%{transform:scale(1);opacity:1}}\n@keyframes shuffle-wiggle{0%,100%{transform:translateY(-1px)}50%{transform:translateY(1px)}}\n@keyframes dice-spin{to{transform:rotate(360deg)}}\n@keyframes finish-pulse{50%{box-shadow:0 0 0 6px #d9564621}}\n@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}\n@media(max-height:520px){.popup{max-height:calc(100dvh - 80px)}.clock-ring{width:112px;height:112px}.clock-time{font-size:28px}.body{padding-top:10px}.student-number{font-size:48px}.history{max-height:60px}}\n.dock{z-index:7}.popup{z-index:6}.toast{z-index:8}\n.float-clock{position:absolute;z-index:3;display:grid;grid-template-rows:36px minmax(0,1fr) 36px;width:316px;height:204px;pointer-events:auto;background:#fff;border:1px solid #cbdedc;border-radius:16px;box-shadow:0 14px 45px #163e4b30,0 2px 7px #163e4b15;color:#173e47;overflow:hidden;user-select:none;touch-action:none}\n.float-clock.is-moving{box-shadow:0 19px 55px #163e4b40}\n.float-head{display:flex;align-items:center;gap:7px;padding:4px 8px 4px 12px;background:#f2f7f5;border-bottom:1px solid #e1ebe7;cursor:move;touch-action:none;outline-offset:-3px}\n.float-head:focus-visible{outline:2px solid #68b2a3}\n.float-head .float-handle{width:13px;height:16px;color:#90aba4;flex:none}\n.float-head h3{flex:1;margin:0;color:#42655f;font-size:11px;font-weight:650;line-height:1.3;white-space:nowrap}\n.float-icon{display:grid;place-items:center;flex:none;width:26px;height:26px;padding:0;background:transparent;border:0;border-radius:7px;color:#64827c;cursor:pointer}\n.float-icon:hover{background:#dceae3;color:#1b6358}\n.float-icon svg{width:15px;height:15px}\n.float-face{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0;min-width:0;overflow:hidden;padding:4px 14px 5px;gap:5px}\n.float-time{display:block;font-size:84px;font-weight:700;font-variant-numeric:tabular-nums;font-feature-settings:\"tnum\";line-height:1.06;letter-spacing:-.035em;white-space:nowrap;color:#174a51}\n.float-status{font-size:10px;line-height:1.4;color:#698780;white-space:nowrap}\n.float-progress{width:82%;height:3px;margin-top:1px;border-radius:4px;background:#e2eeea;overflow:hidden;flex:none}\n.float-progress span{display:block;width:100%;height:100%;background:#178879;border-radius:4px}\n.float-actions{display:flex;align-items:center;justify-content:center;gap:7px;padding:3px 13px 7px}\n.float-button{min-height:26px;border:1px solid #d8e6df;border-radius:8px;background:#f8faf9;color:#4d7269;font-size:11px;font-weight:600;line-height:1.3;padding:4px 11px;white-space:nowrap}\n.float-button:hover{background:#edf4f0;border-color:#93baac}\n.float-button.main{border-color:#127968;background:#127968;color:#fff;min-width:85px}\n.float-button.main:hover{background:#0d6657}\n.float-clock.is-finished{border-color:#dcaaa7;background:#fff9f8}\n.float-clock.is-finished .float-time{color:#b44840}\n.float-clock.is-finished .float-status{color:#b44840}\n.float-clock.is-finished .float-progress span{background:#c56255}\n.float-clock.is-finished .float-head{background:#fcf0ed;border-color:#f0ded8}\n.float-edge{position:absolute;z-index:4;touch-action:none}\n.float-edge[data-clock-resize=\"n\"]{left:12px;right:12px;top:0;height:5px;cursor:ns-resize}\n.float-edge[data-clock-resize=\"s\"]{left:12px;right:12px;bottom:0;height:5px;cursor:ns-resize}\n.float-edge[data-clock-resize=\"e\"]{right:0;top:12px;bottom:12px;width:6px;cursor:ew-resize}\n.float-edge[data-clock-resize=\"w\"]{left:0;top:12px;bottom:12px;width:6px;cursor:ew-resize}\n.float-edge[data-clock-resize=\"nw\"],.float-edge[data-clock-resize=\"ne\"],.float-edge[data-clock-resize=\"sw\"],.float-edge[data-clock-resize=\"se\"]{width:13px;height:13px}\n.float-edge[data-clock-resize=\"nw\"]{top:0;left:0;cursor:nwse-resize}\n.float-edge[data-clock-resize=\"ne\"]{top:0;right:0;cursor:nesw-resize}\n.float-edge[data-clock-resize=\"sw\"]{bottom:0;left:0;cursor:nesw-resize}\n.float-edge[data-clock-resize=\"se\"]{bottom:0;right:0;cursor:nwse-resize;background:linear-gradient(135deg,transparent 48%,#9dbbb2 49%,#9dbbb2 55%,transparent 56%,transparent 67%,#9dbbb2 68%,#9dbbb2 73%,transparent 74%)}\n.float-edge:focus-visible{outline:2px solid #329481;outline-offset:-2px}\n\n</style>\n<div class=\"dock\" role=\"group\" aria-label=\"Tiện ích lớp học\">\n  <button type=\"button\" class=\"dock-button\" data-app=\"timer\" data-label=\"Đếm ngược\" aria-label=\"Đếm ngược\" aria-expanded=\"false\" aria-controls=\"timer-panel\"><svg  viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"13\" r=\"8\"/><path d=\"M12 8v5l3 2M9 2h6M12 2v3M18 5l2 2\"/></svg><span id=\"clock-badge\" class=\"timer-badge\" hidden></span></button>\n  <button type=\"button\" class=\"dock-button\" data-app=\"random\" data-label=\"Random STT\" aria-label=\"Random học sinh theo STT\" aria-expanded=\"false\" aria-controls=\"random-panel\"><svg  viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"4\"/><path d=\"M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01\" stroke-width=\"3\"/></svg></button>\n</div>\n<section id=\"timer-panel\" class=\"popup timer-popup\" role=\"dialog\" aria-labelledby=\"timer-title\" hidden>\n <header class=\"head\"><span class=\"head-icon\"><svg  viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"13\" r=\"8\"/><path d=\"M12 8v5l3 2M9 2h6M12 2v3M18 5l2 2\"/></svg></span><h2 id=\"timer-title\">Đếm ngược</h2><button type=\"button\" class=\"icon-button\" data-action=\"close\" aria-label=\"Đóng đếm ngược\" title=\"Đóng (Esc)\"><svg  viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m6 6 12 12M18 6 6 18\"/></svg></button></header>\n <div class=\"body\">\n  <div id=\"clock-ring\" class=\"clock-ring\"><svg viewBox=\"0 0 146 146\" aria-hidden=\"true\"><circle class=\"ring-track\" cx=\"73\" cy=\"73\" r=\"64\"/><circle id=\"clock-progress\" class=\"ring-progress\" cx=\"73\" cy=\"73\" r=\"64\" stroke-dasharray=\"402.13\" stroke-dashoffset=\"0\"/></svg><div class=\"clock-display\"><span id=\"clock-status\" class=\"clock-status\">Sẵn sàng</span><span id=\"clock-time\" class=\"clock-time\" role=\"timer\" aria-label=\"Thời gian còn lại\">01:00</span></div></div>\n  <div class=\"presets\" aria-label=\"Thời gian nhanh\"><button type=\"button\" class=\"preset\" data-seconds=\"30\" aria-pressed=\"false\">30 giây</button><button type=\"button\" class=\"preset\" data-seconds=\"60\" aria-pressed=\"true\">1 phút</button><button type=\"button\" class=\"preset\" data-seconds=\"120\" aria-pressed=\"false\">2 phút</button><button type=\"button\" class=\"preset\" data-seconds=\"300\" aria-pressed=\"false\">5 phút</button></div>\n  <label for=\"clock-seconds\" class=\"field-label\">Số giây</label><div class=\"save-row\"><input id=\"clock-seconds\" class=\"field\" type=\"number\" min=\"1\" max=\"86400\" step=\"1\" value=\"60\" inputmode=\"numeric\" aria-describedby=\"clock-note\"><button type=\"button\" class=\"small-button\" data-action=\"save-time\">Đặt thời gian</button></div>\n  <div id=\"clock-note\" class=\"field-note\" aria-live=\"polite\">Đặt thời gian để mở đồng hồ và bắt đầu đếm.</div>\n  <div class=\"actions\"><button type=\"button\" class=\"primary\" data-action=\"toggle-time\"><svg id=\"clock-play-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m8 5 11 7-11 7z\"/></svg><svg id=\"clock-pause-icon\" hidden viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M9 5v14M15 5v14\" stroke-width=\"3\"/></svg><span id=\"clock-toggle-text\">Bắt đầu</span></button><button type=\"button\" class=\"secondary\" data-action=\"reset-time\"><svg  viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 11a9 9 0 1 1 3 8M3 4v7h7\"/></svg>Đặt lại</button></div>\n  <div class=\"sound-row\"><label class=\"check-label\"><input id=\"clock-sound\" type=\"checkbox\" checked>Âm báo</label></div>\n  <div id=\"timer-error\" class=\"error\" role=\"status\" hidden></div>\n </div>\n</section>\n<section id=\"random-panel\" class=\"popup random-popup\" role=\"dialog\" aria-labelledby=\"random-title\" hidden>\n <header class=\"head\"><span class=\"head-icon\"><svg  viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"4\"/><path d=\"M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01\" stroke-width=\"3\"/></svg></span><h2 id=\"random-title\">Random học sinh</h2><button type=\"button\" class=\"icon-button\" data-action=\"close\" aria-label=\"Đóng random học sinh\" title=\"Đóng (Esc)\"><svg  viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m6 6 12 12M18 6 6 18\"/></svg></button></header>\n <div class=\"body\">\n  <div class=\"range-row\"><label><span class=\"field-label\">Từ STT</span><input id=\"random-from\" class=\"field\" type=\"number\" min=\"1\" max=\"9999\" step=\"1\" value=\"1\" inputmode=\"numeric\"></label><label><span class=\"field-label\">Đến STT</span><input id=\"random-to\" class=\"field\" type=\"number\" min=\"1\" max=\"9999\" step=\"1\" value=\"45\" inputmode=\"numeric\"></label></div>\n  <div class=\"unique-row\"><label class=\"check-label\"><input id=\"random-unique\" type=\"checkbox\">Không lặp STT</label></div>\n  <div id=\"student\" class=\"student\"><div class=\"student-label\">STT</div><div id=\"student-number\" class=\"student-number\" aria-live=\"polite\">—</div><div id=\"student-caption\" class=\"student-caption\">Bấm nút để chọn một học sinh</div></div>\n  <button id=\"random-pick\" type=\"button\" class=\"primary random-primary\" data-action=\"pick-student\"><svg  viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"4\"/><path d=\"M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01\" stroke-width=\"3\"/></svg><span id=\"random-pick-text\">Chọn học sinh</span></button>\n  <div id=\"random-error\" class=\"error\" role=\"status\" hidden></div>\n  <div class=\"history-head\"><div class=\"history-title\">Lịch sử<span id=\"history-count\"></span></div><button id=\"random-clear\" type=\"button\" class=\"clear-button\" data-action=\"clear-history\" title=\"Xóa lịch sử và bắt đầu lượt mới\" disabled>Xóa lịch sử</button></div>\n  <div id=\"random-history\" class=\"history\" aria-label=\"Lịch sử STT đã chọn\"><span class=\"history-empty\">Chưa có lượt chọn.</span></div>\n </div>\n</section>\n<section id=\"floating-clock\" class=\"float-clock\" role=\"region\" aria-labelledby=\"floating-clock-title\" hidden>\n <header id=\"floating-clock-head\" class=\"float-head\" tabindex=\"0\" title=\"Kéo thanh này để di chuyển đồng hồ\" aria-label=\"Di chuyển đồng hồ bằng cách kéo hoặc dùng phím mũi tên\">\n  <svg class=\"float-handle\" viewBox=\"0 0 12 16\" fill=\"currentColor\" aria-hidden=\"true\"><circle cx=\"3\" cy=\"3\" r=\"1\"/><circle cx=\"9\" cy=\"3\" r=\"1\"/><circle cx=\"3\" cy=\"8\" r=\"1\"/><circle cx=\"9\" cy=\"8\" r=\"1\"/><circle cx=\"3\" cy=\"13\" r=\"1\"/><circle cx=\"9\" cy=\"13\" r=\"1\"/></svg>\n  <h3 id=\"floating-clock-title\">Đếm ngược</h3>\n  <button type=\"button\" class=\"float-icon\" data-action=\"float-settings\" title=\"Đặt thời gian\" aria-label=\"Đặt thời gian\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m9 3-.7 2.3-2 .9L4 5.7 2 9l1.6 1.8v2.4L2 15l2 3.3 2.3-.5 2 .9L9 21h6l.7-2.3 2-.9 2.3.5 2-3.3-1.6-1.8v-2.4L22 9l-2-3.3-2.3.5-2-.9L15 3Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg></button>\n  <button type=\"button\" class=\"float-icon\" data-action=\"float-close\" title=\"Ẩn đồng hồ\" aria-label=\"Ẩn đồng hồ\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"m6 6 12 12M18 6 6 18\"/></svg></button>\n </header>\n <div class=\"float-face\"><span id=\"floating-clock-time\" class=\"float-time\" role=\"timer\" aria-label=\"Thời gian còn lại\">01:00</span><span id=\"floating-clock-status\" class=\"float-status\" role=\"status\" aria-live=\"polite\">Sẵn sàng</span><span class=\"float-progress\" aria-hidden=\"true\"><span id=\"floating-clock-progress\"></span></span></div>\n <footer class=\"float-actions\"><button type=\"button\" id=\"floating-clock-toggle\" class=\"float-button main\" data-action=\"float-toggle\">Tạm dừng</button><button type=\"button\" class=\"float-button\" data-action=\"float-reset\">Đặt lại</button></footer>\n <span class=\"float-edge\" data-clock-resize=\"n\" aria-hidden=\"true\"></span><span class=\"float-edge\" data-clock-resize=\"e\" aria-hidden=\"true\"></span><span class=\"float-edge\" data-clock-resize=\"s\" aria-hidden=\"true\"></span><span class=\"float-edge\" data-clock-resize=\"w\" aria-hidden=\"true\"></span><span class=\"float-edge\" data-clock-resize=\"nw\" aria-hidden=\"true\"></span><span class=\"float-edge\" data-clock-resize=\"ne\" aria-hidden=\"true\"></span><span class=\"float-edge\" data-clock-resize=\"sw\" aria-hidden=\"true\"></span><span class=\"float-edge\" data-clock-resize=\"se\" tabindex=\"0\" role=\"button\" aria-label=\"Thay đổi kích thước đồng hồ bằng cách kéo hoặc dùng phím mũi tên\" title=\"Kéo để đổi kích thước\"></span>\n</section>\n\n<div id=\"mini-toast\" class=\"toast\" role=\"status\" hidden><svg  viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"13\" r=\"8\"/><path d=\"M12 8v5l3 2M9 2h6M12 2v3M18 5l2 2\"/></svg>Hết giờ!</div>";
  var query = function (selector) { return root.querySelector(selector); };
  var pick = function (size) {
    if (window.crypto && window.crypto.getRandomValues) {
      var bucket = new Uint32Array(1), limit = Math.floor(4294967296 / size) * size;
      do { window.crypto.getRandomValues(bucket); } while (bucket[0] >= limit);
      return bucket[0] % size;
    }
    return Math.floor(Math.random() * size);
  };
  var storage;
  try { storage = window.localStorage; } catch (_) { storage = { getItem: function () { return null; }, setItem: function () { throw new Error("Storage unavailable"); } }; }
  var model = makeThdMiniModel({ storage: storage, now: Date.now, pick: pick });
  var active = "", busy = false, shuffleTimer = 0, revealTimer = 0, toastTimer = 0, popTimer = 0;
  var audio = null, destroyed = false;
  var secondsInput = query("#clock-seconds"), rangeFrom = query("#random-from"), rangeTo = query("#random-to");
  var timerButton = query('[data-app="timer"]'), randomButton = query('[data-app="random"]');
  secondsInput.value = String(model.state.timer.seconds);
  rangeFrom.value = String(model.state.draw.from); rangeTo.value = String(model.state.draw.to);
  query("#random-unique").checked = model.state.draw.unique;
  query("#clock-sound").checked = model.state.timer.sound;
  function error(app, message) {
    var el = query("#" + app + "-error");
    el.textContent = message || ""; el.hidden = !message;
  }
  function formatTime(remaining) {
    var total = Math.max(0, Math.ceil(remaining / 1000)), minutes = Math.floor(total / 60), seconds = total % 60;
    if (minutes >= 60) return Math.floor(minutes / 60) + ":" + String(minutes % 60).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }
  var floatClock = query("#floating-clock"), floatHead = query("#floating-clock-head");
  var clockFrame = { x: null, y: null, w: 316, h: 204 }, clockGesture = null;
  var CLOCK_FRAME_KEY = "thd_classroom_clock_window_v1";
  try {
    var storedFrame = JSON.parse(storage.getItem(CLOCK_FRAME_KEY) || "null");
    if (storedFrame && typeof storedFrame === "object") {
      ["x", "y", "w", "h"].forEach(function (key) {
        if (Number.isFinite(storedFrame[key])) clockFrame[key] = storedFrame[key];
      });
    }
  } catch (_) {}
  function clockViewport() {
    return { w: Math.max(24, window.innerWidth || document.documentElement.clientWidth || 1024),
      h: Math.max(24, window.innerHeight || document.documentElement.clientHeight || 768) };
  }
  function bound(value, low, high) { return Math.min(high, Math.max(low, value)); }
  function clampClockFrame(frame) {
    var view = clockViewport(), maxW = view.w - 12, maxH = view.h - 12;
    var w = bound(frame.w, Math.min(220, maxW), maxW), h = bound(frame.h, Math.min(150, maxH), maxH);
    return { x: bound(Number.isFinite(frame.x) ? frame.x : view.w - w - 20, 6, view.w - w - 6),
      y: bound(Number.isFinite(frame.y) ? frame.y : 72, 6, view.h - h - 6), w: w, h: h };
  }
  function rememberClockFrame() {
    try { storage.setItem(CLOCK_FRAME_KEY, JSON.stringify(clockFrame)); } catch (_) {}
  }
  function fitClockDigits() {
    var text = query("#floating-clock-time").textContent || "00:00";
    var size = Math.floor(Math.min((clockFrame.w - 34) / (Math.max(5, text.length) * .64), (clockFrame.h - 109) / 1.14));
    query("#floating-clock-time").style.fontSize = Math.max(16, size) + "px";
  }
  function placeClock(frame) {
    clockFrame = clampClockFrame(frame);
    floatClock.style.left = clockFrame.x + "px"; floatClock.style.top = clockFrame.y + "px";
    floatClock.style.width = clockFrame.w + "px"; floatClock.style.height = clockFrame.h + "px";
    fitClockDigits();
  }
  function renderFloatingClock(timer, text) {
    var status = timer.running ? "Đang đếm" : timer.finished ? "Hết giờ" : timer.paused ? "Tạm dừng" : "Sẵn sàng";
    if (query("#floating-clock-time").textContent !== text) query("#floating-clock-time").textContent = text;
    if (query("#floating-clock-status").textContent !== status) query("#floating-clock-status").textContent = status;
    query("#floating-clock-progress").style.width = (100 * Math.max(0, Math.min(1, timer.remaining / (timer.seconds * 1000)))) + "%";
    query("#floating-clock-toggle").textContent = timer.running ? "Tạm dừng" : timer.paused ? "Tiếp tục" : timer.finished ? "Đếm lại" : "Bắt đầu";
    floatClock.classList.toggle("is-finished", timer.finished);
    timerButton.setAttribute("aria-expanded", String(active === "timer" || !floatClock.hidden));
    fitClockDigits();
  }
  function showFloatingClock(focus) {
    if (active === "timer") close();
    placeClock(clockFrame); floatClock.hidden = false; renderClock();
    if (focus) floatHead.focus({ preventScroll: true });
  }
  function hideFloatingClock() {
    finishClockGesture(); floatClock.hidden = true; renderClock();
    timerButton.focus({ preventScroll: true });
  }
  function launchClock(value) {
    error("timer", "");
    try {
      model.setSeconds(value); unlockSound(); model.start(model.state.timer.seconds);
      secondsInput.value = String(model.state.timer.seconds);
      query("#mini-toast").hidden = true;
      showFloatingClock(true);
    } catch (e) { error("timer", e.message); }
  }
  function beginClockGesture(event) {
    var target = event.target.closest("[data-clock-resize]");
    if ((!target && !floatHead.contains(event.target)) || event.target.closest("button") || event.button !== 0 || event.isPrimary === false) return;
    placeClock(clockFrame);
    clockGesture = { id: event.pointerId, target: target || floatHead,
      mode: target ? target.dataset.clockResize : "move", x: event.clientX, y: event.clientY,
      frame: { x: clockFrame.x, y: clockFrame.y, w: clockFrame.w, h: clockFrame.h } };
    try { clockGesture.target.setPointerCapture(event.pointerId); } catch (_) {}
    floatClock.classList.add("is-moving");
    event.preventDefault(); event.stopPropagation();
  }
  function moveClockGesture(event) {
    if (!clockGesture || event.pointerId !== clockGesture.id) return;
    var g = clockGesture, f = g.frame, view = clockViewport(), dx = event.clientX - g.x, dy = event.clientY - g.y;
    var next = { x: f.x, y: f.y, w: f.w, h: f.h };
    if (g.mode === "move") { next.x += dx; next.y += dy; }
    else {
      var minW = Math.min(220, view.w - 12), minH = Math.min(150, view.h - 12);
      if (g.mode.indexOf("w") >= 0) { next.x = bound(f.x + dx, 6, f.x + f.w - minW); next.w = f.x + f.w - next.x; }
      if (g.mode.indexOf("e") >= 0) next.w = bound(f.w + dx, minW, view.w - f.x - 6);
      if (g.mode.indexOf("n") >= 0) { next.y = bound(f.y + dy, 6, f.y + f.h - minH); next.h = f.y + f.h - next.y; }
      if (g.mode.indexOf("s") >= 0) next.h = bound(f.h + dy, minH, view.h - f.y - 6);
    }
    placeClock(next); event.preventDefault(); event.stopPropagation();
  }
  function finishClockGesture(event) {
    if (!clockGesture || (event && event.pointerId !== clockGesture.id)) return;
    var previous = clockGesture; clockGesture = null;
    try { previous.target.releasePointerCapture(previous.id); } catch (_) {}
    floatClock.classList.remove("is-moving"); rememberClockFrame();
  }
  function onClockViewportChange() {
    finishClockGesture(); placeClock(clockFrame); rememberClockFrame();
  }
  function onFloatingClockKey(event) {
    if (floatClock.hidden) return;
    var target = event.composedPath ? event.composedPath()[0] : event.target;
    if (!target || !target.closest) return;
    var grip = target.closest("[data-clock-resize]");
    if (target !== floatHead && !grip) return;
    if (!/^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown)$/.test(event.key)) return;
    var step = event.shiftKey ? 4 : 20, next = { x: clockFrame.x, y: clockFrame.y, w: clockFrame.w, h: clockFrame.h };
    var horizontal = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    var vertical = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    if (grip) { next.w += horizontal; next.h += vertical; }
    else { next.x += horizontal; next.y += vertical; }
    placeClock(next); rememberClockFrame(); event.preventDefault(); event.stopPropagation();
  }
  floatClock.addEventListener("pointerdown", beginClockGesture);
  window.addEventListener("keydown", onFloatingClockKey, true);
  window.addEventListener("pointermove", moveClockGesture, true);
  window.addEventListener("pointerup", finishClockGesture, true);
  window.addEventListener("pointercancel", finishClockGesture, true);
  window.addEventListener("resize", onClockViewportChange);
  document.addEventListener("fullscreenchange", onClockViewportChange);

  function renderClock() {
    var timer = model.state.timer, text = formatTime(timer.remaining);
    renderFloatingClock(timer, text);
    query("#clock-time").textContent = text;
    query("#clock-time").classList.toggle("long-time", text.length > 5);
    query("#clock-status").textContent = timer.running ? "Đang đếm" : timer.finished ? "Hết giờ" : timer.paused ? "Tạm dừng" : "Sẵn sàng";
    query("#clock-ring").classList.toggle("is-finished", timer.finished);
    query("#clock-progress").style.strokeDashoffset = String(402.13 * (1 - Math.max(0, Math.min(1, timer.remaining / (timer.seconds * 1000)))));
    query("#clock-toggle-text").textContent = timer.running ? "Tạm dừng" : timer.paused ? "Tiếp tục" : "Bắt đầu";
    query("#clock-play-icon").toggleAttribute("hidden", timer.running);
    query("#clock-pause-icon").toggleAttribute("hidden", !timer.running);
    timerButton.classList.toggle("has-timer", timer.running || timer.paused || timer.finished);
    timerButton.classList.toggle("timer-done", timer.finished);
    query("#clock-badge").hidden = !(timer.running || timer.paused || timer.finished);
    query("#clock-badge").textContent = text.length > 5 ? Math.ceil(timer.remaining / 60000) + "p" : text;
    timerButton.setAttribute("aria-label", "Đếm ngược" + (timer.running ? ", còn " + text : timer.finished ? ", hết giờ" : ""));
    Array.from(root.querySelectorAll("[data-seconds]")).forEach(function (button) {
      button.setAttribute("aria-pressed", String(Number(button.dataset.seconds) === timer.seconds));
    });
  }
  function renderHistory() {
    var history = model.state.draw.history;
    query("#history-count").textContent = history.length ? "(" + history.length + ")" : "";
    query("#random-clear").disabled = !history.length;
    query("#random-history").innerHTML = history.length ? history.map(function (entry) {
      var time = new Date(entry.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      return '<span class="history-chip" title="' + time + '">STT ' + entry.value + '</span>';
    }).join("") : '<span class="history-empty">Chưa có lượt chọn.</span>';
  }
  function renderResult() {
    var entry = model.state.draw.history[0];
    query("#student-number").textContent = entry ? String(entry.value) : "—";
    query("#student-caption").textContent = entry ? "Học sinh được chọn" : "Bấm nút để chọn một học sinh";
    renderHistory();
  }
  function cancelShuffle() {
    clearInterval(shuffleTimer); clearTimeout(revealTimer); clearTimeout(popTimer);
    busy = false;
    query("#student").classList.remove("is-shuffling", "is-picked");
    query("#random-pick").classList.remove("is-shuffling");
    query("#random-pick").disabled = false;
    query("#random-pick-text").textContent = "Chọn học sinh";
  }
  function close() {
    var last = active;
    active = ""; cancelShuffle();
    query("#timer-panel").hidden = true; query("#random-panel").hidden = true;
    timerButton.setAttribute("aria-expanded", String(!floatClock.hidden)); randomButton.setAttribute("aria-expanded", "false");
    if (last) query('[data-app="' + last + '"]').focus({ preventScroll: true });
  }
  function toggle(app, settings) {
    if (app === "timer" && !settings && active !== "timer" && (model.state.timer.running || model.state.timer.paused || model.state.timer.finished)) {
      showFloatingClock(true); return;
    }
    if (active === app) { close(); return; }
    cancelShuffle(); active = app;
    query("#timer-panel").hidden = app !== "timer"; query("#random-panel").hidden = app !== "random";
    timerButton.setAttribute("aria-expanded", String(app === "timer" || !floatClock.hidden)); randomButton.setAttribute("aria-expanded", String(app === "random"));
    error("timer", ""); error("random", ""); renderClock(); renderResult();
    var focusTarget = app === "timer" ? secondsInput : rangeTo;
    focusTarget.focus({ preventScroll: true });
  }
  function unlockSound() {
    if (!model.state.timer.sound) return;
    try {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext && !audio) audio = new AudioContext();
      if (audio && audio.state === "suspended") audio.resume().catch(function () {});
    } catch (_) {}
  }
  function chime() {
    if (!audio || !model.state.timer.sound) return;
    try {
      var oscillator = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime;
      oscillator.type = "sine"; oscillator.frequency.setValueAtTime(880, t);
      oscillator.frequency.setValueAtTime(1174.66, t + 0.12);
      gain.gain.setValueAtTime(0.001, t); gain.gain.linearRampToValueAtTime(0.055, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(t); oscillator.stop(t + 0.36);
    } catch (_) {}
  }
  function saveSeconds(value) {
    error("timer", "");
    try {
      var stored = model.setSeconds(value);
      secondsInput.value = String(model.state.timer.seconds);
      query("#clock-note").textContent = stored ? "Đã lưu " + model.state.timer.seconds + " giây cho lần dùng sau." : "Đã đặt thời gian; trình duyệt chưa cho lưu lâu dài.";
      query("#clock-note").classList.toggle("saved", stored);
      query("#mini-toast").hidden = true; renderClock();
    } catch (e) { error("timer", e.message); }
  }
  function chooseStudent() {
    if (busy) return;
    error("random", "");
    try {
      var result = model.draw(rangeFrom.value, rangeTo.value, query("#random-unique").checked);
      var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var finish = function () {
        cancelShuffle(); renderResult();
        query("#student").classList.add("is-picked");
        query("#student-number").textContent = String(result);
        popTimer = setTimeout(function () { query("#student").classList.remove("is-picked"); }, 450);
      };
      if (reduceMotion) { finish(); return; }
      busy = true;
      query("#student").classList.add("is-shuffling"); query("#random-pick").classList.add("is-shuffling");
      query("#random-pick").disabled = true; query("#random-pick-text").textContent = "Đang chọn…";
      query("#student-caption").textContent = "Đang chọn…";
      shuffleTimer = setInterval(function () {
        query("#student-number").textContent = String(model.state.draw.from + pick(model.state.draw.to - model.state.draw.from + 1));
      }, 75);
      revealTimer = setTimeout(finish, 650);
    } catch (e) { error("random", e.message); }
  }
  function onOutside(event) {
    var path = event.composedPath ? event.composedPath() : [];
    if (active && !path.includes(host)) close();
  }
  function onKey(event) {
    var path = event.composedPath ? event.composedPath() : [];
    if (!active && event.key === "Escape" && !floatClock.hidden && path.includes(floatClock)) {
      event.preventDefault(); event.stopImmediatePropagation(); hideFloatingClock(); return;
    }
    if (!active) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); close(); return; }
    if (path.includes(host) && /^(ArrowLeft|ArrowRight|\+|=|-|f|F)$/.test(event.key)) event.stopPropagation();
  }
  root.addEventListener("click", function (event) {
    var target = event.target.closest("[data-app],[data-action],[data-seconds]");
    if (!target) return;
    if (target.dataset.app) { toggle(target.dataset.app); return; }
    if (target.dataset.seconds) { saveSeconds(target.dataset.seconds); return; }
    var action = target.dataset.action;
    if (action === "close") close();
    else if (action === "save-time") launchClock(secondsInput.value);
    else if (action === "float-close") hideFloatingClock();
    else if (action === "float-settings") toggle("timer", true);
    else if (action === "float-reset") launchClock(model.state.timer.seconds);
    else if (action === "float-toggle") {
      if (model.state.timer.running) model.pause();
      else { unlockSound(); model.start(model.state.timer.seconds); }
      query("#mini-toast").hidden = true; renderClock();
    }
    else if (action === "reset-time") saveSeconds(model.state.timer.seconds);
    else if (action === "toggle-time") {
      error("timer", "");
      try {
        if (model.state.timer.running) model.pause();
        else { unlockSound(); model.start(secondsInput.value); secondsInput.value = String(model.state.timer.seconds); showFloatingClock(true); }
        query("#mini-toast").hidden = true; renderClock();
      } catch (e) { error("timer", e.message); }
    } else if (action === "pick-student") chooseStudent();
    else if (action === "clear-history") { cancelShuffle(); model.clearHistory(); renderResult(); error("random", ""); }
  });
  query("#clock-sound").addEventListener("change", function () { model.setSound(this.checked); if (this.checked) unlockSound(); });
  query("#random-unique").addEventListener("change", function () {
    try { model.setRange(rangeFrom.value, rangeTo.value, this.checked); error("random", ""); } catch (e) { error("random", e.message); }
  });
  [rangeFrom, rangeTo].forEach(function (input) {
    input.addEventListener("change", function () {
      try { model.setRange(rangeFrom.value, rangeTo.value, query("#random-unique").checked); error("random", ""); } catch (e) { error("random", e.message); }
    });
  });
  secondsInput.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); launchClock(this.value); } });
  [rangeFrom, rangeTo].forEach(function (input) {
    input.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); chooseStudent(); } });
  });
  window.addEventListener("pointerdown", onOutside, true);
  window.addEventListener("keydown", onKey, true);
  function destroy() {
    if (destroyed) return;
    destroyed = true; clearInterval(clockTimer); cancelShuffle(); clearTimeout(toastTimer);
    finishClockGesture();
    window.removeEventListener("pointermove", moveClockGesture, true);
    window.removeEventListener("pointerup", finishClockGesture, true);
    window.removeEventListener("pointercancel", finishClockGesture, true);
    window.removeEventListener("keydown", onFloatingClockKey, true);
    window.removeEventListener("resize", onClockViewportChange);
    document.removeEventListener("fullscreenchange", onClockViewportChange);
    window.removeEventListener("pointerdown", onOutside, true); window.removeEventListener("keydown", onKey, true);
    if (audio && audio.close) audio.close().catch(function () {});
  }
  var clockTimer = setInterval(function () {
    if (!host.isConnected) { destroy(); return; }
    if (model.tick()) {
      chime(); query("#mini-toast").hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(function () { query("#mini-toast").hidden = true; }, 3500);
    }
    renderClock();
  }, 400);
  window.__THD_MINI_APPS = { host: host, toggle: toggle, close: close, destroy: destroy, model: model };
  renderClock(); renderResult();
  if (model.state.timer.running || model.state.timer.paused) showFloatingClock(false);
  if (which) toggle(which);
})
("");
