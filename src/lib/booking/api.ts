import { supabase } from "@/lib/supabase/client";
import { siteConfig, whatsappLink } from "@/config/siteConfig";

export type Barber = { id: string; name: string; description: string | null; photo_url: string | null; instagram: string | null };
export type Service = { id: string; name: string; description: string | null; duration_minutes: number; price: number };
export type Booking = { appointmentId: string; token: string; endsAt: string };

export async function getBarbers(): Promise<Barber[]> {
  const { data, error } = await supabase.from("barbers").select("*").order("sort_order");
  if (error) throw error;
  return data;
}

export async function getServices(barberId?: string): Promise<Service[]> {
  if (!barberId) {
    const { data, error } = await supabase.from("services").select("*").order("sort_order");
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("barber_services").select("services(*)").eq("barber_id", barberId);
  if (error) throw error;
  return (data ?? []).flatMap((r: any) => (r.services ? [r.services as Service] : []))
    .sort((a, b) => a.duration_minutes - b.duration_minutes);
}

/** Horarios libres (ISO) calculados por Postgres. date = "YYYY-MM-DD". */
export async function getAvailableSlots(barberId: string, serviceId: string, date: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_available_slots",
    { p_barber: barberId, p_service: serviceId, p_date: date });
  if (error) throw error;
  return (data ?? []).map((r: { slot_start: string }) => r.slot_start);
}

export class SlotUnavailableError extends Error {}

export async function createAppointment(input: {
  barberId: string; serviceId: string; startAt: string;
  name: string; phone: string; email?: string;
}): Promise<Booking> {
  const { data, error } = await supabase.rpc("create_appointment", {
    p_barber: input.barberId, p_service: input.serviceId, p_start: input.startAt,
    p_name: input.name, p_phone: input.phone, p_email: input.email ?? null,
  });
  if (error) {
    if (error.message.includes("slot_unavailable"))
      throw new SlotUnavailableError("Ese horario se acaba de ocupar. Elegí otro.");
    throw error;
  }
  const row = data[0];
  return { appointmentId: row.appointment_id, token: row.token, endsAt: row.ends_at };
}

export async function cancelByToken(token: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("cancel_by_token", { p_token: token });
  if (error) throw error;
  return data as boolean;
}

export function bookingWhatsAppLink(b: { barber: string; service: string; date: string; time: string; name: string }) {
  return whatsappLink(
    `Hola! Acabo de reservar un turno en ${siteConfig.name}.\n\n` +
    `Barbero: ${b.barber}\nServicio: ${b.service}\nFecha: ${b.date}\nHora: ${b.time}\n\nNombre: ${b.name}`
  );
};