/**
 * @file utils.js
 * @description Pure helper functions, string escaping, URL parsing, and file import/export capabilities.
 */

import { IC, TRACK, AI, ART, CATS } from './state.js';

export const ic = (n, c = 'h-4 w-4') =>
  `<svg class="${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;

export const root = h => {
  const p = h.split('.');
  return p.length <= 2
    ? h
    : p.slice(p[p.length - 1].length === 2 && ['co', 'com', 'org', 'gov', 'edu', 'ac', 'net'].includes(p[p.length - 2]) ? -3 : -2).join('.');
};

export function norm(u) {
  try {
    const x = new URL(u);
    x.hash = '';
    TRACK.forEach(k => x.searchParams.delete(k));
    const host = x.hostname.toLowerCase().replace(/^(www|m)\./, '').replace(/^(\w+)\.m\./, '$1.');
    return { host, key: host + x.pathname.replace(/\/+$/, '') + x.search };
  } catch {
    return null;
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const categorize = h =>
  /(^|\.)github\.com$/.test(h)
    ? 'github'
    : /(^|\.)(youtube\.com|youtu\.be)$/.test(h)
    ? 'youtube'
    : /(^|\.)linkedin\.com$/.test(h)
    ? 'linkedin'
    : AI.test(h)
    ? 'ai'
    : ART.test(h)
    ? 'articles'
    : 'other';

export function make(url, title, icon, added, cat, extra = {}) {
  const n = norm(url);
  if (!n) return null;
  return {
    id: uid(),
    key: n.key,
    url,
    title: title || n.host,
    host: n.host,
    domain: root(n.host),
    icon: icon && icon.length < 4000 ? icon : '',
    cat: cat || categorize(n.host),
    star: false,
    added: added || Date.now(),
    tags: extra.tags || [],
    folder: extra.folder || '',
    notes: extra.notes || '',
    health: extra.health || '',
    healthChecked: extra.healthChecked || 0
  };
}

export function parse(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = [];

  function walk(dl, path = []) {
    for (const node of [...dl.children]) {
      if (node.tagName === 'DT') {
        const h3 = [...node.children].find(x => x.tagName === 'H3');
        const a = [...node.children].find(x => x.tagName === 'A');
        if (h3) {
          let next = [...path, h3.textContent.trim()];
          let sibling = node.nextElementSibling;
          while (sibling && sibling.tagName !== 'DL') sibling = sibling.nextElementSibling;
          if (sibling) walk(sibling, next);
        } else if (a) {
          const href = (a.getAttribute('href') || '').trim();
          if (/^https?:/i.test(href)) {
            const b = make(href, a.textContent.trim(), a.getAttribute('icon'), (+a.getAttribute('add_date') || 0) * 1000, null, {
              folder: path.join('/')
            });
            if (b) out.push(b);
          }
        }
      } else if (node.tagName === 'DL') {
        walk(node, path);
      }
    }
  }

  const top = doc.querySelector('body > dl') || doc.querySelector('dl');
  if (top) {
    walk(top);
  } else {
    doc.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href').trim();
      if (/^https?:/i.test(href)) {
        const b = make(href, a.textContent.trim(), a.getAttribute('icon'), (+a.getAttribute('add_date') || 0) * 1000);
        if (b) out.push(b);
      }
    });
  }
  return out;
}

export const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const escA = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const show = u => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

export async function copy(text, onSuccess) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const a = document.createElement('textarea');
    a.value = text;
    document.body.append(a);
    a.select();
    document.execCommand('copy');
    a.remove();
  }
  if (onSuccess) onSuccess();
}

export function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJSON(items) {
  download(
    `bookmarkhub-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(
      {
        app: 'BookmarkHub',
        exportedAt: new Date().toISOString(),
        count: items.length,
        bookmarks: items.map(b => ({
          title: b.title,
          url: b.url,
          domain: b.domain,
          category: b.cat,
          favorite: b.star,
          added: new Date(b.added).toISOString(),
          icon: b.icon,
          tags: b.tags,
          folder: b.folder,
          notes: b.notes
        }))
      },
      null,
      2
    ),
    'application/json'
  );
}

export function exportHTML(items) {
  const stamp = b => Math.floor((b.added || Date.now()) / 1000);
  const tree = {};

  items.forEach(b => {
    const catLabel = (CATS.find(c => c[0] === b.cat) || [])[1] || 'Other';
    const path = (b.folder || catLabel).split('/').filter(Boolean);
    let node = tree;
    path.forEach(part => {
      node[part] = node[part] || { _items: [] };
      node = node[part];
    });
    node._items.push(b);
  });

  function renderTree(node) {
    let out = '';
    Object.keys(node)
      .filter(k => k !== '_items')
      .sort((a, b) => a.localeCompare(b))
      .forEach(name => {
        out += `<DT><H3 ADD_DATE="${Math.floor(Date.now() / 1000)}">${escA(name)}</H3>\n<DL><p>\n${renderTree(node[name])}</DL><p>\n`;
      });
    (node._items || []).forEach(b => {
      out += `<DT><A HREF="${escA(b.url)}" ADD_DATE="${stamp(b)}"${b.icon ? ` ICON="${escA(b.icon)}"` : ''}>${escA(b.title)}</A>\n`;
    });
    return out;
  }

  download(
    `bookmarkhub-${new Date().toISOString().slice(0, 10)}.html`,
    `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n${renderTree(tree)}</DL><p>\n`,
    'text/html;charset=utf-8'
  );
}

export const b64 = u => {
  let s = '';
  for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192));
  return btoa(s);
};

export const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));