/**
 * @file sync.js
 * @description End-to-end encrypted cloud synchronization using PBKDF2 key derivation and 3-way merge conflict resolution.
 */

import { SK, S } from './state.js';
import { IDB, fixItems, save } from './storage.js';
import { b64, unb64, uid } from './utils.js';

const te = new TextEncoder();
const SYL = new Set(['id', 'icon', 'health', 'status', 'healthChecked']);

let SY = null;
let CK = null;
let syncBusy = 0;
let stm;

try {
  SY = JSON.parse(localStorage.getItem(SK));
} catch {}

export const pub = b => Object.fromEntries(Object.entries(b).filter(([k]) => !SYL.has(k)));

export const fp = b => {
  const s = JSON.stringify(Object.entries(pub(b)).sort(([x], [y]) => (x < y ? -1 : 1)));
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36) + s.length;
};

export const sig = a => a.map(b => b.key + fp(b)).sort().join('|');

export const snap = a => Object.fromEntries(a.map(b => [b.key, fp(b)]));

export const fmtKey = k => k.match(/.{1,5}/g).join('-');

export async function mkKey(key) {
  const m = await crypto.subtle.importKey('raw', te.encode(key), 'PBKDF2', false, ['deriveKey', 'deriveBits']);
  const p = s => ({ name: 'PBKDF2', salt: te.encode(s), iterations: 150000, hash: 'SHA-256' });

  return {
    key,
    aes: await crypto.subtle.deriveKey(p('bh-enc'), m, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
    id: [...new Uint8Array(await crypto.subtle.deriveBits(p('bh-id'), m, 256))]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('')
  };
}

export async function seal(o, k) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k.aes, te.encode(JSON.stringify(o))));
  const u = new Uint8Array(12 + ct.length);
  u.set(iv);
  u.set(ct, 12);
  return b64(u);
}

export async function unseal(s, k) {
  const u = unb64(s);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, k.aes, u.slice(12))));
}

export async function kv(k, method, body) {
  const r = await fetch('/api/sync', {
    method,
    headers: { 'content-type': 'application/json', 'x-sync-id': k.id },
    body: body && JSON.stringify(body)
  });

  if (r.status === 501) throw Error('Sync storage isn’t set up on this deployment yet');
  if (!r.ok && r.status !== 409) throw Error('Sync failed (HTTP ' + r.status + ')');
  return { status: r.status, ...(await r.json()) };
}

export function merge3(L, R, base) {
  const lm = new Map(L.map(b => [b.key, b]));
  const rm = new Map(R.map(b => [b.key, b]));
  const out = [];
  const adopt1 = r => ({ id: uid(), icon: '', health: '', status: 0, healthChecked: 0, ...r });

  new Set([...lm.keys(), ...rm.keys()]).forEach(k => {
    const l = lm.get(k);
    const r = rm.get(k);
    const bh = base[k];

    if (l && r) {
      out.push(fp(l) === fp(r) || fp(r) === bh ? l : fp(l) === bh ? { ...l, ...pub(r) } : l);
    } else if (l) {
      if (bh === undefined || fp(l) !== bh) out.push(l);
    } else if (bh === undefined || fp(r) !== bh) {
      out.push(adopt1(r));
    }
  });

  return out;
}

export async function syncNow(renderFn, getP, setPref, adopt, syncPanel) {
  if (!SY || syncBusy) return;
  syncBusy = 1;
  setStat('Syncing…');

  try {
    const k = CK && CK.key === SY.key ? CK : (CK = await mkKey(SY.key));
    let done = 0;

    for (let n = 0; n < 3 && !done; n++) {
      const r = await kv(k, 'GET');
      const rem = r.blob ? await unseal(r.blob, k) : { items: [], prefs: null };
      const baseSnap = (await IDB.get('base')) || {};

      S.items = merge3(S.items, fixItems(rem.items), baseSnap);

      if (rem.prefs && getP && rem.prefs.updated > getP().updated && setPref && adopt) {
        setPref(rem.prefs, true);
        adopt();
      }

      const P_updated = getP ? getP().updated : 0;
      const same = sig(S.items) === sig(rem.items || []) && (rem.prefs?.updated || 0) >= P_updated;
      let rev = r.rev;

      if (!same) {
        const currentP = getP ? getP() : {};
        const p = await kv(k, 'PUT', { baseRev: r.rev, blob: await seal({ items: S.items.map(pub), prefs: currentP }, k) });
        if (p.status === 409) continue;
        rev = p.rev;
      }

      await IDB.set('base', snap(S.items));
      SY.rev = rev;
      done = 1;
    }

    if (!done) throw Error('Sync conflict, try again');

    SY.last = Date.now();
    localStorage.setItem(SK, JSON.stringify(SY));
    save(true);
    if (renderFn) renderFn();
    if (syncPanel) syncPanel();
    setStat();
  } catch (e) {
    setStat('⚠ ' + e.message);
  } finally {
    syncBusy = 0;
  }
}

export function scheduleSync(renderFn, getP, setPref, adopt, syncPanel) {
  clearTimeout(stm);
  if (SY) stm = setTimeout(() => syncNow(renderFn, getP, setPref, adopt, syncPanel), 2500);
}

export function setStat(m) {
  const on = !!SY;
  const cOff = document.querySelector('#cOff');
  const cOn = document.querySelector('#cOn');
  const cStat = document.querySelector('#cStat');
  const cShow = document.querySelector('#cShow');

  if (cOff) cOff.classList.toggle('hidden', on);
  if (cOn) cOn.classList.toggle('hidden', !on);
  if (cStat) {
    cStat.textContent =
      m ||
      (on
        ? SY.last
          ? `Synced ${new Date(SY.last).toLocaleTimeString()} · bookmarks and settings, end-to-end encrypted`
          : 'Not synced yet'
        : 'Off: bookmarks and settings stay on this device.');
  }
  if (on && cShow) {
    cShow.textContent = fmtKey(SY.key).slice(0, 5) + '-•••••-•••••-•••••';
  }
}

export function cloudOn(existing, toastFn, renderFn, getP, setPref, adopt, syncPanel) {
  let key = (existing || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (existing !== undefined && key.length < 16) {
    if (toastFn) toastFn('Paste the full sync key from your other device');
    return;
  }

  if (!key) {
    key = [...crypto.getRandomValues(new Uint8Array(20))]
      .map(x => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31])
      .join('');
  }

  SY = { key, rev: 0, last: 0 };
  IDB.set('base', {});
  localStorage.setItem(SK, JSON.stringify(SY));
  setStat();
  syncNow(renderFn, getP, setPref, adopt, syncPanel);
  if (!existing && toastFn) {
    toastFn('Sync on. Copy your key to link other devices.');
  }
}

export function cloudOff(toastFn) {
  SY = null;
  localStorage.removeItem(SK);
  IDB.set('base', {});
  setStat();
  if (toastFn) toastFn('Sync turned off on this device');
}

export const getSY = () => SY;