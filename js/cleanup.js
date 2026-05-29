// Limpia datos falsos del localStorage
(function() {
  const STORAGE_KEY = "canvas_app_state_v3";
  
  // Obtener estado actual
  const rawState = localStorage.getItem(STORAGE_KEY);
  
  if (!rawState) {
    console.log('No hay datos para limpiar');
    return;
  }
  
  try {
    let state = JSON.parse(rawState);
    
    // Limpiar datos falsos
    if (state.user) {
      // Mantener solo valores iniciales limpios
      state.user.name = state.user.name || '';
      state.user.coins = parseInt(state.user.coins) || 0;
      state.user.pixelsInventory = parseInt(state.user.pixelsInventory) || 0;
      state.user.charges = Math.max(0, parseInt(state.user.charges) || 0);
      state.user.maxCharges = parseInt(state.user.maxCharges) || 6;
      state.user.rechargeSeconds = parseInt(state.user.rechargeSeconds) || 30;
    }
    
    // Limpiar creaciones (no hay datos falsos en array nuevo)
    if (Array.isArray(state.creations)) {
      // Las creaciones se cargan desde la galería, mantener como está
    } else {
      state.creations = [];
    }
    
    // Limpiar eventos (no hay datos falsos)
    if (Array.isArray(state.events)) {
      state.events = [];
    } else {
      state.events = [];
    }
    
    // Limpiar likes dados
    if (Array.isArray(state.likesGiven)) {
      state.likesGiven = [];
    } else {
      state.likesGiven = [];
    }
    
    // Limpiar remix source
    state.remixSourceId = null;
    
    // Eliminamos el estado local para que la app lo regenere con su flujo normal.
    localStorage.removeItem(STORAGE_KEY);
    console.log('✓ Datos saneados; estado local eliminado para regeneración segura.');
    
  } catch (error) {
    console.error('Error al limpiar datos:', error);
    // Si hay error, borrar todo y crear desde cero
    localStorage.removeItem(STORAGE_KEY);
    console.log('Se eliminó estado corrupto');
  }
})();
