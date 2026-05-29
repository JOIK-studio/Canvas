// Script de autenticación
(function () {
  const AUTH_MODE_KEY = "canvas_auth_mode";
  const ONBOARDING_KEY_PREFIX = "canvas_onboarding_done_";

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

  function persistSession(user) {
    localStorage.removeItem("canvas_logged_out_at");
    if (user?.id) {
      localStorage.setItem("canvas_user", JSON.stringify({ id: user.id }));
    } else {
      localStorage.removeItem("canvas_user");
    }
  }

  function onboardingKey(userId) {
    return `${ONBOARDING_KEY_PREFIX}${userId || "anon"}`;
  }

  function getPostAuthTarget(user) {
    if (!user?.id) return "app.html";
    const completed = localStorage.getItem(onboardingKey(user.id)) === "1";
    return completed ? "app.html" : "setup.html";
  }

  function setMode(mode) {
    localStorage.setItem(AUTH_MODE_KEY, mode);
    document.body.dataset.authMode = mode;
  }

  function showModeBanner(mode) {
    const footer = document.querySelector(".auth-footer .small");
    if (!footer) return;

    footer.textContent = "Utilizamos Supabase para tu seguridad.";
  }

  function getSupabaseConfig() {
    if (window.CanvasApp?.SupabaseConfig?.read) {
      return window.CanvasApp.SupabaseConfig.read();
    }

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

  function initBackendRequired() {
    setMode("remote-required");
    showModeBanner("remote-required");
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
      console.warn("Fallo al iniciar Supabase; el acceso queda bloqueado hasta recuperar backend.", error);
      initBackendRequired();
    }
  }

  async function initAuth(config) {
    if (!window.supabase) {
      throw new Error("Supabase no cargó correctamente");
    }

    setMode("supabase");
    showModeBanner("supabase");
    window.CANVAS_SUPABASE_URL = config.url;
    window.CANVAS_SUPABASE_KEY = config.key;
    localStorage.removeItem("canvas_supabase_url");
    localStorage.removeItem("canvas_supabase_key");
    supabaseClient = window.supabase.createClient(config.url, config.key);

    const { data: session } = await supabaseClient.auth.getSession();
    if (session?.session) {
      persistSession(session.session.user);
      window.location.href = getPostAuthTarget(session.session.user);
      return;
    }

    setupTabs();
    setupLoginForm();
    setupSignupForm();
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

        if (document.body.dataset.authMode !== "supabase") {
          error = { message: "El servicio no está disponible en este momento. Inténtalo más tarde." };
        } else {
          ({ data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
          }));
        }

        if (error) {
          showError("login", error.message || "Error al ingresar");
          submitBtn.disabled = false;
          return;
        }

        if (data?.session) {
          persistSession(data.user);
          window.location.href = getPostAuthTarget(data.user);
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

        if (document.body.dataset.authMode !== "supabase") {
          error = { message: "Registro no disponible en este momento." };
        } else {
          const result = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
              data: { username }
            }
          });
          error = result.error;

          if (result.data?.session?.user) {
            persistSession(result.data.session.user);
            localStorage.removeItem(onboardingKey(result.data.session.user.id));
            window.location.href = getPostAuthTarget(result.data.session.user);
            return;
          }
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
