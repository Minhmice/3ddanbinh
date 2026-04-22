export type LayerName = "backdrop" | "anatomy" | "muscle" | "muscle_detail";

export interface LayerConfig {
  id: LayerName;
  label: string;
  src: string;
}

/** Layers ordered bottom-to-top. Index 0 = base layer (handles camera). */
export const ANATOMY_LAYERS_DESKTOP: LayerConfig[] = [
  {
    id: "backdrop",
    label: "Backdrop",
    src: "/models/backdrop.glb",
  },
  {
    id: "anatomy",
    label: "Skeleton",
    src: "/models/xuong.glb",
  },
  {
    id: "muscle",
    label: "Superficial Muscles",
    src: "/models/cothuong.glb",
  },
  {
    id: "muscle_detail",
    label: "Deep Muscles",
    src: "/models/codetail.glb",
  },
];

/** Mobile fallback: single model only (avoid multi-<model-viewer> instability on iOS). */
export const ANATOMY_LAYERS_MOBILE_FALLBACK: LayerConfig[] = [
  {
    id: "anatomy",
    label: "Anatomy",
    // Use original (pre-optimization) model for correctness on mobile.
    src: "/models/anatomy_original.glb",
  },
];
