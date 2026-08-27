/* ------------------------------------------------------------------
 * AVISO DE PROYECTO ARCHIVADO (agosto de 2026)
 * ------------------------------------------------------------------
 * Archivo 100% autocontenido: inyecta sus propios estilos y su propio
 * HTML. No modifica ni depende de ningún otro script de la app.
 *
 * CÓMO ELIMINAR EL AVISO EN CUALQUIER MOMENTO:
 *   1. Borrar este archivo (Code/js/archived-notice.js).
 *   2. Borrar la línea <script src="js/archived-notice.js"></script>
 *      de Code/index.html y de Code/app.html.
 * Y el sitio queda exactamente como estaba.
 *
 * Solo está conectado en las dos páginas de entrada (index.html y
 * app.html) y se muestra una vez por sesión (sessionStorage).
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  var DISMISS_KEY = "canvas_archived_notice_dismissed";

  function wasDismissed() {
    try {
      return window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markDismissed() {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch (e) {
      /* modo privado: simplemente se volverá a mostrar */
    }
  }

  function show() {
    if (document.getElementById("archived-notice-root")) return;

    var css = [
      "#archived-notice-root{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,17,21,.72);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;animation:archived-notice-fade .25s ease-out}",
      "#archived-notice-card{max-width:440px;width:100%;background:#171a21;color:#e8eaef;border:1px solid rgba(255,255,255,.12);border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.5);padding:32px;text-align:center;animation:archived-notice-pop .3s ease-out}",
      "#archived-notice-root .archived-tag{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#f0b429;background:rgba(240,180,41,.12);border:1px solid rgba(240,180,41,.35);border-radius:999px;padding:6px 14px;margin:0 0 16px}",
      "#archived-notice-root h2{margin:0 0 12px;font-size:26px;line-height:1.2;color:#fff}",
      "#archived-notice-root p{margin:0 0 24px;font-size:15px;line-height:1.6;color:#aab0bb}",
      "#archived-notice-root .archived-actions{display:flex;flex-direction:column;gap:12px}",
      "#archived-notice-root .archived-btn{display:inline-block;font-size:15px;font-weight:600;padding:12px 24px;border-radius:12px;cursor:pointer;border:0;text-decoration:none;transition:transform .15s ease,background .15s ease}",
      "#archived-notice-root .archived-btn-primary{background:#0a84ff;color:#fff}",
      "#archived-notice-root .archived-btn-primary:hover{background:#0062d6;transform:translateY(-1px)}",
      "#archived-notice-root .archived-link{font-size:13px;color:#7aa7ff;text-decoration:none}",
      "#archived-notice-root .archived-link:hover{text-decoration:underline}",
      "#archived-notice-root .archived-note{margin:16px 0 0;font-size:12px;color:#6b7280}",
      "@keyframes archived-notice-fade{from{opacity:0}to{opacity:1}}",
      "@keyframes archived-notice-pop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}",
      "@media (prefers-reduced-motion:reduce){#archived-notice-root,#archived-notice-card{animation:none}}"
    ].join("\n");

    var style = document.createElement("style");
    style.id = "archived-notice-style";
    style.textContent = css;
    document.head.appendChild(style);

    var root = document.createElement("div");
    root.id = "archived-notice-root";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "archived-notice-title");
    root.innerHTML =
      '<div id="archived-notice-card">' +
      '  <p class="archived-tag">⚠ Aviso</p>' +
      '  <h2 id="archived-notice-title">Proyecto archivado</h2>' +
      "  <p>" +
      "    Canvas se archivó en <strong>agosto de 2026</strong> y ya no recibe mantenimiento.<br />" +
      "    El código sigue público en GitHub. La aplicación puede dejar de funcionar" +
      "    en cualquier momento si el backend se pausa por inactividad." +
      "  </p>" +
      '  <div class="archived-actions">' +
      '    <button type="button" class="archived-btn archived-btn-primary">Continuar al sitio</button>' +
      '    <a class="archived-link" href="https://github.com/JOIK-studio/Canvas" target="_blank" rel="noopener">Ver el código en GitHub →</a>' +
      "  </div>" +
      '  <p class="archived-note">Este aviso no vuelve a aparecer durante esta sesión.</p>' +
      "</div>";

    function close() {
      markDismissed();
      root.remove();
      document.removeEventListener("keydown", onKey);
    }

    function onKey(e) {
      if (e.key === "Escape" || e.key === "Esc") close();
    }

    root.querySelector(".archived-btn-primary").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(root);
  }

  function init() {
    if (wasDismissed()) return;
    if (document.body) {
      show();
    } else {
      document.addEventListener("DOMContentLoaded", show);
    }
  }

  init();
})();
