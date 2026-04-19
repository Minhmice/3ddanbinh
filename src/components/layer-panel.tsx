import React, { useEffect, useRef } from "react";
import { LayerName, ANATOMY_LAYERS } from "@/lib/layer-config";
import { LayerState, LayerMode } from "@/hooks/use-layer-manager";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MousePointer2, Move, ZoomIn, Info } from "lucide-react";
import gsap from "gsap";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export interface LayerPanelProps {
  layers: Record<LayerName, LayerState>;
  mode: LayerMode;
  onModeChange: (mode: LayerMode) => void;
  onToggleLayer: (layerName: LayerName, enabled: boolean) => void;
  onOpacityChange: (layerName: LayerName, opacity: number) => void;
  className?: string;
}

const glassCardCore = "bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_10px_40px_rgba(0,0,0,0.15)] rounded-3xl relative overflow-hidden";

export function LayerPanel({
  layers,
  mode,
  onModeChange,
  onToggleLayer,
  onOpacityChange,
  className
}: LayerPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isBlend = mode === 'blend';

  useEffect(() => {
    // 1. Entry Animation: Fade + Slide from right stagger
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.children,
        { x: 40, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.8, stagger: 0.1, ease: "power3.out" }
      );
    }

    // 2. Parallax floating effect on mouse move
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { clientX, clientY } = e;
      const xPos = (clientX / window.innerWidth - 0.5) * -15; // Invert for depth feel
      const yPos = (clientY / window.innerHeight - 0.5) * -15;
      
      gsap.to(containerRef.current, {
        x: xPos,
        y: yPos,
        rotationY: xPos * 0.2, // Subtle 3D tilt
        rotationX: -yPos * 0.2,
        duration: 1.5,
        ease: "power2.out"
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`w-full max-w-[340px] flex flex-col gap-4 perspective-[1000px] ${inter.className} ${className || ""}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Interaction Mode Block */}
      <div className={`${glassCardCore} p-5`}>
        <h3 className="text-[10px] font-bold tracking-[0.2em] text-neutral-500 mb-4 uppercase select-none">Interaction Mode</h3>
        
        {/* Pill Segmented Control */}
        <div className="flex bg-black/5 hover:bg-black/10 transition-colors duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] rounded-full p-1.5 relative">
          {/* Active Liquid Indicator */}
          <div 
            className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white/70 backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,1)] border border-white/60 rounded-full transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{ transform: isBlend ? 'translateX(0)' : 'translateX(100%)' }}
          />
          <button 
            onClick={() => onModeChange('blend')}
            className={`relative z-10 flex-1 py-1.5 text-sm font-semibold transition-all duration-300 ${isBlend ? 'text-black drop-shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
          >
            Blend
          </button>
          <button 
            onClick={() => onModeChange('isolate')}
            className={`relative z-10 flex-1 py-1.5 text-sm font-semibold transition-all duration-300 ${!isBlend ? 'text-black drop-shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
          >
            Isolate
          </button>
        </div>
      </div>

      {/* Anatomy Layers Block */}
      <div className={`${glassCardCore} p-5 flex flex-col`}>
        <h3 className="text-[10px] font-bold tracking-[0.2em] text-neutral-500 mb-4 uppercase select-none">Anatomy Layers</h3>
        
        <div className="flex flex-col gap-3">
          {[ANATOMY_LAYERS[2], ANATOMY_LAYERS[3], ANATOMY_LAYERS[1], ANATOMY_LAYERS[0]].map(config => {
            const state = layers[config.id];
            const isActive = state.enabled;
            
            return (
              <div 
                key={config.id} 
                className={`p-3 rounded-2xl transition-all duration-500 ease-out border relative group/layer ${
                  isActive 
                    ? 'bg-white/40 border-white/50 shadow-[0_8px_24px_rgba(0,0,0,0.08)] -translate-y-[2px]' 
                    : 'bg-white/5 border-white/10 hover:bg-white/20'
                }`}
              >
                {/* Subtle highlight shimmer effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 group-hover/layer:opacity-100 transition-opacity duration-700 pointer-events-none" />

                {/* Clickable Header Row */}
                <div 
                  className="flex items-center justify-between relative z-10 cursor-pointer group/toggle w-full"
                  onClick={() => onToggleLayer(config.id, !isActive)}
                >
                  <div 
                    className={`text-sm font-semibold transition-colors duration-300 select-none ${
                        isActive ? 'text-black' : 'text-neutral-600 group-hover/toggle:text-neutral-900'
                    }`}
                  >
                    {config.label}
                  </div>
                  {/* Wrap switch in pointer-events-none so parent handles click area cleanly */}
                  <div className="pointer-events-none">
                    <Switch
                      checked={state.enabled}
                      className={`transition-all duration-300 ${isActive ? "data-[state=checked]:bg-black shadow-[0_0_12px_rgba(0,0,0,0.15)] scale-110" : ""}`}
                    />
                  </div>
                </div>
                
                {/* Opacity Slider inside the layer row */}
                <div 
                   className={`grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative z-10 ${
                     isActive ? 'grid-rows-[1fr] opacity-100 mt-3 pt-3 border-t border-black/5' : 'grid-rows-[0fr] opacity-0 mt-0 pt-0 border-t-transparent'
                   }`}
                >
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-4 px-1 pb-1">
                      <span className="text-[10px] text-neutral-500 font-semibold tracking-wide select-none">Opacity</span>
                      <Slider
                        value={[state.opacity * 100]}
                        max={100}
                        step={1}
                        onValueChange={(vals) => onOpacityChange(config.id, vals[0] / 100)}
                        className="flex-1 [&_[data-slot=slider-range]]:bg-neutral-800 [&_[data-slot=slider-track]]:bg-black/10 [&_[data-slot=slider-thumb]]:border-neutral-400 [&_[data-slot=slider-thumb]]:shadow-[0_0_8px_rgba(0,0,0,0.15)] [&_[data-slot=slider-thumb]]:scale-110 [&_[data-slot=slider-thumb]]:transition-transform [&_[data-slot=slider-thumb]:active]:scale-[1.6]"
                      />
                      <span className="text-[10px] w-8 text-right font-bold text-black select-none">{Math.round(state.opacity * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage Guide Block */}
      <div className={glassCardCore}>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="guide" className="border-none">
            {/* Trigger is padded so the entire card area is clickable */}
            <AccordionTrigger className="w-full justify-between p-4 hover:no-underline flex gap-2 text-neutral-500 group [&[data-state=open]_.icon-bg]:bg-white/80 [&[data-state=open]_.icon-color]:text-black hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="icon-bg p-1.5 rounded-full bg-white/40 border border-white/50 group-hover:bg-white/80 transition-colors shadow-sm">
                  <Info size={14} className="icon-color text-neutral-500 transition-colors" />
                </div>
                <span className="text-[11px] font-bold tracking-wide text-neutral-800 uppercase select-none">Need assistance?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
               <div className="space-y-4 mt-2">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 p-2 bg-white/60 border border-white/50 shadow-sm rounded-xl backdrop-blur-sm">
                       <MousePointer2 size={12} className="text-black" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-neutral-800">Left Click / 1 Finger</p>
                      <p className="text-[10.5px] text-neutral-500 leading-snug mt-1">Hold and drag to rotate the 3D viewing angle.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 p-2 bg-white/60 border border-white/50 shadow-sm rounded-xl backdrop-blur-sm">
                       <Move size={12} className="text-black" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-neutral-800">Right Click / Shift + Left</p>
                      <p className="text-[10.5px] text-neutral-500 leading-snug mt-1">Drag to pan the model strictly across the screen.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 p-2 bg-white/60 border border-white/50 shadow-sm rounded-xl backdrop-blur-sm">
                       <ZoomIn size={12} className="text-black" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-neutral-800">Mouse Wheel / 2 Fingers</p>
                      <p className="text-[10.5px] text-neutral-500 leading-snug mt-1">Pinch or scroll to precisely zoom in and out.</p>
                    </div>
                  </div>
               </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

    </div>
  );
}
