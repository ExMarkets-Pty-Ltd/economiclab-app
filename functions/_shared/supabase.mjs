import { createClient } from "@supabase/supabase-js";

export class SupabaseConfigurationError extends Error {
  constructor() {
    super("Supabase server configuration is unavailable.");
    this.name = "SupabaseConfigurationError";
  }
}

export function getAdminSupabase(env = process.env) {
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new SupabaseConfigurationError();
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(request, createSupabase = getAdminSupabase) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!token) return null;

  const supabase = createSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return { supabase, user: data.user };
}
