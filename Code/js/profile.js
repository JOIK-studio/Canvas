(function () {
  const PROVIDERS = ["google", "discord"];
  let supabaseClient = null;

  function readUser() {
    try {
      return JSON.parse(localStorage.getItem("canvas_user") || "null");
    } catch {
      return null;
    }
  }

  function initialsFrom(name) {
    const parts = (name || "Canvas User").trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "C";
  }

  function renderProfile() {
    const user = readUser();
    const state = window.CanvasApp.Store.getState();
    const username = user?.user_metadata?.username || user?.email?.split("@")[0] || state.user.name || "Canvas User";
    const email = user?.email || "Sin correo";

    const ownCreations = state.creations.filter((creation) => creation.author === username || creation.author === state.user.name);
    const totalLikes = ownCreations.reduce((sum, creation) => sum + creation.likes, 0);
    const totalBoosts = ownCreations.reduce((sum, creation) => sum + creation.boosts, 0);
    const totalComments = ownCreations.reduce((sum, creation) => sum + creation.comments.length, 0);

    document.getElementById("profileAvatar").textContent = initialsFrom(username);
    document.getElementById("profileName").textContent = username;
    document.getElementById("profileHandle").textContent = `@${username.toLowerCase().replace(/\s+/g, "_")}`;
    document.getElementById("profileEmailTag").textContent = email;
    document.getElementById("profileTier").textContent = totalLikes >= 20 ? "Nivel 3" : totalLikes >= 8 ? "Nivel 2" : "Nivel 1";
    document.getElementById("profileSummary").textContent = ownCreations.length
      ? `Has publicado ${ownCreations.length} piezas. Tu trabajo ya suma ${totalLikes} likes y ${totalBoosts} boosts.`
      : "Todavía no has publicado piezas. Empieza por el editor y construye tu presencia dentro del lienzo social.";

    document.getElementById("metricCreations").textContent = `${ownCreations.length}`;
    document.getElementById("metricLikes").textContent = `${totalLikes}`;
    document.getElementById("metricBoosts").textContent = `${totalBoosts}`;
    document.getElementById("metricComments").textContent = `${totalComments}`;

    const activityList = document.getElementById("activityList");
    activityList.innerHTML = "";

    const items = [];
    ownCreations.slice(0, 3).forEach((creation) => {
      items.push({
        title: creation.title,
        detail: `${creation.likes} likes · ${creation.boosts} boosts · ${creation.comments.length} comentarios`,
        time: window.CanvasApp.Store.timeLabel(creation.createdAt)
      });
    });

    state.events.slice(0, 5).forEach((event) => {
      items.push({
        title: event.text,
        detail: "Evento del mural social",
        time: window.CanvasApp.Store.timeLabel(event.ts)
      });
    });

    if (!items.length) {
      activityList.innerHTML = '<div class="activity-item"><strong>Aún no hay actividad</strong><small>Publica tu primera pieza para empezar a construir tu historial.</small></div>';
      return;
    }

    items.slice(0, 6).forEach((item) => {
      const node = document.createElement("article");
      node.className = "activity-item";
      node.innerHTML = `<strong>${item.title}</strong><small>${item.detail} · ${item.time}</small>`;
      activityList.appendChild(node);
    });
  }

  function setStatus(message) {
    const node = document.getElementById("socialLinkStatus");
    if (!node) return;
    node.textContent = message || "";
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

  async function initSupabase() {
    const config = getSupabaseConfig();
    if (!hasValidSupabaseConfig(config)) return null;
    await loadSupabaseClient();
    supabaseClient = window.supabase.createClient(config.url, config.key);
    return supabaseClient;
  }

  function currentProviderSet(user) {
    const providers = new Set();
    const fromAppMeta = Array.isArray(user?.app_metadata?.providers)
      ? user.app_metadata.providers
      : [user?.app_metadata?.provider];

    fromAppMeta.forEach((provider) => {
      if (provider) providers.add(String(provider).toLowerCase());
    });

    if (Array.isArray(user?.identities)) {
      user.identities.forEach((identity) => {
        const provider = identity?.provider || identity?.identity_data?.provider;
        if (provider) providers.add(String(provider).toLowerCase());
      });
    }

    return providers;
  }

  function buildRedirectToProfile(provider) {
    const url = new URL(window.location.href);
    url.searchParams.set("linked", provider);
    url.searchParams.set("ts", String(Date.now()));
    return url.toString();
  }

  async function linkProvider(provider) {
    if (!supabaseClient) {
      setStatus("Configura tu conexión en Ajustes para vincular cuentas.");
      return;
    }

    try {
      let linkedByIdentity = false;

      if (typeof supabaseClient.auth.linkIdentity === "function") {
        try {
          const { data, error } = await supabaseClient.auth.linkIdentity({
            provider,
            options: { redirectTo: buildRedirectToProfile(provider) }
          });

          if (!error && data?.url) {
            window.location.href = data.url;
            return;
          }

          linkedByIdentity = !error;
        } catch {
          linkedByIdentity = false;
        }
      }

      // Fallback robusto: si no hubo redirección por linkIdentity, usar OAuth normal.
      if (linkedByIdentity) {
        setStatus("Vínculo iniciado. Si no redirige, vuelve a pulsar el enlace.");
        return;
      }

      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: { redirectTo: buildRedirectToProfile(provider) }
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      setStatus(`No se pudo abrir el enlace de ${provider}.`);
    }
  }

  async function syncLinkedProvidersFromSupabase() {
    if (!supabaseClient) return;
    const { data } = await supabaseClient.auth.getUser();
    const providers = currentProviderSet(data?.user);

    providers.forEach((provider) => {
      if (!PROVIDERS.includes(provider)) return;
      window.CanvasApp.Store.linkSocialAccount(provider);
    });
  }

  function renderSocialLinks() {
    const social = window.CanvasApp.Store.getSocialLinks();

    PROVIDERS.forEach((provider) => {
      const info = social[provider] || { linked: false, visible: false, handle: "" };
      const stateTag = document.getElementById(`${provider}LinkedState`);
      const visibility = document.getElementById(`${provider}VisibleToggle`);
      const linkBtn = document.getElementById(`${provider}LinkBtn`);

      if (stateTag) stateTag.textContent = info.linked ? "Vinculada" : "No vinculada";
      if (visibility) {
        visibility.checked = Boolean(info.visible);
        visibility.disabled = !info.linked;
      }
      if (linkBtn) linkBtn.textContent = info.linked
        ? `Re-vincular con ${provider[0].toUpperCase()}${provider.slice(1)}`
        : `Vincular con ${provider[0].toUpperCase()}${provider.slice(1)}`;
    });
  }

  function bindSocialLinks() {
    PROVIDERS.forEach((provider) => {
      const linkBtn = document.getElementById(`${provider}LinkBtn`);
      const visibility = document.getElementById(`${provider}VisibleToggle`);

      linkBtn?.addEventListener("click", (event) => {
        event.preventDefault();
        setStatus(`Abriendo vínculo con ${provider}...`);
        linkProvider(provider);
        renderSocialLinks();
      });

      visibility?.addEventListener("change", () => {
        const result = window.CanvasApp.Store.setSocialVisibility(provider, visibility.checked);
        if (!result.ok) {
          setStatus(`No se pudo actualizar visibilidad de ${provider}.`);
          renderSocialLinks();
          return;
        }
        setStatus(`Visibilidad de ${provider} actualizada.`);
      });
    });
  }

  async function init() {
    window.CanvasApp.UI.initCommon();
    renderProfile();
    bindSocialLinks();
    await initSupabase();
    await syncLinkedProvidersFromSupabase();
    renderSocialLinks();

    const linkedProvider = new URLSearchParams(window.location.search).get("linked");
    if (linkedProvider && PROVIDERS.includes(linkedProvider)) {
      setStatus(`Regresaste de ${linkedProvider}. Estado de vínculo actualizado.`);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
