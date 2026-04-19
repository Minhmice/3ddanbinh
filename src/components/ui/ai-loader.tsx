"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_MESSAGE = "Generating";

/** ms for one full 0 → 100 when using simulated progress */
const DEFAULT_DURATION_MS = 5000;

export type AiLoaderProps = {
  className?: string;
  /** Text to animate letter-by-letter (default: "Generating"). */
  message?: string;
  /** Show animated percentage (0–100%). Default true. */
  showPercent?: boolean;
  /**
   * Controlled progress 0–100. When set, internal percent animation is disabled.
   */
  progress?: number;
  /**
   * When false (default), percent runs 0 → 100 once, then `onComplete` fires and stays at 100%.
   * When true, percent loops forever (demo / indeterminate wait).
   */
  loop?: boolean;
  /** Called once when non-loop progress reaches 100% (ignored if `progress` is controlled). */
  onComplete?: () => void;
  /** Duration for simulated 0–100% (loop or one-shot). Default 5000. */
  durationMs?: number;
};

export function AiLoader({
  className,
  message = DEFAULT_MESSAGE,
  showPercent = true,
  progress: controlledProgress,
  loop = false,
  onComplete,
  durationMs = DEFAULT_DURATION_MS,
}: AiLoaderProps) {
  const letters = message.split("");
  const [percent, setPercent] = useState(0);
  const rafRef = useRef<number>(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (controlledProgress !== undefined || !showPercent) return;

    completedRef.current = false;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;

      if (!loop) {
        if (elapsed >= durationMs) {
          setPercent(100);
          if (!completedRef.current) {
            completedRef.current = true;
            onCompleteRef.current?.();
          }
          return;
        }
        const t = elapsed / durationMs;
        setPercent(Math.min(100, Math.floor(t * 100)));
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const t = ((now - start) % durationMs) / durationMs;
      setPercent(Math.min(100, Math.floor(t * 100)));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [controlledProgress, showPercent, loop, durationMs]);

  const displayPercent =
    controlledProgress !== undefined
      ? Math.min(100, Math.max(0, Math.round(controlledProgress)))
      : percent;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-8 select-none",
        className
      )}
    >
      <div
        className="flex flex-wrap items-end justify-center gap-0.5 sm:gap-1"
        aria-label={message}
      >
        {letters.map((char, i) => (
          <span
            key={`${i}-${char}`}
            className="inline-block text-2xl font-semibold tracking-tight text-foreground sm:text-3xl animate-[loader-letter-anim_2.4s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {char === " " ? "\u00a0" : char}
          </span>
        ))}
      </div>
      {showPercent && (
        <p
          className="text-2xl font-medium tabular-nums tracking-tight text-muted-foreground sm:text-3xl"
          aria-live="polite"
          aria-atomic="true"
        >
          {displayPercent}%
        </p>
      )}
      <div
        className="size-14 shrink-0 rounded-2xl sm:size-16 animate-[loader-rotate_4s_linear_infinite]"
        aria-hidden
      />
    </div>
  );
}

/** @deprecated Use `AiLoader` — alias for compatibility with older snippets. */
export const Component = AiLoader;
