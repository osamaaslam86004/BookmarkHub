/**
 * @file faviconStudio.js
 * @description Dynamic canvas rendering, live favicon tab icon injection, and multi-size PNG export bundle.
 */

import { S, ACCENTS } from './state.js';
import { save } from './storage.js';

let favCanvas;
let favCtx;
let favImage = null;
let favMode = 'emoji';
let favEls = {};

export function syncFavInputs() {
  const f = S.favicon;
  favMode = f.mode || 'emoji';
  if (!favEls.text) return;

  favEls.text.value = f.text || '🚀';
  favEls.bg.value = f.bgColor || '#3b82f6';
  favEls.bgHex.value = f.bgColor || '#3b82f6';
  favEls.fg.value = f.textColor || '#ffffff';
  favEls.fgHex.value = f.textColor || '#ffffff';
  favEls.radius.value = f.radius ?? 25;
  favEls.size.value = f.fontSize ?? 55;

  const lblRadius = document.querySelector('#lbl-radius');
  const lblFontSize = document.querySelector('#lbl-font-size');
  if (lblRadius) lblRadius.textContent = favEls.radius.value;
  if (lblFontSize) lblFontSize.textContent = favEls.size.value;

  const secEmoji = document.querySelector('#section-emoji');
  const secUpload = document.querySelector('#section-upload');
  if (secEmoji) secEmoji.classList.toggle('hidden', favMode !== 'emoji');
  if (secUpload) secUpload.classList.toggle('hidden', favMode !== 'upload');

  const tabEmoji = document.querySelector('#tab-emoji');
  const tabUpload = document.querySelector('#tab-upload');
  if (tabEmoji) {
    tabEmoji.className =
      'flex-1 rounded-md px-3 py-2 text-sm ' + (favMode === 'emoji' ? 'bg-[var(--accent-color,#38bdf8)] text-white' : 'text-zinc-500');
  }
  if (tabUpload) {
    tabUpload.className =
      'flex-1 rounded-md px-3 py-2 text-sm ' + (favMode === 'upload' ? 'bg-[var(--accent-color,#38bdf8)] text-white' : 'text-zinc-500');
  }
}

export function updateFavicon() {
  if (!favCanvas || !favCtx) return '';
  const f = S.favicon;
  const w = favCanvas.width;
  const h = favCanvas.height;

  favCtx.clearRect(0, 0, w, h);
  const r = w * (Number(f.radius ?? 25) / 100);

  favCtx.beginPath();
  favCtx.moveTo(r, 0);
  favCtx.arcTo(w, 0, w, h, r);
  favCtx.arcTo(w, h, 0, h, r);
  favCtx.arcTo(0, h, 0, 0, r);
  favCtx.arcTo(0, 0, w, 0, r);
  favCtx.closePath();

  if (f.mode === 'upload' && favImage) {
    favCtx.save();
    favCtx.clip();
    const scale = Math.max(w / favImage.width, h / favImage.height);
    const dw = favImage.width * scale;
    const dh = favImage.height * scale;
    favCtx.drawImage(favImage, (w - dw) / 2, (h - dh) / 2, dw, dh);
    favCtx.restore();
  } else {
    favCtx.fillStyle = f.bgColor || '#3b82f6';
    favCtx.fill();
    favCtx.save();
    favCtx.clip();
    const fs = Number(f.fontSize || 55) * 1.8;
    favCtx.font = `${fs}px sans-serif`;
    favCtx.textAlign = 'center';
    favCtx.textBaseline = 'middle';
    favCtx.fillStyle = f.textColor || '#ffffff';
    favCtx.fillText(f.text || '🚀', w / 2, h / 2 + fs * 0.05, w * 0.9);
    favCtx.restore();
  }

  const url = favCanvas.toDataURL('image/png');
  const favIco = document.querySelector('#favicon-ico');
  const favApple = document.querySelector('#favicon-apple');
  if (favIco) favIco.href = url;
  if (favApple) favApple.href = url;

  document.querySelectorAll('.preview-img').forEach(img => {
    img.src = url;
  });

  const codeDataUri = document.querySelector('#code-data-uri');
  if (codeDataUri) {
    codeDataUri.textContent = url.slice(0, 90) + '…';
  }

  return url;
}

export function saveFav() {
  S.favicon = {
    ...S.favicon,
    mode: favMode,
    text: favEls.text?.value || '🚀',
    bgColor: favEls.bg?.value || '#3b82f6',
    textColor: favEls.fg?.value || '#ffffff',
    radius: +(favEls.radius?.value ?? 25),
    fontSize: +(favEls.size?.value ?? 55)
  };

  save();
  updateFavicon();
}

export function loadFavImage(dataUrl, toastFn) {
  const im = new Image();
  im.onload = () => {
    favImage = im;
    S.favicon.customDataUrl = dataUrl;
    updateFavicon();
    save();
  };
  im.onerror = () => {
    if (toastFn) toastFn('That image could not be loaded');
  };
  im.src = dataUrl;
}

export function openFaviconStudio() {
  syncFavInputs();
  const dlg = document.querySelector('#faviconDlg');
  if (dlg) dlg.showModal();
  if (favMode === 'upload' && S.favicon.customDataUrl && !favImage) {
    loadFavImage(S.favicon.customDataUrl);
  }
  updateFavicon();
}

