import { createBrowserClient } from "@supabase/ssr";

// Solo clave publishable. La service_role NUNCA va en el frontend.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
