/**
 * @file state.js
 * @description Global state management, constants, and default configurations for BookmarkHub.
 */

export const CATS = [
  ['github', 'GitHub'],
  ['youtube', 'YouTube'],
  ['linkedin', 'LinkedIn'],
  ['ai', 'AI & Tools'],
  ['articles', 'Articles'],
  ['other', 'Other']
];

export const TABS = [
  ['all', 'All'],
  ['star', 'Starred'],
  ...CATS
];

export const AI = /(^|\.)(huggingface\.co|kaggle\.com|openai\.com|anthropic\.com|claude\.ai|keras\.io|pinokio\.co|lykos\.ai|makesense\.ai|clawhub\.ai|zeroclawlabs\.ai|evidentlyai\.com|pythonanywhere\.com|replicate\.com|perplexity\.ai|tensorflow\.org|pytorch\.org|aistudio\.google\.com|openrouter\.ai|ollama\.com|langchain\.com|colab\.research\.google\.com)$/;
export const ART = /(^|\.)(medium\.com|sciencedirect\.com|arxiv\.org|venturebeat\.com|forbes\.com|mit\.edu|wikipedia\.org|investopedia\.com|visualcapitalist\.com|theblock\.co|substack\.com|dev\.to|towardsdatascience\.com|techpowerup\.com|nature\.com|ieee\.org|springer\.com|researchgate\.net)$/;

export const TRACK = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];

export const IC = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  down: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1Z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  ext: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  mark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>'
};

export const ACCENTS = {
  sky: { primary: '#38bdf8', hover: '#0ea5e9', mark: '#7dd3fc', ring: '#38bdf8' },
  emerald: { primary: '#10b981', hover: '#059669', mark: '#6ee7b7', ring: '#10b981' },
  violet: { primary: '#8b5cf6', hover: '#7c3aed', mark: '#c4b5fd', ring: '#8b5cf6' },
  rose: { primary: '#f43f5e', hover: '#e11d48', mark: '#fda4af', ring: '#f43f5e' },
  amber: { primary: '#f59e0b', hover: '#d97706', mark: '#fde68a', ring: '#f59e0b' }
};

export const KEY = 'bookmarkhub.v1';
export const PK = 'bookmarkhub.prefs.v1';
export const SK = 'bookmarkhub.sync.v1';

export const SYS = 'system-ui,-apple-system,"Segoe UI",sans-serif';
export const FONTS = {
  dm: ["DM Sans (default)", "'DM Sans'," + SYS],
  sys: ['System Sans', SYS],
  serif: ['Serif', 'Georgia,"Times New Roman",serif'],
  mono: ['Monospace', 'ui-monospace,"SF Mono",Menlo,Consolas,monospace'],
  inter: ['Inter', "'Inter'," + SYS, 'Inter:wght@400;500;600'],
  roboto: ['Roboto', "'Roboto'," + SYS, 'Roboto:wght@400;500;700'],
  merri: ['Merriweather', "'Merriweather',Georgia,serif", 'Merriweather:wght@400;700']
};

export const LOOKS = ['contrast', 'sepia', 'cyber'];
export const PRESETS = {
  dark: { theme: 'dark' },
  light: { theme: 'light' },
  contrast: { theme: 'dark', accent: '#ffd60a', hl: '#ffd60a', surf: { dark: '#000000' } },
  sepia: { theme: 'light', accent: '#b45309', hl: '#fcd34d', surf: { light: '#f1e6cf' } },
  cyber: { theme: 'dark', accent: '#00e5ff', hl: '#ff2bd6', surf: { dark: '#0a0612' } }
};

export const EXTRA = {
  contrast: '.dark .text-zinc-500,.dark .text-zinc-400{color:#e4e4e7!important}.card{border-width:2px!important}.dark .card,.dark #panel{border-color:#a1a1aa!important}',
  cyber: '.dark .card:hover{box-shadow:0 0 0 1px var(--accent-color),0 0 24px color-mix(in srgb,var(--accent-color) 40%,transparent)!important}.dark .brand{text-shadow:0 0 14px color-mix(in srgb,var(--accent-color) 70%,transparent)}'
};

export const DEF = {
  accent: '',
  hl: '',
  surf: { dark: '#09090b', light: '#fafafa' },
  scale: 100,
  css: '',
  preset: '',
  theme: '',
  look: '',
  font: 'dm',
  radius: '',
  density: '',
  updated: 0
};

const ci = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });
export const SORTS = {
  new: (a, b) => b.added - a.added,
  old: (a, b) => a.added - b.added,
  az: (a, b) => ci(a.title, b.title),
  za: (a, b) => ci(b.title, a.title),
  dom: (a, b) => ci(a.domain, b.domain) || ci(a.title, b.title)
};

export const S = {
  items: [],
  q: '',
  tab: 'all',
  view: 'grid',
  theme: 'dark',
  accent: 'sky',
  seeded: 0,
  sort: 'new',
  tag: '',
  folder: '',
  sel: new Set(),
  selMode: false,
  vis: [],
  favicon: {
    mode: 'emoji',
    text: '🚀',
    bgColor: '#3b82f6',
    textColor: '#ffffff',
    radius: 25,
    fontSize: 55,
    customDataUrl: ''
  }
};