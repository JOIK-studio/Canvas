(function () {
  const CONNECTION_STATUS_POLL_INTERVAL_MS = 5000;
  const uiSettings = {
    compactMode: false,
    profileVisible: true,
    activityVisible: true
  };

  function readUser() {
    try {
      return JSON.parse(localStorage.getItem("canvas_user") || "null");
    } catch {
      return null;
    }
  }

  function readUiSettings() {
    return { ...uiSettings };
  }

  function saveUiSettings(next) {
    uiSettings.compactMode = Boolean(next?.compactMode);
    uiSettings.profileVisible = next?.profileVisible !== false;
    uiSettings.activityVisible = next?.activityVisible !== false;
  }

  function maskValue(value, start = 3, end = 2) {
    const text = String(value || "").trim();
    if (!text) return "No disponible";
    if (text.length <= start + end) return "****";
    return `${text.slice(0, start)}***${text.slice(-end)}`;
  }

  function maskEmail(email) {
    const text = String(email || "").trim();
    if (!text.includes("@")) return "No disponible";
    const [name, domain] = text.split("@");
    const safeName = maskValue(name, 2, 1);
    const parts = domain.split(".");
    const domainHead = parts.shift() || "";
    const domainTail = parts.length ? `.${parts.join(".")}` : "";
    return `${safeName}@${maskValue(domainHead, 1, 1)}${domainTail}`;
  }

  function renderPrivateData() {
    const user = readUser();
    const maskedEmail = document.getElementById("settingsMaskedEmail");
    const maskedId = document.getElementById("settingsMaskedUserId");

    if (maskedEmail) maskedEmail.textContent = maskEmail(user?.email);
    if (maskedId) maskedId.textContent = maskValue(user?.id, 4, 4);
  }

  function renderConnection() {
    const modeNode = document.getElementById("settingsConnectionMode");
    const stateNode = document.getElementById("settingsConnectionState");
    const syncNode = document.getElementById("settingsLastSync");
    const projectNode = document.getElementById("settingsMaskedProject");

    const config = window.CanvasApp?.SupabaseConfig?.read
      ? window.CanvasApp.SupabaseConfig.read()
      : { url: String(window.CANVAS_SUPABASE_URL || "").trim(), valid: Boolean(window.CANVAS_SUPABASE_URL) };
    const remote = window.CanvasApp?.Store?.getRemoteStatus?.() || {};
    const project = (() => {
      try {
        return config.url ? new URL(config.url).hostname.split(".")[0] : "";
      } catch {
        return "";
      }
    })();

    if (modeNode) modeNode.textContent = config.valid ? "Supabase remoto" : "Local";
    if (stateNode) {
      if (!config.valid) {
        stateNode.textContent = "Sin configuración remota";
      } else if (remote.ready) {
        stateNode.textContent = "Sincronizado";
      } else if (remote.lastError) {
        stateNode.textContent = "Error de sincronización";
      } else {
        stateNode.textContent = "Conectando";
      }
    }

    if (syncNode) {
      syncNode.textContent = remote.lastSyncAt
        ? new Date(remote.lastSyncAt).toLocaleString("es-ES")
        : "Sin datos";
    }

    if (projectNode) projectNode.textContent = maskValue(project, 2, 1);
  }

  function bindTabs() {
    const tabs = document.querySelectorAll("[data-tab-target]");
    const panels = document.querySelectorAll(".settings-panel");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetId = tab.dataset.tabTarget;
        tabs.forEach((entry) => {
          const active = entry === tab;
          entry.classList.toggle("active", active);
          entry.setAttribute("aria-selected", active ? "true" : "false");
        });
        panels.forEach((panel) => {
          panel.classList.toggle("hidden", panel.id !== targetId);
        });
      });
    });
  }

  function bindGeneralSettings() {
    const prefs = readUiSettings();
    const themeToggle = document.getElementById("settingsThemeToggle");
    const compactToggle = document.getElementById("settingsCompactToggle");

    if (themeToggle) {
      themeToggle.checked = document.documentElement.dataset.theme === "light";
      themeToggle.addEventListener("change", () => {
        const next = themeToggle.checked ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        localStorage.setItem("canvas_theme", next);
      });
    }

    if (compactToggle) {
      compactToggle.checked = prefs.compactMode;
      document.body.classList.toggle("compact-ui", prefs.compactMode);
      compactToggle.addEventListener("change", () => {
        const next = { ...readUiSettings(), compactMode: compactToggle.checked };
        document.body.classList.toggle("compact-ui", next.compactMode);
        saveUiSettings(next);
      });
    }
  }

  function bindPrivacySettings() {
    const prefs = readUiSettings();
    const profileToggle = document.getElementById("settingsProfileVisibleToggle");
    const activityToggle = document.getElementById("settingsActivityVisibleToggle");

    if (profileToggle) {
      profileToggle.checked = prefs.profileVisible;
      profileToggle.addEventListener("change", () => {
        saveUiSettings({ ...readUiSettings(), profileVisible: profileToggle.checked });
      });
    }

    if (activityToggle) {
      activityToggle.checked = prefs.activityVisible;
      activityToggle.addEventListener("change", () => {
        saveUiSettings({ ...readUiSettings(), activityVisible: activityToggle.checked });
      });
    }
  }

  function init() {
    window.CanvasApp.UI.initCommon();
    bindTabs();
    bindGeneralSettings();
    bindPrivacySettings();
    renderPrivateData();
    renderConnection();
    let intervalId = null;
    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(renderConnection, CONNECTION_STATUS_POLL_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        renderConnection();
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }, { once: true });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
