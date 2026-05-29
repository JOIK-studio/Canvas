(function () {
  const ONBOARDING_KEY_PREFIX = "canvas_onboarding_done_";

  function readUser() {
    try {
      return JSON.parse(localStorage.getItem("canvas_user") || "null");
    } catch {
      return null;
    }
  }

  function writeUser(user) {
    const persistedUser = user?.id ? { id: user.id } : null;
    localStorage.setItem("canvas_user", JSON.stringify(persistedUser));
  }

  function getProfileNames(user, state) {
    const baseHandle = user?.user_metadata?.username || user?.email?.split("@")[0] || "canvas";
    const displayName = user?.user_metadata?.display_name || state.user.name || baseHandle || "Canvas User";
    return { displayName, handle: baseHandle };
  }

  function getSupabaseConfig() {
    if (window.CanvasApp?.SupabaseConfig?.read) {
      return window.CanvasApp.SupabaseConfig.read();
    }

    const urlMeta = document.querySelector('meta[name="supabase-url"]');
    const keyMeta = document.querySelector('meta[name="supabase-key"]');
    const url = window.CANVAS_SUPABASE_URL || urlMeta?.content || localStorage.getItem("canvas_supabase_url") || "";
    const key = window.CANVAS_SUPABASE_KEY || keyMeta?.content || localStorage.getItem("canvas_supabase_key") || "";
    return { url: String(url).trim(), key: String(key).trim(), valid: Boolean(url && key) };
  }

  async function getSupabaseClient() {
    const config = getSupabaseConfig();
    if (!config.url || !config.key) return null;

    if (!window.supabase?.createClient) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      }).catch(() => null);
    }

    if (!window.supabase?.createClient) return null;
    return window.supabase.createClient(config.url, config.key);
  }

  function initialsFrom(name) {
    const parts = (name || "Canvas User").trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "C";
  }

  function renderProfile() {
    const user = readUser();
    const state = window.CanvasApp.Store.getState();
    const names = getProfileNames(user, state);
    const email = user?.email || "Sin correo";

    const ownCreations = state.creations.filter((creation) => creation.author === names.displayName || creation.author === state.user.name);
    const totalLikes = ownCreations.reduce((sum, creation) => sum + creation.likes, 0);
    const totalBoosts = ownCreations.reduce((sum, creation) => sum + creation.boosts, 0);
    const totalComments = ownCreations.reduce((sum, creation) => sum + creation.comments.length, 0);

    document.getElementById("profileAvatar").textContent = initialsFrom(names.displayName);
    document.getElementById("profileName").textContent = names.displayName;
    document.getElementById("profileHandle").textContent = `@${names.handle.toLowerCase().replace(/\s+/g, "_")}`;
    document.getElementById("profileEmailTag").textContent = email;
    document.getElementById("profileTier").textContent = totalLikes >= 20 ? "Nivel 3" : totalLikes >= 8 ? "Nivel 2" : "Nivel 1";
    document.getElementById("profileSummary").textContent = ownCreations.length
      ? `Has publicado ${ownCreations.length} piezas. Tu trabajo ya suma ${totalLikes} likes y ${totalBoosts} boosts.`
      : "Todavia no has publicado piezas. Empieza por el editor y construye tu presencia dentro del lienzo social.";

    document.getElementById("metricCreations").textContent = `${ownCreations.length}`;
    document.getElementById("metricLikes").textContent = `${totalLikes}`;
    document.getElementById("metricBoosts").textContent = `${totalBoosts}`;
    document.getElementById("metricComments").textContent = `${totalComments}`;

    const activityList = document.getElementById("activityList");
    activityList.innerHTML = "";

    const items = [];
    ownCreations.slice(0, 4).forEach((creation) => {
      items.push({
        title: creation.title,
        detail: `${creation.likes} likes · ${creation.boosts} boosts · ${creation.comments.length} comentarios`,
        time: window.CanvasApp.Store.timeLabel(creation.createdAt)
      });
    });

    state.events.slice(0, 6).forEach((event) => {
      items.push({
        title: event.text,
        detail: "Evento del mural social",
        time: window.CanvasApp.Store.timeLabel(event.ts)
      });
    });

    if (!items.length) {
      activityList.innerHTML = '<div class="activity-item"><strong>Aun no hay actividad</strong><small>Publica tu primera pieza para empezar a construir tu historial.</small></div>';
      return;
    }

    items.slice(0, 8).forEach((item) => {
      const node = document.createElement("article");
      node.className = "activity-item";
      node.innerHTML = `<strong>${item.title}</strong><small>${item.detail} · ${item.time}</small>`;
      activityList.appendChild(node);
    });

    const displayInput = document.getElementById("profileDisplayNameInput");
    if (displayInput && !displayInput.dataset.prime) {
      displayInput.value = names.displayName;
      displayInput.dataset.prime = "1";
    }
  }

  async function syncDisplayNameToSupabase(user, displayName) {
    const client = await getSupabaseClient();
    if (!client || !user?.id) return;

    const metadata = { ...(user.user_metadata || {}), display_name: displayName };
    await client.auth.updateUser({ data: metadata });

    const { data: profile } = await client
      .from("profiles")
      .select("settings")
      .eq("id", user.id)
      .maybeSingle();

    const baseSettings = profile?.settings && typeof profile.settings === "object" ? profile.settings : {};
    const nextSettings = {
      ...baseSettings,
      profile: {
        ...(baseSettings.profile && typeof baseSettings.profile === "object" ? baseSettings.profile : {}),
        display_name: displayName
      }
    };

    await client.from("profiles").update({ settings: nextSettings }).eq("id", user.id);
  }

  function bindProfileEditor() {
    const form = document.getElementById("profileEditForm");
    const input = document.getElementById("profileDisplayNameInput");
    const msg = document.getElementById("profileEditMsg");
    if (!form || !input || !msg) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const value = input.value.trim().slice(0, 32);
      if (value.length < 2) {
        msg.textContent = "El nombre visible debe tener al menos 2 caracteres.";
        return;
      }

      const submit = form.querySelector("button[type='submit']");
      if (submit) submit.disabled = true;

      const user = readUser();
      if (user) {
        user.user_metadata = { ...(user.user_metadata || {}), display_name: value };
        writeUser(user);
        if (user.id) {
          localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${user.id}`, "1");
        }
      }

      if (window.CanvasApp?.Store?.setDisplayName) {
        window.CanvasApp.Store.setDisplayName(value);
      }

      try {
        await syncDisplayNameToSupabase(user, value);
      } catch {
        // Conservamos el cambio local aunque falle sincronización remota.
      }

      msg.textContent = "Perfil actualizado.";
      renderProfile();
      if (submit) submit.disabled = false;
    });
  }

  function init() {
    window.CanvasApp.UI.initCommon();
    bindProfileEditor();
    renderProfile();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
