import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { createElement, Fragment } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import ts from 'typescript';

const source = new URL('../app/rich-content.tsx', import.meta.url);
const { outputText } = ts.transpileModule(await readFile(source, 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
});
// Resolve the component's imports before importing the compiled TSX from memory.
const compiled = outputText.replace(/\bfrom (["'])([^"']+)\1/g, (_match, _quote, specifier) => {
  const url = specifier.startsWith('.') ? new URL(specifier, source).href : import.meta.resolve(specifier);
  return `from ${JSON.stringify(url)}`;
});
const { Rich } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

test('Rich keeps question formulas and images attached when the countdown updates', t => {
  const { window, document } = parseHTML('<!doctype html><div id="question"></div>');
  globalThis.window = window;
  globalThis.document = document;
  const container = document.getElementById('question');
  const root = createRoot(container);
  t.after(() => flushSync(() => root.unmount()));

  const prompt = '<p>Tính <math><mi>x</mi></math><img src="/bank-assets/mau.svg" alt="Hình mẫu"></p>';
  const render = (seconds, html = prompt) => flushSync(() => root.render(createElement(Fragment, null,
    createElement('output', null, String(seconds)),
    createElement(Rich, { html }),
  )));

  render(42);
  const math = container.querySelector('math');
  const image = container.querySelector('img');
  assert.ok(math && image);
  render(41);
  assert.equal(container.querySelector('output').textContent, '41');
  assert.ok(container.querySelector('math') === math, 'Keep the same MathML element');
  assert.ok(container.querySelector('img') === image, 'Keep the same diagram');

  render(40, '<p>Tính <math><mi>y</mi></math></p>');
  assert.equal(container.querySelector('mi').textContent, 'y');
  assert.equal(container.querySelector('img'), null);
});
