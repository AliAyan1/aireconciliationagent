"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}

export function ScrollReveal({ children, className = "", stagger = false }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("scroll-reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    if (stagger) {
      const items = el.querySelectorAll(".scroll-reveal-item");
      items.forEach((item) => observer.observe(item));
    } else {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [stagger]);

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${stagger ? "scroll-reveal-stagger" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
