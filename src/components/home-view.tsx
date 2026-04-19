"use client";

import { gsap } from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiLoader } from "@/components/ui/ai-loader";
import { GlbModelViewer } from "@/components/glb-model-viewer";
import { useLayerManager } from "@/hooks/use-layer-manager";
import { LayerPanel } from "@/components/layer-panel";
import { Settings, Camera, X } from "lucide-react";
import type { ModelViewerElement } from "@/types/model-viewer";

/** Minimum overlay duration (ms): ensures models have enough time to decode in the background before dismissing the loading screen. */
const MIN_OVERLAY_MS = 2000;
const OVERLAY_EXIT_DURATION = 0.85;

export function HomeView() {
  const [modelReady, setModelReady] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  // Mobile drawer + camera debug toggle
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [cameraDebugOpen, setCameraDebugOpen] = useState(false);

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

  // Glass button style for the floating mobile buttons
  const fabClass =
    "w-12 h-12 flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-2xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.3)] text-neutral-700 active:scale-90 transition-all duration-200 hover:bg-white/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.18)]";

  return (
    <div className="relative min-h-dvh bg-[#e7e7e7]">
      <GlbModelViewer
        introEnabled={overlayDismissed}
        onModelLoaded={() => {
          setModelReady(true);
        }}
        cameraDebugOpen={cameraDebugOpen}
      />

      {/* === DESKTOP: Layer Control Panel (hidden on mobile) === */}
      {overlayDismissed && (
        <div className="hidden md:block absolute top-4 right-4 z-40 lg:top-8 lg:right-8 md:w-[320px] max-w-[calc(100vw-32px)]">
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

      {/* === MOBILE: Floating Action Buttons (bottom-right) === */}
      {overlayDismissed && (
        <div className="md:hidden fixed bottom-6 right-4 z-40 flex flex-col gap-3">
          {/* Camera Debug Toggle */}
          <button
            onClick={() => setCameraDebugOpen((v) => !v)}
            className={`${fabClass} ${cameraDebugOpen ? "bg-white/50 ring-2 ring-black/10" : ""}`}
            aria-label="Toggle camera parameters"
          >
            <Camera size={20} />
          </button>
          {/* Settings (Open Layer Panel Drawer) */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className={fabClass}
            aria-label="Open layer settings"
          >
            <Settings size={20} />
          </button>
        </div>
      )}

      {/* === DESKTOP: Camera Debug Toggle (bottom-left, small icon) === */}
      {overlayDismissed && (
        <div className="hidden md:block fixed bottom-6 left-4 z-40">
          <button
            onClick={() => setCameraDebugOpen((v) => !v)}
            className={`${fabClass} ${cameraDebugOpen ? "bg-white/50 ring-2 ring-black/10" : ""}`}
            aria-label="Toggle camera parameters"
          >
            <Camera size={20} />
          </button>
        </div>
      )}

      {/* === MOBILE DRAWER (Bottom Sheet) === */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop - closes drawer on tap */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileDrawerOpen(false)}
          />
          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto rounded-t-[28px] bg-white/15 backdrop-blur-3xl border-t border-white/30 shadow-[0_-20px_60px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom duration-300 p-4 pb-8">
            {/* Handle bar */}
            <div className="flex justify-center mb-2">
              <div className="w-10 h-1 rounded-full bg-black/15" />
            </div>
            {/* Close button */}
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 rounded-xl bg-white/20 border border-white/20 text-neutral-600 hover:bg-white/40 transition-colors"
                aria-label="Close settings"
              >
                <X size={16} />
              </button>
            </div>
            {/* Reuse the same LayerPanel */}
            <LayerPanel
              layers={layerManager.layers}
              mode={layerManager.mode}
              onModeChange={layerManager.setMode}
              onToggleLayer={layerManager.handleToggle}
              onOpacityChange={layerManager.setLayerOpacity}
              className="w-full max-w-none"
            />
          </div>
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
