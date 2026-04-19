"use client";

import { gsap } from "gsap";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { ANATOMY_LAYERS } from "@/lib/layer-config";
import type { LayerName } from "@/lib/layer-config";
import type { ModelViewerElement } from "@/types/model-viewer";

const MODEL_VIEWER_SRC =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js";

const ORBIT_END = { az: 0, el: 90, r: 20 } as const;
const ORBIT_START = { az: 75, el: 45, r: 36 } as const;
const ORBIT_END_MOBILE = { az: 0, el: 90, r: 11 } as const;
const ORBIT_START_MOBILE = { az: 75, el: 45, r: 24 } as const;

const TARGET_DEFAULT = "3m 3m 0.92m";
const TARGET_MOBILE = "3.2m 3m 0.92m";
const INTRO_DURATION = 1.5;
const TOTAL_LAYERS = ANATOMY_LAYERS.length;
const BASE_INDEX = 0;

type GlbModelViewerProps = {
  introEnabled?: boolean;
  onModelLoaded?: () => void;
  cameraDebugOpen?: boolean;
  /** Controls visibility (opacity) of each layer. All are always mounted. */
  enabledLayers: Record<LayerName, boolean>;
};

export const GlbModelViewer = forwardRef<ModelViewerElement, GlbModelViewerProps>(
  ({ introEnabled = true, onModelLoaded, cameraDebugOpen = false, enabledLayers }, ref) => {
    const [viewerReady, setViewerReady] = useState(false);
    const [loadedCount, setLoadedCount] = useState(0);
    const [introComplete, setIntroComplete] = useState(false);
    const [debugOrbit, setDebugOrbit] = useState("");
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
      const check = () => setIsMobile(window.innerWidth < 768);
      check();
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
    }, []);

    const layerRefs = useRef<(ModelViewerElement | null)[]>(new Array(TOTAL_LAYERS).fill(null));
    useImperativeHandle(ref, () => layerRefs.current[BASE_INDEX] as ModelViewerElement, []);

    // ── 1. Script injection ──
    useEffect(() => {
      if (typeof window === "undefined") return;
      let cancelled = false;
      const markReady = () => { if (!cancelled) setViewerReady(true); };

      if (customElements.get("model-viewer")) { markReady(); return; }

      const existing = document.querySelector<HTMLScriptElement>(`script[src="${MODEL_VIEWER_SRC}"]`);
      if (existing) {
        customElements.whenDefined("model-viewer").then(markReady);
        return () => { cancelled = true; };
      }

      const script = document.createElement("script");
      script.type = "module";
      script.src = MODEL_VIEWER_SRC;
      script.async = true;
      script.onload = () => customElements.whenDefined("model-viewer").then(markReady);
      script.onerror = () => console.error("[model-viewer] Failed to load:", MODEL_VIEWER_SRC);
      document.head.appendChild(script);
      return () => { cancelled = true; };
    }, []);

    // ── 2. Wait for ALL models to load ──
    useEffect(() => {
      if (!viewerReady) return;
      const handleLoad = () => setLoadedCount((c) => c + 1);

      layerRefs.current.forEach((el) => {
        if (!el) return;
        if (el.loaded) handleLoad();
        else el.addEventListener("load", handleLoad, { once: true });
      });
    }, [viewerReady]);

    // ── 3. Notify parent when ALL models loaded ──
    useEffect(() => {
      if (loadedCount >= TOTAL_LAYERS) onModelLoaded?.();
    }, [loadedCount, onModelLoaded]);

    // ── 4. Camera sync: Base → all overlays ──
    useEffect(() => {
      if (!viewerReady) return;
      const base = layerRefs.current[BASE_INDEX];
      if (!base) return;

      const syncCamera = () => {
        try {
          if (typeof base.getCameraOrbit !== "function") return;
          const orbit = base.getCameraOrbit().toString();
          const target = base.getCameraTarget().toString();
          const fov = base.getFieldOfView();
          if (!orbit || !target || fov == null) return;

          const orb = base.getCameraOrbit();
          const tgt = base.getCameraTarget();
          setDebugOrbit(
            `Orbit: (AZ) ${Math.round((orb.theta * 180) / Math.PI)}° | (EL) ${Math.round((orb.phi * 180) / Math.PI)}° | Zoom (R) ${orb.radius.toFixed(2)}m\nTarget (Pan): X: ${tgt.x.toFixed(3)} | Y: ${tgt.y.toFixed(3)} | Z: ${tgt.z.toFixed(3)}`
          );

          layerRefs.current.forEach((layer, i) => {
            if (i !== BASE_INDEX && layer) {
              try {
                layer.cameraOrbit = orbit;
                layer.cameraTarget = target;
                layer.fieldOfView = `${fov}deg`;
                layer.setAttribute("camera-orbit", orbit);
                layer.setAttribute("camera-target", target);
                layer.setAttribute("field-of-view", `${fov}deg`);
                if (typeof layer.jumpCameraToGoal === "function") layer.jumpCameraToGoal();
              } catch (e) {
                console.error("[CameraSync] Error on layer", i, e);
              }
            }
          });
        } catch (e) {
          console.error("[CameraSync] Critical", e);
        }
      };

      base.addEventListener("camera-change", syncCamera);
      return () => base.removeEventListener("camera-change", syncCamera);
    }, [viewerReady]);

    // ── 5. Idle Rotation ──
    useEffect(() => {
      if (!viewerReady || !introComplete) return;
      const base = layerRefs.current[BASE_INDEX];
      if (!base) return;

      let idleTimeout: NodeJS.Timeout;
      let rafId: number;
      let isIdle = false;
      let lastTime = 0;

      const stopIdleAndReset = () => {
        isIdle = false;
        cancelAnimationFrame(rafId);
        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
          isIdle = true;
          lastTime = performance.now();
          loop();
        }, 2000);
      };

      const handleInteract = (e: any) => {
        if (e.detail?.source === "user-interaction") stopIdleAndReset();
      };

      const loop = () => {
        if (!isIdle) return;
        const now = performance.now();
        const dt = Math.min(now - lastTime, 50);
        lastTime = now;
        const rotSpeed = (Math.PI / 180) * (dt / 1000);
        const orb = base.getCameraOrbit();
        const fov = base.getFieldOfView();
        const tgt = base.getCameraTarget();
        if (orb) {
          const orbitStr = `${orb.theta + rotSpeed}rad ${orb.phi}rad ${orb.radius}m`;
          const targetStr = `${tgt.x}m ${tgt.y}m ${tgt.z}m`;
          layerRefs.current.forEach((layer) => {
            if (layer) {
              layer.cameraOrbit = orbitStr;
              layer.cameraTarget = targetStr;
              layer.fieldOfView = `${fov}deg`;
              layer.setAttribute("camera-orbit", orbitStr);
              if (typeof layer.jumpCameraToGoal === "function") layer.jumpCameraToGoal();
            }
          });
        }
        rafId = requestAnimationFrame(loop);
      };

      stopIdleAndReset();
      base.addEventListener("camera-change", handleInteract);
      return () => {
        clearTimeout(idleTimeout);
        cancelAnimationFrame(rafId);
        base.removeEventListener("camera-change", handleInteract);
      };
    }, [viewerReady, introComplete]);

    // ── 6. Intro Animation ──
    useEffect(() => {
      if (!viewerReady || loadedCount < TOTAL_LAYERS || !introEnabled) return;
      const base = layerRefs.current[BASE_INDEX];
      if (!base) return;

      setIntroComplete(false);
      const applyOrbit = (az: number, el: number, r: number) => {
        base.cameraOrbit = `${az}deg ${el}deg ${r}m`;
        base.jumpCameraToGoal();
      };
      const finishIntro = () => setIntroComplete(true);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      base.updateFraming().catch(() => {}).finally(() => {
        const end = isMobile ? ORBIT_END_MOBILE : ORBIT_END;
        const start = isMobile ? ORBIT_START_MOBILE : ORBIT_START;
        if (reduceMotion) { applyOrbit(end.az, end.el, end.r); finishIntro(); return; }
        const state = { az: start.az, el: start.el, r: start.r };
        gsap.to(state, {
          az: end.az, el: end.el, r: end.r,
          duration: INTRO_DURATION, ease: "power3.out",
          onUpdate: () => applyOrbit(state.az, state.el, state.r),
          onComplete: finishIntro,
        });
      });
    }, [viewerReady, loadedCount, introEnabled, isMobile]);

    // ── Render ──
    const startOrbit = isMobile ? ORBIT_START_MOBILE : ORBIT_START;
    const initialOrbit = `${startOrbit.az}deg ${startOrbit.el}deg ${startOrbit.r}m`;
    const currentTarget = isMobile ? TARGET_MOBILE : TARGET_DEFAULT;

    if (!viewerReady) {
      return (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#e7e7e7]" aria-busy="true">
          Loading 3D viewer…
        </div>
      );
    }

    const handleDoubleClick = () => {
      if (!introComplete) return;
      const base = layerRefs.current[BASE_INDEX];
      const end = isMobile ? ORBIT_END_MOBILE : ORBIT_END;
      if (base) base.cameraOrbit = `${end.az}deg ${end.el}deg ${end.r}m`;
    };

    return (
      <div className="fixed inset-0 z-30 bg-[#e7e7e7]" onDoubleClick={handleDoubleClick}>
        {ANATOMY_LAYERS.map((config, index) => {
          const isBase = index === BASE_INDEX;
          const isEnabled = enabledLayers[config.id];

          return (
            <model-viewer
              key={config.id}
              id={`layer-${config.id}`}
              ref={(node: any) => { layerRefs.current[index] = node; }}
              src={config.src}
              alt={config.label}
              camera-controls={isBase && introComplete ? true : undefined}
              camera-orbit={initialOrbit}
              camera-target={currentTarget}
              min-camera-orbit="auto auto 0.1m"
              max-camera-orbit="auto auto 100m"
              min-field-of-view="10deg"
              max-field-of-view="170deg"
              interaction-prompt="none"
              className={`block w-full h-[100dvh] absolute inset-0 bg-transparent [&::part(default-progress-bar)]:hidden ${
                !isBase ? "pointer-events-none" : ""
              }`}
              style={{
                opacity: isEnabled ? 1 : 0,
                transition: "opacity 0.5s ease-out",
              }}
            />
          );
        })}

        {introComplete && cameraDebugOpen && (
          <div className="absolute bottom-20 md:bottom-20 left-4 z-50 bg-black/80 backdrop-blur text-white text-[10px] font-mono p-3 rounded-lg pointer-events-none border border-white/10 shadow-xl opacity-80 whitespace-pre-line transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="text-[#00ffcc] mb-1.5 font-bold tracking-wider">🛠 CURRENT CAMERA PARAMETERS</div>
            <div className="leading-relaxed">{debugOrbit || "Loading parameters..."}</div>
          </div>
        )}
      </div>
    );
  }
);

GlbModelViewer.displayName = "GlbModelViewer";
