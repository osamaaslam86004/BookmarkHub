/**
 * @file customizer.js
 * @description Theme customizer, dynamic CSS variables, WCAG contrast checking, custom CSS injection, and preset manager.
 */

import { PK, DEF, FONTS, LOOKS, PRESETS, EXTRA, ACCENTS, S } from './state.js';
import { save } from './storage.js';

export const loaded = {};

export function loadFont(k) {
  const q = FONTS[k]?.[2];
  if (!q || loaded[k]) return;
  loaded[k] = 1;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${q}&display=swap`;
  document.head.append(l);
}

export function rl(c) {
  const f = v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

export function cr(a, b) {
  const x = rl(a);
  const y = rl(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
export const lum = c => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
export const tri = c => c.join(' ');
export const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
export const pre = () => ACCENTS[S.accent] || ACCENTS.sky;

const HEX_REGEX = /^#[0-9a-f]{6}$/i;

export function clean(p) {
  p = p && typeof p === 'object' ? p : {};
  const h = (v, d) => (HEX_REGEX.test(v) ? v.toLowerCase() : d);
  const s = p.surf || {};

  return {
    accent: h(p.accent, ''),
    hl: h(p.hl, ''),
    surf: { dark: h(s.dark, DEF.surf.dark), light: h(s.light, DEF.surf.light) },
    scale: Math.min(120, Math.max(80, Math.round(+p.scale / 5) * 5 || 100)),
    css: typeof p.css === 'string' ? p.css.slice(0, 10000) : '',
    preset: ACCENTS[p.preset] ? p.preset : '',
    theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : '',
    look: LOOKS.includes(p.look) ? p.look : '',
    font: FONTS[p.font] ? p.font : 'dm',
    radius: ['sharp', 'rounded', 'pill'].includes(p.radius) ? p.radius : '',
    density: ['compact', 'spacious'].includes(p.density) ? p.density : '',
    updated: +p.updated || 0
  };
}

let P;
try {
  P = clean(JSON.parse(localStorage.getItem(PK)));
} catch {
  P = clean();
}

export const getP = () => P;

export const safeCss = c =>
  c
    .replace(/@import[^;]*;?/gi, '')
    .replace(/url\(\s*(?!['"]?data:)[^)]*\)/gi, 'none')
    .replace(/expression\s*\(|javascript:|behavior\s*:|-moz-binding/gi, '')
    .replace(/<\/?style/gi, '');

export function applyPref() {
  const ac = P.accent && rgb(P.accent);
  const hlColor = P.hl || (ac ? hex(mix(ac, [255, 255, 255], 0.45)) : '');
  const W = [255, 255, 255];
  const K = [0, 0, 0];
  const sl = rgb(P.surf.light);
  const sd = rgb(P.surf.dark);
  const L = P.surf.light !== DEF.surf.light;
  const D = P.surf.dark !== DEF.surf.dark;

  let css = L ? `:root{--z50:${tri(sl)};--z100:${tri(mix(sl, K, 0.04))};--z200:${tri(mix(sl, K, 0.1))}}html:not(.dark) .bg-white{background-color:rgb(${tri(mix(sl, W, 0.6))})!important}` : '';
  css += `.dark{--z50:250 250 250;--z100:244 244 245;--z200:228 228 231;${D ? `--z800:${tri(mix(sd, W, 0.16))};--z900:${tri(mix(sd, W, 0.08))};--z950:${tri(sd)}` : ''}}`;

  if (ac) css += `:root{--accent-color:${P.accent}!important}`;
  const ea = ac || rgb(pre().primary);
  if (cr(ea, [9, 9, 11]) > cr(ea, [255, 255, 255])) {
    css += '[class*="bg-[var(--accent-color"]:not([class*=")]/"]){color:#09090b!important}';
  }

  if (hlColor) css += `:root{--mark-bg:${hlColor}!important;--mark-fg:${lum(rgb(hlColor)) > 0.5 ? '#09090b' : '#fff'}}`;
  css += `:root{--ff:${FONTS[P.font][1]}}` + (P.radius ? `:root{--r:${{ sharp: '0px', rounded: '6px', pill: '16px' }[P.radius]}}` : '') +
    ({ compact: '#list{gap:.5rem!important}.card{padding:.625rem!important}', spacious: '#list{gap:1.25rem!important}.card{padding:1.25rem!important}main{padding-block:2rem}' }[P.density] || '') +
    (EXTRA[P.look] || '');

  loadFont(P.font);

  let a = document.querySelector('#themeVars');
  let u = document.querySelector('#userCss');
  if (!a) {
    a = document.createElement('style');
    a.id = 'themeVars';
    u = document.createElement('style');
    u.id = 'userCss';
  }
  a.textContent = css;
  u.textContent = safeCss(P.css);
  document.head.append(a, u);

  document.documentElement.style.fontSize = P.scale + '%';
}

export function setPref(patch, keep, scheduleSyncFn) {
  P = clean({ ...P, ...patch, updated: keep ? patch.updated : Date.now() });
  try {
    localStorage.setItem(PK, JSON.stringify(P));
  } catch {}
  applyPref();
  if (!keep && scheduleSyncFn) scheduleSyncFn();
}

export function adopt() {
  if (P.preset && P.preset !== S.accent) {
    S.accent = P.preset;
    applyAccent(P.preset);
  }
  if (P.theme && P.theme !== S.theme) {
    S.theme = P.theme;
  }
}

export function warnings() {
  const m = S.theme;
  const ac = rgb(P.accent || pre().primary);
  const bg = rgb(P.surf[m]);
  const w = [];

  const btn = Math.max(cr(ac, [255, 255, 255]), cr(ac, [9, 9, 11]));
  if (btn < 4.5) w.push(`Button text on this accent reaches only ${btn.toFixed(1)}:1 (4.5:1 recommended).`);

  const ui = cr(ac, bg);
  if (ui < 3) w.push(`Accent against the ${m} background is ${ui.toFixed(1)}:1, so tab underlines and links may fade (3:1 minimum).`);

  const tx = cr(bg, m === 'dark' ? [244, 244, 245] : [24, 24, 27]);
  if (tx < 4.5) w.push(`Body text on this surface is ${tx.toFixed(1)}:1. Try a ${m === 'dark' ? 'darker' : 'lighter'} tone.`);

  return w;
}

export function syncPanel() {
  const panel = document.querySelector('#panel');
  if (!panel) return;
  const m = S.theme;

  const pAcc = document.querySelector('#pAcc');
  const pHl = document.querySelector('#pHl');
  const pSurf = document.querySelector('#pSurf');
  const pSurfL = document.querySelector('#pSurfL');
  const pScale = document.querySelector('#pScale');
  const pSc = document.querySelector('#pSc');
  const pCss = document.querySelector('#pCss');
  const pFont = document.querySelector('#pFont');
  const pRad = document.querySelector('#pRad');
  const pDen = document.querySelector('#pDen');
  const pWarn = document.querySelector('#pWarn');

  if (pAcc) pAcc.value = P.accent || pre().primary;
  if (pHl) pHl.value = P.hl || (P.accent ? hex(mix(rgb(P.accent), [255, 255, 255], 0.45)) : pre().mark);
  if (pSurf) pSurf.value = P.surf[m];
  if (pSurfL) pSurfL.textContent = `Surface tone (${m} mode)`;
  if (pScale) pScale.value = P.scale;
  if (pSc) pSc.textContent = P.scale + '%';
  if (pCss && document.activeElement !== pCss) pCss.value = P.css;
  if (pFont) pFont.value = P.font;
  if (pRad) pRad.value = P.radius;
  if (pDen) pDen.value = P.density;

  const pk = P.look || m;
  document.querySelectorAll('#pPresets button').forEach(b => b.classList.toggle('ring-2', b.dataset.preset === pk));

  const w = warnings();
  if (pWarn) {
    pWarn.innerHTML =
      w.map(t => `<p class="text-amber-600 dark:text-amber-400">⚠ ${t}</p>`).join('') ||
      '<p class="text-emerald-600 dark:text-emerald-400">✓ Contrast looks good</p>';
  }

  panel.querySelectorAll('input[type=color]').forEach(i => {
    if (i.previousElementSibling) i.previousElementSibling.textContent = i.value;
  });
}

export function openPanel(o = true) {
  const panel = document.querySelector('#panel');
  if (!panel) return;
  panel.classList.toggle('translate-x-full', !o);
  panel.inert = !o;
  if (o) {
    syncPanel();
    const pAcc = document.querySelector('#pAcc');
    if (pAcc) pAcc.focus();
  }
}

export function applyAccent(name) {
  const a = ACCENTS[name] || ACCENTS.sky;
  document.documentElement.style.setProperty('--accent-color', a.primary);
  document.documentElement.style.setProperty('--mark-bg', a.mark);
}

export function applyPreset(k, renderFn, scheduleSyncFn) {
  const p = PRESETS[k];
  setPref({ accent: p.accent || '', hl: p.hl || '', surf: { ...DEF.surf, ...p.surf }, look: LOOKS.includes(k) ? k : '', theme: p.theme }, false, scheduleSyncFn);
  adopt();
  save();
  syncPanel();
  if (renderFn) renderFn();
}

export function resetPrefs(renderFn, toastFn, scheduleSyncFn) {
  const prev = { ...P, preset: S.accent, theme: S.theme };
  setPref({ ...DEF, surf: { ...DEF.surf }, preset: 'sky' }, false, scheduleSyncFn);
  adopt();
  save();
  syncPanel();
  if (renderFn) renderFn();
  if (toastFn) {
    toastFn('Appearance reset to default', () => {
      setPref(prev, false, scheduleSyncFn);
      adopt();
      save();
      syncPanel();
      if (renderFn) renderFn();
    });
  }
}

const enc = o => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))));
const dec = s => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0))));

export async function copyCode(toastFn) {
  const c = 'BH1.' + enc({ ...P, preset: S.accent, theme: S.theme });
  const pCode = document.querySelector('#pCode');
  if (pCode) pCode.value = c;
  try {
    await navigator.clipboard.writeText(c);
    if (toastFn) toastFn('Sync code copied');
  } catch {
    if (pCode) pCode.select();
    if (toastFn) toastFn('Select the code and copy it');
  }
}

export function applyCode(renderFn, toastFn, scheduleSyncFn) {
  try {
    const pCode = document.querySelector('#pCode');
    const s = pCode ? pCode.value.trim() : '';
    if (!s.startsWith('BH1.')) throw 0;
    setPref(dec(s.slice(4)), false, scheduleSyncFn);
    adopt();
    save();
    syncPanel();
    if (renderFn) renderFn();
    if (toastFn) toastFn('Appearance applied');
  } catch {
    if (toastFn) toastFn('That sync code isn’t valid');
  }
}

export function initCustomizer(renderFn, scheduleSyncFn) {
  const panel = document.querySelector('#panel');
  if (!panel) return;

  panel.addEventListener('input', e => {
    const t = e.target;
    const v = t.value;
    const actions = {
      pAcc: () => setPref({ accent: v }, false, scheduleSyncFn),
      pHl: () => setPref({ hl: v }, false, scheduleSyncFn),
      pSurf: () => setPref({ surf: { ...P.surf, [S.theme]: v } }, false, scheduleSyncFn),
      pScale: () => setPref({ scale: +v }, false, scheduleSyncFn),
      pCss: () => setPref({ css: v }, false, scheduleSyncFn),
      pFont: () => setPref({ font: v }, false, scheduleSyncFn),
      pRad: () => setPref({ radius: v }, false, scheduleSyncFn),
      pDen: () => setPref({ density: v }, false, scheduleSyncFn)
    };
    if (actions[t.id]) actions[t.id]();
    syncPanel();
  });

  window.addEventListener('storage', e => {
    if (e.key !== PK || !e.newValue) return;
    try {
      const n = clean(JSON.parse(e.newValue));
      if (n.updated < P.updated) return;
      P = n;
      adopt();
      applyPref();
      syncPanel();
      if (renderFn) renderFn();
    } catch {}
  });

  applyPref();
  syncPanel();
}