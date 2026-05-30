// Limpia restos heredados del almacenamiento local
(function() {
  const STORAGE_KEY = "canvas_app_state_v3";

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("canvas_ui_settings_v1");
    localStorage.removeItem("canvas_auth_mode");
    localStorage.removeItem("canvas_supabase_url");
    localStorage.removeItem("canvas_supabase_key");
    sessionStorage.removeItem("canvas_shop_detail_fx");
    console.log('✓ Restos locales eliminados');
  } catch (error) {
    console.error('Error al limpiar datos heredados:', error);
  }
})();
