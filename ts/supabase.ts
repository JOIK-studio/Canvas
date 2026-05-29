import { SUPABASE_CONFIG } from "./types";

let supabaseClient: any = null;

export async function initSupabase() {
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
    supabaseClient = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
    return supabaseClient;
  } catch (error) {
    console.error("Error inicializando Supabase:", error);
    return null;
  }
}

export function getSupabaseClient() {
  return supabaseClient;
}

export async function signUp(email: string, password: string, username: string) {
  if (!supabaseClient) throw new Error("Supabase no inicializado");

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { username }
    }
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  if (!supabaseClient) throw new Error("Supabase no inicializado");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabaseClient) throw new Error("Supabase no inicializado");
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  if (!supabaseClient) throw new Error("Supabase no inicializado");

  const { data, error } = await supabaseClient.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getSession() {
  if (!supabaseClient) throw new Error("Supabase no inicializado");

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session;
}
