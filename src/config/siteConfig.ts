// Único lugar para cambiar datos del negocio.
export const siteConfig = {
  name: "ALAN Barber & Co.",
  shortName: "ALAN BARBER",
  tagline: "Tu estilo empieza acá.",
  timezone: "America/Argentina/Buenos_Aires",
  instagram: { handle: "@alanbarberandco", url: "https://instagram.com/alanbarberandco" },
  // Fotos del local/cortes: poné los archivos en /public/gallery y listalos acá, ej: "/gallery/1.jpg"
  gallery: [] as string[],
  whatsapp: { number: "BARBER_PHONE" }, // formato internacional sin +, ej: 54343XXXXXXX
  address: {
    line1: "Buenos Aires 60, Local 5",
    city: "Paraná, Entre Ríos",
    mapsUrl: "GOOGLE_MAPS_URL",
  },
} as const;

export const whatsappLink = (text?: string) =>
  `https://wa.me/${siteConfig.whatsapp.number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;