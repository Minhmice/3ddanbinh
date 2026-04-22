# Technology Stack

**Analysis Date:** 2026-04-22

## Languages

**Primary:**
- TypeScript - Next.js app source in `src/app/**/*.tsx`, `src/components/**/*.tsx`, `src/hooks/**/*.ts`, `src/lib/**/*.ts`

**Secondary:**
- JavaScript (ESM) - tooling scripts in `scripts/optimize-models.mjs`, config in `eslint.config.mjs`, `postcss.config.mjs`
- Python - model fetch pipeline in `scripts/fetch-drive-assets.py`

## Runtime

**Environment:**
- Node.js - required for Next.js + scripts (see `package.json`)
- Python 3.10+ - required for Google Drive download helper (see `README.md`, `scripts/fetch-drive-assets.py`)

**Package Manager:**
- npm - `package-lock.json` present
- Python pip (isolated venv) - `requirements.txt` (`gdown>=5.0.0`) and runtime install into `.venv-gdown/` via `scripts/fetch-drive-assets.py`

## Frameworks

**Core:**
- Next.js 16.2.4 - App Router in `src/app/` (see `package.json`, `src/app/layout.tsx`, `src/app/page.tsx`)
- React 19.2.4 / React DOM 19.2.4 (see `package.json`)

**3D Viewer Runtime:**
- `<model-viewer>` web component (Google) loaded at runtime from CDN:
  - `https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js`
  - Script injection + usage in `src/components/glb-model-viewer.tsx`

**UI:**
- Tailwind CSS v4 via PostCSS plugin `@tailwindcss/postcss` (see `postcss.config.mjs`, `src/app/globals.css`)
- shadcn UI config and registry integration (see `components.json`, components under `src/components/ui/`)
- Radix primitives via `radix-ui` (see `package.json`)
- Icons via `lucide-react` (see `src/components/home-view.tsx`, `src/components/layer-panel.tsx`)
- Animation via GSAP `gsap` (see `src/components/home-view.tsx`, `src/components/glb-model-viewer.tsx`, `src/components/layer-panel.tsx`)

**Testing:**
- Not detected (no `jest.config.*`, `vitest.config.*`, or test files found)

**Build/Dev:**
- ESLint v9 + `eslint-config-next` (see `eslint.config.mjs`, `package.json`)
- TypeScript v5 with path alias `@/*` → `src/*` (see `tsconfig.json`)

## Key Dependencies

**Critical:**
- `next` 16.2.4 - framework/runtime/build
- `react` / `react-dom` 19.2.4 - UI runtime
- `gsap` - overlay + camera intro and UI motion

**Infrastructure / UI Foundation:**
- `tailwindcss` ^4, `@tailwindcss/postcss` ^4 - styling pipeline
- `class-variance-authority`, `clsx`, `tailwind-merge` - class composition patterns
- `tw-animate-css` - animation utilities imported by `src/app/globals.css`

## Configuration

**Environment:**
- Static export toggled by `NODE_ENV`:
  - Production: `output: "export"` (writes `out/`)
  - Dev: default Next dev server behavior
  - Config: `next.config.ts`
- Model fetch/overwrite behavior controlled by env vars in `scripts/fetch-drive-assets.py`:
  - `SKIP_FETCH_IF_PRESENT` (default: skip if assets exist)
  - `FORCE_FETCH=1` (override skip)

**Build:**
- Next config: `next.config.ts` (static export, `allowedDevOrigins`, `images.unoptimized`)
- ESLint: `eslint.config.mjs`
- PostCSS: `postcss.config.mjs`
- Global CSS + Tailwind entry: `src/app/globals.css`
- Shadcn configuration: `components.json`

## Platform Requirements

**Development:**
- Node.js (recommended in docs: 18 or 20+) and npm (see `README.md`)
- Python 3.10+ for Drive fetch pipeline (see `README.md`, `requirements.txt`)

**Production:**
- Static site output in `out/` (Next export) served by a static server:
  - `npm run start` runs `npx -y serve@latest out` (see `package.json`)
- Deployment tooling indicates Node + Python available (see `nixpacks.toml`)

---

*Stack analysis: 2026-04-22*
