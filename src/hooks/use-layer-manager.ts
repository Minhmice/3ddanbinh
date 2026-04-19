import { useRef, useCallback, useState } from "react";
import { gsap } from "gsap";
import { LayerName } from "@/lib/layer-config";

export type LayerMode = "isolate" | "blend";

export interface LayerState {
  enabled: boolean;
  opacity: number;
}

export function useLayerManager() {
  const [layers, setLayers] = useState<Record<LayerName, LayerState>>({
    backdrop: { enabled: true, opacity: 1 },
    anatomy: { enabled: true, opacity: 1 },
    muscle: { enabled: false, opacity: 1 },       // lazy: loads on toggle
    muscle_detail: { enabled: false, opacity: 1 }, // lazy: loads on toggle
  });

  const [mode, setMode] = useState<LayerMode>("blend");
  const tweensRef = useRef<Record<string, gsap.core.Tween | undefined>>({});

  const applyOpacity = useCallback((layerName: LayerName, targetOpacity: number) => {
    // Target the specific model-viewer DOM element
    const targetElement = document.getElementById(`layer-${layerName}`);
    if (!targetElement) return;

    if (tweensRef.current[layerName]) {
      tweensRef.current[layerName]?.kill();
    }

    tweensRef.current[layerName] = gsap.to(targetElement, {
      opacity: targetOpacity,
      duration: 0.5,
      ease: "power2.out",
    });
  }, []);

  const setLayerOpacity = useCallback((layerName: LayerName, val: number) => {
     setLayers(prev => {
        const next = { ...prev, [layerName]: { ...prev[layerName], opacity: val }};
        if (next[layerName].enabled) {
           applyOpacity(layerName, val);
        }
        return next;
     });
  }, [applyOpacity]);

  const handleToggle = useCallback((layerName: LayerName, enabled: boolean) => {
    if (mode === "isolate" && enabled) {
      setLayers(prev => {
        const next = { ...prev };
        (Object.keys(next) as LayerName[]).forEach((key) => {
           const shouldEnable = key === layerName;
           next[key] = { ...next[key], enabled: shouldEnable };
           applyOpacity(key, shouldEnable ? next[key].opacity : 0);
        });
        return next;
      });
    } else {
      setLayers(prev => {
        const next = { ...prev, [layerName]: { ...prev[layerName], enabled }};
        applyOpacity(layerName, enabled ? next[layerName].opacity : 0);
        return next;
      });
    }
  }, [mode, applyOpacity]);

  const updateMode = useCallback((newMode: LayerMode) => {
      setMode(newMode);
      if (newMode === "isolate") {
        setLayers(prev => {
            const next = { ...prev };
            (Object.keys(next) as LayerName[]).forEach((key) => {
                const shouldEnable = key === "muscle";
                next[key] = { ...next[key], enabled: shouldEnable };
                applyOpacity(key, shouldEnable ? 1 : 0);
                if (shouldEnable) next[key].opacity = 1;
            });
            return next;
        });
      } else if (newMode === "blend") {
        setLayers(prev => {
            const next = { ...prev };
            (Object.keys(next) as LayerName[]).forEach((key) => {
                next[key] = { ...next[key], enabled: true, opacity: 1 };
                applyOpacity(key, 1);
            });
            return next;
        });
      }
  }, [applyOpacity]);

  return {
    layers,
    mode,
    setMode: updateMode,
    setLayerOpacity,
    handleToggle,
  };
}
