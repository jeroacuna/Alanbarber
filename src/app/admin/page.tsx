"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { siteConfig } from "@/config/siteConfig";

type Row = { id: string; start_at: string; status: string; customer_name: string; customer_phone: string; barbers: { name: string } | null; services: { name: string } | null };
const fmt = (iso: string) => new Date(iso).toLocaleString("es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: siteConfig.timezone });

export default function Admin() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/admin/login"); return; }
    const { data, error } = await supabase.from("appointments")
      .select("id,start_at,status,customer_name,customer_phone,barbers(name),services(name)")
      .gte("start_at", new Date(Date.now() - 864e5).toISOString()).order("start_at");
    if (error) setMsg("Error al cargar turnos."); else setRows(data as unknown as Row[]);
  }, [router]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    await supabase.from("appointments").update({ status }).eq("id", id); load();
  }
  const b = "rounded-lg border border-white/20 px-3 py-2 text-xs";
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Turnos</h1>
        <button className="text-sm text-white/60 underline" onClick={async () => { await supabase.auth.signOut(); router.replace("/admin/login"); }}>Salir</button>
      </div>
      <a href="/admin/catalogo" className="mb-4 inline-block text-sm text-[#b08d57] underline">Servicios, precios y horarios →</a>
      {msg && <p>{msg}</p>}
      {rows?.length === 0 && <p className="text-white/60">No hay turnos próximos. (Si esperabas ver turnos, revisá que tu usuario esté en la tabla admins.)</p>}
      <ul className="grid gap-3">
        {rows?.map((r) => (
          <li key={r.id} className={`rounded-xl border border-white/15 p-4 ${r.status === "cancelled" ? "opacity-40" : ""}`}>
            <p className="font-semibold capitalize">{fmt(r.start_at)} · {r.barbers?.name}</p>
            <p className="text-sm text-white/70">{r.services?.name} — {r.customer_name} · {r.customer_phone}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-[#b08d57]">{r.status}</p>
            <div className="mt-3 flex gap-2">
              <button className={b} onClick={() => setStatus(r.id, "confirmed")}>Confirmar</button>
              <button className={b} onClick={() => setStatus(r.id, "completed")}>Completado</button>
              <button className={b} onClick={() => setStatus(r.id, "cancelled")}>Cancelar</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
