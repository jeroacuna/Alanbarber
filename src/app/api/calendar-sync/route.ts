import { NextResponse } from "next/server";
import { createSign } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/config/siteConfig";

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

async function googleToken(email: string, key: string) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: "RS256", typ: "JWT" });
  const claim = b64({ iss: email, scope: "https://www.googleapis.com/auth/calendar.events", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const sig = createSign("RSA-SHA256").update(`${head}.${claim}`).sign(key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${sig}` }),
  });
  return (await r.json()).access_token as string;
}

// Crea el turno en el Google Calendar de la barbería. Si falta configuración, no hace nada.
export async function POST(req: Request) {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, calId = process.env.GOOGLE_CALENDAR_ID;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const { token } = await req.json();
    if (!email || !key || !calId || !token) return NextResponse.json({ ok: false });
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    const { data } = await db.rpc("claim_calendar_sync", { p_token: token });
    const b = data?.[0];
    if (!b) return NextResponse.json({ ok: false });
    const access = await googleToken(email, key);
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`, {
      method: "POST", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `${b.barber_name} · ${b.service_name} · ${b.customer_name}`,
        description: `Cliente: ${b.customer_name}\nTeléfono: ${b.customer_phone}`,
        start: { dateTime: b.start_at, timeZone: siteConfig.timezone },
        end: { dateTime: b.end_at, timeZone: siteConfig.timezone },
      }),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }); // nunca rompe la reserva
  }
}
