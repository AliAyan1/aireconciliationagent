"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}

function revealElement(target: Element) {
  target.classList.add("scroll-reveal-visible");
}

function isInViewport(target: Element) {
  const rect = target.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}

export function ScrollReveal({ children, className = "", stagger = false }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets: Element[] = stagger
      ? Array.from(el.querySelectorAll(".scroll-reveal-item"))
      : [el];

    if (typeof IntersectionObserver === "undefined") {
      targets.forEach(revealElement);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealElement(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px 5% 0px" }
    );

    targets.forEach((target) => {
      if (isInViewport(target)) revealElement(target);
      observer.observe(target);
    });

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
