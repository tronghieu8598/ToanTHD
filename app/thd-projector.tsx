'use client';

import {useEffect, useRef, useState} from 'react';
import {answerText, kindNames} from '../lib/analytics.mjs';
import {layoutMathHtml} from '../lib/client/math-display.mjs';
import {gzipJson} from '../lib/client/packed-json.mjs';

type Row = Record<string, any>;

function statistics(item: Row) {
  const {n, full, partial, wrong, blank} = item;
  const rows = [
    ...item.choices.map((c: Row) => ({label: c.key, detail: c.count + '/' + n + ' chọn', count: c.count})),
    ...item.parts.map((p: Row) => ({
      label: 'Ý ' + p.key, detail: p.right + '/' + n + ' đúng · ' + p.yes.length + ' Đ · ' + p.no.length + ' S · ' + p.blank.length + ' trống',
      count: p.right,
    })),
    ...item.groups.map((g: Row) => ({
      label: g.key === 'blank' ? 'Bỏ trống' : g.variants.join(' · '),
      detail: g.students.length + '/' + n + (g.key === 'blank' ? '' : g.correct ? ' đúng' : ' sai'),
      count: g.students.length,
    })),
  ];
  return {total: n, full, partial, wrong, blank, rows};
}

export function ThdProjector({detail, items, onClose}: {detail: Row; items: Row[]; onClose: () => void}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const close = useRef(onClose);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  close.current = onClose;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();

    function message(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.origin !== window.location.origin) return;
      if (event.data?.type === 'thd:close') close.current();
      if (event.data?.type === 'thd:loaded') setReady(true);
    }
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') close.current();
    }
    window.addEventListener('message', message);
    document.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('message', message);
      document.removeEventListener('keydown', key);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, []);

  useEffect(() => {
    const target = frame.current?.contentWindow;
    if (!loaded || !target) return;
    const closed = detail.session.state === 'closed';
    const session = {
      id: detail.session.id, label: detail.session.class_label, closed,
      questions: detail.questions.map((q: Row, i: number) => ({
        id: q.id, number: q.original_number, kind: q.kind, kindLabel: kindNames[q.kind as keyof typeof kindNames],
        topic: [q.document_title, q.lesson_title].filter(Boolean).join(' · '),
        stem: layoutMathHtml(q.prompt), options: q.choices.map((c: Row) => ({key: c.key, html: layoutMathHtml(c.text)})),
        ...(closed && {
          answer: q.correct, answerText: answerText(q, q.correct), solution: layoutMathHtml(q.solution),
          note: q.bank_note, stat: items[i] ? statistics(items[i]) : null,
        }),
      })),
    };
    let current = true;
    void gzipJson(session).then(blob => blob.arrayBuffer()).then(payload => {
      if (current) target.postMessage({type: 'thd:session', payload}, window.location.origin, [payload]);
    }).catch(() => {
      if (current) setError('Không thể nạp dữ liệu trình chiếu trên trình duyệt này.');
    });
    return () => {current = false;};
  }, [loaded, detail, items]);

  return <div ref={ref} className="thd-projector" tabIndex={-1} role="dialog" aria-modal="true" aria-label="Trình chiếu chữa bài THD 3.0">
    <iframe ref={frame} title="Khung THD 3.0" src="/thd-3.0/index.html"
      allowFullScreen onLoad={() => setLoaded(true)} />
    {(!ready || error) && <div className="thd-projector-status">
      {error && <p role="alert">{error}</p>}
      <button type="button" className="btn secondary" onClick={onClose}>Đóng trình chiếu</button>
    </div>}
  </div>;
}
