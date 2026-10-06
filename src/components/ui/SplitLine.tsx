"use client";
import { motion } from "motion/react";

export default function SplitLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="block overflow-hidden pb-1">
      <motion.span initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }} className="block">
        {children}
      </motion.span>
    </span>
  );
}
