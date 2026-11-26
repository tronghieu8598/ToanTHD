'use strict';

const $ = id => document.getElementById(id);
const parentOrigin = window.location.origin;
const notify = type => parent.postMessage({type}, parentOrigin);
const layer = $('modal-layer');
const figure = $('figure-layer');
const board = $('q-body');
const inkPage = {id: 'session', name: 'Chữa bài', ink: Object.create(null)};
const state = {
  session: null, index: 0, font: 24, presenting: false, key: false, solution: false,
  stats: false, chosen: null, figureScale: 1, figureTrigger: null,
};
const current = () => state.session?.questions[state.index];
const ink = createThdInk({
  store: {COLORS: ['#d74a42', '#247aab', '#167466'], active: () => inkPage, save() {}},
  getContext: () => current()?.id,
  getSurface: () => figure.hidden ? 'question' : 'figure',
});

function settings(open) {
  $('q-settings').hidden = !open;
  $('q-more').classList.toggle('active', open);
  $('q-more').setAttribute('aria-expanded', String(open));
  (open ? $('q-jump') : $('q-more')).focus({preventScroll: true});
}

function setFont(size) {
  state.font = Math.min(56, Math.max(16, size));
  document.documentElement.style.setProperty('--question-font', state.font + 'px');
  $('q-font-label').textContent = state.font + 'px';
  ink.redraw();
}

function present() {
  if (!$('q-settings').hidden) settings(false);
  state.presenting = !state.presenting;
  layer.classList.toggle('is-presenting', state.presenting);
  $('q-present').classList.toggle('active', state.presenting);
  $('q-present').setAttribute('aria-pressed', String(state.presenting));
  $('q-present').setAttribute('aria-label', state.presenting ? 'Thu gọn khung trình chiếu' : 'Phóng toàn khung trình chiếu');
  ink.redraw();
}

function bindFigures(root, prefix) {
  for (const [index, image] of [...root.querySelectorAll('img')].entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'figure-button';
    button.dataset.figure = prefix + '-' + index;
    button.setAttribute('aria-label', 'Phóng to hình minh họa');
    image.replaceWith(button);
    button.append(image);
    button.addEventListener('click', event => {
      event.stopPropagation();
      openFigure(button, image);
    });
  }
}

function openFigure(trigger, image) {
  state.figureTrigger = trigger;
  state.figureScale = 1;
  const zoomed = $('figure-image');
  zoomed.dataset.inkAsset = trigger.dataset.figure;
  zoomed.src = image.src;
  figure.hidden = false;
  layer.inert = true;
  $('figure-close').focus({preventScroll: true});
  sizeFigure();
  ink.mount();
}

function sizeFigure() {
  const image = $('figure-image');
  const viewport = $('figure-viewport');
  if (figure.hidden || !image.naturalWidth || !image.naturalHeight) return;
  const width = Math.max(20, Math.min(viewport.clientWidth - 40, (viewport.clientHeight - 40) * image.naturalWidth / image.naturalHeight));
  image.style.width = Math.round(width * state.figureScale) + 'px';
  $('figure-scale').textContent = Math.round(state.figureScale * 100) + '%';
  ink.redraw();
}

function closeFigure() {
  if (figure.hidden) return;
  figure.hidden = true;
  layer.inert = false;
  state.figureTrigger?.focus({preventScroll: true});
  ink.mount();
}

function setControl(id, active, disabled, aria) {
  const button = $(id);
  button.classList.toggle('active', active);
  button.disabled = disabled;
  button.setAttribute(aria, String(active));
}

function renderDistribution() {
  const section = $('distribution');
  const stat = current()?.stat;
  section.replaceChildren();
  if (!state.stats || !stat) return;
  const title = document.createElement('h3');
  title.textContent = 'Thống kê câu này';
  const summary = document.createElement('p');
  summary.textContent = stat.total
    ? stat.total + ' bài đã nộp · ' + stat.full + ' trọn câu · ' + stat.partial + ' đúng một phần · ' + stat.wrong + ' sai · ' + stat.blank + ' bỏ trống'
    : 'Chưa có bài nộp để phân tích.';
  section.append(title, summary);
  if (!stat.total || !stat.rows.length) return;
  const list = document.createElement('ul');
  for (const row of stat.rows) {
    const li = document.createElement('li');
    li.textContent = row.label + ' · ' + row.detail;
    const bar = document.createElement('progress');
    bar.max = stat.total;
    bar.value = row.count;
    bar.setAttribute('aria-label', row.label);
    li.append(bar);
    list.append(li);
  }
  section.append(list);
}

