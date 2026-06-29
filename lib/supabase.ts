import { createClient } from "@supabase/supabase-js";

// On utilise les variables NEXT_PUBLIC_ qui sont disponibles
// à la fois côté serveur ET côté navigateur.
// La clé anon (publishable) est de toute façon publique par conception.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

// Client partagé — utilisé dans les API routes (server) et composants (client)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

// Alias pour les composants client (même client, gardé pour compatibilité)
let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (browserClient) return browserClient;
  browserClient = createClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
