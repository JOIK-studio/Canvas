(function () {
  const BOARD_SIZE = 500;
  const COLORS = [
    { name: "Negro",        value: "#000000" },
    { name: "Gris oscuro",  value: "#3d3d3d" },
    { name: "Gris",         value: "#898d90" },
    { name: "Gris claro",   value: "#d4d7d9" },
    { name: "Blanco",       value: "#ffffff" },
    { name: "Rojo sangre",  value: "#6d001a" },
    { name: "Rojo",         value: "#be0039" },
    { name: "Rojo vivo",    value: "#ff4500" },
    { name: "Coral",        value: "#ff8666" },
    { name: "Rosa",         value: "#ff99aa" },
    { name: "Marrón",       value: "#6d482f" },
    { name: "Naranja",      value: "#ff8c00" },
    { name: "Ámbar",        value: "#ffa800" },
    { name: "Amarillo",     value: "#ffd635" },
    { name: "Crema",        value: "#fff8b8" },
    { name: "Tan",          value: "#ffb470" },
    { name: "Verde bosque", value: "#1a5200" },
    { name: "Verde",        value: "#00a368" },
    { name: "Verde vivo",   value: "#00cc78" },
    { name: "Lima",         value: "#7eed56" },
    { name: "Teal oscuro",  value: "#00443e" },
    { name: "Teal",         value: "#009eaa" },
    { name: "Cian",         value: "#00ccc0" },
    { name: "Marino",       value: "#00195e" },
    { name: "Azul",         value: "#2450a4" },
    { name: "Azul vivo",    value: "#0a84ff" },
    { name: "Celeste",      value: "#51e9f4" },
    { name: "Índigo",       value: "#493ac1" },
    { name: "Violeta",      value: "#5e5ce6" },
    { name: "Lavanda",      value: "#94b3ff" },
    { name: "Púrpura",      value: "#811e9f" },
    { name: "Violeta vivo", value: "#b44ac0" },
    { name: "Lila",         value: "#e4abff" },
    { name: "Rosa fuerte",  value: "#ff3881" },
    { name: "Rosa pastel",  value: "#ffd6f5" },
  ];

  const view = {
    zoom: 14,
    minZoom: 4,
    maxZoom: 30,
    offsetX: 214,
    offsetY: 214,
    color: COLORS[2].value,
    cursorX: 0,
    cursorY: 0,
    drawing: false,
    panning: false,
    spaceHeld: false,
    panStartX: 0,
    panStartY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    paintEnabled: false,
    paintMenuOpen: false,
    lastPaintKey: null,
    paintSessionPlaced: 0
  };

  function setColorPreview(name) {
    const node = document.getElementById("openColorName");
    if (!node) return;
    node.textContent = name ? `Color: ${name}` : "";
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function board() {
    return window.CanvasApp.Store.getOpenCanvasBoard();
  }

  function getPixelColor(boardState, x, y) {
    return boardState.pixels[`${x},${y}`] || "#ffffff";
  }

  function setColor(value) {
    view.color = value;
    renderPalette();
    const current = COLORS.find((entry) => entry.value === value);
    setColorPreview(current?.name || "");
    renderStats();
  }

  function normalizeOffsets(canvas) {
    const visible = Math.floor(canvas.width / view.zoom);
    const maxOffset = Math.max(0, BOARD_SIZE - visible);
    view.offsetX = clamp(view.offsetX, 0, maxOffset);
    view.offsetY = clamp(view.offsetY, 0, maxOffset);
  }

  function canvasCoords(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const px = (event.clientX - rect.left) * (canvas.width / rect.width);
    const py = (event.clientY - rect.top) * (canvas.height / rect.height);
    const boardX = clamp(Math.floor(px / view.zoom) + view.offsetX, 0, BOARD_SIZE - 1);
    const boardY = clamp(Math.floor(py / view.zoom) + view.offsetY, 0, BOARD_SIZE - 1);
    return { boardX, boardY };
  }

  function renderStats() {
    const cursor = document.getElementById("openCursorStat");
    const zoom = document.getElementById("openZoomStat");
    const painted = document.getElementById("openPixelsPainted");
    const paintBtn = document.getElementById("openPaintBtn");
    const chargeCount = document.getElementById("openChargeCount");
    const chargeTimer = document.getElementById("openChargeTimer");
    const paintMenu = document.getElementById("openPaintMenu");
    const paintMenuLabel = document.querySelector("#openPaintBtn .opb-label");
    const boardState = board();
    const appState = window.CanvasApp.Store.getState();
    const cooldown = window.CanvasApp.Store.getCooldownSeconds();

    if (cursor) cursor.textContent = `${view.cursorX}, ${view.cursorY}`;
    if (zoom) zoom.textContent = `${Math.round((view.zoom / 14) * 100)}%`;
    if (painted) painted.textContent = Object.keys(boardState.pixels).length;
    if (chargeCount) chargeCount.textContent = `${appState.user.charges}/${appState.user.maxCharges}`;
    if (chargeTimer) chargeTimer.textContent = cooldown > 0 ? ` · ${cooldown}s` : "";

    if (paintMenu) {
      paintMenu.classList.toggle("hidden", !view.paintMenuOpen);
      if (!view.paintMenuOpen) paintMenu.classList.remove("open");
    }

    if (paintBtn) {
      paintBtn.classList.toggle("active", view.paintEnabled);
      paintBtn.disabled = false;
      paintBtn.title = view.paintEnabled ? "Confirmar pintado" : "Activar pintar";
    }

    if (paintMenuLabel) {
      paintMenuLabel.textContent = view.paintEnabled ? "Confirmar pintar" : "Pintar";
    }
  }

  function syncCanvasSize() {
    const canvas = document.getElementById("openCanvas");
    if (!canvas) return;
    const w = canvas.offsetWidth || window.innerWidth;
    const h = canvas.offsetHeight || window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    renderBoard();
  }

  function renderPalette() {
    const root = document.getElementById("openPalette");
    if (!root) return;
    root.innerHTML = "";

    COLORS.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `oc-swatch ${view.color === entry.value ? "active" : ""}`;
      button.style.background = entry.value;
      button.title = entry.name;
      button.setAttribute("aria-label", entry.name);
      button.addEventListener("mouseenter", () => setColorPreview(entry.name));
      button.addEventListener("focus", () => setColorPreview(entry.name));
      button.addEventListener("click", () => setColor(entry.value));
      root.appendChild(button);
    });

    const active = COLORS.find((entry) => entry.value === view.color);
    setColorPreview(active?.name || "");
  }

  function renderMiniMap() {
    const mini = document.getElementById("openMiniMap");
    if (!mini) return;

    const ctx = mini.getContext("2d");
    const boardState = board();
    ctx.clearRect(0, 0, mini.width, mini.height);
    ctx.fillStyle = "#08132f";
    ctx.fillRect(0, 0, mini.width, mini.height);

    const cell = mini.width / BOARD_SIZE;
    Object.entries(boardState.pixels).forEach(([key, color]) => {
      const [x, y] = key.split(",").map(Number);
      ctx.fillStyle = color;
      ctx.fillRect(x * cell, y * cell, Math.max(1, cell), Math.max(1, cell));
    });

    const visible = Math.floor(document.getElementById("openCanvas").width / view.zoom);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      view.offsetX * cell,
      view.offsetY * cell,
      Math.max(10, visible * cell),
      Math.max(10, visible * cell)
    );
  }

  function renderBoard() {
    const canvas = document.getElementById("openCanvas");
    if (!canvas) return;

    normalizeOffsets(canvas);

    const ctx = canvas.getContext("2d");
    const boardState = board();
    const cols = Math.ceil(canvas.width / view.zoom);
    const rows = Math.ceil(canvas.height / view.zoom);
    const endX = Math.min(BOARD_SIZE, view.offsetX + cols + 1);
    const endY = Math.min(BOARD_SIZE, view.offsetY + rows + 1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#060e22";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = view.offsetY; y < endY; y += 1) {
      for (let x = view.offsetX; x < endX; x += 1) {
        const color = getPixelColor(boardState, x, y);
        const drawX = (x - view.offsetX) * view.zoom;
        const drawY = (y - view.offsetY) * view.zoom;
        ctx.fillStyle = color;
        ctx.fillRect(drawX, drawY, view.zoom, view.zoom);
      }
    }

    renderStats();
    renderMiniMap();
  }

  function paintAt(canvas, event) {
    if (!view.paintEnabled) return;
    const { boardX, boardY } = canvasCoords(canvas, event);
    const pixelKey = `${boardX},${boardY}`;

    if (pixelKey === view.lastPaintKey) return;

    const spend = window.CanvasApp.Store.consumeOpenCanvasCharge();
    if (!spend.ok) {
      view.paintEnabled = false;
      renderStats();
      return;
    }

    view.cursorX = boardX;
    view.cursorY = boardY;
    const result = window.CanvasApp.Store.paintOpenCanvasPixel(boardX, boardY, view.color);
    if (!result.ok) return;
    view.lastPaintKey = pixelKey;
    view.paintSessionPlaced += 1;
    renderBoard();
  }

  function showPixelInfo(canvas, event) {
    const { boardX, boardY } = canvasCoords(canvas, event);
    const info = window.CanvasApp.Store.getPixelInfo(boardX, boardY);
    const tooltip = document.getElementById("openPixelInfo");
    if (!tooltip) return;

    document.getElementById("opitSwatch").style.background = info.color;
    document.getElementById("opitAuthor").textContent = info.author || "Libre";
    document.getElementById("opitCoords").textContent = `(${boardX}, ${boardY})`;

    const margin = 14;
    let left = event.clientX + margin;
    let top = event.clientY - 36;
    if (left + 160 > window.innerWidth) left = event.clientX - 160 - margin;
    if (top < 8) top = event.clientY + margin;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.remove("hidden");

    clearTimeout(view._tooltipTimer);
    view._tooltipTimer = setTimeout(() => tooltip.classList.add("hidden"), 3200);
  }

  function zoomAt(delta, event) {
    const canvas = document.getElementById("openCanvas");
    const rect = canvas.getBoundingClientRect();
    const px = (event.clientX - rect.left) * (canvas.width / rect.width);
    const py = (event.clientY - rect.top) * (canvas.height / rect.height);
    const beforeX = view.offsetX + px / view.zoom;
    const beforeY = view.offsetY + py / view.zoom;
    view.zoom = clamp(view.zoom + delta, view.minZoom, view.maxZoom);
    view.offsetX = Math.round(beforeX - px / view.zoom);
    view.offsetY = Math.round(beforeY - py / view.zoom);
    renderBoard();
  }

  function bindCanvas() {
    const canvas = document.getElementById("openCanvas");
    if (!canvas) return;

    canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    canvas.addEventListener("pointerdown", (event) => {
      canvas.setPointerCapture(event.pointerId);
      const isRightButton = event.button === 2;
      const isLeftButton = event.button === 0;
      const panWithLeft = isLeftButton && !view.paintEnabled;
      const panWithRight = isRightButton && view.paintEnabled;

      if (view.spaceHeld || panWithLeft || panWithRight) {
        view.panning = true;
        view.panStartX = event.clientX;
        view.panStartY = event.clientY;
        view.startOffsetX = view.offsetX;
        view.startOffsetY = view.offsetY;
        return;
      }

      if (isRightButton) return;

      if (!view.paintEnabled) {
        showPixelInfo(canvas, event);
        return;
      }

      view.drawing = true;
      view.lastPaintKey = null;
      paintAt(canvas, event);
    });

    canvas.addEventListener("pointermove", (event) => {
      const { boardX, boardY } = canvasCoords(canvas, event);
      view.cursorX = boardX;
      view.cursorY = boardY;

      if (view.panning) {
        const deltaX = Math.round((event.clientX - view.panStartX) / view.zoom);
        const deltaY = Math.round((event.clientY - view.panStartY) / view.zoom);
        view.offsetX = view.startOffsetX - deltaX;
        view.offsetY = view.startOffsetY - deltaY;
        renderBoard();
        return;
      }

      if (view.drawing) {
        paintAt(canvas, event);
      } else {
        renderStats();
      }
    });

    const endGesture = (event) => {
      if (event.pointerId !== undefined) {
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {}
      }
      view.drawing = false;
      view.lastPaintKey = null;
      view.panning = false;
    };

    canvas.addEventListener("pointerup", endGesture);
    canvas.addEventListener("pointerleave", endGesture);

    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      zoomAt(event.deltaY < 0 ? 2 : -2, event);
    }, { passive: false });
  }

  function bindControls() {
    // Topbar peek (igual que el editor Crear)
    const header = document.querySelector(".topbar");
    if (header && !window.matchMedia("(hover: none)").matches) {
      document.addEventListener("mousemove", (event) => {
        document.body.classList.toggle("oc-topbar-visible", event.clientY <= 72);
      });
      header.addEventListener("mouseenter", () => {
        document.body.classList.add("oc-topbar-visible");
      });
    }

    document.getElementById("openCenterBtn")?.addEventListener("click", () => {
      view.offsetX = 214;
      view.offsetY = 214;
      view.zoom = 14;
      renderBoard();
    });

    document.getElementById("openPaintBtn")?.addEventListener("click", () => {
      const hasCharges = window.CanvasApp.Store.getState().user.charges > 0;
      const menu = document.getElementById("openPaintMenu");

      if (!view.paintEnabled) {
        if (!hasCharges) {
          view.paintEnabled = false;
          view.paintMenuOpen = false;
          renderStats();
          return;
        }

        view.paintEnabled = true;
        view.paintMenuOpen = true;
        view.paintSessionPlaced = 0;
        if (menu) {
          menu.classList.remove("open");
          void menu.offsetWidth;
          menu.classList.add("open");
        }
        const tooltip = document.getElementById("openPixelInfo");
        if (tooltip) tooltip.classList.add("hidden");
        renderStats();
        return;
      }

      view.paintEnabled = false;
      view.paintMenuOpen = false;
      view.paintSessionPlaced = 0;

      if (!view.paintMenuOpen) {
        menu?.classList.remove("open");
      }
      const tooltip = document.getElementById("openPixelInfo");
      if (tooltip) tooltip.classList.add("hidden");
      renderStats();
    });

    document.addEventListener("keydown", (event) => {
      if (event.code === "Space") view.spaceHeld = true;
    });

    document.addEventListener("keyup", (event) => {
      if (event.code === "Space") {
        view.spaceHeld = false;
        view.panning = false;
      }
    });
  }

  function init() {
    window.CanvasApp.UI.initCommon();
    renderPalette();
    bindCanvas();
    bindControls();
    syncCanvasSize();
    window.addEventListener("resize", syncCanvasSize);
    renderBoard();
    setInterval(() => {
      window.CanvasApp.UI.updateTopStats();
      renderStats();
    }, 2000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
