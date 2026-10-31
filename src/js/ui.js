/**
 * @file ui.js
 * @description Main UI rendering engine, DOM event delegation, Command Palette, modals, and app lifecycle bootstrapper.
 */

import { S, CATS, TABS, ACCENTS, SORTS } from './state.js';
import { ic, esc, show, copy, exportJSON, exportHTML, make, parse } from './utils.js';
import { save, merge, initStorageFromLocalStorage, IDB, fixItems, idbFlush, idbOk } from './storage.js';
import { match, hl } from './search.js';
import { syncNow, scheduleSync, cloudOn, cloudOff, setStat, getSY } from './sync.js';
import { openFaviconStudio, initFaviconStudio, updateFavicon } from './faviconStudio.js';
import { applyAccent, applyPreset, resetPrefs, copyCode, applyCode, openPanel, initCustomizer, adopt, getP, setPref, syncPanel } from './customizer.js';

let tt;

export function toast(m, undo) {
  const t = document.querySelector('#toast');
  if (!t) return;
  t.innerHTML = `<span>${esc(m)}</span>` + (undo ? '<button class="ml-3 font-semibold text-[var(--accent-color,#38bdf8)]">Undo</button>' : '');
  if (undo) {
    const btn = t.querySelector('button');
    if (btn) btn.onclick = () => { undo(); t.classList.add('hidden'); };
  }
  t.classList.remove('hidden');
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.add('hidden'), undo ? 5000 : 3000);
}

const BADGE = 'rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';

const fav = b =>
  `<img src="${esc(b.icon || 'https://www.google.com/s2/favicons?domain=' + b.host + '&sz=64')}" alt="" loading="lazy" data-l="${esc(
    (b.domain || '?')[0].toUpperCase()
  )}" class="h-8 w-8 shrink-0 rounded-lg bg-zinc-100 object-contain p-1 dark:bg-zinc-800">`;

const ab = (act, id, icon, label, color, cls = '') =>
  `<button data-act="${act}" data-id="${esc(id)}" title="${label}" aria-label="${label}" class="rounded-md p-1.5 ${color} hover:bg-zinc-200/70 dark:hover:bg-zinc-800">${ic(
    icon,
    'h-4 w-4 ' + cls
  )}</button>`;

const acts = b =>
  `<a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer" title="Open link" class="rounded-md p-1.5 text-zinc-400 hover:text-[var(--accent-color,#38bdf8)]">${ic('ext')}</a>` +
  ab('copy', b.id, 'copy', 'Copy URL', 'text-zinc-400') +
  ab('star', b.id, 'star', b.star ? 'Remove favorite' : 'Add favorite', b.star ? 'text-amber-400' : 'text-zinc-400', b.star ? 'fill-current' : '') +
  ab('edit', b.id, 'mark', 'Edit bookmark', 'text-zinc-400') +
  ab('del', b.id, 'trash', 'Delete', 'text-zinc-400 hover:text-red-500');

const tagPills = b =>
  (b.tags || [])
    .map(
      t =>
        `<button data-tag="${esc(t)}" class="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-600 hover:bg-sky-500/20 dark:text-sky-300">#${esc(t)}</button>`
    )
    .join('');

const hb = b => {
  const A = 'bg-amber-500/10 text-amber-600 dark:text-amber-300';
  const H = {
    broken: ['bg-red-500/10 text-red-600 dark:text-red-300', b.status ? `Broken · HTTP ${b.status}` : 'Unreachable'],
    blocked: [A, `Can’t verify · HTTP ${b.status}`],
    unreachable: [A, 'Possibly unreachable']
  }[b.health === 'bad' ? 'unreachable' : b.health];

  return H
    ? `<span title="Checked ${new Date(b.healthChecked || 0).toLocaleDateString()}" class="mt-2 inline-flex rounded-md px-2 py-0.5 text-xs ${H[0]}">⚠️ ${H[1]}</span>`
    : '';
};

