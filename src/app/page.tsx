import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/ui/Reveal";
import Gallery from "@/components/ui/Gallery";
import HeroGlow from "@/components/ui/HeroGlow";
import { createClient } from "@supabase/supabase-js";
import { siteConfig, whatsappLink } from "@/config/siteConfig";

export const revalidate = 60;
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const money = (n: number) => "$" + Number(n).toLocaleString("es-AR");

export default async function Home() {
  const [{ data: barbers }, { data: services }] = await Promise.all([
    db.from("barbers").select("*").order("sort_order"),
    db.from("services").select("*").order("sort_order"),
  ]);
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-black/70 px-5 py-4 backdrop-blur">
        <span className="text-xl font-bold tracking-widest">{siteConfig.shortName}</span>
        <nav className="hidden gap-6 text-sm text-white/70 md:flex">
          <a href="#servicios">Servicios</a><a href="#barberos">Barberos</a><a href="#ubicacion">Ubicación</a>
        </nav>
        <Link href="/reservar" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Reservar</Link>
      </header>

      <main>
        <section className="relative isolate grid min-h-[80dvh] content-end gap-6 overflow-hidden bg-gradient-to-b from-neutral-900 to-black px-5 pb-16"><HeroGlow />
          <Reveal><h1 className="text-6xl font-extrabold leading-none md:text-8xl">ALAN<br />Barber &amp; Co.</h1></Reveal>
          <Reveal delay={0.15}><p className="max-w-sm text-lg text-white/70">Reservá. Sentate. Salí distinto.</p></Reveal>
          <Reveal delay={0.3} className="flex gap-3">
            <Link href="/reservar" className="rounded-full bg-white px-6 py-4 font-semibold text-black">Reservar turno</Link>
            <a href="#servicios" className="rounded-full border border-white/30 px-6 py-4">Ver servicios</a>
          </Reveal>
        </section>

        <section id="servicios" className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="mb-6 text-3xl font-bold">Nuestros servicios</h2>
          <Reveal><ul className="divide-y divide-white/10 border-y border-white/10">
            {services?.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-5 transition-all duration-300 hover:bg-white/5 hover:pl-4">
                <div><p className="text-lg font-semibold">{s.name}</p><p className="text-sm text-white/50">{s.duration_minutes} min</p></div>
                <p className="text-[#b08d57]">{money(s.price)}</p>
              </li>
            ))}
          </ul></Reveal>
        </section>

        <section id="barberos" className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="mb-6 text-3xl font-bold">Elegí quién te atiende.</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {barbers?.map((b, i) => (
              <Reveal key={b.id} delay={i * 0.12}><Link href={`/reservar?barbero=${b.id}`} className="group relative block aspect-[3/4] overflow-hidden bg-neutral-800">
                {/* Reemplazar por <Image src={b.photo_url} /> cuando haya fotos */}
                {b.photo_url ? <Image src={b.photo_url} alt={b.name} fill sizes="(min-width:640px) 400px, 100vw" className="object-cover transition duration-700 group-hover:scale-105" /> : <span className="absolute inset-0 grid place-items-center text-7xl font-bold text-white/10 transition duration-700 group-hover:scale-110">{b.name[0]}</span>}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black p-5">
                  <p className="text-2xl font-bold">{b.name}</p>
                  <p className="text-sm text-white/60">{b.description}</p>
                  <p className="mt-3 text-sm font-semibold opacity-80 transition group-hover:opacity-100">Reservar con {b.name.split(" ")[0]}</p>
                </div>
              </Link></Reveal>
            ))}
          </div>
        </section>

        <Gallery images={siteConfig.gallery} />

        <section id="ubicacion" className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="mb-4 text-3xl font-bold">Ubicación</h2>
          <address className="not-italic text-white/80">{siteConfig.address.line1}<br />{siteConfig.address.city}</address>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <a href={siteConfig.address.mapsUrl} className="rounded-full border border-white/30 px-5 py-3">Cómo llegar</a>
            <a href={siteConfig.instagram.url} className="rounded-full border border-white/30 px-5 py-3">{siteConfig.instagram.handle}</a>
            <a href={whatsappLink()} className="rounded-full border border-white/30 px-5 py-3">WhatsApp</a>
          </div>
        </section>
      </main>
      <footer className="px-5 pb-28 pt-8 text-sm text-white/40 md:pb-8">© {new Date().getFullYear()} {siteConfig.name}</footer>
      <Link href="/reservar" className="fixed inset-x-4 bottom-4 z-30 rounded-full bg-white py-4 text-center font-bold text-black md:hidden">Reservar turno</Link>
    </>
  );
}
