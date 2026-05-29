(function () {
  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem("canvas_user") || "null");
    } catch {
      return null;
    }
  }

  function updateUserLabel() {
    const emailNode = document.getElementById("userEmail");
    if (!emailNode) return;

    const storedUser = getStoredUser();
    const user = storedUser || null;
    const displayName = user?.user_metadata?.display_name || user?.user_metadata?.username || user?.email?.split("@")[0] || "Usuario";
    emailNode.textContent = displayName;
  }

  function initUserMenu() {
    const btn = document.getElementById("userMenuBtn");
    const menu = document.getElementById("userDropdown");
    if (!btn || !menu) return;

    updateUserLabel();

    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.classList.toggle("hidden");
    });

    menu.addEventListener("click", (event) => {
      event.stopPropagation();

      const action = event.target.closest("button.dropdown-item");
      const label = (action?.textContent || "").toLowerCase();
      if (!action || !label.includes("cerrar") || !label.includes("sesi")) return;

      event.preventDefault();
      if (typeof window.logout === "function") {
        void window.logout();
        return;
      }

      // Fallback defensivo si auth-check no cargó o está en caché antigua.
      localStorage.removeItem("canvas_user");
      localStorage.removeItem("canvas_app_state_v3");
      sessionStorage.removeItem("canvas_user");
      sessionStorage.removeItem("canvas_app_state_v3");
      window.location.replace(`index.html?logged_out=1&t=${Date.now()}`);
    });

    document.addEventListener("click", () => {
      menu.classList.add("hidden");
    });
  }

  document.addEventListener("DOMContentLoaded", initUserMenu);
})();
