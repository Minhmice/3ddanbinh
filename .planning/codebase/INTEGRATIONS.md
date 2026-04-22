# External Integrations

**Analysis Date:** 2026-04-22

## APIs & External Services

**3D Viewer Runtime:**
- Google Hosted `<model-viewer>` - web component for GLB rendering
  - SDK/Client: remote ESM script loaded from `https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js`
  - Implementation: script injection + custom element readiness gate in `src/components/glb-model-viewer.tsx`

**Asset Distribution (Build/Install time):**
- Google Drive - source of `.glb` assets downloaded during install/build
  - Client: `gdown` (Python) installed into local venv `.venv-gdown/` by `scripts/fetch-drive-assets.py`
  - Manifest: `manifest.json` (`folderId`, `dest: "public/models"`)
  - Fetch entrypoint: `npm run fetch-models` → `scripts/fetch-drive-assets.py` (see `package.json`)

## Data Storage

**Databases:**
- Not detected

**File Storage:**
- Local filesystem only (repo checkout)
  - Static model assets served by Next from `public/models/*.glb`
  - Layer sources reference `/models/*.glb` (see `src/lib/layer-config.ts`)

**Caching:**
- Not detected (no Redis/edge cache integration in repo)

## Authentication & Identity

**Auth Provider:**
- Not detected

## Monitoring & Observability

**Error Tracking:**
- Not detected

**Logs:**
- `console.error` used for runtime viewer failures and camera sync errors in `src/components/glb-model-viewer.tsx`

## CI/CD & Deployment

**Hosting:**
- Static export intended for nginx/Coolify per Next config note (see `next.config.ts`)
- Nixpacks indicates both Node and Python providers (see `nixpacks.toml`)

**CI Pipeline:**
- Not detected (no GitHub Actions/workflows found in repo root listing)

## Environment Configuration

**Required env vars:**
- None required for app runtime (static site + static assets)
- Optional for fetch pipeline (affects install/build behavior):
  - `SKIP_FETCH_IF_PRESENT` (default: `"1"` truthy; skip downloads if assets exist)
  - `FORCE_FETCH` (`"1"` forces re-download)
  - Implemented in `scripts/fetch-drive-assets.py`
- Build/runtime toggle uses `NODE_ENV` (static export in production) in `next.config.ts`

**Secrets location:**
- Not detected in repo-scanned files. Drive IDs live in `manifest.json` (non-secret identifier, but should still be treated as config).

## Webhooks & Callbacks

**Incoming:**
- None (no route handlers; `src/app/api/` contains empty placeholder directories only)

**Outgoing:**
- None detected

---

*Integration audit: 2026-04-22*
