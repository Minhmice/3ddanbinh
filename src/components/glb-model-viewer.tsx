"use client";

import { gsap } from "gsap";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { ANATOMY_LAYERS, EAGER_COUNT } from "@/lib/layer-config";
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

// Base layer handles interactions and camera bounding.
const BASE_INDEX = 0;

type GlbModelViewerProps = {
  introEnabled?: boolean;
  onModelLoaded?: () => void;
  cameraDebugOpen?: boolean;
  /** Which layers are currently enabled (visible). Lazy layers only mount when enabled. */
  enabledLayers: Record<LayerName, boolean>;
};

export const GlbModelViewer = forwardRef<ModelViewerElement, GlbModelViewerProps>(
  ({ introEnabled = true, onModelLoaded, cameraDebugOpen = false, enabledLayers }, ref) => {
    const [viewerReady, setViewerReady] = useState(false);
    const [eagerLoadedCount, setEagerLoadedCount] = useState(0);
    const [introComplete, setIntroComplete] = useState(false);
    const [debugOrbit, setDebugOrbit] = useState("");
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile for better framing
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const layerRefs = useRef<(ModelViewerElement | null)[]>(new Array(ANATOMY_LAYERS.length).fill(null));
    // Track which lazy layers have already been loaded (so we don't re-count on re-enable)
    const lazyLoadedRef = useRef<Set<string>>(new Set());

    useImperativeHandle(ref, () => layerRefs.current[BASE_INDEX] as ModelViewerElement, []);

    // ── 1. Script injection ──
    useEffect(() => {
      if (typeof window === "undefined") return;
      let cancelled = false;

      const markReady = () => {
        if (!cancelled) setViewerReady(true);
      };

      if (customElements.get("model-viewer")) {
        markReady();
        return;
      }

      const existing = document.querySelector<HTMLScriptElement>(`script[src="${MODEL_VIEWER_SRC}"]`);
      if (existing) {
        customElements.whenDefined("model-viewer").then(markReady);
        return () => { cancelled = true; };
      }

      const script = document.createElement("script");
      script.type = "module";
      script.src = MODEL_VIEWER_SRC;
      script.async = true;
      script.onload = () => {
        customElements.whenDefined("model-viewer").then(markReady);
      };
      script.onerror = () => {
        console.error("[model-viewer] Failed to load script:", MODEL_VIEWER_SRC);
      };
      document.head.appendChild(script);

      return () => { cancelled = true; };
    }, []);

    // ── 2. Load events for EAGER models only (gate for loading screen) ──
    useEffect(() => {
      if (!viewerReady) return;

      const handleEagerLoad = () => setEagerLoadedCount((c) => c + 1);

      ANATOMY_LAYERS.forEach((config, index) => {
        if (!config.eager) return; // skip lazy layers
        const layer = layerRefs.current[index];
        if (!layer) return;
        if (layer.loaded) handleEagerLoad();
        else layer.addEventListener("load", handleEagerLoad, { once: true });
      });
    }, [viewerReady]);

    // ── 3. Notify parent when eager models loaded ══
    useEffect(() => {
      if (eagerLoadedCount >= EAGER_COUNT) {
        onModelLoaded?.();
      }
    }, [eagerLoadedCount, onModelLoaded]);

    // ── Helper: sync camera from base to a specific layer element ──
    const syncCameraToLayer = useCallback((layer: ModelViewerElement) => {
      const base = layerRefs.current[BASE_INDEX];
      if (!base || typeof base.getCameraOrbit !== "function") return;

      try {
        const orbit = base.getCameraOrbit().toString();
        const target = base.getCameraTarget().toString();
        const fov = base.getFieldOfView();

        layer.cameraOrbit = orbit;
        layer.cameraTarget = target;
        layer.fieldOfView = `${fov}deg`;
        layer.setAttribute("camera-orbit", orbit);
        layer.setAttribute("camera-target", target);
        layer.setAttribute("field-of-view", `${fov}deg`);
        if (typeof layer.jumpCameraToGoal === "function") {
          layer.jumpCameraToGoal();
        }
      } catch (e) {
        console.error("[CameraSync] Error syncing to layer", e);
      }
    }, []);

    // ── 4. On lazy layer mount → sync camera immediately ──
    const handleLayerRef = useCallback(
      (index: number) => (node: any) => {
        const prev = layerRefs.current[index];
        layerRefs.current[index] = node;

        // If this is a NEW mount (prev was null, now it's not), sync camera
        if (node && !prev && index !== BASE_INDEX) {
          // Need to wait for the element to be ready
          const trySync = () => {
            if (node.loaded) {
              syncCameraToLayer(node);
            } else {
              node.addEventListener("load", () => syncCameraToLayer(node), { once: true });
            }
          };

          // Small delay to ensure model-viewer custom element is upgraded
          requestAnimationFrame(trySync);
        }
      },
      [syncCameraToLayer]
    );

    // ── 5. Synchronize Camera from Base → all mounted Overlays ──
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

          layerRefs.current.forEach((layer, index) => {
            if (index !== BASE_INDEX && layer) {
              try {
                layer.cameraOrbit = orbit;
                layer.cameraTarget = target;
                layer.fieldOfView = `${fov}deg`;
                layer.setAttribute("camera-orbit", orbit);
                layer.setAttribute("camera-target", target);
                layer.setAttribute("field-of-view", `${fov}deg`);
                if (typeof layer.jumpCameraToGoal === "function") {
                  layer.jumpCameraToGoal();
                }
              } catch (e) {
                console.error("[CameraSync] Error on layer", index, e);
              }
            }
          });
        } catch (e) {
          console.error("[CameraSync] Critical Error", e);
        }
      };

      base.addEventListener("camera-change", syncCamera);
      return () => base.removeEventListener("camera-change", syncCamera);
    }, [viewerReady]);

    // ── 6. Custom Synchronized Idle Rotation ──
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
        if (e.detail && e.detail.source === "user-interaction") {
          stopIdleAndReset();
        }
      };

      const loop = () => {
        if (!isIdle) return;
        const now = performance.now();
        const dt = Math.min(now - lastTime, 50);
        lastTime = now;

        const rotSpeedRad = (Math.PI / 180) * (dt / 1000);

        const orb = base.getCameraOrbit();
        const fov = base.getFieldOfView();
        const tgt = base.getCameraTarget();

        if (orb) {
          const newTheta = orb.theta + rotSpeedRad;
          const orbitStr = `${newTheta}rad ${orb.phi}rad ${orb.radius}m`;
          const targetStr = `${tgt.x}m ${tgt.y}m ${tgt.z}m`;

          layerRefs.current.forEach((layer) => {
            if (layer) {
              layer.cameraOrbit = orbitStr;
              layer.cameraTarget = targetStr;
              layer.fieldOfView = `${fov}deg`;
              layer.setAttribute("camera-orbit", orbitStr);
              if (typeof layer.jumpCameraToGoal === "function") {
                layer.jumpCameraToGoal();
              }
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

    // ── 7. Intro Animation ──
    useEffect(() => {
      if (!viewerReady || eagerLoadedCount < EAGER_COUNT || !introEnabled) return;

      const base = layerRefs.current[BASE_INDEX];
      if (!base) return;

      setIntroComplete(false);

      const applyOrbit = (az: number, elDeg: number, r: number) => {
        base.cameraOrbit = `${az}deg ${elDeg}deg ${r}m`;
        base.jumpCameraToGoal();
      };

      const finishIntro = () => {
        setIntroComplete(true);
      };

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      base
        .updateFraming()
        .catch(() => {})
        .finally(() => {
          const finalOrbit = isMobile ? ORBIT_END_MOBILE : ORBIT_END;
          const startOrbit = isMobile ? ORBIT_START_MOBILE : ORBIT_START;

          if (reduceMotion) {
            applyOrbit(finalOrbit.az, finalOrbit.el, finalOrbit.r);
            finishIntro();
            return;
          }

          const state = { az: startOrbit.az, el: startOrbit.el, r: startOrbit.r };

          gsap.to(state, {
            az: finalOrbit.az,
            el: finalOrbit.el,
            r: finalOrbit.r,
            duration: INTRO_DURATION,
            ease: "power3.out",
            onUpdate: () => applyOrbit(state.az, state.el, state.r),
            onComplete: finishIntro,
          });
        });
    }, [viewerReady, eagerLoadedCount, introEnabled, isMobile]);

    // ── Render ──
    const currentOrbitStart = isMobile ? ORBIT_START_MOBILE : ORBIT_START;
    const initialOrbit = `${currentOrbitStart.az}deg ${currentOrbitStart.el}deg ${currentOrbitStart.r}m`;
    const currentTarget = isMobile ? TARGET_MOBILE : TARGET_DEFAULT;
    const shellClass = "fixed inset-0 z-30 flex flex-col bg-[#e7e7e7] text-muted-foreground";

    if (!viewerReady) {
      return (
        <div className={`${shellClass} items-center justify-center`} aria-busy="true" aria-live="polite">
          Loading 3D viewer…
        </div>
      );
    }

    const handleDoubleClick = () => {
      if (!viewerReady || !introComplete) return;
      const base = layerRefs.current[BASE_INDEX];
      const orbitEnd = isMobile ? ORBIT_END_MOBILE : ORBIT_END;
      if (base) {
        base.cameraOrbit = `${orbitEnd.az}deg ${orbitEnd.el}deg ${orbitEnd.r}m`;
      }
    };

    return (
      <div className="fixed inset-0 z-30 bg-[#e7e7e7]" onDoubleClick={handleDoubleClick}>
        {ANATOMY_LAYERS.map((config, index) => {
          const isBase = index === BASE_INDEX;
          const isEnabled = enabledLayers[config.id];

          // LAZY LOADING: Don't mount model-viewer at all for disabled lazy layers
          // Eager layers always mount (they're needed for loading screen + base camera)
          if (!config.eager && !isEnabled) {
            return null;
          }

          return (
            <model-viewer
              key={config.id}
              id={`layer-${config.id}`}
              ref={handleLayerRef(index)}
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
              loading={config.eager ? "eager" : "lazy"}
              className={`block w-full h-[100dvh] absolute inset-0 bg-transparent [&::part(default-progress-bar)]:hidden ${
                !isBase ? "pointer-events-none" : ""
              }`}
              style={{
                // Hide via opacity for lazy layers that are mounted but toggled off
                opacity: isEnabled ? 1 : 0,
                transition: "opacity 0.4s ease-out",
              }}
            />
          );
        })}

        {/* Camera Parameters Debug Panel (toggled via button) */}
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
