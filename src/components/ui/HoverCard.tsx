"use client";
import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

// Brillo que sigue al mouse + inclinación 3D opcional.
export default function HoverCard({ children, tilt = false, className = "" }: { children: React.ReactNode; tilt?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 200, damping: 20 });
  const sy = useSpring(my, { stiffness: 200, damping: 20 });
  const rotY = useTransform(sx, [0, 1], [-8, 8]);
  const rotX = useTransform(sy, [0, 1], [8, -8]);
  const glow = useTransform([mx, my], ([x, y]) => `radial-gradient(320px circle at ${(x as number) * 100}% ${(y as number) * 100}%, rgba(176,141,87,.22), transparent 60%)`);
  return (
    <motion.div ref={ref} className={`group/card relative ${className}`}
      style={tilt ? { rotateX: rotX, rotateY: rotY, transformPerspective: 900 } : undefined}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width); my.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => { mx.set(0.5); my.set(0.5); }}>
      {children}
      <motion.div aria-hidden style={{ backgroundImage: glow }} className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />
    </motion.div>
  );
}