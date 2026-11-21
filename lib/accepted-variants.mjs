import {gunzipSync, strFromU8} from 'fflate';
import index from './chapter-variants/index.mjs';
import loaders from './chapter-variants/loaders.mjs';
import chapterOne from '../data/chapter-variants/generated/12-C01.json' with {type: 'json'};
import chapterTwo from '../data/chapter-variants/generated/12-C02.json' with {type: 'json'};
import chapterThree from '../data/chapter-variants/generated/12-C03.json' with {type: 'json'};
import chapterFour from '../data/chapter-variants/generated/12-C04.json' with {type: 'json'};
import chapterFive from '../data/chapter-variants/generated/12-C05.json' with {type: 'json'};
import chapterSix from '../data/chapter-variants/generated/12-C06.json' with {type: 'json'};
import {buildQuestionVariant,questionVariantKeys} from './question-variants.mjs';

const chapters = new Map();
const editedVariants = {...chapterOne.entries,...chapterTwo.entries,...chapterThree.entries,
  ...chapterFour.entries,...chapterFive.entries,...chapterSix.entries};
const keyFor = (entry, n) => 'cv-'+entry.version+'-'+entry.source+'-'+n;
function entryFor(question) {
  const entry = editedVariants[question.id]?.index ?? index[question.id];
  return entry && entry.fingerprint === question.bank_fingerprint && entry.kind === question.kind &&
    question.revision === 1 && !question.archived_at ? entry : null;
}
export function availableQuestionVariantKeys(question) {
  const entry = entryFor(question);
  if (index[question.id]) return entry ? Array.from({length:entry.count},(_,i)=>keyFor(entry,i+1)) : [];
  return questionVariantKeys(question);
}
async function loadChapter(id) {
  if (chapters.has(id)) { const value=chapters.get(id); chapters.delete(id); chapters.set(id,value); return value; }
  const pending = loaders[id]().then(({default:packed}) => {
    const bytes = Uint8Array.from(atob(packed), c => c.charCodeAt(0));
    return JSON.parse(strFromU8(gunzipSync(bytes)));
  }).catch(error => { chapters.delete(id); throw error; });
  chapters.set(id,pending);
  if (chapters.size > 2) chapters.delete(chapters.keys().next().value);
  return pending;
}
export async function resolveQuestionVariant(question, key) {
  // Previously saved v0.9/v0.10 keys remain supported.
  if (typeof key === 'string' && key.startsWith('tc1-')) return buildQuestionVariant(question,key);
  const entry=entryFor(question);
  if (!entry || !availableQuestionVariantKeys(question).includes(key)) return null;
  const number=Number(key.split('-').at(-1));
  const variants=editedVariants[question.id]?.variants ?? (await loadChapter(entry.chapter))[question.id];
  const variant=variants?.find(v=>v.number===number);
  if (!variant) return null;
  return {...question,...structuredClone(variant),id:question.id,
    bank_status:variant.kind==='free'?'reference':'auto',bank_meta:null,bank_tex:null,source:null,source_json:null,
    variant:{key,number}};
}
