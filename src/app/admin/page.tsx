"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { siteConfig } from "@/config/siteConfig";

type Row = { id: string; start_at: string; end_at: string; status: string; customer_name: string; customer_phone: string; customer_email: string | null; barbers: { name: string } | null; services: { name: string; price: number } | null };

const tz = siteConfig.timezone;
const dayKey = (d: Date | string | number) => new Date(d).toLocaleDateString("en-CA", { timeZone: tz });
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
const dayLabel = (k: string) => new Date(k + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-amber-500/15 text-amber-300" },
  confirmed: { label: "Confirmado", cls: "bg-emerald-500/15 text-emerald-300" },
  completed: { label: "Completado", cls: "bg-white/10 text-white/60" },
  cancelled: { label: "Cancelado", cls: "bg-red-500/15 text-red-300" },
};
const waLink = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.length === 10 ? "549" + d : d}`;
};

export default function Admin() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<"hoy" | "manana" | "proximos">("hoy");
  const [barber, setBarber] = useState("todos");
  const [showCancelled, setShowCancelled] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/"); return; }
    const { data, error } = await supabase.from("appointments")
      .select("id,start_at,end_at,status,customer_name,customer_phone,customer_email,barbers(name),services(name,price)")
      .gte("start_at", new Date(Date.now() - 864e5).toISOString()).order("start_at");
    if (error) setMsg("No se pudieron cargar los turnos."); else { setMsg(""); setRows(data as unknown as Row[]); }
  }, [router]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  async function setStatus(id: string, status: string) {
    await supabase.from("appointments").update({ status }).eq("id", id); load();
  }

  const today = dayKey(Date.now()), tomorrow = dayKey(Date.now() + 864e5), weekEnd = dayKey(Date.now() + 7 * 864e5);
  const live = (rows ?? []).filter((r) => r.status !== "cancelled");
  const stats = {
    hoy: live.filter((r) => dayKey(r.start_at) === today).length,
    semana: live.filter((r) => dayKey(r.start_at) >= today && dayKey(r.start_at) <= weekEnd).length,
    pendientes: live.filter((r) => r.status === "pending").length,
  };
  const barbers = Array.from(new Set((rows ?? []).map((r) => r.barbers?.name).filter(Boolean))) as string[];

  const groups = useMemo(() => {
    const list = (rows ?? []).filter((r) => {
      const k = dayKey(r.start_at);
      if (filter === "hoy" && k !== today) return false;
      if (filter === "manana" && k !== tomorrow) return false;
      if (filter === "proximos" && k < today) return false;
      if (barber !== "todos" && r.barbers?.name !== barber) return false;
      return showCancelled || r.status !== "cancelled";
    });
    const m: Record<string, Row[]> = {};
    list.forEach((r) => (m[dayKey(r.start_at)] ??= []).push(r));
    return Object.entries(m);
  }, [rows, filter, barber, showCancelled, today, tomorrow]);

  const chip = (on: boolean) => `rounded-full px-4 py-2 text-sm transition ${on ? "bg-white text-black font-semibold" : "border border-white/15 text-white/70 hover:bg-white/10"}`;
  const act = "rounded-lg border border-white/20 px-3 py-2 text-xs transition hover:bg-white/10";

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-white/60 hover:text-white">← Volver al sitio</Link>
        <button className="text-sm text-white/50 hover:text-white" onClick={async () => { await supabase.auth.signOut(); router.replace("/"); }}>Salir</button>
      </header>
      <h1 className="text-3xl font-bold">{siteConfig.shortName}</h1>
      <nav className="mb-6 mt-3 flex gap-5 border-b border-white/10 text-sm">
        <span className="border-b-2 border-[#b08d57] pb-3 font-semibold">Turnos</span>
        <Link href="/admin/catalogo" className="pb-3 text-white/60 hover:text-white">Servicios y horarios</Link>
      </nav>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {([["Hoy", stats.hoy], ["Próximos 7 días", stats.semana], ["Pendientes", stats.pendientes]] as const).map(([l, n]) => (
          <div key={l} className="rounded-2xl border border-white/10 bg-neutral-950 p-4">
            <p className="text-3xl font-bold text-[#b08d57]">{n}</p><p className="text-xs text-white/50">{l}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button className={chip(filter === "hoy")} onClick={() => setFilter("hoy")}>Hoy</button>
        <button className={chip(filter === "manana")} onClick={() => setFilter("manana")}>Mañana</button>
        <button className={chip(filter === "proximos")} onClick={() => setFilter("proximos")}>Próximos</button>
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button className={chip(barber === "todos")} onClick={() => setBarber("todos")}>Todos</button>
        {barbers.map((b) => <button key={b} className={chip(barber === b)} onClick={() => setBarber(b)}>{b}</button>)}
        <label className="ml-auto text-xs text-white/50"><input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> ver cancelados</label>
      </div>

      {msg && <p className="mb-4 text-red-300">{msg}</p>}
      {rows === null && !msg && <p className="text-white/50">Cargando turnos…</p>}
      {rows && groups.length === 0 && <p className="rounded-2xl border border-white/10 p-6 text-center text-white/50">No hay turnos para este filtro.</p>}

      <div className="grid gap-8">
        {groups.map(([k, list]) => (
          <section key={k}>
            <h2 className="mb-3 text-sm font-semibold capitalize text-white/60">{k === today ? "Hoy · " : k === tomorrow ? "Mañana · " : ""}{dayLabel(k)}</h2>
            <ul className="grid gap-3">
              {list.map((r) => (
                <li key={r.id} className={`flex gap-4 rounded-2xl border border-white/10 bg-neutral-950 p-4 ${r.status === "cancelled" ? "opacity-50" : ""}`}>
                  <div className="w-16 shrink-0 text-center">
                    <p className="text-2xl font-bold">{hhmm(r.start_at)}</p>
                    <p className="text-xs text-white/40">hasta {hhmm(r.end_at)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{r.customer_name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[r.status]?.cls}`}>{STATUS[r.status]?.label}</span>
                    </div>
                    <p className="text-sm text-white/60">{r.services?.name} · con {r.barbers?.name}</p>
                    <p className="mt-1 text-sm"><a className="text-white/60 underline" href={`tel:${r.customer_phone}`}>{r.customer_phone}</a>
                      {r.customer_email && <span className="text-white/40"> · {r.customer_email}</span>}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a className={act} href={waLink(r.customer_phone)} target="_blank" rel="noreferrer">WhatsApp</a>
                      {r.status === "pending" && <button className={act} onClick={() => setStatus(r.id, "confirmed")}>Confirmar</button>}
                      {(r.status === "pending" || r.status === "confirmed") && <button className={act} onClick={() => setStatus(r.id, "completed")}>Completado</button>}
                      {(r.status === "pending" || r.status === "confirmed") && <button className={act + " text-red-300"} onClick={() => confirm("¿Cancelar este turno?") && setStatus(r.id, "cancelled")}>Cancelar</button>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
};