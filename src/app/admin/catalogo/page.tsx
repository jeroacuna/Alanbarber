"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const inp = "min-h-11 rounded-lg border border-white/15 bg-transparent px-3 text-sm text-white";

export default function Catalogo() {
  const router = useRouter();
  const [services, setServices] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [nb, setNb] = useState({ date: "", barber_id: "", reason: "" });

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/admin/login"); return; }
    const [s, h, b, d] = await Promise.all([
      supabase.from("services").select("*").order("sort_order"),
      supabase.from("working_hours").select("*").order("day_of_week"),
      supabase.from("barbers").select("*").order("sort_order"),
      supabase.from("blocked_dates").select("*").order("date"),
    ]);
    setServices(s.data ?? []); setHours(h.data ?? []); setBarbers(b.data ?? []); setBlocked(d.data ?? []);
  }, [router]);
  useEffect(() => { load(); }, [load]);

  const upd = async (table: string, id: string, patch: object) => { await supabase.from(table).update(patch).eq("id", id); load(); };
  const del = async (table: string, id: string) => { await supabase.from(table).delete().eq("id", id); load(); };
  const t = (v: string) => v.slice(0, 5);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <a href="/admin" className="text-sm text-white/60">← Turnos</a>
      <h1 className="my-4 text-3xl font-bold">Servicios y precios</h1>
      <div className="grid gap-2">
        {services.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2">
            <input className={inp + " w-44"} defaultValue={s.name} onBlur={(e) => e.target.value !== s.name && upd("services", s.id, { name: e.target.value })} />
            <input className={inp + " w-20"} type="number" defaultValue={s.duration_minutes} onBlur={(e) => +e.target.value !== s.duration_minutes && upd("services", s.id, { duration_minutes: +e.target.value })} />
            <span className="text-xs text-white/50">min</span>
            <input className={inp + " w-28"} type="number" defaultValue={s.price} onBlur={(e) => +e.target.value !== +s.price && upd("services", s.id, { price: +e.target.value })} />
            <label className="text-xs"><input type="checkbox" checked={s.active} onChange={(e) => upd("services", s.id, { active: e.target.checked })} /> activo</label>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-2xl font-bold">Horarios</h2>
      {barbers.map((b) => (
        <div key={b.id} className="mb-6">
          <p className="mb-2 font-semibold">{b.name}</p>
          <div className="grid gap-2">
            {hours.filter((h) => h.barber_id === b.id).map((h) => (
              <div key={h.id} className="flex flex-wrap items-center gap-2">
                <select className={inp} value={h.day_of_week} onChange={(e) => upd("working_hours", h.id, { day_of_week: +e.target.value })}>
                  {DAYS.map((d, i) => <option key={d} value={i} className="text-black">{d}</option>)}
                </select>
                <input className={inp} type="time" defaultValue={t(h.start_time)} onBlur={(e) => e.target.value && upd("working_hours", h.id, { start_time: e.target.value })} />
                <input className={inp} type="time" defaultValue={t(h.end_time)} onBlur={(e) => e.target.value && upd("working_hours", h.id, { end_time: e.target.value })} />
                <label className="text-xs"><input type="checkbox" checked={h.active} onChange={(e) => upd("working_hours", h.id, { active: e.target.checked })} /> activo</label>
                <button className="text-xs text-red-300" onClick={() => del("working_hours", h.id)}>Borrar</button>
              </div>
            ))}
          </div>
          <button className="mt-2 text-sm text-[#b08d57]" onClick={async () => { await supabase.from("working_hours").insert({ barber_id: b.id, day_of_week: 1, start_time: "16:00", end_time: "20:00" }); load(); }}>+ Agregar horario</button>
        </div>
      ))}

      <h2 className="mb-3 mt-10 text-2xl font-bold">Días bloqueados</h2>
      <div className="flex flex-wrap gap-2">
        <input className={inp} type="date" value={nb.date} onChange={(e) => setNb({ ...nb, date: e.target.value })} />
        <select className={inp} value={nb.barber_id} onChange={(e) => setNb({ ...nb, barber_id: e.target.value })}>
          <option value="" className="text-black">Todos</option>
          {barbers.map((b) => <option key={b.id} value={b.id} className="text-black">{b.name}</option>)}
        </select>
        <input className={inp} placeholder="Motivo" value={nb.reason} onChange={(e) => setNb({ ...nb, reason: e.target.value })} />
        <button className="rounded-lg bg-white px-4 text-sm font-semibold text-black" onClick={async () => {
          if (!nb.date) return;
          await supabase.from("blocked_dates").insert({ date: nb.date, barber_id: nb.barber_id || null, reason: nb.reason || null });
          setNb({ date: "", barber_id: "", reason: "" }); load();
        }}>Bloquear</button>
      </div>
      <ul className="mt-3 grid gap-1 text-sm">
        {blocked.map((d) => (
          <li key={d.id}>{d.date} · {barbers.find((b) => b.id === d.barber_id)?.name ?? "Todos"} {d.reason && `· ${d.reason}`}
            <button className="ml-2 text-xs text-red-300" onClick={() => del("blocked_dates", d.id)}>Quitar</button></li>
        ))}
      </ul>
    </main>
  );
}