function updateReveals() {
  const q = current();
  const closed = state.session.closed;
  const key = closed && state.key && q.answer != null;
  const solution = closed && state.solution;
  const stats = closed && state.stats;
  $('q-locked').hidden = closed;
  setControl('q-publish', key, !closed || q.answer == null, 'aria-pressed');
  $('q-publish-label').textContent = key ? 'Ẩn đáp án' : 'Công bố đáp án';
  $('q-publish').setAttribute('aria-label', $('q-publish-label').textContent);
  setControl('q-reveal', solution, !closed, 'aria-expanded');
  $('q-reveal-label').textContent = solution ? 'Ẩn lời giải' : 'Xem lời giải';
  $('q-reveal').setAttribute('aria-label', $('q-reveal-label').textContent);
  setControl('q-distribution', stats, !closed, 'aria-expanded');
  $('feedback').hidden = !key;
  $('feedback').className = 'feedback correct';
  $('feedback').textContent = key ? 'Đáp án ' + q.answerText : '';
  $('solution-section').hidden = !solution;
  board.classList.toggle('showing-solution', solution);
  $('distribution').hidden = !stats;
  for (const choice of $('answer-controls').querySelectorAll('[data-choice]')) {
    choice.classList.toggle('chosen', Number(choice.dataset.choice) === state.chosen);
    choice.classList.toggle('correct', key && q.answer === choice.dataset.key);
  }
  for (const label of $('answer-controls').querySelectorAll('[data-tf]')) {
    label.hidden = !key;
    label.textContent = key ? q.answer[Number(label.dataset.tf)] ? 'Đúng' : 'Sai' : '';
  }
  renderDistribution();
  ink.redraw();
}

function renderQuestion() {
  const q = current();
  const total = state.session.questions.length;
  $('q-title').textContent = 'Câu ' + q.number;
  $('q-count').textContent = (state.index + 1) + ' / ' + total;
  $('q-topic').textContent = q.topic;
  $('q-type').textContent = q.kindLabel;
  $('q-prev').disabled = state.index === 0;
  $('q-next').disabled = state.index === total - 1;
  $('q-jump').value = String(state.index);
  $('q-stem').innerHTML = q.stem;
  bindFigures($('q-stem'), 'stem');
  const controls = $('answer-controls');
  controls.replaceChildren();
  if (q.options.length) {
    const grid = document.createElement('div');
    grid.className = q.kind === 'tf' ? 'tf-list' : 'answer-options';
    for (const [index, option] of q.options.entries()) {
      const row = document.createElement('div');
      const letter = document.createElement('span');
      const content = document.createElement('div');
      row.className = q.kind === 'tf' ? 'tf-row' : 'answer-option';
      letter.className = 'option-letter';
      letter.textContent = option.key + '.';
      content.className = 'option-content tex-content';
      content.innerHTML = option.html;
      bindFigures(content, 'option-' + index);
      row.append(letter, content);
      if (q.kind === 'mcq') {
        row.dataset.choice = String(index);
        row.dataset.key = option.key;
        row.tabIndex = 0;
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', 'Phương án ' + option.key);
        row.addEventListener('click', () => {
          state.chosen = state.chosen === index ? null : index;
          updateReveals();
        });
        row.addEventListener('keydown', event => {
          if (event.target === row && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            row.click();
          }
        });
      } else {
        const label = document.createElement('span');
        label.className = 'session-tf-label';
        label.dataset.tf = String(index);
        label.hidden = true;
        row.append(label);
      }
      grid.append(row);
    }
    controls.append(grid);
  }
  $('review-note').hidden = !q.note;
  $('review-note').textContent = q.note || '';
  $('q-solution').innerHTML = q.solution || '';
  if (state.session.closed && !q.solution) $('q-solution').textContent = 'Tài liệu chưa có lời giải.';
  bindFigures($('q-solution'), 'solution');
  updateReveals();
  board.scrollTop = 0;
  $('question-pane').scrollTop = 0;
  $('solution-scroll').scrollTop = 0;
  ink.mount();
}

