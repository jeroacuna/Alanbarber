import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { MessageCircle } from "lucide-react";
import "./globals.css";
import { siteConfig, whatsappLink } from "@/config/siteConfig";

const font = Archivo({ subsets: ["latin"] });
const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Barbería en Paraná | ALAN Barber & Co.",
  description: "Cortes y barba en Paraná, Entre Ríos. Elegí tu barbero y reservá tu turno online en minutos.",
  openGraph: { title: siteConfig.name, description: siteConfig.tagline, locale: "es_AR", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className={`${font.className} bg-black text-white antialiased`}>
        {children}
        <a href={whatsappLink("Hola! Quería hacer una consulta.")} aria-label="Escribinos por WhatsApp"
           className="fixed right-4 bottom-20 md:bottom-6 z-40 grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-lg focus-visible:outline-2 focus-visible:outline-[#b08d57]">
          <MessageCircle size={22} />
        </a>
      </body>
    </html>
  );
}
