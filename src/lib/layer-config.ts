export type LayerName = "backdrop" | "anatomy" | "muscle" | "muscle_detail";

export interface LayerConfig {
  id: LayerName;
  label: string;
  src: string;
  /** If true, model loads immediately on page load. If false, loads only when user enables it. */
  eager: boolean;
}

/** Layers ordered bottom-to-top. Index 0 = base layer (handles camera). */
export const ANATOMY_LAYERS: LayerConfig[] = [
  {
    id: "backdrop",
    label: "Backdrop",
    src: "/models/backdrop.glb",
    eager: true,
  },
  {
    id: "anatomy",
    label: "Skeleton",
    src: "/models/xuong.glb",
    eager: true,
  },
  {
    id: "muscle",
    label: "Superficial Muscles",
    src: "/models/cothuong.glb",
    eager: false, // lazy: ~25MB saved on initial load
  },
  {
    id: "muscle_detail",
    label: "Deep Muscles",
    src: "/models/codetail.glb",
    eager: false, // lazy: ~30MB saved on initial load
  },
];

/** Only eager layers count toward the initial loading gate. */
export const EAGER_LAYERS = ANATOMY_LAYERS.filter((l) => l.eager);
export const EAGER_COUNT = EAGER_LAYERS.length;
