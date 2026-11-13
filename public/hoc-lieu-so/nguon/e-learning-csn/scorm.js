(function () {
  "use strict";
  let api = null;
  let initialized = false;

  function findApi(win) {
    let attempts = 0;
    while (win && attempts < 12) {
      try {
        if (win.API) return win.API;
        if (win.parent && win.parent !== win) win = win.parent;
        else break;
      } catch (_) { break; }
      attempts += 1;
    }
    try {
      return window.opener && window.opener.API ? window.opener.API : null;
    } catch (_) { return null; }
  }
  function call(method, ...args) {
    if (!api || typeof api[method] !== "function") return "";
    try { return api[method](...args); } catch (_) { return ""; }
  }
  function init() {
    api = findApi(window);
    if (!api) return false;
    initialized = call("LMSInitialize", "") === "true";
    if (initialized) {
      const status = call("LMSGetValue", "cmi.core.lesson_status");
      if (!status || status === "not attempted") {
        call("LMSSetValue", "cmi.core.lesson_status", "incomplete");
        call("LMSCommit", "");
      }
    }
    return initialized;
  }
  function save(state) {
    if (!initialized) return false;
    call("LMSSetValue", "cmi.core.lesson_location", String(state.slide));
    call("LMSSetValue", "cmi.core.score.min", "0");
    call("LMSSetValue", "cmi.core.score.max", "100");
    call("LMSSetValue", "cmi.core.score.raw", String(state.score));
    call("LMSSetValue", "cmi.suspend_data", JSON.stringify({
      slide: state.slide, visited: state.visited, quiz: state.quiz,
      audioDone: state.audioDone, settings: state.settings
    }).slice(0, 3900));
    call("LMSSetValue", "cmi.core.lesson_status",
      state.completed ? (state.score >= window.COURSE_CONFIG.passingScore ? "passed" : "failed") : "incomplete");
    call("LMSCommit", "");
    return true;
  }
  function restore() {
    if (!initialized) return null;
    try {
      const raw = call("LMSGetValue", "cmi.suspend_data");
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }
  function finish() {
    if (!initialized) return;
    call("LMSCommit", "");
    call("LMSFinish", "");
    initialized = false;
  }
  window.ScormBridge = { init, save, restore, finish, isConnected: () => initialized };
})();
