import Link from "next/link";
import BookingFlow from "@/components/booking/BookingFlow";
export const metadata = { title: "Reservar turno | ALAN Barber & Co." };
export default function Reservar() {
  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pb-10 pt-6">
      <Link href="/" className="text-sm text-white/60 hover:text-white">← ALAN</Link>
      <BookingFlow />
    </main>
  );
}
