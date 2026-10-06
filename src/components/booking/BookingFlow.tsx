"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import {
  Barber, Service, Booking, getBarbers, getServices, getAvailableSlots,
  createAppointment, SlotUnavailableError, bookingWhatsAppLink,
} from "@/lib/booking/api";
import { siteConfig } from "@/config/siteConfig";

const tz = siteConfig.timezone;
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
const money = (n: number) => "$" + Number(n).toLocaleString("es-AR");
const nextDays = (n: number) => Array.from({ length: n }, (_, i) => new Date(Date.now() + i * 864e5).toLocaleDateString("en-CA", { timeZone: tz }));
const TITLES = ["¿Con quién querés reservar?", "¿Qué te hacemos?", "Elegí el día", "Elegí la hora", "Tus datos", "Turno confirmado"];
const btn = "min-h-14 w-full rounded-xl border border-white/15 px-5 text-left transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#b08d57]";

function downloadIcs(startIso: string, endIso: string, title: string) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", `DTSTART:${f(startIso)}`, `DTEND:${f(endIso)}`,
    `SUMMARY:${title}`, `LOCATION:${siteConfig.address.line1}, ${siteConfig.address.city}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "turno.ics"; a.click();
}

export default function BookingFlow() {
  const [step, setStep] = useState(0);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barber, setBarber] = useState<Barber>();
  const [service, setService] = useState<Service>();
  const [days, setDays] = useState<Record<string, string[]> | null>(null);
  const [date, setDate] = useState<string>();
  const [slot, setSlot] = useState<string>();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [done, setDone] = useState<Booking>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getBarbers().then((b) => {
      setBarbers(b);
      const pre = b.find((x) => x.id === new URLSearchParams(location.search).get("barbero"));
      if (pre) pickBarber(pre);
    }).catch(() => setError("No pudimos cargar los barberos. Probá de nuevo."));
    try { const s = localStorage.getItem("alan-cliente"); if (s) setForm(JSON.parse(s)); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pickBarber(b: Barber) {
    setBarber(b); setError(""); setStep(1);
    setServices(await getServices(b.id));
  }
  async function loadDays(b: Barber, s: Service) {
    setDays(null);
    const list = nextDays(14);
    const res = await Promise.all(list.map((d) => getAvailableSlots(b.id, s.id, d)));
    setDays(Object.fromEntries(list.map((d, i) => [d, res[i]])));
  }
  function pickService(s: Service) { setService(s); setStep(2); setDate(undefined); setSlot(undefined); loadDays(barber!, s); }

  async function confirm() {
    if (!barber || !service || !slot) return;
    setBusy(true); setError("");
    try {
      const b = await createAppointment({ barberId: barber.id, serviceId: service.id, startAt: slot, ...form });
      try { localStorage.setItem("alan-cliente", JSON.stringify(form)); } catch {}
      setDone(b); setStep(5);
    } catch (e) {
      setError(e instanceof SlotUnavailableError ? e.message : "No pudimos reservar. Probá de nuevo.");
      if (e instanceof SlotUnavailableError) { loadDays(barber, service); setSlot(undefined); setStep(3); }
    } finally { setBusy(false); }
  }

  const slots = (date && days?.[date]) || [];
  const valid = form.name.trim().length >= 2 && form.phone.trim().length >= 6;

  return (
    <section aria-live="polite" className="mt-6">
      {step > 0 && step < 5 && <button onClick={() => setStep(step - 1)} className="mb-3 text-sm text-white/60">← Volver</button>}
      <h1 className="mb-6 text-3xl font-bold">{TITLES[step]}</h1>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="grid gap-3">
          {step === 0 && barbers.map((b) => (
            <button key={b.id} onClick={() => pickBarber(b)} className={btn + " py-5 text-xl font-semibold"}>
              {b.name}<span className="block text-sm font-normal text-white/50">{b.description}</span>
            </button>
          ))}

          {step === 1 && services.map((s) => (
            <button key={s.id} onClick={() => pickService(s)} className={btn + " flex items-center justify-between py-4"}>
              <span><span className="block font-semibold">{s.name}</span><span className="text-sm text-white/50">{s.duration_minutes} min</span></span>
              <span className="text-[#b08d57]">{money(s.price)}</span>
            </button>
          ))}

          {step === 2 && (days === null ? <p className="text-white/50">Buscando días disponibles…</p> : (
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(days).map(([d, s]) => (
                <button key={d} disabled={!s.length} onClick={() => { setDate(d); setStep(3); }}
                  className="min-h-16 rounded-xl border border-white/15 px-2 text-sm capitalize transition hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent">
                  {new Date(d + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric" })}
                </button>
              ))}
            </div>
          ))}

          {step === 3 && (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s) => (
                <button key={s} onClick={() => { setSlot(s); setStep(4); }} className="min-h-14 rounded-xl border border-white/15 transition hover:bg-white hover:text-black">{fmtTime(s)}</button>
              ))}
              {!slots.length && <p className="col-span-3 text-white/50">No quedan horarios ese día.</p>}
            </div>
          )}

          {step === 4 && barber && service && slot && date && (
            <>
              <dl className="grid grid-cols-2 gap-3 rounded-xl border border-white/15 p-4 text-sm">
                <div><dt className="text-white/50">Barbero</dt><dd>{barber.name}</dd></div>
                <div><dt className="text-white/50">Servicio</dt><dd>{service.name}</dd></div>
                <div><dt className="text-white/50">Fecha</dt><dd className="capitalize">{fmtDate(date)}</dd></div>
                <div><dt className="text-white/50">Hora</dt><dd>{fmtTime(slot)}</dd></div>
                <div><dt className="text-white/50">Duración</dt><dd>{service.duration_minutes} min</dd></div>
                <div><dt className="text-white/50">Precio</dt><dd>{money(service.price)}</dd></div>
              </dl>
              {(["name", "phone", "email"] as const).map((k) => (
                <label key={k} className="grid gap-1 text-sm text-white/70">
                  {k === "name" ? "Nombre" : k === "phone" ? "Teléfono" : "Email (opcional)"}
                  <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    type={k === "email" ? "email" : k === "phone" ? "tel" : "text"} autoComplete={k === "name" ? "name" : k}
                    className="min-h-14 rounded-xl border border-white/15 bg-transparent px-4 text-base text-white focus-visible:outline-2 focus-visible:outline-[#b08d57]" />
                </label>
              ))}
              <button onClick={confirm} disabled={!valid || busy} className="min-h-14 rounded-xl bg-white font-bold text-black disabled:opacity-40">
                {busy ? "Reservando…" : "CONFIRMAR TURNO"}
              </button>
            </>
          )}

          {step === 5 && done && barber && service && slot && date && (
            <>
              <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-black"><Check /></div>
              <p>Tu turno está reservado.</p>
              <p className="rounded-xl border border-white/15 p-4 capitalize">{barber.name}<br />{service.name}<br />{fmtDate(date)} · {fmtTime(slot)}</p>
              <button className={btn} onClick={() => downloadIcs(slot, done.endsAt, `${service.name} en ${siteConfig.name}`)}>Agregar al calendario</button>
              <a className={btn + " flex items-center"} href={bookingWhatsAppLink({ barber: barber.name, service: service.name, date: fmtDate(date), time: fmtTime(slot), name: form.name })}>Enviar reserva por WhatsApp</a>
              <a className={btn + " flex items-center"} href="/">Volver al inicio</a>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
