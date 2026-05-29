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
    grid: Array.from({ length: GRID }, () => Array(GRID).fill("#ffffff")),
    modalOpen: false,
    lastPublishedId: null,
    confettiTimer: null
  };

  function runConfetti() {
    const canvas = document.getElementById("publishConfetti");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: 1.6 + Math.random() * 2.4,
      size: 4 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    }));

    let frames = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > canvas.height + 12) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      frames += 1;
      if (frames < 120) {
        state.confettiTimer = requestAnimationFrame(tick);
      }
    };

    if (state.confettiTimer) cancelAnimationFrame(state.confettiTimer);
    tick();
  }

  function normalizeGrid(sourceGrid) {
    const next = Array.from({ length: GRID }, () => Array(GRID).fill("#ffffff"));
    if (!Array.isArray(sourceGrid)) return next;

    for (let y = 0; y < Math.min(GRID, sourceGrid.length); y += 1) {
      const row = sourceGrid[y];
      if (!Array.isArray(row)) continue;
      for (let x = 0; x < Math.min(GRID, row.length); x += 1) {
        next[y][x] = typeof row[x] === "string" ? row[x] : "#ffffff";
      }
    }

    return next;
  }

  function initResponsiveEditor() {
    const stage = document.querySelector(".create-stage");
    const palette = document.querySelector(".create-palette");
    const publish = document.querySelector(".create-publish-only");
    const canvas = document.getElementById("editorCanvas");
    if (!stage || !palette || !publish) return;

    if (canvas) {
      canvas.style.touchAction = "none";
    }

    const syncSize = () => {
      const stageTop = stage.getBoundingClientRect().top;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const chrome = palette.offsetHeight + publish.offsetHeight + 40;
      const availableHeight = viewportHeight - stageTop - chrome;
      const availableWidth = window.innerWidth - 48;
      const size = Math.max(280, Math.min(availableHeight, availableWidth, 920));
      stage.style.setProperty("--editor-size", `${Math.floor(size)}px`);
    };

    syncSize();
    window.addEventListener("resize", syncSize);
    window.visualViewport?.addEventListener("resize", syncSize);
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
    if (!palette) return;
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

  function countUsedPixels() {
    return state.grid.flat().filter((color) => color !== "#ffffff").length;
  }

  function tryLoadRemix(ctx) {
    const app = window.CanvasApp.Store.getState();
    if (!app.remixSourceId) return;
    const src = window.CanvasApp.Store.getCreationById(app.remixSourceId);
    if (src && src.grid) {
      state.grid = normalizeGrid(src.grid);
      drawGrid(ctx);
    }
    window.CanvasApp.Store.clearRemixSource();
  }

  function closePublishModal() {
    const modal = document.getElementById("publishModal");
    const card = document.querySelector(".publish-modal-card");
    const viewBtn = document.getElementById("publishViewBtn");
    const status = document.getElementById("publishModalStatus");
    const input = document.getElementById("publishTitleInput");
    const confirmBtn = document.getElementById("publishConfirmBtn");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    card?.classList.remove("published");
    if (viewBtn) {
      viewBtn.classList.add("hidden");
      viewBtn.setAttribute("href", "gallery.html");
    }
    if (input) {
      input.disabled = false;
      input.value = "";
    }
    if (confirmBtn) confirmBtn.disabled = false;
    if (status) status.textContent = "";
    state.lastPublishedId = null;
    state.modalOpen = false;
  }

  function openPublishModal() {
    const modal = document.getElementById("publishModal");
    const input = document.getElementById("publishTitleInput");
    const status = document.getElementById("publishModalStatus");
    const card = document.querySelector(".publish-modal-card");
    const viewBtn = document.getElementById("publishViewBtn");
    const confirmBtn = document.getElementById("publishConfirmBtn");
    if (!modal || !input || !status) return;

    input.value = "";
    input.disabled = false;
    if (confirmBtn) confirmBtn.disabled = false;
    status.textContent = "Publicar consume 5 cargas.";
    card?.classList.remove("published");
    if (viewBtn) viewBtn.classList.add("hidden");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    state.modalOpen = true;
    input.focus();
  }

  function publish(ctx, title) {
    const used = countUsedPixels();
    const result = window.CanvasApp.Store.publishCreation({
      title: title || "Nueva pieza",
      grid: state.grid,
      pixelsUsed: used
    });

    const status = document.getElementById("publishModalStatus");
    const card = document.querySelector(".publish-modal-card");
    const viewBtn = document.getElementById("publishViewBtn");
    const input = document.getElementById("publishTitleInput");
    const confirmBtn = document.getElementById("publishConfirmBtn");

    if (!result.ok) {
      if (status) {
        if (result.reason === "no_charges") status.textContent = "Necesitas al menos 5 cargas para publicar.";
        if (result.reason === "empty") status.textContent = "El lienzo está vacío.";
        if (result.reason === "no_pixels") status.textContent = "No tienes píxeles suficientes.";
      }
      window.CanvasApp.UI.updateTopStats();
      return;
    }

    if (status) status.textContent = "Obra publicada";
    card?.classList.add("published");
    if (input) input.disabled = true;
    if (confirmBtn) confirmBtn.disabled = true;

    if (viewBtn && result.creation?.id) {
      state.lastPublishedId = result.creation.id;
      viewBtn.classList.remove("hidden");
      viewBtn.setAttribute("href", `art.html?id=${encodeURIComponent(result.creation.id)}`);
    }

    runConfetti();

    state.grid = normalizeGrid();
    drawGrid(ctx);
    window.CanvasApp.UI.updateTopStats();

    setTimeout(() => {
      if (input) input.disabled = false;
      if (confirmBtn) confirmBtn.disabled = false;
    }, 300);
  }

  function init() {
    window.CanvasApp.UI.initCommon();
    initResponsiveEditor();
    makePalette();

    const canvas = document.getElementById("editorCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = GRID * CELL;
    canvas.height = GRID * CELL;
    drawGrid(ctx);
    tryLoadRemix(ctx);

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

    document.getElementById("publishBtn")?.addEventListener("click", openPublishModal);
    document.getElementById("publishCancelBtn")?.addEventListener("click", closePublishModal);
    document.getElementById("publishConfirmBtn")?.addEventListener("click", () => {
      const title = document.getElementById("publishTitleInput")?.value?.trim() || "Nueva pieza";
      publish(ctx, title);
    });
    document.getElementById("publishTitleInput")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const title = document.getElementById("publishTitleInput")?.value?.trim() || "Nueva pieza";
      publish(ctx, title);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
