"use client";
import { useEffect, useRef } from "react";

// Solo en desktop con mouse; nunca en mobile ni con "reducir movimiento".
export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current!;
    el.style.display = "block";
    let x = 0, y = 0, cx = 0, cy = 0, big = false, raf = 0;
    const move = (e: MouseEvent) => { x = e.clientX; y = e.clientY; big = !!(e.target as HTMLElement).closest("a,button,input,label"); };
    const tick = () => {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      el.style.transform = `translate(${cx - 16}px,${cy - 16}px) scale(${big ? 1.8 : 1})`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", move);
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener("mousemove", move); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} aria-hidden className="pointer-events-none fixed left-0 top-0 z-50 hidden h-8 w-8 rounded-full border border-white/70 mix-blend-difference" />;
}
