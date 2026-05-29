(function () {
  function getSupabaseConfig() {
    const urlMeta = document.querySelector('meta[name="supabase-url"]');
    const keyMeta = document.querySelector('meta[name="supabase-key"]');
    const url = window.CANVAS_SUPABASE_URL || urlMeta?.content || localStorage.getItem("canvas_supabase_url") || "";
    const key = window.CANVAS_SUPABASE_KEY || keyMeta?.content || localStorage.getItem("canvas_supabase_key") || "";
    return { url: String(url).trim(), key: String(key).trim() };
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

  function isRecentLogout() {
    const raw = localStorage.getItem("canvas_logged_out_at");
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < 15000;
  }

  function clearResidualSession() {
    localStorage.removeItem("canvas_user");
    localStorage.removeItem("canvas_app_state_v3");
    sessionStorage.removeItem("canvas_user");
    sessionStorage.removeItem("canvas_app_state_v3");

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

  function updateLoginLinks(isAuthenticated) {
    const loginLinks = document.querySelectorAll('a[href="auth.html"]');
    loginLinks.forEach((link) => {
      const content = (link.textContent || "").toLowerCase();
      if (!content.includes("entrar") && !content.includes("sesi") && !content.includes("cuenta")) {
        return;
      }
      link.setAttribute("href", isAuthenticated ? "app.html" : "auth.html");
    });
  }

  async function loadSupabaseClient() {
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

  async function getRemoteSession() {
    const config = getSupabaseConfig();
    if (!hasValidSupabaseConfig(config)) {
      return { status: "no-config", user: null };
    }

    try {
      const loaded = await Promise.race([
        loadSupabaseClient(),
        new Promise((resolve) => setTimeout(() => resolve(false), 1500))
      ]);
      if (!loaded) return { status: "timeout", user: null };

      const client = window.supabase.createClient(config.url, config.key);
      const sessionResult = await Promise.race([
        client.auth.getSession(),
        new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 1500))
      ]);

      return { status: "ok", user: sessionResult?.data?.session?.user || null };
    } catch {
      return { status: "error", user: null };
    }
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const forceLoggedOut = params.get("logged_out") === "1" || isRecentLogout();

    if (window.CanvasApp?.UI) {
      window.CanvasApp.UI.initCommon();
    }

    if (forceLoggedOut) {
      clearResidualSession();
      updateLoginLinks(false);
      return;
    }

    const remote = await getRemoteSession();

    if (remote.status === "no-config") {
      clearResidualSession();
      updateLoginLinks(false);
      return;
    }

    if (remote.status === "timeout" || remote.status === "error") {
      updateLoginLinks(false);
      return;
    }

    if (remote.user) {
      localStorage.setItem("canvas_user", JSON.stringify(remote.user));
      updateLoginLinks(true);
      window.location.replace("app.html");
      return;
    }

    clearResidualSession();
    updateLoginLinks(false);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
