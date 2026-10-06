import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/config/siteConfig";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Solo recibe el token secreto del turno: no se puede usar para mandar mails a cualquiera.
export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    const key = process.env.RESEND_API_KEY;
    if (!key || !token) return NextResponse.json({ ok: false });
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    const { data } = await db.rpc("claim_confirmation", { p_token: token });
    const b = data?.[0];
    if (!b) return NextResponse.json({ ok: false });
    const when = new Date(b.start_at).toLocaleString("es-AR", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: siteConfig.timezone,
    });
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const html = `<div style="font-family:Arial,sans-serif;max-width:480px">
      <h2>Turno confirmado ✓</h2><p>Hola ${esc(b.customer_name)}, tu turno está reservado.</p>
      <p><b>${esc(b.barber_name)}</b><br>${esc(b.service_name)}<br>${esc(when)}</p>
      <p>${esc(siteConfig.address.line1)}, ${esc(siteConfig.address.city)}</p>
      <p><a href="${site}/cancelar/${token}">Cancelar mi turno</a></p></div>`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM ?? "onboarding@resend.dev", to: b.customer_email, subject: `Turno confirmado · ${siteConfig.name}`, html }),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }); // un mail fallido nunca rompe la reserva
  }
}
