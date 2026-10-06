"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Reveal from "./Reveal";

export default function Gallery({ images }: { images: string[] }) {
  const list = images.slice(0, 6);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((o) => ((o ?? 0) + 1) % list.length);
      if (e.key === "ArrowLeft") setOpen((o) => ((o ?? 0) - 1 + list.length) % list.length);
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open, list.length]);
  if (!list.length) return null;
  return (
    <section className="mx-auto max-w-3xl px-5 py-16">
      <Reveal><h2 className="mb-6 text-3xl font-bold">El trabajo</h2></Reveal>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {list.map((src, i) => (
          <Reveal key={src} delay={i * 0.08} className="aspect-square">
            <button onClick={() => setOpen(i)} aria-label={`Ver foto ${i + 1}`} className="group relative block h-full w-full overflow-hidden bg-neutral-900">
              <Image src={src} alt={`Trabajo ${i + 1}`} fill sizes="(min-width:768px) 240px, 50vw" className="object-cover transition duration-700 group-hover:scale-110" />
            </button>
          </Reveal>
        ))}
      </div>
      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label="Galería" onClick={() => setOpen(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4">
          <div className="relative h-[80dvh] w-full max-w-3xl">
            <Image src={list[open]} alt={`Trabajo ${open + 1}`} fill sizes="100vw" className="object-contain" />
          </div>
          <button aria-label="Cerrar" className="absolute right-4 top-4 text-3xl" onClick={() => setOpen(null)}>✕</button>
        </div>
      )}
    </section>
  );
}
