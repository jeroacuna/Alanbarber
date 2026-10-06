"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// Acceso discreto en el header: candado -> modal de login -> aparece "Panel" (mismo sitio).
export default function AdminAccess() {
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function check() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setIsAdmin(false); return false; }
    const { data } = await supabase.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
    setIsAdmin(!!data);
    return !!data;
  }
  useEffect(() => { setMounted(true); check(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword(f);
    if (error) setErr("Email o contraseña incorrectos.");
    else if (await check()) { setOpen(false); setF({ email: "", password: "" }); }
    else { await supabase.auth.signOut(); setErr("Esta cuenta no tiene permisos de administrador."); }
    setBusy(false);
  }

  const input = "min-h-12 rounded-xl border border-white/15 bg-transparent px-4 text-white focus-visible:outline-2 focus-visible:outline-[#b08d57]";

  if (isAdmin) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/admin" className="rounded-full border border-[#b08d57] px-4 py-2 text-[#b08d57]">Panel</Link>
        <button className="text-white/50 hover:text-white" onClick={async () => { await supabase.auth.signOut(); setIsAdmin(false); }}>Salir</button>
      </div>
    );
  }
  return (
    <>
      <button aria-label="Acceso administrador" onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-full text-white/40 transition hover:text-white">
        <Lock size={16} />
      </button>
      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}
              className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-5 backdrop-blur-sm">
              <motion.form onSubmit={submit} onClick={(e) => e.stopPropagation()} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
                className="grid w-full max-w-sm gap-3 rounded-2xl border border-white/15 bg-neutral-950 p-6">
                <h2 className="text-2xl font-bold">Acceso admin</h2>
                <input className={input} type="email" placeholder="Email" autoComplete="email" autoFocus value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                <input className={input} type="password" placeholder="Contraseña" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
                {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
                <button disabled={busy} className="min-h-12 rounded-xl bg-white font-bold text-black disabled:opacity-50">{busy ? "Entrando…" : "Entrar"}</button>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>, document.body)}
    </>
  );
}