const card = b =>
  `<article class="card flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm hover:border-[var(--accent-color,#38bdf8)] hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 ${
    S.view === 'list' ? 'sm:flex-row sm:items-center' : ''
  } ${S.sel.has(b.id) ? 'ring-2 ring-[var(--accent-color,#38bdf8)]' : ''}"><div class="flex min-w-0 gap-3">${
    S.selMode
      ? `<input type="checkbox" data-sel="${b.id}" aria-label="Select ${esc(b.title)}" ${
          S.sel.has(b.id) ? 'checked' : ''
        } class="mt-1.5 h-4 w-4 shrink-0 accent-[var(--accent-color,#38bdf8)]">`
      : ''
  }${fav(b)}<div class="min-w-0 flex-1"><a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer" class="${
    S.view === 'grid' ? 'line-clamp-2' : 'block'
  } break-words text-sm font-medium leading-snug hover:text-[var(--accent-color,#38bdf8)]">${hl(b.title, S)} ${ic(
    'ext',
    'ml-1 inline h-3 w-3 opacity-50'
  )}</a><p class="mt-0.5 truncate text-xs text-zinc-500">${hl(show(b.url), S)}</p>${
    b.notes ? `<p class="mt-1 line-clamp-1 text-xs text-zinc-400 italic">📝 ${hl(b.notes, S)}</p>` : ''
  }${b.folder ? `<p class="mt-1 truncate text-xs text-violet-500">📁 ${esc(b.folder)}</p>` : ''}${hb(b)}<div class="mt-2 flex flex-wrap gap-1">${tagPills(
    b
  )}</div></div></div><div class="mt-3 flex items-center justify-between gap-2 sm:mt-0"><span class="${BADGE}">${hl(
    b.domain,
    S
  )}</span><div class="flex shrink-0">${acts(b)}</div></div></article>`;

const empty = () =>
  `<div class="mx-auto flex max-w-sm flex-col items-center py-20 text-center"><div class="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--accent-color,#38bdf8)]/10 text-[var(--accent-color,#38bdf8)]">${ic(
    'mark',
    'h-8 w-8'
  )}</div><h3 class="brand text-lg font-bold">Nothing here yet</h3><p class="mt-1 text-sm text-zinc-500">Try another filter, import bookmarks, or add a link.</p><button data-act="add" class="mt-4 rounded-lg bg-[var(--accent-color,#38bdf8)] px-3 py-2 text-sm font-semibold text-white">Add bookmark</button></div>`;

const inTab = (b, t) => t === 'all' || (t === 'star' ? b.star : b.cat === t);

