// Script de autenticación
(function () {
  const AUTH_USERS_KEY = "canvas_auth_users_v1";
  const AUTH_MODE_KEY = "canvas_auth_mode";
  const PASSWORD_HASH_VERSION = 1;
  const PASSWORD_PBKDF2_ITERATIONS = 120000;
  const PASSWORD_SALT_BYTES = 16;

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

  function readAuthUsers() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveAuthUsers(users) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  }

  function bytesToBase64(bytes) {
    let out = "";
    for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
    return btoa(out);
  }

  function base64ToBytes(value) {
    const raw = atob(value);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function hashLocalPassword(password, saltBase64, iterations = PASSWORD_PBKDF2_ITERATIONS) {
    if (!window.crypto?.subtle) {
      throw new Error("Tu navegador no soporta cifrado seguro para autenticación local.");
    }

    const encoder = new TextEncoder();
    const passKey = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const salt = saltBase64
      ? base64ToBytes(saltBase64)
      : window.crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES));
    const bits = await window.crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt,
        iterations
      },
      passKey,
      256
    );

    return {
      passwordHash: bytesToBase64(new Uint8Array(bits)),
      passwordSalt: bytesToBase64(salt),
      passwordIterations: iterations,
      passwordVersion: PASSWORD_HASH_VERSION
    };
  }

  async function verifyLocalPassword(account, password) {
    if (!account) return false;

    if (!account.passwordHash || !account.passwordSalt) return false;

    try {
      const computed = await hashLocalPassword(
        password,
        account.passwordSalt,
        Number.isFinite(account.passwordIterations) ? account.passwordIterations : PASSWORD_PBKDF2_ITERATIONS
      );
      return computed.passwordHash === account.passwordHash;
    } catch {
      return false;
    }
  }

  function makeLocalUser(account) {
    return {
      id: account.id,
      email: account.email,
      user_metadata: {
        username: account.username
      },
      app_metadata: {
        provider: "local"
      },
      created_at: account.createdAt
    };
  }

  function persistSession(user) {
    const safeEmail = (user?.email || "").trim().toLowerCase();
    const safeUsername =
      (user?.user_metadata?.username || safeEmail.split("@")[0] || "Artista").toString();

    localStorage.setItem(
      "canvas_user",
      JSON.stringify({
        email: safeEmail,
        user_metadata: {
          username: safeUsername
        }
      })
    );
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
      : "Prototipo funcional social activo: sin backend remoto.";
  }

  function getSupabaseConfig() {
    const urlMeta = document.querySelector('meta[name="supabase-url"]');
    const keyMeta = document.querySelector('meta[name="supabase-key"]');
    const url = window.CANVAS_SUPABASE_URL || urlMeta?.content || localStorage.getItem("canvas_supabase_url") || "";
    const key = window.CANVAS_SUPABASE_KEY || keyMeta?.content || localStorage.getItem("canvas_supabase_key") || "";
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

  function initLocalAuth() {
    setMode("local");
    showModeBanner("local");
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

  function readStoredUser() {
    try {
      return JSON.parse(localStorage.getItem("canvas_user") || "null");
    } catch {
      return null;
    }
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
      initLocalAuth();
      return;
    }

    try {
      await loadSupabaseClient();
      await initAuth(config);
    } catch (error) {
      console.warn("Fallo al iniciar Supabase; se activa el prototipo funcional social.", error);
      initLocalAuth();
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
          const users = readAuthUsers();
          const account = users.find((item) => item.email === email.toLowerCase());
          if (!account) {
            error = { message: "Correo o contraseña incorrectos" };
          } else if (!account.passwordHash || !account.passwordSalt) {
            error = { message: "Cuenta local desactualizada. Crea una cuenta nueva para continuar." };
          } else {
            const valid = await verifyLocalPassword(account, password);
            if (!valid) {
              error = { message: "Correo o contraseña incorrectos" };
            } else {
              data = { user: makeLocalUser(account), session: { user: makeLocalUser(account) } };
            }
          }
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
          const users = readAuthUsers();
          const normalizedEmail = email.toLowerCase();
          const emailExists = users.some((item) => item.email === normalizedEmail);
          const usernameExists = users.some((item) => item.username.toLowerCase() === username.toLowerCase());

          if (emailExists) {
            error = { message: "Ese correo ya está registrado" };
          } else if (usernameExists) {
            error = { message: "Ese nombre de usuario ya existe" };
          } else {
            const securePassword = await hashLocalPassword(password);
            users.push({
              id: window.crypto?.randomUUID?.() || `local_${Date.now()}`,
              email: normalizedEmail,
              username,
              ...securePassword,
              createdAt: new Date().toISOString()
            });
            saveAuthUsers(users);
          }
        }

        if (error) {
          showError("signup", error.message || "Error al registrarse");
          submitBtn.disabled = false;
          return;
        }

        showError(
          "signup",
          document.body.dataset.authMode === "supabase"
            ? "✓ Registrado. Verifica tu correo y luego inicia sesión."
            : "✓ Cuenta creada. Ya puedes iniciar sesión en este dispositivo."
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
