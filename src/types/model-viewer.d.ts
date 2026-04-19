import type * as React from "react";

/** Subset of &lt;model-viewer&gt; API used by GlbModelViewer (see modelviewer.dev). */
export type ModelViewerElement = HTMLElement & {
  cameraOrbit: string;
  cameraTarget: string;
  fieldOfView: string;
  getCameraOrbit(): { theta: number; phi: number; radius: number; toString(): string };
  getCameraTarget(): { x: number; y: number; z: number; toString(): string };
  getFieldOfView(): number;
  loaded?: boolean;
  jumpCameraToGoal(): void;
  updateFraming(): Promise<void>;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          "camera-controls"?: boolean;
          "camera-orbit"?: string;
          "camera-target"?: string;
          "min-camera-orbit"?: string;
          "max-camera-orbit"?: string;
          "min-field-of-view"?: string;
          "max-field-of-view"?: string;
          "interaction-prompt"?: string;
          loading?: "auto" | "eager" | "lazy";
          reveal?: string;
          poster?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