export function render(swap) {
  document.documentElement.classList.toggle('dark', S.theme === 'dark');
  const themeB = document.querySelector('#themeB');
  const viewB = document.querySelector('#viewB');
  const accentSelect = document.querySelector('#accentSelect');
  const tabs = document.querySelector('#tabs');
  const tagsBar = document.querySelector('#tagsBar');
  const folderFilter = document.querySelector('#folderFilter');
  const sortSel = document.querySelector('#sortSel');
  const box = document.querySelector('#list');
  const meta = document.querySelector('#meta');

  if (themeB) themeB.innerHTML = ic(S.theme === 'dark' ? 'sun' : 'moon');
  if (viewB)
    viewB.innerHTML =
      ic(S.view === 'grid' ? 'list' : 'grid') + `<span class="hidden lg:inline">${S.view === 'grid' ? 'List' : 'Cards'}</span>`;
  if (accentSelect) accentSelect.value = S.accent || 'sky';

  const found = S.items.filter(b => match(b, S));

  if (tabs) {
    tabs.innerHTML = TABS.map(([id, label], i) => {
      const on = id === S.tab;
      return `<button data-tab="${id}" aria-current="${on}" title="Shortcut ${
        i + 1
      }" class="-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium ${
        on
          ? 'border-[var(--accent-color,#38bdf8)] text-zinc-900 dark:text-white'
          : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
      }">${label}<span class="rounded-full px-1.5 text-xs ${
        on ? 'bg-[var(--accent-color,#38bdf8)] text-white' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
      }">${found.filter(b => inTab(b, id)).length}</span></button>`;
    }).join('');
  }

  if (tagsBar) {
    const tags = {};
    S.items.forEach(b => (b.tags || []).forEach(t => (tags[t] = (tags[t] || 0) + 1)));
    tagsBar.innerHTML =
      Object.entries(tags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(
          ([t, n]) =>
            `<button data-tag="${esc(t)}" class="rounded-full px-2.5 py-1 text-xs ${
              S.tag === t
                ? 'bg-[var(--accent-color,#38bdf8)] text-white'
                : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
            }">#${esc(t)} <span class="opacity-70">${n}</span></button>`
        )
        .join('') + (S.tag ? '<button data-tag="" class="hb !py-1 text-xs">Clear tag ×</button>' : '');
  }

  if (folderFilter) {
    const folders = [...new Set(S.items.map(b => b.folder).filter(Boolean))].sort();
    folderFilter.innerHTML =
      '<option value="">All folders</option>' +
      folders.map(f => `<option value="${esc(f)}" ${S.folder === f ? 'selected' : ''}>${esc(f)}</option>`).join('');
  }

  const rows = found.filter(b => inTab(b, S.tab)).sort(SORTS[S.sort] || SORTS.new);
  S.vis = rows.map(b => b.id);
  if (sortSel) sortSel.value = S.sort || 'new';
  renderBulk();

  if (box) {
    box.className = rows.length
      ? S.view === 'grid'
        ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        : 'flex flex-col gap-1.5'
      : '';
    box.innerHTML = rows.length ? rows.map(card).join('') : empty();
    if (swap) {
      box.classList.remove('swap');
      void box.offsetWidth;
      box.classList.add('swap');
    }
  }

  if (meta) {
    meta.textContent = `${rows.length} bookmark${rows.length === 1 ? '' : 's'}${S.tag ? ' · #' + S.tag : ''}${
      S.folder ? ' · ' + S.folder : ''
    }`;
  }
}

export function renderBulk() {
  const on = S.selMode;
  const b = document.querySelector('#bulk');
  const bulkN = document.querySelector('#bulkN');
  const selB = document.querySelector('#selB');
  if (b) {
    b.classList.toggle('hidden', !on);
    b.classList.toggle('flex', on);
  }
  if (bulkN) bulkN.textContent = `${S.sel.size} selected`;
  if (selB) selB.setAttribute('aria-pressed', on);
}

export function toggleSel() {
  S.selMode = !S.selMode;
  S.sel.clear();
  render();
}

export function bulkOp(op, v) {
  const sel = S.items.filter(b => S.sel.has(b.id));

  if (op === 'all') {
    S.vis.forEach(id => S.sel.add(id));
  } else if (!sel.length) {
    return toast('Select some links first');
  } else if (op === 'tag') {
    const t = (v || '').trim().toLowerCase().replace(/^#/, '');
    if (!t) return toast('Type a tag first');
    sel.forEach(b => {
      if (!b.tags.includes(t)) b.tags.push(t);
    });
    const bTag = document.querySelector('#bTag');
    if (bTag) bTag.value = '';
    toast(`Tagged ${sel.length} link${sel.length > 1 ? 's' : ''} #${t}`);
  } else if (op === 'move') {
    sel.forEach(b => (b.cat = v));
    const catLabel = (CATS.find(c => c[0] === v) || [, v])[1];
    toast(`Moved ${sel.length} to ${catLabel}`);
  } else if (op === 'star') {
    const on = !sel.every(b => b.star);
    sel.forEach(b => (b.star = on));
  } else if (op === 'del') {
    const prev = S.items.slice();
    S.items = S.items.filter(b => !S.sel.has(b.id));
    S.sel.clear();
    save(false, toast, scheduleSyncWrapper);
    render();
    return toast(`Deleted ${sel.length} link${sel.length > 1 ? 's' : ''}`, () => {
      S.items = prev;
      save(false, toast, scheduleSyncWrapper);
      render();
    });
  }

  save(false, toast, scheduleSyncWrapper);
  render();
}

const scheduleSyncWrapper = () => scheduleSync(render, getP, setPref, adopt, syncPanel);

export function editBookmark(b) {
  const f = document.querySelector('#f');
  if (!f) return;
  f.reset();
  document.querySelector('#fT').value = b.title;
  document.querySelector('#fU').value = b.url;
  document.querySelector('#fC').value = b.cat;
  document.querySelector('#fTags').value = (b.tags || []).join(', ');
  document.querySelector('#fFolder').value = b.folder || '';
  document.querySelector('#fNotes').value = b.notes || '';

  f.dataset.edit = b.id;
  const dlg = document.querySelector('#dlg');
  dlg.querySelector('h2').textContent = 'Edit bookmark';
  dlg.showModal();
  document.querySelector('#fT').focus();
}

export function openInfo(title, html) {
  const infoTitle = document.querySelector('#infoTitle');
  const infoBody = document.querySelector('#infoBody');
  const infoDlg = document.querySelector('#infoDlg');
  if (infoTitle) infoTitle.textContent = title;
  if (infoBody) infoBody.innerHTML = html;
  if (infoDlg) infoDlg.showModal();
}

export function tagManagerModal() {
  const tags = {};
  S.items.forEach(b => (b.tags || []).forEach(t => (tags[t] = (tags[t] || 0) + 1)));
  const html = `<p class="text-sm text-zinc-500 mb-4">Rename or delete tags across your library.</p><div class="space-y-2">${
    Object.entries(tags)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([t, n]) =>
          `<div class="flex items-center justify-between rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-800"><span class="font-medium">#${esc(
            t
          )} <span class="text-xs text-zinc-400">(${n})</span></span><div class="flex gap-2"><button data-ren-tag="${esc(
            t
          )}" class="hb !py-1 text-xs">Rename</button><button data-del-tag="${esc(
            t
          )}" class="hb !py-1 text-xs text-red-500">Delete</button></div></div>`
      )
      .join('') || '<p class="text-sm text-zinc-500">No tags found.</p>'
  }</div>`;
  openInfo('Tag Manager', html);
}

export function stats() {
  const items = S.items;
  const domains = {};
  items.forEach(b => (domains[b.domain] = (domains[b.domain] || 0) + 1));
  const top = Object.entries(domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const cats = CATS.map(([id, l]) => [l, items.filter(b => b.cat === id).length]).filter(x => x[1]);
  const max = Math.max(1, ...top.map(x => x[1]));
  const total = items.length;
  const week = Date.now() - 7 * 864e5;
  const recent = items.filter(b => b.added >= week).length;

  const bar = (label, n, maxv, color = 'bg-[var(--accent-color,#38bdf8)]') =>
    `<div class="mb-3"><div class="mb-1 flex justify-between text-sm"><span>${esc(
      label
    )}</span><span class="text-zinc-500">${n}</span></div><div class="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"><div class="h-full ${color}" style="width:${Math.round(
      (n / maxv) * 100
    )}%"></div></div></div>`;

  openInfo(
    'Library analytics',
    `<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">${[
      ['Unique bookmarks', total],
      ['Unique domains', Object.keys(domains).length],
      ['Favorites', items.filter(b => b.star).length],
      ['Added in 7 days', recent]
    ]
      .map(
        ([l, n]) =>
          `<div class="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800"><p class="text-xs text-zinc-500">${l}</p><p class="brand mt-1 text-2xl font-bold">${n}</p></div>`
      )
      .join('')}</div><h3 class="mb-3 mt-6 font-semibold">Top domains</h3>${
      top.map(([d, n]) => bar(d, n, max)).join('') || '<p class="text-sm text-zinc-500">No bookmarks yet.</p>'
    }<h3 class="mb-3 mt-6 font-semibold">Category distribution</h3>${cats
      .map(([l, n]) => bar(l, n, Math.max(1, total), 'bg-violet-500'))
      .join('')}`
  );
}

