"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { cancelByToken } from "@/lib/booking/api";

export default function Cancelar() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-4 px-5">
      <h1 className="text-3xl font-bold">Cancelar turno</h1>
      {state === "ok" && <p>Tu turno fue cancelado.</p>}
      {state === "fail" && <p>No se pudo cancelar (ya pasó o ya estaba cancelado).</p>}
      {state === "idle" && (
        <button className="min-h-14 rounded-xl bg-white font-bold text-black"
          onClick={async () => setState((await cancelByToken(token)) ? "ok" : "fail")}>Sí, cancelar mi turno</button>
      )}
      <a href="/" className="text-sm text-white/60 underline">Volver al inicio</a>
    </main>
  );
}
