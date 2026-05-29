// Configuración de Supabase
// IMPORTANTE: Reemplaza con tus credenciales de Supabase

export const SUPABASE_CONFIG = {
  URL: import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co",
  ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key"
};

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
}

export interface Creation {
  id: string;
  author_id: string;
  title: string;
  grid: string[][];
  pixels_used: number;
  like_count: number;
  boost_count: number;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface AppState {
  auth: AuthState;
  user: {
    coins: number;
    pixels_inventory: number;
    charges: number;
    max_charges: number;
    recharge_seconds: number;
  };
  creations: Creation[];
  events: Array<{ id: string; text: string; ts: number }>;
}