export function shortcuts() {
  openInfo(
    'Keyboard shortcuts',
    `<div class="space-y-2 text-sm">${[
      ['Ctrl / Cmd + K', 'Open command palette'],
      ['1–7', 'Switch tabs instantly'],
      ['T', 'Toggle dark/light mode'],
      ['V', 'Toggle grid/list view'],
      ['/', 'Focus search'],
      ['?', 'Show this shortcut sheet'],
      ['Esc', 'Close dialogs']
    ]
      .map(
        ([k, v]) =>
          `<div class="flex gap-4 border-b border-zinc-200 py-2 dark:border-zinc-800"><kbd class="min-w-28 rounded bg-zinc-100 px-2 py-1 font-mono dark:bg-zinc-800">${k}</kbd><span>${v}</span></div>`
      )
      .join('')}`
  );
}

export function paletteRender() {
  const paletteQ = document.querySelector('#paletteQ');
  const paletteResults = document.querySelector('#paletteResults');
  if (!paletteQ || !paletteResults) return;

  const q = paletteQ.value.toLowerCase();
  const rows = S.items
    .filter(b => `${b.title} ${b.url} ${b.notes || ''} ${b.tags.join(' ')}`.toLowerCase().includes(q))
    .slice(0, 30);

  paletteResults.innerHTML =
    rows
      .map(
        (b, i) =>
          `<button data-palette-id="${b.id}" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800" data-index="${i}"><span class="truncate text-sm">${esc(
            b.title
          )}<span class="ml-2 text-xs text-zinc-500">${esc(b.domain)}</span></span><span class="text-xs text-zinc-400">↵</span></button>`
      )
      .join('') || '<p class="p-3 text-sm text-zinc-500">No matching bookmarks.</p>';

  paletteResults.querySelector('button')?.classList.add('bg-zinc-100', 'dark:bg-zinc-800');
}

