# Architecture

**Analysis Date:** 2026-04-22

## Pattern Overview

**Overall:** Next.js App Router with a single client-rendered 3D experience (no server API). The 3D scene is rendered via multiple stacked `<model-viewer>` instances whose cameras are synchronized, with UI overlays controlling layer visibility/opacity.

**Key Characteristics:**
- Static-first deployment: production uses Next static export (`out/`) (see `next.config.ts`)
- Client-only 3D runtime: main view is `"use client"` and uses browser APIs (`window`, `customElements`) (see `src/components/home-view.tsx`, `src/components/glb-model-viewer.tsx`)
- Multi-layer rendering: 4 GLBs always mounted; per-layer opacity toggled for “blend/isolate” modes (see `src/lib/layer-config.ts`, `src/hooks/use-layer-manager.ts`)

## Layers

**Routing / App Shell (Next App Router):**
- Purpose: route entry + layout + global styling
- Location: `src/app/`
- Contains: `layout.tsx`, `page.tsx`, `globals.css`, static assets like `favicon.ico`
- Depends on: Next framework + React
- Used by: browser entry via Next runtime

**View Composition (Client):**
- Purpose: orchestrate overlay loading UX, mobile/desktop UI, and pass layer state into viewer
- Location: `src/components/home-view.tsx`
- Contains:
  - Loader overlay with minimum duration gate (`MIN_OVERLAY_MS`)
  - Desktop panel vs mobile drawer UI
  - Camera debug toggle plumbing
- Depends on: `gsap`, `lucide-react`, `useLayerManager`, `GlbModelViewer`
- Used by: `src/app/page.tsx`

**3D Viewer (Client, multi-instance `<model-viewer>`):**
- Purpose: render multiple GLBs in lockstep and provide camera controls via base layer only
- Location: `src/components/glb-model-viewer.tsx`
- Contains:
  - Runtime script injection for `<model-viewer>` from CDN (`MODEL_VIEWER_SRC`)
  - Load counting: waits for all layers to emit `load` before reporting ready
  - Camera synchronization: base layer propagates orbit/target/fov to overlays on `camera-change`
  - Intro camera animation (GSAP) after all models decode
  - Idle rotation loop that pauses/resets on user interaction
- Depends on: `ANATOMY_LAYERS` (`src/lib/layer-config.ts`), `ModelViewerElement` typing (`src/types/model-viewer.d.ts`)
- Used by: `src/components/home-view.tsx`

**State Management (Client):**
- Purpose: manage enabled/opacity state for each anatomy layer and interaction mode
- Location: `src/hooks/use-layer-manager.ts`
- Contains:
  - `blend` mode: all layers enabled with opacity sliders
  - `isolate` mode: enabling one layer disables others via animated opacity transitions
  - GSAP-powered DOM opacity animation via `document.getElementById("layer-...")`
- Depends on: `LayerName` (`src/lib/layer-config.ts`), `gsap`
- Used by: `src/components/home-view.tsx`, `src/components/layer-panel.tsx`

**Config / Mappings:**
- Purpose: canonical mapping of layer IDs → user labels → GLB URLs under `/public/models`
- Location: `src/lib/layer-config.ts`
- Used by: `src/components/glb-model-viewer.tsx`, `src/components/layer-panel.tsx`, `src/hooks/use-layer-manager.ts`

## Data Flow

**Model pipeline (install/build time → runtime):**

1. Assets live in Google Drive, referenced by ID in `manifest.json`.
2. Install/build hooks fetch assets into the app’s static public folder:
   - `npm run postinstall` → `npm run prepare-models` (see `package.json`)
   - `npm run fetch-models` runs `scripts/fetch-drive-assets.py`
   - Destination is `public/models/` (see `manifest.json`)
3. Optimization step compresses models in-place:
   - `npm run optimize-models` runs `scripts/optimize-models.mjs`
   - Uses `npx -y @gltf-transform/cli@latest optimize ... --compress draco` (see `scripts/optimize-models.mjs`)
   - Creates backup files `*_original.glb` in `public/models/` and skips re-optimizing if backups already exist
