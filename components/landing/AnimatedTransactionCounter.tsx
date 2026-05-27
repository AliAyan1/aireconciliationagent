"use client";

import { useEffect, useRef, useState } from "react";

const START = 1_247_832;
const RATE_PER_SEC = 127;

export function AnimatedTransactionCounter() {
  const [display, setDisplay] = useState(START);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let frame: number;
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = (now - startRef.current) / 1000;
      setDisplay(Math.floor(START + elapsed * RATE_PER_SEC));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const formatted = display.toLocaleString("en-US");

  return (
    <div className="mt-10 text-center">
      <p className="text-3xl sm:text-4xl font-bold text-accent tabular-nums tracking-tight">
        {formatted}
      </p>
      <p className="mt-2 text-sm text-muted">transactions reconciled</p>
    </div>
  );
}
