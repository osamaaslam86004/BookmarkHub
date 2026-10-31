# BookmarkHub 🚀

**BookmarkHub** is a privacy-first, offline-ready, high-performance bookmark management system built with **Vanilla JavaScript (ES Modules)**, **Vite**, **Tailwind CSS v4**, and **Vercel Serverless Functions**. It features end-to-end encrypted cloud synchronization, offline IndexedDB storage, instant typo-tolerant fuzzy search with field operators, a dynamic Favicon Studio canvas generator, and a live WCAG-compliant appearance customizer.

---

## 🌟 Key Features

- **Offline-First Storage**: Full offline functionality using IndexedDB (`bookmarkhub` database) with fallback to `localStorage`.
- **End-to-End Encrypted Cloud Sync**: Zero-knowledge E2E encryption powered by **AES-GCM (256-bit)** and **PBKDF2 (150,000 iterations)**. Server only ever sees opaque sync keys and ciphertext. Includes 3-way merge conflict resolution backed by Upstash Redis Compare-And-Set (CAS) Lua scripts.
- **Advanced Search Engine**:
  - **Filter Operators**: `tag:`, `domain:`, `cat:`, `folder:`, `is:starred`, `is:broken`, `is:blocked`, `is:untagged`.
  - **Typo Tolerance**: Integrated Levenshtein distance matching for resilient, instant search across titles, URLs, tags, and notes.
- **Link Health Probing (`api/check.js`)**: Serverless batch link health verification with strict **SSRF guards** (blocking loopback, private, link-local, and mapped-IPv6 addresses across redirect hops).
- **Favicon Studio**: In-browser canvas generator for custom tab favicons (emoji/text or custom image upload) with multi-size PNG bundle exports (16x16, 32x32, 180x180, 512x512).
- **Appearance Customizer**: Theme presets (Dark, Light, High Contrast, Sepia, Cyberpunk), dynamic accent color mapping, custom font loading, density adjustments, real-time WCAG 2.1 contrast evaluation, and custom CSS injection.
- **Power Tools**: Command Palette (`Ctrl+K` / `Cmd+K`), bulk bookmark tagging/moving/deletion, Netscape HTML and JSON import/export, library analytics dashboard, and tag manager.

---

## 📂 Project Architecture

```
BookmarkHub/
├── api/
│   ├── check.js          # Link health probe serverless function with SSRF guards
│   └── sync.js           # E2E encrypted KV blob storage with Upstash Redis CAS Lua scripts
├── src/
│   ├── css/
│   │   └── tailwind.css  # Tailwind CSS v4 setup & custom component utility classes
│   ├── js/
│   │   ├── state.js      # Global state store, constants, & default configurations
│   │   ├── storage.js    # IndexedDB & LocalStorage persistence layer
│   │   ├── sync.js       # E2E AES-GCM + PBKDF2 encryption & 3-way cloud merge
│   │   ├── search.js     # Query parser, operator filters, & fuzzy/Levenshtein matching
│   │   ├── utils.js      # Helpers, escape functions, exporters (JSON/HTML)
│   │   ├── faviconStudio.js # Canvas rendering engine & live browser tab favicon injection
│   │   ├── customizer.js # Theme presets, WCAG 2.1 contrast checks, & custom CSS injection
│   │   └── ui.js         # Main UI rendering loop, Command Palette, modals, & event delegation
│   └── index.html        # Clean HTML shell referencing Vite ES Module entry
├── package.json          # Vite & Tailwind CSS v4 dependencies and scripts
├── vite.config.js        # Vite bundler configuration
└── vercel.json           # Vercel deployment & serverless function rules
```

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES Modules), Vite 6, Tailwind CSS v4, HTML5 Canvas, IndexedDB API, Web Crypto API.
- **Backend / Serverless**: Node.js (Vercel Serverless Functions).
- **Database / Key-Value Store**: Upstash Redis (via Vercel Marketplace KV REST API).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the Vite local development server with hot module replacement (HMR):
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### Production Build

Compile and bundle the project for deployment:
```bash
npm run build
```
The production output will be generated in the `dist/` directory.

---

## 🌐 Vercel Deployment & Cloud Sync Configuration

BookmarkHub is configured for seamless deployment on **Vercel**.

1. Deploy the project to Vercel:
   ```bash
   vercel
   ```

2. Configure Upstash Redis for E2E Encrypted Cloud Sync:
   - Create an Upstash Redis database via the Vercel Marketplace or directly at Upstash.
   - In your Vercel Project Settings, configure the following Environment Variables:
     - `UPSTASH_REDIS_REST_URL` (or `KV_REST_API_URL`)
     - `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_TOKEN`)

---

## 🔍 Feature Guide

### Search Operators
You can combine standard text queries with advanced operators:
- `tag:ai` — Filter by tag.
- `domain:github.com` — Filter by domain host.
- `cat:youtube` — Filter by category (`github`, `youtube`, `linkedin`, `ai`, `articles`, `other`).
- `folder:Tech/AI` — Filter by nested folder path.
- `is:starred` — Show favorite bookmarks only.
- `is:broken` — Show links flagged as broken or unreachable by health check.
- `is:untagged` — Show bookmarks without assigned tags.

### E2E Encrypted Cloud Sync Mechanics
1. **Key Derivation**: When turning on cloud sync, a master key generates:
   - `AES-GCM` 256-bit encryption key (using `PBKDF2` with 150,000 iterations & salt `bh-enc`).
   - Opaque `Sync ID` hash (using `PBKDF2` with salt `bh-id`). The server **never** receives the encryption key.
2. **Conflict Resolution**: Sync uses a 3-way merge (`lm`, `rm`, `base`). Server writes use Redis `EVAL` Lua compare-and-set (`CAS`) script on revision numbers (`baseRev`).

---

## 📄 License

This project is open-source under the MIT License.