4. Runtime loads models as static assets:
   - Layer URLs are hardcoded as `/models/<file>.glb` in `src/lib/layer-config.ts`
   - Next serves `public/models` at that URL path in dev and in static export output

**Viewer boot sequence (runtime):**

1. `src/app/page.tsx` renders `HomeView` (client).
2. `HomeView` renders `GlbModelViewer` immediately and shows an overlay (`AiLoader`) until:
   - All 4 layers decode (`onModelLoaded`) and
   - At least 4000ms has elapsed since mount (see `MIN_OVERLAY_MS` in `src/components/home-view.tsx`)
3. `GlbModelViewer` injects `<script type="module" src="...model-viewer.min.js">` into `<head>` and waits for `customElements.whenDefined("model-viewer")` (see `src/components/glb-model-viewer.tsx`).
4. `GlbModelViewer` mounts 4 `<model-viewer>` elements (one per layer from `ANATOMY_LAYERS`), all positioned `absolute inset-0` (stacked).
5. Base layer (index 0) becomes the only interactive layer after intro completes:
   - `camera-controls` set only for base layer and only when `introComplete` is true
   - Overlays use `pointer-events-none` to avoid capturing gestures/clicks
6. Base camera state is propagated to overlays on each `camera-change` event.

**State Management:**
- Layer visibility is represented as per-layer opacity (`opacity: 0..1`) + “enabled” boolean.
- Opacity updates animate the actual `<model-viewer>` DOM element via GSAP (`useLayerManager`).

## Key Abstractions

**Layer definition (single source of truth):**
- Purpose: map UI + layer ID to a static GLB URL
- Examples: `src/lib/layer-config.ts`
- Pattern: config array ordered bottom-to-top; index 0 is “base camera layer”

**Typed `<model-viewer>` integration:**
- Purpose: allow TypeScript-safe access to the subset of `<model-viewer>` API used for camera sync
- Examples: `src/types/model-viewer.d.ts`

## Entry Points

**Page entry:**
- Location: `src/app/page.tsx`
- Triggers: initial route load of `/`
- Responsibilities: render `HomeView`

**3D view:**
- Location: `src/components/home-view.tsx`
- Responsibilities: loading UX, responsive UI controls, glue code for viewer + layer state

## Error Handling

**Strategy:** best-effort client-side resilience; errors are logged to console, UI continues where possible.

**Patterns:**
- Script load failure logs: `console.error("[model-viewer] Failed to load:", MODEL_VIEWER_SRC)` in `src/components/glb-model-viewer.tsx`
- Camera sync guarded with try/catch per layer to avoid cascading failures (see `syncCamera` in `src/components/glb-model-viewer.tsx`)

## Cross-Cutting Concerns

**Logging:** `console.*` in viewer component only (`src/components/glb-model-viewer.tsx`)

**Validation:** not detected (no runtime schema validation libs)

**Accessibility / Motion:**
- `prefers-reduced-motion: reduce` disables the GSAP overlay exit and short-circuits intro camera animation (see `src/components/home-view.tsx`, `src/components/glb-model-viewer.tsx`)

**Mobile vs Desktop Rendering Notes (current architecture):**
- Responsive breakpoint is derived from `window.innerWidth < 768` in `src/components/glb-model-viewer.tsx`
- Mobile uses different camera parameters:
  - Orbits: `ORBIT_START_MOBILE`, `ORBIT_END_MOBILE`
  - Target: `TARGET_MOBILE`
  - Desktop uses `ORBIT_START`, `ORBIT_END`, `TARGET_DEFAULT`
- UI surfaces differ:
  - Desktop: `LayerPanel` fixed top-right (`md:block`) and camera debug button bottom-left (see `src/components/home-view.tsx`)
  - Mobile: floating action buttons + bottom-sheet drawer (`md:hidden`) (see `src/components/home-view.tsx`)

---

*Architecture analysis: 2026-04-22*
