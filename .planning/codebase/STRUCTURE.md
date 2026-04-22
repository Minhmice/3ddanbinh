# Codebase Structure

**Analysis Date:** 2026-04-22

## Directory Layout

```
[project-root]/
├── .planning/                 # Planning artifacts (includes .planning/codebase/)
├── public/
│   └── models/                # Runtime-served GLB assets (and *_original.glb backups)
├── scripts/                   # Model fetch + optimization scripts
├── src/
│   ├── app/                   # Next.js App Router (routes, layout, global CSS)
│   ├── components/            # Client components (viewer + UI composition)
│   │   └── ui/                # shadcn-style UI primitives
│   ├── hooks/                 # React hooks (layer state management)
│   ├── lib/                   # Small config/utils modules
│   └── types/                 # Type augmentations / shared types
├── manifest.json              # Google Drive asset manifest (folderId + dest)
├── next.config.ts             # Next config (static export + dev origin allowlist)
├── package.json               # JS deps + model pipeline scripts
├── package-lock.json          # npm lockfile
├── requirements.txt           # Python deps (gdown)
├── postcss.config.mjs         # Tailwind v4 PostCSS plugin config
├── eslint.config.mjs          # ESLint config (Next core-web-vitals + TS)
└── tsconfig.json              # TypeScript config + @/* alias
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router entry + global styling
- Contains:
  - `src/app/layout.tsx` (document shell + fonts)
  - `src/app/page.tsx` (home route)
  - `src/app/globals.css` (Tailwind v4 entry + design tokens + animations)
  - `src/app/favicon.ico`

**`src/components/`:**
- Purpose: view-layer composition and UI components for the app
- Contains:
  - `src/components/home-view.tsx` (main client page composition + responsive UI)
  - `src/components/glb-model-viewer.tsx` (multi-layer `<model-viewer>` runtime)
  - `src/components/layer-panel.tsx` (desktop panel + mobile drawer content)
  - `src/components/ui/*` (shadcn-style primitives used by `layer-panel.tsx`)

**`src/hooks/`:**
- Purpose: reusable client state logic
- Key files:
  - `src/hooks/use-layer-manager.ts` (layer toggles, isolate/blend mode, opacity animation)

**`src/lib/`:**
- Purpose: small configuration + utility modules referenced across components
- Key files:
  - `src/lib/layer-config.ts` (layer IDs + GLB src mapping; order matters)
  - `src/lib/model-asset.ts` (default model src constant)
  - `src/lib/utils.ts` (`cn()` for class merging)

**`src/types/`:**
- Purpose: shared types and JSX/element augmentations
- Key files:
  - `src/types/model-viewer.d.ts` (typed `<model-viewer>` element + JSX intrinsic element definition)

**`scripts/`:**
- Purpose: model pipeline tooling that runs on install/build hooks
- Key files:
  - `scripts/fetch-drive-assets.py` (download from Drive using gdown venv; flatten; skip logic)
  - `scripts/optimize-models.mjs` (optimize GLBs via `@gltf-transform/cli`; writes `*_original.glb` backups)

**`public/models/`:**
- Purpose: static assets served at runtime under `/models/*`
- Contains:
  - Optimized `.glb` assets referenced by the app:
    - `public/models/backdrop.glb`
    - `public/models/xuong.glb`
    - `public/models/cothuong.glb`
    - `public/models/codetail.glb`
  - Backup originals created by optimizer (not referenced at runtime):
    - `public/models/*_original.glb`

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: renders `HomeView`
- `src/app/layout.tsx`: fonts + app shell

**Configuration:**
- `next.config.ts`: static export (`output: "export"` in production), `allowedDevOrigins`, `images.unoptimized`
- `tsconfig.json`: alias `@/*` → `src/*`
- `components.json`: shadcn config + path aliases

**Core Logic:**
- `src/components/glb-model-viewer.tsx`: 3D runtime (script injection, layer stacking, camera sync)
- `src/hooks/use-layer-manager.ts`: layer state + animated opacity
- `src/lib/layer-config.ts`: canonical mapping for layers and GLB file URLs

**Testing:**
- Not detected

## Naming Conventions

**Files:**
- React components: kebab-case `.tsx` in `src/components/` (e.g. `src/components/home-view.tsx`)
- Hooks: `use-*.ts` in `src/hooks/` (e.g. `src/hooks/use-layer-manager.ts`)
- Lib modules: short kebab-case `.ts` in `src/lib/` (e.g. `src/lib/layer-config.ts`)

**Directories:**
- `src/*` is the code root; App Router under `src/app/`
- UI primitives under `src/components/ui/`

## Where to Add New Code

**New Feature (UI or view behavior):**
- Primary code: `src/components/` (compose in `home-view.tsx` or new component)
- Shared state: `src/hooks/`
- Shared constants/mappings: `src/lib/`
- Types: `src/types/`

**New Anatomy Layer / New GLB:**
- Asset file: add optimized `.glb` to `public/models/`
- Mapping: add/update layer entry in `src/lib/layer-config.ts`
- UI label + ordering: update `src/components/layer-panel.tsx` (if you want custom ordering) and `use-layer-manager.ts` default state

**New Scripted Pipeline Step:**
- Add scripts in `scripts/`
- Wire into npm lifecycle via `package.json` scripts (`postinstall`, `prebuild`, etc.)

## Special Directories

**`.venv-gdown/`:**
- Purpose: isolated Python environment for `gdown` downloads
- Generated: Yes (created on demand by `scripts/fetch-drive-assets.py`)
- Committed: Not intended (should be ignored by VCS; see `.gitignore`)

**`out/`:**
- Purpose: static export output directory for production build
- Generated: Yes (by Next export when `output: "export"` in `next.config.ts`)
- Committed: No

**`.next/`:**
- Purpose: Next build artifacts
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-04-22*
