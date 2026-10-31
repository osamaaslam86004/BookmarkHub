/**
 * @file search.js
 * @description Query parser, operator filtering, fuzzy/Levenshtein matching, and term highlighting.
 */

import { esc } from './utils.js';

let PQ = { q: null, f: { tag: [], domain: [], cat: [], is: [], folder: [] }, terms: [] };

export const getPQ = () => PQ;

export function parseQ(q) {
  const f = { tag: [], domain: [], cat: [], is: [], folder: [] };
  const terms = [];

  (q.match(/\w+:"[^"]*"|\w+:\S+|"[^"]*"|\S+/g) || []).forEach(t => {
    const m = t.match(/^(tag|domain|cat|is|folder):(.+)$/i);
    const c = s => s.replace(/^"|"$/g, '').toLowerCase();

    if (m) {
      f[m[1].toLowerCase()].push(c(m[2]));
    } else {
      terms.push(c(t));
    }
  });

  return { f, terms };
}

export function lev(a, b) {
  const d = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    let p = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1));
      p = t;
    }
  }
  return d[b.length];
}

export const fuzzy = (t, hay) =>
  hay.includes(t) ||
  (t.length > 3 &&
    hay.split(/[^a-z0-9]+/).some(w => Math.abs(w.length - t.length) <= 2 && lev(t, w) <= (t.length > 6 ? 2 : 1)));

export function match(b, S) {
  if (PQ.q !== S.q) {
    PQ = { q: S.q, ...parseQ(S.q) };
  }

  const { f, terms } = PQ;
  const hay = `${b.title} ${b.url} ${b.domain} ${b.notes || ''} ${(b.tags || []).join(' ')} ${b.folder || ''}`.toLowerCase();

  return (
    terms.every(t => fuzzy(t, hay)) &&
    f.tag.every(t => (b.tags || []).some(x => x.toLowerCase().includes(t))) &&
    f.domain.every(d => b.host.includes(d)) &&
    f.cat.every(c => b.cat.includes(c)) &&
    f.folder.every(x => (b.folder || '').toLowerCase().includes(x)) &&
    f.is.every(x =>
      x.startsWith('star')
        ? b.star
        : x === 'broken'
        ? b.health === 'broken' || b.health === 'unreachable' || b.health === 'bad'
        : x === 'blocked'
        ? b.health === 'blocked'
        : x === 'untagged'
        ? !(b.tags || []).length
        : true
    ) &&
    (!S.tag || (b.tags || []).includes(S.tag)) &&
    (!S.folder || b.folder === S.folder)
  );
}

export function hl(s, S) {
  const e = esc(s);
  if (PQ.q !== S.q) {
    PQ = { q: S.q, ...parseQ(S.q) };
  }

  if (!PQ.terms.length) return e;

  return e.replace(
    new RegExp(
      PQ.terms
        .map(t => esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|'),
      'gi'
    ),
    m => `<mark>${m}</mark>`
  );
}