export function setFavMode(mode) {
  favMode = mode;
  S.favicon.mode = mode;
  syncFavInputs();
  saveFav();
  updateFavicon();
}

export function initFaviconStudio(toastFn, applyAccentFn, renderFn) {
  favCanvas = document.querySelector('#main-canvas');
  if (!favCanvas) return;
  favCtx = favCanvas.getContext('2d');
  favMode = S.favicon.mode || 'emoji';

  favEls = {
    text: document.querySelector('#inp-text'),
    bg: document.querySelector('#inp-bg-color'),
    bgHex: document.querySelector('#inp-bg-color-hex'),
    fg: document.querySelector('#inp-text-color'),
    fgHex: document.querySelector('#inp-text-color-hex'),
    radius: document.querySelector('#inp-radius'),
    size: document.querySelector('#inp-font-size')
  };

  syncFavInputs();

  if (favEls.text) favEls.text.addEventListener('input', () => { S.favicon.text = favEls.text.value; saveFav(); });
  if (favEls.bg) favEls.bg.addEventListener('input', () => { favEls.bgHex.value = favEls.bg.value; S.favicon.bgColor = favEls.bg.value; saveFav(); });
  if (favEls.bgHex) favEls.bgHex.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(favEls.bgHex.value)) { favEls.bg.value = favEls.bgHex.value; S.favicon.bgColor = favEls.bg.value; saveFav(); } });
  if (favEls.fg) favEls.fg.addEventListener('input', () => { favEls.fgHex.value = favEls.fg.value; S.favicon.textColor = favEls.fg.value; saveFav(); });
  if (favEls.fgHex) favEls.fgHex.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(favEls.fgHex.value)) { favEls.fg.value = favEls.fgHex.value; S.favicon.textColor = favEls.fg.value; saveFav(); } });
  if (favEls.radius) favEls.radius.addEventListener('input', () => { S.favicon.radius = +favEls.radius.value; const lbl = document.querySelector('#lbl-radius'); if (lbl) lbl.textContent = favEls.radius.value; saveFav(); });
  if (favEls.size) favEls.size.addEventListener('input', () => { S.favicon.fontSize = +favEls.size.value; const lbl = document.querySelector('#lbl-font-size'); if (lbl) lbl.textContent = favEls.size.value; saveFav(); });

  const tabEmoji = document.querySelector('#tab-emoji');
  const tabUpload = document.querySelector('#tab-upload');
  if (tabEmoji) tabEmoji.addEventListener('click', () => setFavMode('emoji'));
  if (tabUpload) tabUpload.addEventListener('click', () => setFavMode('upload'));

  const dropZone = document.querySelector('#drop-zone');
  const fileInput = document.querySelector('#file-input');
  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        toastFn('Image exceeds the 2 MB limit');
        e.target.value = '';
        return;
      }
      if (!file.type.startsWith('image/')) {
        toastFn('Choose an image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        S.favicon.mode = 'upload';
        favMode = 'upload';
        syncFavInputs();
        loadFavImage(reader.result, toastFn);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    ['dragenter', 'dragover'].forEach(ev =>
      dropZone.addEventListener(ev, e => {
        e.preventDefault();
        dropZone.classList.add('border-[var(--accent-color,#38bdf8)]');
      })
    );
    ['dragleave', 'drop'].forEach(ev =>
      dropZone.addEventListener(ev, e => {
        e.preventDefault();
        dropZone.classList.remove('border-[var(--accent-color,#38bdf8)]');
        if (ev === 'drop') {
          const file = e.dataTransfer.files?.[0];
          if (file) {
            if (file.size > 2 * 1024 * 1024) return toastFn('Image exceeds the 2 MB limit');
            const r = new FileReader();
            r.onload = () => {
              favMode = 'upload';
              S.favicon.mode = 'upload';
              syncFavInputs();
              loadFavImage(r.result, toastFn);
            };
            r.readAsDataURL(file);
          }
        }
      })
    );
  }

  document.querySelectorAll('[data-fav-accent]').forEach(btn =>
    btn.addEventListener('click', () => {
      const name = btn.dataset.favAccent;
      const a = ACCENTS[name];
      if (applyAccentFn) applyAccentFn(name);
      S.accent = name;
      const accSel = document.querySelector('#accentSelect');
      if (accSel) accSel.value = name;
      if (favEls.bg) favEls.bg.value = a.primary;
      if (favEls.bgHex) favEls.bgHex.value = a.primary;
      S.favicon.bgColor = a.primary;
      saveFav();
      if (renderFn) renderFn();
    })
  );

  const btnExportAll = document.querySelector('#btn-export-all');
  if (btnExportAll) {
    btnExportAll.addEventListener('click', () => {
      const sizes = [16, 32, 180, 512];
      sizes.forEach(size => {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        c.getContext('2d').drawImage(favCanvas, 0, 0, size, size);
        const a = document.createElement('a');
        a.href = c.toDataURL('image/png');
        a.download = `favicon-${size}x${size}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
      toastFn('PNG bundle exported (4 files)');
    });
  }

  if (S.favicon.customDataUrl) {
    loadFavImage(S.favicon.customDataUrl, toastFn);
  }
  updateFavicon();
}