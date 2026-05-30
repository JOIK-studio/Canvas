(function () {
  const DEFAULT_GRID = 16;
  const userGridSize = window.CanvasApp?.Store?.getState
    ? window.CanvasApp.Store.getState().user.editorGrid
    : DEFAULT_GRID;
  const GRID = Number.isFinite(userGridSize)
    ? Math.max(16, Math.min(32, Math.floor(userGridSize)))
    : DEFAULT_GRID;
  const CELL = 20;
  const COLORS = [
    "#000000", "#3d3d3d", "#898d90", "#d4d7d9", "#ffffff",
    "#6d001a", "#be0039", "#ff4500", "#ff8666", "#ff99aa",
    "#6d482f", "#ff8c00", "#ffa800", "#ffd635", "#fff8b8",
    "#1a5200", "#00a368", "#00cc78", "#7eed56",
    "#00443e", "#009eaa", "#00ccc0",
    "#00195e", "#2450a4", "#0a84ff", "#51e9f4",
    "#493ac1", "#5e5ce6", "#94b3ff",
    "#811e9f", "#b44ac0", "#e4abff",
    "#ff3881", "#ffd6f5", "#ffb470",
  ];

  const state = {
    color: COLORS[0],
    drawing: false,
    grid: Array.from({ length: GRID }, () => Array(GRID).fill("#ffffff"))
  };

  function normalizeGrid(sourceGrid) {
    const next = Array.from({ length: GRID }, () => Array(GRID).fill("#ffffff"));
    if (!Array.isArray(sourceGrid)) return next;

    for (let y = 0; y < Math.min(GRID, sourceGrid.length); y += 1) {
      const row = sourceGrid[y];
      if (!Array.isArray(row)) continue;
      for (let x = 0; x < Math.min(GRID, row.length); x += 1) {
        const value = row[x];
        next[y][x] = typeof value === "string" ? value : "#ffffff";
      }
    }

    return next;
  }

  function initPeekHeader() {
    const header = document.querySelector(".topbar");
    if (!header) return;

    const setHeaderVisible = (visible) => {
      document.body.classList.toggle("editor-topbar-visible", visible);
      header.style.opacity = visible ? "1" : "0";
      header.style.transform = visible ? "translate(-50%, 0)" : "translate(-50%, calc(-100% - 18px))";
    };

    if (window.matchMedia("(hover: none)").matches) {
      document.body.classList.add("editor-touch-nav");
      setHeaderVisible(true);
      return;
    }

    const syncFromY = (clientY) => {
      setHeaderVisible(clientY <= 84);
    };

    setHeaderVisible(false);

    document.addEventListener("mousemove", (event) => {
      syncFromY(event.clientY);
    });

    header.addEventListener("mouseenter", () => {
      setHeaderVisible(true);
    });

    header.addEventListener("mouseleave", (event) => {
      syncFromY(event.clientY);
    });
  }

  function toast(msg) {
    const node = document.getElementById("toast");
    if (!node) return;
    node.textContent = msg;
    node.classList.add("show");
    setTimeout(() => node.classList.remove("show"), 1600);
  }

  function initResponsiveEditor() {
    const stage = document.querySelector(".create-stage");
    const head = document.querySelector(".create-head");
    const palette = document.querySelector(".create-palette");
    const dock = document.querySelector(".create-dock");
    if (!stage || !head || !palette || !dock) return;

    const syncSize = () => {
      const pad = 42;
      const chrome = head.offsetHeight + palette.offsetHeight + dock.offsetHeight + pad;
      const availableHeight = window.innerHeight - chrome;
      const availableWidth = window.innerWidth - 54;
      const size = Math.max(220, Math.min(availableHeight, availableWidth, 920));
      stage.style.setProperty("--editor-size", `${Math.floor(size)}px`);
    };

    syncSize();
    window.addEventListener("resize", syncSize);
  }

  function drawGrid(ctx) {
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        ctx.fillStyle = state.grid[y][x];
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        ctx.strokeStyle = "#e4edf8";
        ctx.strokeRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  function makePalette() {
    const palette = document.getElementById("palette");
    palette.innerHTML = "";

    COLORS.forEach((color) => {
      const swatch = document.createElement("button");
      swatch.className = `swatch ${state.color === color ? "active" : ""}`;
      swatch.style.background = color;
      swatch.addEventListener("click", () => {
        state.color = color;
        makePalette();
      });
      palette.appendChild(swatch);
    });
  }

  function getPos(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * (canvas.width / rect.width) / CELL);
    const y = Math.floor((event.clientY - rect.top) * (canvas.height / rect.height) / CELL);
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return null;
    return { x, y };
  }

  function paint(canvas, ctx, event) {
    const pos = getPos(canvas, event);
    if (!pos) return;
    state.grid[pos.y][pos.x] = event.shiftKey ? "#ffffff" : state.color;
    drawGrid(ctx);
  }

  function clearGrid(ctx) {
    state.grid = normalizeGrid();
    drawGrid(ctx);
  }

  function fillGrid(ctx) {
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) state.grid[y][x] = state.color;
    }
    drawGrid(ctx);
  }

  function randomGrid(ctx) {
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        state.grid[y][x] = Math.random() > 0.72 ? COLORS[Math.floor(Math.random() * COLORS.length)] : "#ffffff";
      }
    }
    drawGrid(ctx);
  }

  function mirrorGrid(ctx) {
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID / 2; x += 1) {
        state.grid[y][GRID - 1 - x] = state.grid[y][x];
      }
    }
    drawGrid(ctx);
  }

  function countUsedPixels() {
    return state.grid.flat().filter((c) => c !== "#ffffff").length;
  }

  function syncPanel() {
    const app = window.CanvasApp.Store.getState();
    const charges = document.getElementById("chargesPanel");
    const recharge = document.getElementById("rechargePanel");
    const cooldown = document.getElementById("cooldownPanel");
    const pixels = document.getElementById("pixelsPanel");
    const editorSize = document.getElementById("editorSizePanel");
    if (charges) charges.textContent = `${app.user.charges}`;
    if (recharge) recharge.textContent = `${app.user.rechargeSeconds}s`;
    if (cooldown) cooldown.textContent = `${window.CanvasApp.Store.getCooldownSeconds()}s`;
    if (pixels) pixels.textContent = `${app.user.pixelsInventory}`;
    if (editorSize) editorSize.textContent = `${GRID}x${GRID}`;
  }

  function tryLoadRemix(ctx) {
    const remixId = String(new URLSearchParams(window.location.search).get("remix") || "").trim();
    if (!/^[\w-]{1,80}$/.test(remixId)) return;
    if (!remixId) return;
    const src = window.CanvasApp.Store.getCreationById(remixId);
    if (src && src.grid) {
      state.grid = normalizeGrid(src.grid);
      drawGrid(ctx);
      toast(`Remix cargado: ${src.title}`);
    }
    const nextUrl = `${window.location.pathname}${window.location.hash || ""}`;
    window.history.replaceState({}, "", nextUrl);
  }

  function publish(ctx) {
    const input = document.getElementById("titleInput");
    const used = countUsedPixels();
    const result = window.CanvasApp.Store.publishCreation({
      title: input.value || "Nueva pieza",
      grid: state.grid,
      pixelsUsed: used
    });

    if (!result.ok) {
      if (result.reason === "no_charges") toast("No tienes cargas disponibles");
      if (result.reason === "empty") toast("El lienzo esta vacio");
      if (result.reason === "no_pixels") toast("No tienes pixeles suficientes");
      syncPanel();
      window.CanvasApp.UI.updateTopStats();
      return;
    }

    const modal = document.getElementById("publishModal");
    const viewBtn = document.getElementById("publishViewBtn");
    if (viewBtn && result.creation?.id) {
      viewBtn.href = `art.html?id=${encodeURIComponent(result.creation.id)}`;
    }
    if (modal) {
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("publish-focus");
    }

    toast("Creacion publicada en la galeria");
    if (input) input.value = "";
    clearGrid(ctx);
    syncPanel();
    window.CanvasApp.UI.updateTopStats();
  }

  function bindPublishModal() {
    const modal = document.getElementById("publishModal");
    const closeBtn = document.getElementById("publishCloseBtn");
    if (!modal || !closeBtn) return;

    const close = () => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("publish-focus");
    };

    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
  }

  function initShortcuts(ctx) {
    document.addEventListener("keydown", (event) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
      const key = event.key.toLowerCase();
      if (key >= "1" && key <= "8") {
        state.color = COLORS[Number(key) - 1];
        makePalette();
      }
      if (key === "p") publish(ctx);
      if (key === "c") clearGrid(ctx);
      if (key === "f") fillGrid(ctx);
      if (key === "r") randomGrid(ctx);
      if (key === "m") mirrorGrid(ctx);
    });
  }

  function init() {
    window.CanvasApp.UI.initCommon();
    initPeekHeader();
    initResponsiveEditor();
    makePalette();

    const canvas = document.getElementById("editorCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = GRID * CELL;
    canvas.height = GRID * CELL;
    drawGrid(ctx);
    tryLoadRemix(ctx);
    syncPanel();

    canvas.addEventListener("pointerdown", (event) => {
      state.drawing = true;
      paint(canvas, ctx, event);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!state.drawing) return;
      paint(canvas, ctx, event);
    });
    window.addEventListener("pointerup", () => {
      state.drawing = false;
    });

    document.getElementById("clearBtn").addEventListener("click", () => clearGrid(ctx));
    document.getElementById("fillBtn").addEventListener("click", () => fillGrid(ctx));
    document.getElementById("randomBtn").addEventListener("click", () => randomGrid(ctx));
    document.getElementById("mirrorBtn").addEventListener("click", () => mirrorGrid(ctx));
    document.getElementById("publishBtn").addEventListener("click", () => publish(ctx));

    bindPublishModal();
    initShortcuts(ctx);
    setInterval(syncPanel, 1000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