export function openPalette() {
  const paletteQ = document.querySelector('#paletteQ');
  const paletteDlg = document.querySelector('#paletteDlg');
  if (paletteQ) paletteQ.value = '';
  paletteRender();
  if (paletteDlg) paletteDlg.showModal();
  if (paletteQ) paletteQ.focus();
}

export async function healthCheck() {
  const items = [...S.items];
  if (!items.length) return toast('No bookmarks to check');

  let done = 0;
  let api = true;
  toast(`Checking links… 0/${items.length}`);

  const mark = (b, h, s) => {
    b.health = h;
    b.status = s || 0;
    b.healthChecked = Date.now();
  };

  for (let i = 0; i < items.length; i += 15) {
    const batch = items.slice(i, i + 15);
    let res = null;

    if (api) {
      try {
        const r = await fetch('/api/check', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ urls: batch.map(b => b.url) })
        });
        if (r.ok) res = (await r.json()).results;
        else api = false;
      } catch {
        api = false;
      }
    }

    if (res) {
      const m = new Map(res.map(x => [x.url, x.status]));
      batch.forEach(b => {
        const s = m.get(b.url) || 0;
        mark(b, s >= 200 && s < 400 ? 'ok' : [401, 403, 429, 999].includes(s) ? 'blocked' : 'broken', s);
      });
    } else {
      await Promise.all(
        batch.map(async b => {
          try {
            const c = new AbortController();
            const t = setTimeout(() => c.abort(), 4000);
            await fetch(b.url, { method: 'HEAD', mode: 'no-cors', signal: c.signal });
            clearTimeout(t);
            mark(b, 'ok');
          } catch {
            mark(b, 'unreachable');
          }
        })
      );
    }

    done += batch.length;
    toast(`Checking links… ${done}/${items.length}`);
  }

  save(false, toast, scheduleSyncWrapper);
  render();
  const n = h => items.filter(b => b.health === h).length;
  toast(
    api
      ? `Done: ${n('broken')} broken, ${n('blocked')} can’t be verified (the site blocks bots).`
      : `Limited check: ${n('unreachable')} possibly unreachable. Deploy with /api/check for real HTTP status.`
  );
}