function goTo(index) {
  if (index < 0 || index >= state.session.questions.length || index === state.index) return;
  state.index = index;
  state.key = state.solution = state.stats = false;
  state.chosen = null;
  if (!$('q-settings').hidden) settings(false);
  renderQuestion();
  board.focus({preventScroll: true});
}

function showSection(flag, section) {
  if (!state.session.closed) return;
  state[flag] = !state[flag];
  updateReveals();
  if (state[flag] && section) section.scrollIntoView({block: 'nearest', behavior: 'auto'});
}

function setSession(session) {
  const previous = state.session;
  const initial = !previous || previous.id !== session.id;
  state.session = session;
  if (initial) {
    state.index = 0;
    inkPage.name = session.label;
    $('q-jump').replaceChildren(...session.questions.map((q, i) => new Option((i + 1) + ' · Câu ' + q.number, String(i))));
  }
  if (!session.questions.length) {
    $('projection-status').textContent = 'Phiên này chưa có câu hỏi để trình chiếu.';
    return;
  }
  $('projection-status').hidden = true;
  layer.hidden = false;
  if (initial || previous.closed !== session.closed) {
    state.key = state.solution = state.stats = false;
    renderQuestion();
    if (initial) {
      setFont(state.font);
      board.focus({preventScroll: true});
      notify('thd:loaded');
    }
  } else if (state.stats) {
    renderDistribution();
    ink.redraw();
  }
}

let received = 0;
window.addEventListener('message', async event => {
  if (event.source !== parent || event.origin !== parentOrigin || event.data?.type !== 'thd:session' || !(event.data.payload instanceof ArrayBuffer)) return;
  const request = ++received;
  try {
    const stream = new Blob([event.data.payload]).stream().pipeThrough(new DecompressionStream('gzip'));
    const session = JSON.parse(await new Response(stream).text());
    if (request === received) setSession(session);
  } catch (error) {
    console.error(error);
    if (request === received && !state.session) $('projection-status').textContent = 'Không mở được dữ liệu trình chiếu.';
  }
});

$('q-prev').onclick = () => goTo(state.index - 1);
$('q-next').onclick = () => goTo(state.index + 1);
$('q-jump').onchange = event => goTo(Number(event.target.value));
$('q-publish').onclick = () => showSection('key');
$('q-reveal').onclick = () => showSection('solution', $('solution-section'));
$('q-distribution').onclick = () => showSection('stats', $('distribution'));
$('q-present').onclick = present;
$('q-more').onclick = () => settings($('q-settings').hidden);
$('q-settings-close').onclick = () => settings(false);
$('q-minus').onclick = () => setFont(state.font - 2);
$('q-plus').onclick = () => setFont(state.font + 2);
$('q-close').onclick = () => notify('thd:close');
$('q-fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    settings(false);
  } catch {
    $('q-fullscreen').textContent = 'Không thể mở toàn màn hình';
  }
};
$('figure-close').onclick = closeFigure;
$('figure-image').onload = sizeFigure;
$('figure-fit').onclick = () => { state.figureScale = 1; sizeFigure(); };
$('figure-minus').onclick = () => { state.figureScale = Math.max(.4, state.figureScale / 1.25); sizeFigure(); };
$('figure-plus').onclick = () => { state.figureScale = Math.min(5, state.figureScale * 1.25); sizeFigure(); };
window.addEventListener('resize', sizeFigure);
document.addEventListener('keydown', event => {
  if (!state.session || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.isComposing ||
      event.composedPath().some(el => el?.id === '__thd_mini_host') || document.querySelector('dialog[open]')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (!figure.hidden) closeFigure();
    else if (!$('q-settings').hidden) settings(false);
    else if (document.fullscreenElement) void document.exitFullscreen();
    else notify('thd:close');
    return;
  }
  if (!figure.hidden || event.target.closest?.('input,select,textarea,button,[role="button"]')) return;
  const action = {
    ArrowLeft: () => goTo(state.index - 1), ArrowRight: () => goTo(state.index + 1),
    ' ': () => $('q-reveal').click(), f: present,
    '+': () => setFont(state.font + 2), '-': () => setFont(state.font - 2),
  }[event.key];
  if (action) { event.preventDefault(); action(); }
});
