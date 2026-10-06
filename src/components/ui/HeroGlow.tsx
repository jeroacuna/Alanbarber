"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function HeroGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const t = gsap.to(ref.current, {
      yPercent: 40, ease: "none",
      scrollTrigger: { trigger: ref.current!.parentElement, start: "top top", end: "bottom top", scrub: true },
    });
    return () => { t.scrollTrigger?.kill(); t.kill(); };
  }, []);
  return <div ref={ref} aria-hidden className="pointer-events-none absolute -top-1/4 left-1/2 -z-10 h-[70%] w-[120%] -translate-x-1/2 rounded-full bg-[#b08d57]/10 blur-3xl" />;
}