document.addEventListener('click', e => {
  const ren = e.target.closest('[data-ren-tag]');
  if (ren) {
    const oldTag = ren.dataset.renTag;
    const newTag = prompt(`Rename tag #${oldTag} to:`, oldTag)?.trim().toLowerCase().replace(/^#/, '');
    if (newTag && newTag !== oldTag) {
      S.items.forEach(b => {
        if (b.tags?.includes(oldTag)) {
          b.tags = b.tags.map(t => (t === oldTag ? newTag : t));
        }
      });
      save(false, toast, scheduleSyncWrapper);
      render();
      tagManagerModal();
      toast(`Renamed #${oldTag} to #${newTag}`);
    }
    return;
  }

  const delTag = e.target.closest('[data-del-tag]');
  if (delTag) {
    const t = delTag.dataset.delTag;
    if (confirm(`Remove tag #${t} from all bookmarks?`)) {
      S.items.forEach(b => {
        if (b.tags) b.tags = b.tags.filter(x => x !== t);
      });
      save(false, toast, scheduleSyncWrapper);
      render();
      tagManagerModal();
      toast(`Deleted tag #${t}`);
    }
    return;
  }

  const tag = e.target.closest('[data-tag]');
  if (tag) {
    S.tag = tag.dataset.tag;
    render(true);
    return;
  }

  const palette = e.target.closest('[data-palette-id]');
  if (palette) {
    const b = S.items.find(x => x.id === palette.dataset.paletteId);
    if (b) window.open(b.url, '_blank', 'noopener');
    document.querySelector('#paletteDlg').close();
    return;
  }

  const t = e.target.closest('[data-act],[data-tab]');
  if (!t) return;

  if (t.dataset.tab) {
    S.tab = t.dataset.tab;
    return render(true);
  }

  const { act, id } = t.dataset;
  const i = S.items.findIndex(b => b.id === id);

  if (act === 'copy' && i >= 0) copy(S.items[i].url, () => toast('URL copied'));
  else if (act === 'star' && i >= 0) {
    S.items[i].star = !S.items[i].star;
    save(false, toast, scheduleSyncWrapper);
    render();
  } else if (act === 'del' && i >= 0) {
    const [b] = S.items.splice(i, 1);
    save(false, toast, scheduleSyncWrapper);
    render();
    toast(`Deleted “${b.title.slice(0, 40)}”`, () => {
      S.items.splice(i, 0, b);
      save(false, toast, scheduleSyncWrapper);
      render();
    });
  } else if (act === 'edit' && i >= 0) editBookmark(S.items[i]);
  else if (act === 'view') {
    S.view = S.view === 'grid' ? 'list' : 'grid';
    save(false, toast, scheduleSyncWrapper);
    render(true);
  } else if (act === 'theme') {
    S.theme = S.theme === 'dark' ? 'light' : 'dark';
    setPref({ theme: S.theme }, false, scheduleSyncWrapper);
    syncPanel();
    render();
  } else if (act === 'export') exportJSON(S.items);
  else if (act === 'exportHtml') exportHTML(S.items);
  else if (act === 'health') healthCheck();
  else if (act === 'tagManager') tagManagerModal();
  else if (act === 'stats') stats();
  else if (act === 'shortcuts') shortcuts();
  else if (act === 'faviconStudio') openFaviconStudio();
  else if (act === 'closeFavicon') document.querySelector('#faviconDlg').close();
  else if (act === 'palette') openPalette();
  else if (act === 'customize') openPanel();
  else if (act === 'selmode' || act === 'bDone') toggleSel();
  else if (act === 'bAll') bulkOp('all');
  else if (act === 'bTag') bulkOp('tag', document.querySelector('#bTag').value);
  else if (act === 'bStar') bulkOp('star');
  else if (act === 'bDel') bulkOp('del');
  else if (act === 'cNew') cloudOn(undefined, toast, render, getP, setPref, adopt, syncPanel);
  else if (act === 'cLink') cloudOn(document.querySelector('#cKey').value, toast, render, getP, setPref, adopt, syncPanel);
  else if (act === 'cNow') syncNow(render, getP, setPref, adopt, syncPanel);
  else if (act === 'cCopy') {
    const SY = getSY();
    if (SY) {
      navigator.clipboard.writeText(SY.key).then(() => toast('Sync key copied'));
    }
  } else if (act === 'cOffBtn') cloudOff(toast);
  else if (act === 'closePanel') openPanel(false);
  else if (act === 'resetPrefs') resetPrefs(render, toast, scheduleSyncWrapper);
  else if (act === 'copyCode') copyCode(toast);
  else if (act === 'applyCode') applyCode(render, toast, scheduleSyncWrapper);
  else if (act === 'closeInfo') document.querySelector('#infoDlg').close();
  else if (act === 'import') document.querySelector('#file').click();
  else if (act === 'clear') {
    S.q = '';
    document.querySelector('#q').value = '';
    render();
  } else if (act === 'add') {
    const f = document.querySelector('#f');
    delete f.dataset.edit;
    f.reset();
    f.querySelector('h2').textContent = 'Add bookmark';
    document.querySelector('#dlg').showModal();
    document.querySelector('#fU').focus();
  }
});

document.addEventListener(
  'error',
  e => {
    const i = e.target;
    if (i.tagName !== 'IMG' || !i.dataset.l) return;
    const s = document.createElement('span');
    s.className =
      'grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-color,#38bdf8)]/15 text-sm font-semibold text-[var(--accent-color,#38bdf8)]';
    s.textContent = i.dataset.l;
    i.replaceWith(s);
  },
  true
);

document.querySelector('#q')?.addEventListener('input', e => {
  S.q = e.target.value.trim();
  render();
});

document.querySelector('#folderFilter')?.addEventListener('change', e => {
  S.folder = e.target.value;
  render();
});

document.querySelector('#accentSelect')?.addEventListener('change', e => {
  S.accent = e.target.value;
  applyAccent(S.accent);
  setPref({ accent: '', hl: '', preset: S.accent }, false, scheduleSyncWrapper);
  save(false, toast, scheduleSyncWrapper);
  syncPanel();
  render();
});

document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  const paletteOpen = document.querySelector('#paletteDlg')?.open;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openPalette();
    return;
  }

  if (e.key === 'Escape') {
    if (S.selMode) toggleSel();
    if (!document.querySelector('#panel')?.inert) openPanel(false);
    if (document.querySelector('#infoDlg')?.open) document.querySelector('#infoDlg').close();
    if (paletteOpen) document.querySelector('#paletteDlg').close();
    if (document.activeElement === document.querySelector('#q')) {
      document.querySelector('#q').value = '';
      S.q = '';
      render();
    }
    return;
  }

  if (paletteOpen) {
    const buttons = [...document.querySelectorAll('#paletteResults [data-palette-id]')];
    let idx = buttons.findIndex(b => b.classList.contains('bg-zinc-100'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons.forEach((b, j) => b.classList.toggle('bg-zinc-100', j === idx));
      buttons[idx]?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      buttons[idx >= 0 ? idx : 0]?.click();
      return;
    }
  }

  if (typing) return;

  if (e.key === '/') {
    e.preventDefault();
    document.querySelector('#q')?.focus();
  } else if (e.key === '?') {
    shortcuts();
  } else if (e.key.toLowerCase() === 't') {
    document.querySelector('[data-act="theme"]')?.click();
  } else if (e.key.toLowerCase() === 'v') {
    document.querySelector('[data-act="view"]')?.click();
  } else if (/^[1-7]$/.test(e.key)) {
    const tab = TABS[+e.key - 1];
    if (tab) {
      S.tab = tab[0];
      render(true);
    }
  }
});

