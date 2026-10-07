import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/config/siteConfig";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

const row = (l: string, v: string) =>
  `<tr><td style="padding:14px 0;border-bottom:1px solid #222;color:#8a8a8a;font-size:12px;letter-spacing:1.5px;text-transform:uppercase">${l}</td>` +
  `<td align="right" style="padding:14px 0;border-bottom:1px solid #222;color:#ffffff;font-size:16px;font-weight:600">${esc(v)}</td></tr>`;

const button = (href: string, label: string, primary: boolean) =>
  `<a href="${href}" style="display:inline-block;margin:6px 4px;padding:14px 26px;border-radius:999px;font-size:14px;font-weight:700;text-decoration:none;` +
  (primary ? "background:#ffffff;color:#000000" : "border:1px solid #444;color:#ffffff") + `">${label}</a>`;

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

    const tz = siteConfig.timezone;
    const date = cap(new Date(b.start_at).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: tz }));
    const time = new Date(b.start_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const address = `${siteConfig.address.line1}, ${siteConfig.address.city}`;
    const hasMaps = siteConfig.address.mapsUrl.startsWith("http");
    const hasWa = /^\d+$/.test(siteConfig.whatsapp.number);

    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#000000">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Tu turno con ${esc(b.barber_name)} está reservado: ${esc(date)} a las ${time}.</div>
<table role="presentation" width="100%" bgcolor="#000000" style="background:#000000"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;font-family:${FONT}">
<tr><td align="center" style="padding-bottom:28px;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:6px">${esc(siteConfig.shortName)}</td></tr>
<tr><td bgcolor="#0f0f0f" style="background:#0f0f0f;border:1px solid #222;border-radius:18px;padding:32px 28px">
  <div style="width:52px;height:52px;line-height:52px;border-radius:26px;background:#ffffff;color:#000000;font-size:26px;font-weight:700;text-align:center;margin:0 auto 18px">&#10003;</div>
  <h1 style="margin:0 0 8px;color:#ffffff;font-size:26px;text-align:center">Turno confirmado</h1>
  <p style="margin:0 0 26px;color:#9a9a9a;font-size:15px;text-align:center">Hola ${esc(b.customer_name)}, tu turno está reservado.</p>
  <table role="presentation" width="100%" style="border-top:1px solid #222">
    ${row("Barbero", b.barber_name)}${row("Servicio", b.service_name)}${row("Fecha", date)}${row("Hora", time + " hs")}
  </table>
  <p style="margin:22px 0 4px;color:#b08d57;font-size:14px;text-align:center">${esc(address)}</p>
  <div style="text-align:center;padding-top:18px">
    ${hasMaps ? button(siteConfig.address.mapsUrl, "Cómo llegar", true) : ""}${hasWa ? button(`https://wa.me/${siteConfig.whatsapp.number}`, "WhatsApp", false) : ""}
  </div>
</td></tr>
<tr><td align="center" style="padding-top:22px;color:#777;font-size:13px;line-height:1.6">
  ¿No podés venir? <a href="${site}/cancelar/${token}" style="color:#b08d57">Cancelá tu turno acá</a> para liberar el horario.<br>
  ${esc(siteConfig.name)} · ${esc(address)}
</td></tr>
</table></td></tr></table></body></html>`;

    const text = `Turno confirmado\n\nHola ${b.customer_name}, tu turno está reservado.\n\nBarbero: ${b.barber_name}\nServicio: ${b.service_name}\nFecha: ${date}\nHora: ${time} hs\nLugar: ${address}\n\nCancelar: ${site}/cancelar/${token}`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM ?? "onboarding@resend.dev", to: b.customer_email, subject: `Turno confirmado · ${siteConfig.name}`, html, text }),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }); // un mail fallido nunca rompe la reserva
  }
};