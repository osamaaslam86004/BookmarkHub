/**
 * @file storage.js
 * @description IndexedDB and LocalStorage persistence layer for BookmarkHub.
 */

import { S, KEY } from './state.js';

export let idbOk = !!window.indexedDB;
let idt;

export const IDB = (() => {
  let db;
  const open = () =>
    db ||
    (db = new Promise((ok, no) => {
      const r = indexedDB.open('bookmarkhub', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    }));

  const tx = async (m, f) => {
    const d = await open();
    return new Promise((ok, no) => {
      const t = d.transaction('kv', m);
      const o = f(t.objectStore('kv'));
      t.oncomplete = () => ok(o.result);
      t.onerror = () => no(o.error);
    });
  };

  return {
    get: k => tx('readonly', s => s.get(k)),
    set: (k, v) => tx('readwrite', s => s.put(v, k))
  };
})();

export const fixItems = a =>
  (a || []).map(b => ({
    ...b,
    tags: Array.isArray(b.tags) ? b.tags : [],
    folder: b.folder || '',
    notes: b.notes || '',
    health: b.health || '',
    healthChecked: b.healthChecked || 0
  }));

export const idbFlush = toastFn =>
  IDB.set('data', { items: S.items, favicon: S.favicon }).catch(() => {
    idbOk = false;
    save(true, toastFn);
    if (toastFn) toastFn('IndexedDB unavailable, using localStorage');
  });

export function save(quiet, toastFn, scheduleSyncFn) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        view: S.view,
        theme: S.theme,
        accent: S.accent,
        seeded: S.seeded,
        sort: S.sort,
        idb: idbOk ? 1 : 0,
        ...(idbOk ? {} : { items: S.items, favicon: S.favicon })
      })
    );
  } catch {
    if (toastFn) toastFn('Storage is full: export a backup to keep your changes');
  }

  if (idbOk) {
    clearTimeout(idt);
    idt = setTimeout(() => idbFlush(toastFn), 250);
  }

  if (quiet !== true && scheduleSyncFn) {
    scheduleSyncFn();
  }
}

export function merge(list) {
  const seen = new Set(S.items.map(b => b.key));
  let n = 0;
  list.forEach(b => {
    if (!seen.has(b.key)) {
      seen.add(b.key);
      S.items.push(b);
      n++;
    }
  });
  return n;
}

export function initStorageFromLocalStorage() {
  try {
    Object.assign(S, JSON.parse(localStorage.getItem(KEY) || 'null') || {});
  } catch {}

  S.favicon = {
    mode: 'emoji',
    text: '🚀',
    bgColor: '#3b82f6',
    textColor: '#ffffff',
    radius: 25,
    fontSize: 55,
    customDataUrl: '',
    ...(S.favicon || {})
  };
  S.q = '';
  S.tab = 'all';
  S.tag = '';
  S.folder = '';
  S.items = fixItems(S.items || []);
}