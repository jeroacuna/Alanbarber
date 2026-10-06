"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword(f);
    if (error) setErr("Email o contraseña incorrectos."); else router.push("/admin");
  }
  const input = "min-h-14 rounded-xl border border-white/15 bg-transparent px-4 text-white";
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center px-5">
      <form onSubmit={submit} className="grid gap-3">
        <h1 className="mb-2 text-3xl font-bold">Admin</h1>
        <input className={input} type="email" placeholder="Email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className={input} type="password" placeholder="Contraseña" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
        <button className="min-h-14 rounded-xl bg-white font-bold text-black">Entrar</button>
      </form>
    </main>
  );
}
