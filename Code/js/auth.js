// Script de autenticación
(function () {
  const AUTH_MODE_KEY = "canvas_auth_mode";

  function setupThemeToggle() {
    const button = document.getElementById("authThemeToggle");
    if (!button) return;

    const paint = () => {
      const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
      button.textContent = theme === "light" ? "Modo oscuro" : "Modo claro";
    };

    button.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
      const next = current === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("canvas_theme", next);
      paint();
    });

    paint();
  }

  setupThemeToggle();

  let supabaseClient;

  bootAuth();

  function buildPersistedUser(user) {
    if (!user || typeof user !== "object") return null;
    return {
      id: user.id || null,
      email: user.email || null,
      user_metadata: {
        username: user.user_metadata?.username || null,
        display_name: user.user_metadata?.display_name || null,
        bio: user.user_metadata?.bio || null
      },
      app_metadata: {
        provider: user.app_metadata?.provider || null,
        providers: Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : []
      }
    };
  }

  function persistSession(user) {
    const persistedUser = buildPersistedUser(user);
    localStorage.setItem("canvas_user", JSON.stringify(persistedUser));
  }

  function readStoredUser() {
    try {
      return JSON.parse(localStorage.getItem("canvas_user") || "null");
    } catch {
      return null;
    }
  }

  function setMode(mode) {
    localStorage.setItem(AUTH_MODE_KEY, mode);
    document.body.dataset.authMode = mode;
  }

  function showModeBanner(mode) {
    const footer = document.querySelector(".auth-footer .small");
    if (!footer) return;

    footer.textContent = mode === "supabase"
      ? "Autenticación conectada con Supabase."
      : "Falta configuración de Supabase en este entorno.";
  }

  function getSupabaseConfig() {
    const fromWindow = window.CANVAS_SUPABASE_CONFIG || {};
    const urlMeta = document.querySelector('meta[name="supabase-url"]');
    const keyMeta = document.querySelector('meta[name="supabase-key"]');
    const url = window.CANVAS_SUPABASE_URL || fromWindow.url || urlMeta?.content || "";
    const key = window.CANVAS_SUPABASE_KEY || fromWindow.key || keyMeta?.content || "";
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

  function initBackendRequired() {
    setMode("remote-required");
    showModeBanner("remote-required");
    setupSocialAuth(false);

    const currentUser = readStoredUser();
    if (currentUser) {
      window.location.href = "app.html";
      return;
    }

    setupTabs();
    setupLoginForm();
    setupSignupForm();
  }

  async function loadSupabaseClient() {
    if (window.supabase) return;

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function bootAuth() {
    const config = getSupabaseConfig();
    if (!hasValidSupabaseConfig(config)) {
      initBackendRequired();
      return;
    }

    try {
      await loadSupabaseClient();
      await initAuth(config);
    } catch (error) {
      console.warn("Fallo al iniciar Supabase.", error);
      initBackendRequired();
    }
  }

  async function initAuth(config) {
    if (!window.supabase) {
      throw new Error("Supabase no cargó correctamente");
    }

    setMode("supabase");
    showModeBanner("supabase");
    supabaseClient = window.supabase.createClient(config.url, config.key);

    const { data: session } = await supabaseClient.auth.getSession();
    if (session?.session) {
      persistSession(session.session.user);
      window.location.href = "app.html";
      return;
    }

    setupTabs();
    setupLoginForm();
    setupSignupForm();
    setupSocialAuth(true);
  }

  function buildRedirectToApp() {
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/[^/]*$/, "app.html");
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  function setupSocialAuth(enabled) {
    const buttons = document.querySelectorAll(".btn-social[data-provider]");
    if (!buttons.length) return;

    buttons.forEach((button) => {
      button.disabled = !enabled;
      button.title = enabled
        ? "Continuar con proveedor OAuth"
        : "Disponible cuando Supabase está configurado";

      if (button.dataset.bound === "1") return;
      button.dataset.bound = "1";

      button.addEventListener("click", async () => {
        const provider = button.dataset.provider;
        if (!enabled || !supabaseClient || !provider) {
          showError("login", "OAuth solo está disponible con Supabase activo.");
          return;
        }

        button.disabled = true;
        try {
          const { error } = await supabaseClient.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: buildRedirectToApp()
            }
          });

          if (error) {
            showError("login", error.message || "No se pudo iniciar sesión con OAuth");
            button.disabled = false;
          }
        } catch (error) {
          showError("login", "Error de conexión con OAuth.");
          button.disabled = false;
        }
      });
    });
  }

  function setupTabs() {
    const tabs = document.querySelectorAll(".tab-btn");
    const forms = document.querySelectorAll(".auth-form");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.dataset.tab;

        tabs.forEach((t) => t.classList.remove("active"));
        forms.forEach((f) => f.classList.remove("active"));

        tab.classList.add("active");
        document.getElementById(`${tabName}Form`).classList.add("active");
      });
    });
  }

  function showError(formId, message) {
    const errorEl = document.getElementById(`${formId}Error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
      setTimeout(() => errorEl.classList.add("hidden"), 5000);
    }
  }

  function setupLoginForm() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;

      if (!email || !password) {
        showError("login", "Por favor completa todos los campos");
        return;
      }

      const submitBtn = form.querySelector(".btn-submit");
      submitBtn.disabled = true;

      try {
        let data;
        let error;

        if (document.body.dataset.authMode === "supabase") {
          ({ data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
          }));
        } else {
          error = { message: "Configura Supabase para iniciar sesión." };
        }

        if (error) {
          showError("login", error.message || "Error al ingresar");
          submitBtn.disabled = false;
          return;
        }

        if (data?.session) {
          persistSession(data.user);
          window.location.href = "app.html";
        }
      } catch (err) {
        showError("login", "Error de conexión. Intenta de nuevo.");
        submitBtn.disabled = false;
      }
    });
  }

  function setupSignupForm() {
    const form = document.getElementById("signupForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("signupUsername").value.trim();
      const email = document.getElementById("signupEmail").value.trim();
      const password = document.getElementById("signupPassword").value;
      const confirmPassword = document.getElementById("signupPasswordConfirm").value;

      // Validaciones
      if (!username || !email || !password || !confirmPassword) {
        showError("signup", "Por favor completa todos los campos");
        return;
      }

      if (username.length < 3) {
        showError("signup", "El usuario debe tener al menos 3 caracteres");
        return;
      }

      if (password.length < 6) {
        showError("signup", "La contraseña debe tener al menos 6 caracteres");
        return;
      }

      if (password !== confirmPassword) {
        showError("signup", "Las contraseñas no coinciden");
        return;
      }

      const submitBtn = form.querySelector(".btn-submit");
      submitBtn.disabled = true;

      try {
        let error;

        if (document.body.dataset.authMode === "supabase") {
          ({ error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
              data: { username }
            }
          }));
        } else {
          error = { message: "Configura Supabase para registrar cuentas." };
        }

        if (error) {
          showError("signup", error.message || "Error al registrarse");
          submitBtn.disabled = false;
          return;
        }

        showError(
          "signup",
          "✓ Registrado. Verifica tu correo y luego inicia sesión."
        );
        form.reset();
        submitBtn.disabled = false;

        setTimeout(() => {
          document.querySelector("[data-tab='login']").click();
        }, 2000);
      } catch (err) {
        showError("signup", "Error de conexión. Intenta de nuevo.");
        submitBtn.disabled = false;
      }
    });
  }
})();
