'use strict';

const catalog = window.toanThdPublicCatalog;
const search = document.querySelector('#library-search');
const grade = document.querySelector('#library-grade');
const chapter = document.querySelector('#library-chapter');
const status = document.querySelector('#library-status');
const results = document.querySelector('#library-results');
let stopActive;

const normalize = value => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll('đ', 'd');
const gradeLabel = grades => 'Toán ' + grades.join('–');
const chapterTitle = number => number === null ? 'Tài liệu dùng chung'
    : `Chương ${number}${grade.value ? ` · ${catalog.chapters[grade.value][number - 1]}` : ''}`;

function element(tag, className = '', text = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

function visual(card, item) {
    const block = element('div', 'lesson-visual');
    if (item.cover) {
        const photo = element('img');
        photo.src = item.cover;
        photo.alt = '';
        photo.loading = 'lazy';
        block.append(photo);
    }
    if (!item.preview) return block;

    const video = element('video');
    video.preload = 'none';
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');
    const controls = element('button', 'preview-button', 'Phát clip');
    controls.type = 'button';
    controls.setAttribute('aria-label', 'Phát clip xem trước ' + item.title);
    block.append(video, controls);

    let origin;
    let timer;
    let generation = 0;
    function stop() {
        clearTimeout(timer);
        generation += 1;
        origin = undefined;
        video.dataset.playing = 'false';
        if (video.hasAttribute('src')) {
            video.pause();
            video.removeAttribute('src');
            video.load();
        }
        controls.textContent = 'Phát clip';
        controls.setAttribute('aria-label', 'Phát clip xem trước ' + item.title);
        if (stopActive === stop) stopActive = undefined;
    }
    function play(trigger) {
        if (origin || !card.isConnected) return;
        stopActive?.();
        stopActive = stop;
        origin = trigger;
        const attempt = ++generation;
        video.src = item.preview;
        controls.textContent = 'Dừng clip';
        controls.setAttribute('aria-label', 'Dừng clip xem trước ' + item.title);
        video.play().then(() => {
            if (attempt === generation) video.dataset.playing = 'true';
        }).catch(() => {
            if (attempt === generation) stop();
        });
    }

    video.addEventListener('ended', stop);
    card.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse') timer = setTimeout(() => play('hover'), 150);
    });
    card.addEventListener('pointerleave', () => {
        clearTimeout(timer);
        if (origin === 'hover') stop();
    });
    card.addEventListener('keydown', event => {
        if (event.key === 'Escape' && origin) stop();
    });
    controls.addEventListener('click', () => {
        clearTimeout(timer);
        if (origin) stop();
        else play('control');
    });
    return block;
}

function lessonCard(item) {
    const card = element('article', 'lesson');
    if (item.cover || item.preview) card.append(visual(card, item));
    const body = element('div', 'lesson-body');
    body.append(element('h4', '', item.title));
    if (item.description) body.append(element('p', '', item.description));
    const link = element('a', 'lesson-link', 'Mở học liệu');
    link.href = item.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Mở học liệu ' + item.title);
    body.append(link);
    card.append(body);
    return card;
}

function updateChapters() {
    const selected = chapter.value;
    const possible = [...new Set(catalog.items.filter(item => !grade.value || item.grades.includes(Number(grade.value)))
        .map(item => item.chapter).filter(number => number !== null))].sort((a, b) => a - b);
    chapter.replaceChildren(new Option('Tất cả chương', ''),
        ...possible.map(number => new Option(chapterTitle(number), String(number))));
    if (possible.includes(Number(selected))) chapter.value = selected;
}

function render() {
    stopActive?.();
    const query = normalize(search.value.trim());
    const items = catalog.items.filter(item =>
        (!grade.value || item.grades.includes(Number(grade.value))) &&
        (!chapter.value || item.chapter === Number(chapter.value)) &&
        normalize([item.title, item.description, gradeLabel(item.grades), chapterTitle(item.chapter)].join(' ')).includes(query));
    results.replaceChildren();
    status.textContent = !catalog.items.length ? 'Kho học liệu công khai đang được chuẩn bị.'
        : !items.length ? 'Chưa tìm thấy học liệu phù hợp.'
        : `${items.length} học liệu`;

    const groups = new Map();
    for (const item of items) {
        const key = grade.value ? item.chapter ?? 0 : item.grades.length === 1 ? item.grades[0] : 0;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
    }
    for (const [key, entries] of [...groups].sort(([a], [b]) => (a || Infinity) - (b || Infinity))) {
        const group = element('section', 'lesson-group');
        const label = grade.value ? chapterTitle(key || null) : key ? gradeLabel([key]) : 'Tài liệu dùng chung';
        const grid = element('div', 'lesson-grid');
        grid.append(...entries.map(lessonCard));
        group.append(element('h3', '', label), grid);
        results.append(group);
    }
}

grade.addEventListener('change', () => { updateChapters(); render(); });
chapter.addEventListener('change', render);
search.addEventListener('input', render);
updateChapters();
render();
