(function () {
  const THEME_KEY = "canvas_theme";
  const storedTheme = localStorage.getItem(THEME_KEY);
  const theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
  document.documentElement.dataset.theme = theme;

  function ensureOfflineStyles() {
    if (document.getElementById("offlineScreenStyles")) return;
    const style = document.createElement("style");
    style.id = "offlineScreenStyles";
    style.textContent = `
      .offline-screen {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: none;
        place-items: center;
        background:
          radial-gradient(760px 420px at 14% 8%, rgba(10, 132, 255, 0.2), transparent 60%),
          radial-gradient(540px 320px at 86% 12%, rgba(48, 176, 199, 0.16), transparent 62%),
          linear-gradient(165deg, #060b1e 0%, #0a1130 48%, #050a1a 100%);
        color: #eef4ff;
        font-family: "Segoe UI", "Inter", "Roboto", sans-serif;
      }

      :root[data-theme="light"] .offline-screen {
        background:
          radial-gradient(740px 420px at 12% 8%, rgba(10, 132, 255, 0.13), transparent 60%),
          radial-gradient(520px 300px at 88% 14%, rgba(48, 176, 199, 0.1), transparent 62%),
          linear-gradient(180deg, #f8fbff 0%, #ebf2ff 100%);
        color: #0e1836;
      }

      .offline-screen.visible {
        display: grid;
      }

      .offline-card {
        width: min(560px, calc(100% - 28px));
        border-radius: 24px;
        border: 1px solid rgba(68, 164, 255, 0.45);
        background: linear-gradient(165deg, rgba(9, 17, 51, 0.9), rgba(7, 13, 38, 0.9));
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(48, 176, 199, 0.34), 0 0 34px rgba(94, 92, 230, 0.32);
        padding: 28px;
        text-align: center;
        display: grid;
        gap: 14px;
      }

      :root[data-theme="light"] .offline-card {
        background: linear-gradient(165deg, rgba(255, 255, 255, 0.95), rgba(240, 246, 255, 0.92));
        border-color: rgba(10, 132, 255, 0.25);
        box-shadow: 0 14px 30px rgba(74, 99, 160, 0.14);
      }

      .offline-icon {
        width: 52px;
        height: 52px;
        margin: 0 auto;
        color: #30b0c7;
      }

      .offline-title {
        font-size: clamp(1.6rem, 3.6vw, 2.2rem);
        font-weight: 800;
      }

      .offline-copy {
        color: rgba(238, 244, 255, 0.82);
      }

      :root[data-theme="light"] .offline-copy {
        color: #47618f;
      }

      .offline-btn {
        min-height: 42px;
        border-radius: 12px;
        border: 1px solid rgba(68, 164, 255, 0.62);
        background: linear-gradient(135deg, #0a84ff, #5e5ce6);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureOfflineScreen() {
    if (document.getElementById("offlineScreen")) return;

    const screen = document.createElement("aside");
    screen.id = "offlineScreen";
    screen.className = "offline-screen";
    screen.setAttribute("aria-live", "assertive");
    screen.innerHTML = `
      <section class="offline-card">
        <svg class="offline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 8.82a15 15 0 0 1 20 0" />
          <path d="M5 12.86a10 10 0 0 1 14 0" />
          <path d="M8.5 16.9a5 5 0 0 1 7 0" />
          <line x1="12" y1="21" x2="12.01" y2="21" />
          <line x1="3" y1="3" x2="21" y2="21" />
        </svg>
        <h1 class="offline-title">Sin conexion</h1>
        <p class="offline-copy">No hay WiFi o red disponible. Revisa tu conexion para seguir usando Canvas.</p>
        <button id="offlineRetryBtn" class="offline-btn" type="button">Reintentar</button>
      </section>
    `;

    document.body.appendChild(screen);
    document.getElementById("offlineRetryBtn")?.addEventListener("click", () => {
      if (navigator.onLine) {
        window.location.reload();
      }
    });
  }

  function syncOffline() {
    const screen = document.getElementById("offlineScreen");
    if (!screen) return;
    screen.classList.toggle("visible", !navigator.onLine);
    document.documentElement.dataset.network = navigator.onLine ? "online" : "offline";
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureOfflineStyles();
    ensureOfflineScreen();
    syncOffline();
  });

  window.addEventListener("online", syncOffline);
  window.addEventListener("offline", syncOffline);
})();