document.querySelector('#paletteQ')?.addEventListener('input', paletteRender);

document.querySelector('#file')?.addEventListener('change', async e => {
  const f = e.target.files?.[0];
  if (!f) return;
  const list = parse(await f.text());
  const added = merge(list);
  e.target.value = '';
  save(false, toast, scheduleSyncWrapper);
  render();
  toast(
    list.length ? `Imported ${added} new links · ${list.length - added} duplicates skipped` : 'No bookmarks found in that file'
  );
});

const fC = document.querySelector('#fC');
if (fC) {
  fC.innerHTML = '<option value="">Auto-detect from URL</option>' + CATS.map(([id, l]) => `<option value="${id}">${l}</option>`).join('');
}

document.querySelector('#fX')?.addEventListener('click', () => document.querySelector('#dlg')?.close());

document.querySelector('#f')?.addEventListener('submit', e => {
  e.preventDefault();
  let u = document.querySelector('#fU').value.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;

  const editId = document.querySelector('#f').dataset.edit;
  const old = S.items.find(b => b.id === editId);

  const b = make(
    u,
    document.querySelector('#fT').value.trim(),
    old?.icon || '',
    old?.added || Date.now(),
    document.querySelector('#fC').value,
    {
      tags: [
        ...new Set(
          document
            .querySelector('#fTags')
            .value.split(',')
            .map(t => t.trim().toLowerCase().replace(/^#/, ''))
            .filter(Boolean)
        )
      ],
      folder: document.querySelector('#fFolder').value.trim(),
      notes: document.querySelector('#fNotes').value.trim(),
      health: old?.health || ''
    }
  );

  if (!b) return toast('That URL doesn’t look valid');

  if (old) {
    if (S.items.some(x => x.id !== old.id && x.key === b.key)) return toast('Another bookmark already uses this URL');
    Object.assign(old, b, { id: old.id, star: old.star });
  } else if (!merge([b])) {
    return toast('Already in your library');
  }

  document.querySelector('#dlg').close();
  delete document.querySelector('#f').dataset.edit;
  S.tab = b.cat;
  S.q = '';
  const qEl = document.querySelector('#q');
  if (qEl) qEl.value = '';
  save(false, toast, scheduleSyncWrapper);
  render(true);
  toast(old ? 'Bookmark updated' : 'Bookmark added');
});

document.addEventListener('DOMContentLoaded', async () => {
  initStorageFromLocalStorage();

  ['logo:mark', 'sIc:search', 'upIc:up', 'dnIc:down', 'plIc:plus'].forEach(p => {
    const [id, n] = p.split(':');
    const el = document.querySelector('#' + id);
    if (el) el.innerHTML = ic(n, id === 'logo' ? 'h-6 w-6 fill-current' : 'h-4 w-4');
  });

  if (idbOk) {
    try {
      const d = await IDB.get('data');
      if (d) {
        S.items = fixItems(d.items);
        S.favicon = { ...S.favicon, ...d.favicon };
      }
      await idbFlush(toast);
      save(true, toast, scheduleSyncWrapper);
    } catch {
      save(true, toast, scheduleSyncWrapper);
    }
  }

  if (!S.seeded) {
    const seed = document.querySelector('#seed');
    if (seed) {
      const n = merge(parse(seed.textContent));
      const d = +seed.dataset.dupes || 0;
      S.seeded = 1;
      save(false, toast, scheduleSyncWrapper);
      if (n) toast(`Loaded ${n} unique links · ${d} duplicates removed`);
    }
  }

  setStat();
  render();
  initCustomizer(render, scheduleSyncWrapper);
  initFaviconStudio(toast, applyAccent, render);

  syncNow(render, getP, setPref, adopt, syncPanel);

  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncNow(render, getP, setPref, adopt, syncPanel);
  });
  setInterval(() => {
    if (!document.hidden) syncNow(render, getP, setPref, adopt, syncPanel);
  }, 90000);
  window.addEventListener('pagehide', () => {
    if (idbOk) idbFlush(toast);
  });
});