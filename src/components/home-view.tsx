"use client";

import { gsap } from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiLoader } from "@/components/ui/ai-loader";
import { GlbModelViewer } from "@/components/glb-model-viewer";
import { useLayerManager } from "@/hooks/use-layer-manager";
import { LayerPanel } from "@/components/layer-panel";
import type { ModelViewerElement } from "@/types/model-viewer";

/** Minimum overlay duration (ms): ensures models have enough time to decode in the background before dismissing the loading screen. */
const MIN_OVERLAY_MS = 2000;
const OVERLAY_EXIT_DURATION = 0.85;

export function HomeView() {
  const [modelReady, setModelReady] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const pageStartRef = useRef<number>(0);
  useEffect(() => {
    pageStartRef.current = Date.now();
  }, []);

  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayTweenRef = useRef<gsap.core.Tween | null>(null);
  const exitStartedRef = useRef(false);

  const layerManager = useLayerManager();

  const runOverlayExit = useCallback(() => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;

    const el = overlayRef.current;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!el || reduceMotion) {
      setOverlayDismissed(true);
      setShowOverlay(false);
      return;
    }

    overlayTweenRef.current?.kill();
    overlayTweenRef.current = gsap.to(el, {
      yPercent: -100,
      duration: OVERLAY_EXIT_DURATION,
      ease: "power3.inOut",
      onComplete: () => {
        setOverlayDismissed(true);
        setShowOverlay(false);
      },
    });
  }, []);

  /**
   * Only remove overlay when: model is loaded AND MIN_OVERLAY_MS has passed since page mount
   * (prevents white flashes: ensures GLB finishes decoding before the animation turns off).
   */
  useEffect(() => {
    if (!modelReady || overlayDismissed) return;

    const elapsed = Date.now() - pageStartRef.current;
    const waitMs = Math.max(0, MIN_OVERLAY_MS - elapsed);
    const t = window.setTimeout(() => {
      runOverlayExit();
    }, waitMs);
    return () => window.clearTimeout(t);
  }, [modelReady, overlayDismissed, runOverlayExit]);

  useEffect(() => {
    return () => {
      overlayTweenRef.current?.kill();
    };
  }, []);

  return (
    <div className="relative min-h-dvh bg-[#e7e7e7]">
      <GlbModelViewer
        introEnabled={overlayDismissed}
        onModelLoaded={() => {
          setModelReady(true);
        }}
      />

      {/* Layer Control Panel */}
      {overlayDismissed && (
        <div className="absolute top-4 right-4 z-40 lg:top-8 lg:right-8 md:w-[320px] max-w-[calc(100vw-32px)]">
          <LayerPanel
            layers={layerManager.layers}
            mode={layerManager.mode}
            onModeChange={layerManager.setMode}
            onToggleLayer={layerManager.handleToggle}
            onOpacityChange={layerManager.setLayerOpacity}
            className="w-full"
          />
        </div>
      )}

      {showOverlay ? (
        <div
          ref={overlayRef}
          className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#e7e7e7]"
          aria-busy={!overlayDismissed}
          aria-live="polite"
        >
          <AiLoader loop message="Loading 3D" showPercent />
        </div>
      ) : null}
    </div>
  );
}
