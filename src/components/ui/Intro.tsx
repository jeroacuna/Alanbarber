"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { siteConfig } from "@/config/siteConfig";

export default function Intro() {
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 1000); return () => clearTimeout(t); }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="intro" exit={{ y: "-100%" }} transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[60] grid place-items-center bg-black">
          <motion.span initial={{ opacity: 0, letterSpacing: "0.1em" }} animate={{ opacity: 1, letterSpacing: "0.3em" }}
            transition={{ duration: 0.8 }} className="text-2xl font-bold">{siteConfig.shortName}</motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}