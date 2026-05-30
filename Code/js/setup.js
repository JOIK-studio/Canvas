(function () {
  function readUser() {
    try {
      return JSON.parse(localStorage.getItem("canvas_user") || "null");
    } catch {
      return null;
    }
  }

  function getDisplayName(user) {
    return user?.user_metadata?.display_name || user?.user_metadata?.username || "Artista";
  }

  function getSupabaseConfig() {
    if (window.CanvasApp?.SupabaseConfig?.read) return window.CanvasApp.SupabaseConfig.read();
    const url = String(window.CANVAS_SUPABASE_URL || "").trim();
    const key = String(window.CANVAS_SUPABASE_KEY || "").trim();
    return { url, key, valid: Boolean(url && key) };
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

  async function syncProfile(user, displayName, bio) {
    const client = await getSupabaseClient();
    if (!client || !user?.id) return;

    const metadata = {
      ...(user.user_metadata || {}),
      display_name: displayName,
      bio: bio || ""
    };

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
        display_name: displayName,
        bio: bio || ""
      }
    };

    await client.from("profiles").update({ settings: nextSettings }).eq("id", user.id);
  }

  function bindForm() {
    const user = readUser();
    const form = document.getElementById("setupForm");
    const nameInput = document.getElementById("setupDisplayName");
    const bioInput = document.getElementById("setupBio");
    const msg = document.getElementById("setupMsg");
    if (!user || !form || !nameInput || !bioInput || !msg) return;

    nameInput.value = getDisplayName(user);
    bioInput.value = "";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const displayName = nameInput.value.trim().slice(0, 32);
      const bio = bioInput.value.trim().slice(0, 160);

      if (displayName.length < 2) {
        msg.textContent = "El nombre visible debe tener al menos 2 caracteres.";
        return;
      }

      const button = form.querySelector("button[type='submit']");
      if (button) button.disabled = true;

      user.user_metadata = {
        ...(user.user_metadata || {}),
        display_name: displayName,
        bio
      };

      if (window.CanvasApp?.Store?.setDisplayName) {
        window.CanvasApp.Store.setDisplayName(displayName);
      }

      try {
        await syncProfile(user, displayName, bio);
      } catch {
        // Mantenemos experiencia fluida; el perfil local ya quedó aplicado.
      }

      window.location.replace("app.html");
    });
  }

  function init() {
    if (window.CanvasApp?.UI?.initCommon) {
      window.CanvasApp.UI.initCommon();
    }
    bindForm();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
