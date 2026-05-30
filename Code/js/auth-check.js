// Verificar autenticación en cada página
(function () {
  const currentPage = document.body.dataset.page;

  if (currentPage === "auth" || currentPage === "landing") return;

  // Verificar si hay usuario en localStorage
  const userStr = localStorage.getItem("canvas_user");
  
  if (!userStr) {
    window.location.href = "index.html";
  } else {
    try {
      const user = JSON.parse(userStr);
      // Guardar en global para acceso en otras páginas
      window.CanvasApp = window.CanvasApp || {};
      window.CanvasApp.currentUser = user;
    } catch (e) {
      localStorage.removeItem("canvas_user");
      window.location.href = "index.html";
    }
  }
})();

let canvasLogoutInFlight = null;

function readSupabaseRuntimeConfig() {
  const readConfig = window.CanvasApp?.SupabaseConfig?.read;
  if (typeof readConfig === "function") {
    return readConfig();
  }
  const url = String(window.CANVAS_SUPABASE_URL || "").trim();
  const key = String(window.CANVAS_SUPABASE_KEY || "").trim();
  return { url, key, valid: Boolean(url && key) };
}

function removeSupabaseSessionKeys() {
  const removableKeys = [
    "canvas_user",
    "canvas_app_state_v3",
    "canvas_ui_settings_v1",
    "canvas_auth_mode",
    "canvas_supabase_url",
    "canvas_supabase_key",
    "supabase_url",
    "supabase_anon_key",
    "sb-auth-token"
  ];

  removableKeys.forEach((key) => localStorage.removeItem(key));

  Object.keys(localStorage)
    .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
    .forEach((key) => localStorage.removeItem(key));
}

async function ensureSupabaseLibrary() {
  if (window.supabase?.createClient) return true;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return Boolean(window.supabase?.createClient);
}

// Función para hacer logout
async function logout() {
  if (canvasLogoutInFlight) return canvasLogoutInFlight;

  canvasLogoutInFlight = (async () => {
    try {
      const config = readSupabaseRuntimeConfig();
      if (config.valid) {
        const loaded = await ensureSupabaseLibrary();
        if (loaded) {
          const client = window.supabase.createClient(config.url, config.key);
          await client.auth.signOut({ scope: "global" });
        }
      }
    } catch (error) {
      console.warn("No se pudo cerrar sesión remota de Supabase.", error);
    } finally {
      removeSupabaseSessionKeys();
      window.location.href = "index.html";
    }
  })();

  return canvasLogoutInFlight;
}

// Exponer logout globalmente
window.logout = logout;
