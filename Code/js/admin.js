(function () {
  function ensureAdmin() {
    if (!window.CanvasApp.Store.isCurrentUserAdmin()) {
      window.location.href = "app.html";
      return false;
    }
    return true;
  }

  function renderCreations() {
    const root = document.getElementById("adminCreations");
    if (!root) return;

    const state = window.CanvasApp.Store.getState();
    root.innerHTML = "";

    if (!state.creations.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "No hay obras para moderar.";
      root.appendChild(empty);
      return;
    }

    state.creations.slice(0, 40).forEach((creation) => {
      const row = document.createElement("article");
      row.className = "admin-list-item";
      row.innerHTML = `
        <div>
          <strong>${creation.title}</strong>
          <p class="hint">${creation.author} · ${window.CanvasApp.Store.timeLabel(creation.createdAt)}</p>
        </div>
      `;

      const actions = document.createElement("div");
      actions.className = "admin-inline-actions";

      const view = document.createElement("a");
      view.className = "btn ghost sm";
      view.href = `art.html?id=${encodeURIComponent(creation.id)}`;
      view.textContent = "Ver";

      const del = document.createElement("button");
      del.className = "btn ghost sm btn-danger";
      del.type = "button";
      del.textContent = "Eliminar";
      del.addEventListener("click", () => {
        const ok = window.confirm("¿Eliminar esta obra de la galería?");
        if (!ok) return;
        const result = window.CanvasApp.Store.deleteCreationAdmin(creation.id);
        if (!result.ok) return;
        renderCreations();
        renderStats();
        renderEvents();
      });

      actions.append(view, del);
      row.appendChild(actions);
      root.appendChild(row);
    });
  }

  function renderStats() {
    const state = window.CanvasApp.Store.getState();
    const creations = document.getElementById("adminCreationsCount");
    const pixels = document.getElementById("adminPixelsCount");
    const events = document.getElementById("adminEventsCount");
    const storage = document.getElementById("adminStorageStats");
    const stats = window.CanvasApp.Store.getStorageStats?.();

    if (creations) creations.textContent = `${state.creations.length}`;
    if (pixels) pixels.textContent = `${Object.keys(state.openCanvas.pixels || {}).length}`;
    if (events) events.textContent = `${state.events.length}`;
    if (storage && stats) {
      storage.textContent = `Storage: ${stats.packedBytes} B (compacto) · ahorro ${stats.savedBytes} B`;
    }
  }

  function renderEvents() {
    const root = document.getElementById("adminEvents");
    if (!root) return;

    const state = window.CanvasApp.Store.getState();
    root.innerHTML = "";

    if (!state.events.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "Sin eventos.";
      root.appendChild(empty);
      return;
    }

    state.events.slice(0, 20).forEach((event) => {
      const line = document.createElement("p");
      line.className = "admin-event-line";
      line.textContent = `[${window.CanvasApp.Store.timeLabel(event.ts)}] ${event.text}`;
      root.appendChild(line);
    });
  }

  function bindActions() {
    document.getElementById("adminRollback1")?.addEventListener("click", () => {
      const result = window.CanvasApp.Store.rollbackOpenCanvas(1);
      if (!result.ok) return;
      alert("Rollback aplicado (-1).");
      renderStats();
      renderEvents();
    });

    document.getElementById("adminRollback10")?.addEventListener("click", () => {
      const result = window.CanvasApp.Store.rollbackOpenCanvas(10);
      if (!result.ok) return;
      alert("Rollback aplicado (-10).");
      renderStats();
      renderEvents();
    });

    document.getElementById("adminClearCanvas")?.addEventListener("click", () => {
      const ok = window.confirm("Se borrará Open Canvas completo. ¿Continuar?");
      if (!ok) return;
      const result = window.CanvasApp.Store.clearOpenCanvasAdmin();
      if (!result.ok) return;
      alert("Open Canvas limpiado.");
      renderStats();
      renderEvents();
    });

    document.getElementById("adminClearEvents")?.addEventListener("click", () => {
      const ok = window.confirm("Se limpiará el feed de eventos. ¿Continuar?");
      if (!ok) return;
      const result = window.CanvasApp.Store.clearEventsAdmin();
      if (!result.ok) return;
      alert("Eventos limpiados.");
      renderStats();
      renderEvents();
    });

    document.getElementById("adminCompactStorage")?.addEventListener("click", () => {
      const result = window.CanvasApp.Store.compactStorageAdmin?.();
      if (!result?.ok) return;
      alert(`Compactado: ${result.before.packedBytes} B -> ${result.after.packedBytes} B`);
      renderStats();
      renderEvents();
    });

    document.getElementById("adminApplyTune")?.addEventListener("click", () => {
      const coinsDelta = Number(document.getElementById("adminCoinsDelta")?.value || 0);
      const pixelsDelta = Number(document.getElementById("adminPixelsDelta")?.value || 0);
      const chargesDelta = Number(document.getElementById("adminChargesDelta")?.value || 0);
      const rechargeRaw = document.getElementById("adminRechargeSeconds")?.value;
      const editorRaw = document.getElementById("adminEditorGrid")?.value;

      const payload = {
        coinsDelta,
        pixelsDelta,
        chargesDelta,
        rechargeSeconds: rechargeRaw ? Number(rechargeRaw) : undefined,
        editorGrid: editorRaw ? Number(editorRaw) : undefined
      };

      const result = window.CanvasApp.Store.adminTuneUser?.(payload);
      if (!result?.ok) return;
      alert("Ajustes aplicados.");
      renderStats();
      renderEvents();
      window.CanvasApp.UI.updateTopStats();
    });

    document.getElementById("adminApplyGlobalScreen")?.addEventListener("click", () => {
      const mode = String(document.getElementById("adminGlobalMode")?.value || "off");
      const title = String(document.getElementById("adminGlobalTitle")?.value || "");
      const message = String(document.getElementById("adminGlobalMessage")?.value || "");
      const result = window.CanvasApp.Store.setSystemScreenAdmin?.({ mode, title, message });
      if (!result?.ok) {
        const status = document.getElementById("adminGlobalScreenStatus");
        if (status) status.textContent = "No se pudo publicar la pantalla global.";
        return;
      }
      renderGlobalScreenControls();
      renderEvents();
    });

    document.getElementById("adminDisableGlobalScreen")?.addEventListener("click", () => {
      const result = window.CanvasApp.Store.setSystemScreenAdmin?.({ mode: "off" });
      if (!result?.ok) return;
      renderGlobalScreenControls();
      renderEvents();
    });
  }

  function renderGlobalScreenControls() {
    const screen = window.CanvasApp.Store.getSystemScreen?.();
    if (!screen) return;

    const mode = document.getElementById("adminGlobalMode");
    const title = document.getElementById("adminGlobalTitle");
    const message = document.getElementById("adminGlobalMessage");
    const status = document.getElementById("adminGlobalScreenStatus");
    if (mode) mode.value = screen.mode || "off";
    if (title) title.value = screen.title || "";
    if (message) message.value = screen.message || "";

    if (status) {
      if (screen.mode === "off") {
        status.textContent = "Pantalla global desactivada.";
      } else {
        const label = screen.mode === "maintenance" ? "Mantenimiento" : "Aviso";
        const when = screen.updatedAt
          ? new Date(screen.updatedAt).toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
          : "-";
        status.textContent = `${label} activo · actualizado ${when} por ${screen.updatedBy || "admin"}.`;
      }
    }
  }

  function init() {
    window.CanvasApp.UI.initCommon();
    if (!ensureAdmin()) return;
    bindActions();
    renderGlobalScreenControls();
    renderCreations();
    renderStats();
    renderEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();