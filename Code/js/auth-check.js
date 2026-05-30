// Verificar autenticación en cada página
(function () {
  const currentPage = document.body.dataset.page;

  if (currentPage === "auth" || currentPage === "landing") return;

  // Verificar si hay usuario en localStorage
  const userStr = localStorage.getItem("canvas_user");
  
  if (!userStr) {
    window.location.href = "index.html";
  } else {
    try {
      const user = JSON.parse(userStr);
      // Guardar en global para acceso en otras páginas
      window.CanvasApp = window.CanvasApp || {};
      window.CanvasApp.currentUser = user;
    } catch (e) {
      localStorage.removeItem("canvas_user");
      window.location.href = "index.html";
    }
  }
})();

// Función para hacer logout
function logout() {
  localStorage.removeItem("canvas_user");
  localStorage.removeItem("canvas_app_state_v3");
  localStorage.removeItem("canvas_ui_settings_v1");
  localStorage.removeItem("canvas_auth_mode");
  localStorage.removeItem("canvas_supabase_url");
  localStorage.removeItem("canvas_supabase_key");
  localStorage.removeItem("supabase_url");
  localStorage.removeItem("supabase_anon_key");
  localStorage.removeItem("sb-auth-token");
  window.location.href = "index.html";
}

// Exponer logout globalmente
window.logout = logout;
