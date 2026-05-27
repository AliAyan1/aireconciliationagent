"use client";

import { useEffect, useState } from "react";

export function useAnimatedNumber(
  target: number,
  durationMs = 1000,
  enabled = true
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const start = performance.now();
    const from = 0;
    const to = target;

    let frame: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, enabled]);

  if (!enabled) return target;
  return value;
}
