(function () {
  const STORAGE_KEY = "canvas_app_state_v3";

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(message) {
    const node = byId("settingsStatus");
    if (!node) return;
    node.textContent = message || "";
  }


  function loadCurrentTheme() {
    const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    const input = byId("settingsTheme");
    if (input) input.value = theme;
  }

  function downloadJson(filename, content) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function bindActions() {
    byId("settingsThemeSaveBtn")?.addEventListener("click", () => {
      const input = byId("settingsTheme");
      const next = input?.value === "light" ? "light" : "dark";
      window.CanvasApp.UI.applyTheme(next);
      setStatus(`Tema aplicado: ${next === "light" ? "Claro" : "Oscuro"}.`);
    });

    byId("settingsExportBtn")?.addEventListener("click", () => {
      const userRaw = localStorage.getItem("canvas_user") || "null";
      const appRaw = localStorage.getItem(STORAGE_KEY) || "null";
      const payload = {
        exportedAt: new Date().toISOString(),
        user: JSON.parse(userRaw),
        appState: JSON.parse(appRaw)
      };
      downloadJson(`canvas-backup-${Date.now()}.json`, JSON.stringify(payload, null, 2));
      setStatus("Backup exportado correctamente.");
    });

    byId("settingsImportBtn")?.addEventListener("click", () => {
      byId("settingsImportFile")?.click();
    });

    byId("settingsImportFile")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data?.user) localStorage.setItem("canvas_user", JSON.stringify(data.user));
        if (data?.appState) localStorage.setItem(STORAGE_KEY, JSON.stringify(data.appState));
        setStatus("Backup importado. Recarga la página para ver cambios.");
      } catch {
        setStatus("No se pudo importar el archivo seleccionado.");
      }
      event.target.value = "";
    });

    byId("settingsResetBtn")?.addEventListener("click", () => {
      const ok = window.confirm("Esto reinicia tus datos de cuenta en este cliente. ¿Continuar?");
      if (!ok) return;
      localStorage.removeItem(STORAGE_KEY);
      setStatus("Datos de cuenta reiniciados.");
    });

  }

  function init() {
    window.CanvasApp.UI.initCommon();
    loadCurrentTheme();
    bindActions();
  }

  document.addEventListener("DOMContentLoaded", init);
})();