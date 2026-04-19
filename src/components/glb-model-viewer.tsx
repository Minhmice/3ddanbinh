"use client";

import { gsap } from "gsap";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { ANATOMY_LAYERS } from "@/lib/layer-config";
import type { ModelViewerElement } from "@/types/model-viewer";

const MODEL_VIEWER_SRC =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js";

const ORBIT_END = { az: 0, el: 90, r: 20 } as const;
const ORBIT_START = { az: 75, el: 45, r: 36 } as const;
const TARGET_DEFAULT = "3m 3m 0.92m";
const INTRO_DURATION = 1.5;

// Base layer handles interactions and camera bounding.
// 0: Backdrop, 1: Anatomy (Xương), 2: Muscle, 3: Muscle Detail
const BASE_INDEX = 0;

type GlbModelViewerProps = {
  introEnabled?: boolean;
  onModelLoaded?: () => void;
};

export const GlbModelViewer = forwardRef<ModelViewerElement, GlbModelViewerProps>(
  ({ introEnabled = true, onModelLoaded }, ref) => {
    const [viewerReady, setViewerReady] = useState(false);
    const [loadedCount, setLoadedCount] = useState(0);
    const [introComplete, setIntroComplete] = useState(false);
    const [debugOrbit, setDebugOrbit] = useState("");
    
    const layerRefs = useRef<(ModelViewerElement | null)[]>(new Array(ANATOMY_LAYERS.length).fill(null));
    
    useImperativeHandle(ref, () => layerRefs.current[BASE_INDEX] as ModelViewerElement, []);

    // 1. Initial Injection of script
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

    // 2. Load events for all models
    useEffect(() => {
      if (!viewerReady) return;
      
      const handleLoad = () => setLoadedCount((c) => c + 1);

      layerRefs.current.forEach(layer => {
         if (!layer) return;
         if (layer.loaded) handleLoad();
         else layer.addEventListener("load", handleLoad, { once: true });
      });

    }, [viewerReady]);

    // 3. Notify parent when all models finish loading
    useEffect(() => {
      if (loadedCount === ANATOMY_LAYERS.length) {
        onModelLoaded?.();
      }
    }, [loadedCount, onModelLoaded]);

    // 4. Synchronize Camera strictly from Base -> Overlays
    useEffect(() => {
       if (!viewerReady) return;
       const base = layerRefs.current[BASE_INDEX];
       if (!base) return;

        const syncCamera = () => {
          try {
              if (typeof base.getCameraOrbit !== 'function') return;
              const orbit = base.getCameraOrbit().toString();
              const target = base.getCameraTarget().toString();
              const fov = base.getFieldOfView();

              if (!orbit || !target || fov == null) return;
              
              const orb = base.getCameraOrbit();
              const tgt = base.getCameraTarget();
              setDebugOrbit(
                `Orbit: (AZ) ${Math.round(orb.theta * 180 / Math.PI)}° | (EL) ${Math.round(orb.phi * 180 / Math.PI)}° | Zoom (R) ${orb.radius.toFixed(2)}m\nTarget (Pan): X: ${tgt.x.toFixed(3)} | Y: ${tgt.y.toFixed(3)} | Z: ${tgt.z.toFixed(3)}`
              );

              layerRefs.current.forEach((layer, index) => {
                 if (index !== BASE_INDEX && layer) {
                    try {
                        layer.cameraOrbit = orbit;
                        layer.cameraTarget = target;
                        layer.fieldOfView = `${fov}deg`;
                        
                        // Also force attributes for stable sync
                        layer.setAttribute("camera-orbit", orbit);
                        layer.setAttribute("camera-target", target);
                        layer.setAttribute("field-of-view", `${fov}deg`);

                        if (typeof layer.jumpCameraToGoal === 'function') {
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

    // 4.1. Custom Synchronized Idle Animation across all 4 layers
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
          }, 2000); // 2000ms delay after interaction
       };

       const handleInteract = (e: any) => {
          if (e.detail && e.detail.source === 'user-interaction') {
             stopIdleAndReset();
          }
       };

       const loop = () => {
          if (!isIdle) return;
          const now = performance.now();
          const dt = Math.min(now - lastTime, 50); // cap dt
          lastTime = now;

          // Rotate by 1 degree per second
          const rotSpeedRad = (Math.PI / 180) * (dt / 1000);
          
          const orb = base.getCameraOrbit();
          const fov = base.getFieldOfView();
          const tgt = base.getCameraTarget();
          
          if (orb) {
             const newTheta = orb.theta + rotSpeedRad;
             const orbitStr = `${newTheta}rad ${orb.phi}rad ${orb.radius}m`;
             const targetStr = `${tgt.x}m ${tgt.y}m ${tgt.z}m`;

             layerRefs.current.forEach(layer => {
                if (layer) {
                   layer.cameraOrbit = orbitStr;
                   layer.cameraTarget = targetStr;
                   layer.fieldOfView = `${fov}deg`;
                   layer.setAttribute("camera-orbit", orbitStr);
                   if (typeof layer.jumpCameraToGoal === 'function') {
                      layer.jumpCameraToGoal();
                   }
                }
             });
          }
          
          rafId = requestAnimationFrame(loop);
       }

       // Start initial idle wait
       stopIdleAndReset();
       base.addEventListener("camera-change", handleInteract);

       return () => {
          clearTimeout(idleTimeout);
          cancelAnimationFrame(rafId);
          base.removeEventListener("camera-change", handleInteract);
       };
    }, [viewerReady, introComplete]);

    // 5. Intro Animation (Only animates the Base, which automatically syncs the Overlay)
    useEffect(() => {
      if (!viewerReady || loadedCount < ANATOMY_LAYERS.length || !introEnabled) return;
      
      const base = layerRefs.current[BASE_INDEX];
      if (!base) return;

      setIntroComplete(false);

      const applyOrbit = (az: number, elDeg: number, r: number) => {
        base.cameraOrbit = `${az}deg ${elDeg}deg ${r}m`;
        base.jumpCameraToGoal(); // Note: This triggers "camera-change" allowing sync loop to catch it automatically
      };

      const finishIntro = () => {
        setIntroComplete(true);
      };

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Ensure framing is updated first
      base.updateFraming().catch(() => {}).finally(() => {
          if (reduceMotion) {
            applyOrbit(ORBIT_END.az, ORBIT_END.el, ORBIT_END.r);
            finishIntro();
            return;
          }
    
          const state = { az: ORBIT_START.az, el: ORBIT_START.el, r: ORBIT_START.r };
    
          gsap.to(state, {
            az: ORBIT_END.az,
            el: ORBIT_END.el,
            r: ORBIT_END.r,
            duration: INTRO_DURATION,
            ease: "power3.out",
            onUpdate: () => applyOrbit(state.az, state.el, state.r),
            onComplete: finishIntro,
          });
      });

    }, [viewerReady, loadedCount, introEnabled]);

    const initialOrbit = `${ORBIT_START.az}deg ${ORBIT_START.el}deg ${ORBIT_START.r}m`;
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
      if (base) {
        // Native model-viewer dampens to this target automatically
        base.cameraOrbit = `${ORBIT_END.az}deg ${ORBIT_END.el}deg ${ORBIT_END.r}m`;
      }
    };

    return (
      <div className="fixed inset-0 z-30 bg-[#e7e7e7]" onDoubleClick={handleDoubleClick}>
        {ANATOMY_LAYERS.map((config, index) => {
           const isBase = index === BASE_INDEX;
           return (
             <model-viewer
               key={config.id}
               id={`layer-${config.id}`}
               ref={(node: any) => { layerRefs.current[index] = node; }}
               src={config.src}
               alt={config.label}
               camera-controls={isBase && introComplete ? true : undefined}
               camera-orbit={initialOrbit}
               camera-target={TARGET_DEFAULT}
               min-camera-orbit="auto auto 0.1m"
               max-camera-orbit="auto auto 100m"
               min-field-of-view="10deg"
               max-field-of-view="170deg"
               interaction-prompt="none"
               className={`block w-full h-[100dvh] absolute inset-0 bg-transparent [&::part(default-progress-bar)]:hidden ${
                 !isBase ? "pointer-events-none" : ""
               }`}
             />
           );
        })}

        {/* Debug Panel for Developer to pick default zoom & target */}
        {introComplete && (
          <div className="absolute bottom-4 left-4 z-50 bg-black/80 backdrop-blur text-white text-[10px] font-mono p-3 rounded-lg pointer-events-none border border-white/10 shadow-xl opacity-80 whitespace-pre-line">
            <div className="text-[#00ffcc] mb-1.5 font-bold tracking-wider">🛠 CURRENT CAMERA PARAMETERS</div>
            <div className="leading-relaxed">{debugOrbit || "Loading parameters..."}</div>
          </div>
        )}
      </div>
    );
  }
);

GlbModelViewer.displayName = "GlbModelViewer";
