(function () {
  const ITEMS = [
    {
      id: "pixels_50",
      section: "Impulso rápido",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>',
      logo: "PX-50",
      name: "Pack Pixeles x50",
      price: 20,
      desc: "Pack rapido para publicar piezas pequenas.",
      gives: ["+50 px de inventario"]
    },
    {
      id: "speed_upgrade",
      section: "Impulso rápido",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7h11"/><path d="M14 4l4 3-4 3"/><path d="M17 17H6"/><path d="M10 14l-4 3 4 3"/></svg>',
      logo: "SPD",
      name: "Upgrade Recarga",
      price: 50,
      desc: "Baja el tiempo de recarga en 5s hasta minimo 10s.",
      gives: ["-5s de recarga", "Minimo 10s"]
    },
    {
      id: "charge_now",
      section: "Impulso rápido",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
      logo: "NOW",
      name: "Carga Instantanea",
      price: 32,
      desc: "Recupera una carga al instante.",
      gives: ["+1 carga ahora"]
    },
    {
      id: "max_charge_plus",
      section: "Progreso",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/><path d="M5 5l14 14" opacity=".35"/></svg>',
      logo: "MAX+",
      name: "Modulo de Carga Extra",
      price: 70,
      desc: "Amplia el tope de cargas para sesiones mas largas.",
      gives: ["+1 carga maxima", "+1 carga al comprar", "Tope: 10"]
    },
    {
      id: "editor_grid_plus",
      section: "Progreso",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
      logo: "GRID+",
      name: "Upgrade Editor +8",
      price: 84,
      desc: "Aumenta el tamano de tu editor para dibujar con mas pixeles por lado.",
      gives: ["+8 pixeles por lado", "Maximo 32x32"]
    }
  ];

  function getById(id) {
    if (id === undefined || id === null) return null;
    const raw = String(id).trim();
    const candidates = new Set([raw]);
    try { candidates.add(decodeURIComponent(raw)); } catch {}
    try { candidates.add(decodeURIComponent(decodeURIComponent(raw))); } catch {}

    for (const candidate of candidates) {
      const key = String(candidate).trim();
      const found = ITEMS.find((item) => String(item.id).trim() === key);
      if (found) return found;
    }

    return null;
  }

  window.CanvasApp = window.CanvasApp || {};
  window.CanvasApp.ShopCatalog = {
    ITEMS,
    getById
  };
})();
