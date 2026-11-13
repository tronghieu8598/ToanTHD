import katex from 'katex';
import { escape as escapeHtml } from '../content.mjs';

const formulaPattern = /<math\b[^>]*>[\s\S]*?<\/math>/gi;
const texAnnotation = /<annotation\b[^>]*encoding=["']application\/x-tex["'][^>]*>([\s\S]*?)<\/annotation>/i;
const entities = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"};
const macros = {
  '\\R': '\\mathbb{R}', '\\N': '\\mathbb{N}', '\\Z': '\\mathbb{Z}',
  '\\Q': '\\mathbb{Q}', '\\C': '\\mathbb{C}', '\\vec': '\\overrightarrow{#1}',
};

function decodeTex(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, key) => {
    if (!key.startsWith('#')) return entities[key.toLowerCase()] ?? entity;
    const hexadecimal = key[1].toLowerCase() === 'x';
    const code = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

function repairTextFormula(tex, display, original) {
  const source = decodeTex(tex).normalize('NFC');
  const textSegments = [];
  const temporaryTex = source.replace(/(\\text(?:normal|rm)?\s*\{)([^{}\\$]+)\}/g, (whole, start, label) => {
    if (!/[^\x00-\x7f]/u.test(label)) return whole;
    const token = 'THDUnicodeText' + textSegments.length + 'End';
    if (source.includes(token)) return whole;
    textSegments.push({token, text: escapeHtml(label.replace(/\s+/g, '\u00a0'))});
    return start + token + '}';
  });
  if (!textSegments.length) return original;

  try {
    // KaTeX decomposes some Vietnamese vowels into separate math accents.
    // Parse the math with plain text atoms, then restore the original text in MathML.
    const rendered = katex.renderToString(temporaryTex, {
      output: 'mathml', displayMode: display, throwOnError: true,
      strict: 'ignore', trust: false, maxExpand: 1000, maxSize: 20, macros: {...macros},
    });
    let math = rendered.match(formulaPattern)?.[0];
    if (!math || !textSegments.every(({token}) => math.includes(token))) return original;
    math = math.replace(texAnnotation, (_match, _tex) => '<annotation encoding="application/x-tex">' + tex + '</annotation>');
    for (const {token, text} of textSegments) math = math.replaceAll(token, () => text);
    return math;
  } catch {
    return original;
  }
}

export function layoutMathHtml(html) {
  return (html || '').replace(formulaPattern, original => {
    const header = original.slice(0, original.indexOf('>') + 1);
    const display = /\bdisplay\s*=\s*["']block["']/i.test(header);
    const tex = original.match(texAnnotation)?.[1];
    const symbols = original.split(/<annotation\b/i, 1)[0]
      .replace(/<mtext\b[^>]*>[\s\S]*?<\/mtext>/gi, '');
    let math = original;

    // Some older MathML entries split Vietnamese words into math accents.
    // Rebuild those expressions from their own TeX, leaving the saved question intact.
    if (tex && tex.length <= 20000 && /[ˋˊđĐ]/u.test(symbols) && /\\text(?:normal|rm)?\s*\{/.test(tex)) {
      math = repairTextFormula(tex, display, original);
    }

    // Latin Modern Math has a stretchable combining overline for MathML accents.
    math = math.replace(/(<mo\b[^>]*>)(?:‾|&#8254;|&#x203e;)(<\/mo>)/gi, '$1\u0305$2');
    math = math.replace(/<mi\b([^>]*)>([đĐ])<\/mi>/g, '<mi$1 data-math-letter="vi">$2</mi>');
    if (display) return '<span class="math-scroll math-scroll-block">' + math + '</span>';
    if (/<mtable\b/i.test(math)) return '<span class="math-scroll math-scroll-inline">' + math + '</span>';
    return math;
  });
}
