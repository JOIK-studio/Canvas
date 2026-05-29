let isLoggingOut = false;

// Verificar autenticación en cada página
(function () {
  void guardRouteWithSupabase();
})();

async function guardRouteWithSupabase() {
  const currentPage = document.body.dataset.page;
  const query = new URLSearchParams(window.location.search);
  const hash = String(window.location.hash || "");
  const isOAuthReturn = query.has("code") || query.has("error") || hash.includes("access_token") || hash.includes("error");

  if (currentPage === "auth" || currentPage === "landing") return;
  if (isOAuthReturn) return;

  const config = getSupabaseConfig();
  if (!hasValidSupabaseConfig(config)) {
    window.location.replace("index.html");
    return;
  }

  try {
    if (!window.supabase) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    if (!window.supabase?.createClient) {
      window.location.replace("index.html");
      return;
    }

    const client = window.supabase.createClient(config.url, config.key);
    const { data, error } = await client.auth.getSession();
    const user = data?.session?.user;

    if (error || !user?.id) {
      clearLocalSession();
      window.location.replace("index.html");
      return;
    }

    window.CanvasApp = window.CanvasApp || {};
    window.CanvasApp.currentUser = user;
    localStorage.setItem("canvas_user", JSON.stringify(user));
  } catch {
    window.location.replace("index.html");
  }
}

function getSupabaseConfig() {
  const urlMeta = document.querySelector('meta[name="supabase-url"]');
  const keyMeta = document.querySelector('meta[name="supabase-key"]');
  const url = window.CANVAS_SUPABASE_URL || urlMeta?.content || "";
  const key = window.CANVAS_SUPABASE_KEY || keyMeta?.content || "";
  return { url: url.trim(), key: key.trim() };
}

function hasValidSupabaseConfig(config) {
  if (!config.url || !config.key) return false;
  if (config.url.includes("your-project") || config.key.includes("your-public-key")) return false;
  try {
    const parsed = new URL(config.url);
    return /^https?:$/.test(parsed.protocol);
  } catch {
    return false;
  }
}

function clearLocalSession() {
  if (window.CanvasApp) {
    window.CanvasApp.currentUser = null;
  }

  localStorage.removeItem("canvas_user");
  localStorage.removeItem("canvas_app_state_v3");
  localStorage.removeItem("sb-auth-token");
  sessionStorage.removeItem("canvas_user");
  sessionStorage.removeItem("canvas_app_state_v3");
  sessionStorage.removeItem("sb-auth-token");

  // Limpieza defensiva para todas las variantes de sesión Supabase.
  Object.keys(localStorage).forEach((key) => {
    const lower = key.toLowerCase();
    if (lower.startsWith("sb-") || lower.includes("supabase.auth") || lower.includes("auth-token")) {
      localStorage.removeItem(key);
    }
  });

  Object.keys(sessionStorage).forEach((key) => {
    const lower = key.toLowerCase();
    if (lower.startsWith("sb-") || lower.includes("supabase.auth") || lower.includes("auth-token")) {
      sessionStorage.removeItem(key);
    }
  });
}

async function bestEffortRemoteSignOut() {
  try {
    const config = getSupabaseConfig();
    if (hasValidSupabaseConfig(config)) {
      if (!window.supabase) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if (window.supabase?.createClient) {
        const client = window.supabase.createClient(config.url, config.key);
        await Promise.race([
          client.auth.signOut(),
          new Promise((resolve) => setTimeout(resolve, 1200))
        ]);
      }
    }
  } catch {
    // Silencioso: logout local ya garantiza salida de sesión en cliente.
  }
}

async function logout() {
  if (isLoggingOut) return;
  isLoggingOut = true;

  localStorage.setItem("canvas_logged_out_at", String(Date.now()));
  clearLocalSession();

  // Intento remoto con timeout corto para cerrar sesión real sin dejar colgado el flujo.
  await bestEffortRemoteSignOut();

  window.location.replace(`index.html?logged_out=1&t=${Date.now()}`);
}

function bindLogoutButtons() {
  const buttons = document.querySelectorAll("button.dropdown-item");
  buttons.forEach((btn) => {
    const label = (btn.textContent || "").toLowerCase();
    if (!label.includes("cerrar") || !label.includes("sesi")) return;
    if (btn.dataset.logoutBound === "1") return;

    btn.dataset.logoutBound = "1";
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      void logout();
    });
  });
}

// Exponer logout globalmente
window.logout = logout;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindLogoutButtons);
} else {
  bindLogoutButtons();
}
