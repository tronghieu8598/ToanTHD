import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {parseHTML} from 'linkedom';
import {act, createElement} from 'react';
import {createRoot} from 'react-dom/client';
import ts from 'typescript';

const source = new URL('../app/lan-panels.tsx', import.meta.url);
const {outputText} = ts.transpileModule(await readFile(source, 'utf8'), {
  compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext},
});
const compiled = outputText.replace(/\bfrom (["'])([^"']+)\1/g, (_match, _quote, specifier) => {
  const url = specifier.startsWith('.') ? new URL(specifier, source).href : import.meta.resolve(specifier);
  return `from ${JSON.stringify(url)}`;
});
const {ShareDialog} = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

async function renderDialog(origin, requiresEntryCode, addresses = []) {
  const {window, document} = parseHTML('<!doctype html><body><div id="root"></div></body>');
  window.location = new URL(origin);
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.window = window;
  globalThis.document = document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.fetch = async url => {
    requests.push(url);
    return {ok: true, json: async () => ({mode: 'lan', port: 8787, addresses})};
  };
  const container = document.getElementById('root');
  const root = createRoot(container);
  try {
    const session = {
      code: 'ABC234', state: 'open', closes_at: Date.now() + 60_000,
      title: 'Phiên mẫu', class_label: '11 Mẫu', requires_entry_code: requiresEntryCode,
    };
    await act(async () => root.render(createElement(ShareDialog, {session, onClose() {}})));
    return {requests, text: container.textContent, url: container.querySelector('.share-link').textContent};
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    delete globalThis.window;
    delete globalThis.document;
  }
}

test('the hosted QR targets the current HTTPS site and explains individual entry codes', async () => {
  const {requests, text, url} = await renderDialog('https://example.test', 1);
  assert.equal(url, 'https://example.test/hoc-sinh?code=ABC234');
  assert.match(text, /nhập STT và mã cá nhân/);
  assert.match(text, /gửi riêng từng mã/);
  assert.doesNotMatch(text, /Mo_lop_LAN|Địa chỉ laptop|IPv4|Nhận lại địa chỉ/);
  assert.deepEqual(requests, []);
});

test('demo and legacy hosted sessions retain entry by ordinal without an individual code', async () => {
  const {text} = await renderDialog('https://example.test', 0);
  assert.match(text, /nhập STT → xác nhận họ tên/);
  assert.doesNotMatch(text, /mã cá nhân/);
});

test('HTTP localhost and HTTPS private-network origins retain LAN discovery', async () => {
  const address = {address: '192.168.1.20', base: 'http://192.168.1.20:8787', name: 'Wi-Fi'};
  for (const origin of ['http://127.0.0.1:8787', 'https://localhost:8787', 'https://192.168.1.20:8787']) {
    const {requests, text, url} = await renderDialog(origin, 0, [address]);
    assert.equal(url, 'http://192.168.1.20:8787/hoc-sinh?code=ABC234');
    assert.match(text, /Nhập IP nội bộ khác/);
    assert.deepEqual(requests, ['/api/local/network']);
  }
});
