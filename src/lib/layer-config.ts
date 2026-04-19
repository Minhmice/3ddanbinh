export type LayerName = "backdrop" | "anatomy" | "muscle" | "muscle_detail";

export interface LayerConfig {
  id: LayerName;
  label: string;
  src: string;
}

/** Layers ordered bottom-to-top. Index 0 = base layer (handles camera). */
export const ANATOMY_LAYERS: LayerConfig[] = [
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
