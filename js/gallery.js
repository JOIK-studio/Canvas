(function () {
  function sanitizeGrid(rawGrid, fallbackSize = 16) {
    const size = Array.isArray(rawGrid) && rawGrid.length ? rawGrid.length : fallbackSize;
    const safe = Array.from({ length: size }, () => Array(size).fill("#ffffff"));

    if (!Array.isArray(rawGrid)) return safe;

    for (let y = 0; y < Math.min(size, rawGrid.length); y += 1) {
      const row = rawGrid[y];
      if (!Array.isArray(row)) continue;
      for (let x = 0; x < Math.min(size, row.length); x += 1) {
        safe[y][x] = typeof row[x] === "string" ? row[x] : "#ffffff";
      }
    }

    return safe;
  }

  function normalizeCreations(snapshot) {
    const source = [
      snapshot?.creations,
      snapshot?.gallery,
      snapshot?.artworks,
      snapshot?.userCreations
    ].find((entry) => Array.isArray(entry)) || [];

    return source
      .map((entry, index) => {
        const id = entry?.id || entry?.i || `legacy_${index}`;
        const title = String(entry?.title || entry?.t || "Creación");
        const author = String(entry?.author || entry?.a || "Artista");
        const likes = Number.isFinite(entry?.likes) ? entry.likes : Number(entry?.l) || 0;
        const boosts = Number.isFinite(entry?.boosts) ? entry.boosts : Number(entry?.b) || 0;
        const grid = sanitizeGrid(entry?.grid, 16);

        return { id, title, author, likes, boosts, grid };
      })
      .filter((entry) => Array.isArray(entry.grid) && entry.grid.length > 0);
  }

  function gridSize(grid) {
    if (!Array.isArray(grid) || !grid.length || !Array.isArray(grid[0])) return 16;
    return Math.max(1, grid.length);
  }

  function drawThumb(canvas, grid) {
    const ctx = canvas.getContext("2d");
    const size = gridSize(grid);
    const safeGrid = sanitizeGrid(grid, size);
    const cell = canvas.width / size;
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        ctx.fillStyle = safeGrid[y][x];
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }

  function card(creation) {
    const item = document.createElement("article");
    item.className = "art-card art-square reveal";
    item.tabIndex = 0;

    const thumb = document.createElement("canvas");
    thumb.width = 220;
    thumb.height = 220;
    thumb.className = "thumb square";
    drawThumb(thumb, creation.grid);

    const title = document.createElement("h2");
    title.className = "art-square-title";
    title.textContent = creation.title;

    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = `${creation.author} · Likes ${creation.likes} · Boost ${creation.boosts}`;

    item.addEventListener("click", () => {
      window.location.href = `art.html?id=${encodeURIComponent(creation.id)}`;
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        window.location.href = `art.html?id=${encodeURIComponent(creation.id)}`;
      }
    });

    item.append(thumb, title, meta);
    return item;
  }

  function render() {
    const state = window.CanvasApp.Store.getState();
    const creations = normalizeCreations(state);
    const empty = document.getElementById("emptyState");
    const grid = document.getElementById("galleryGrid");
    grid.innerHTML = "";

    if (!creations.length) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    creations.forEach((creation) => {
      grid.appendChild(card(creation));
    });

    window.CanvasApp.UI.updateTopStats();
    window.CanvasApp.UI.applySequentialMotion(grid.parentElement || document);
    requestAnimationFrame(() => {
      document.querySelectorAll(".reveal").forEach((node, i) => {
        node.style.transitionDelay = `${i * 45}ms`;
        node.classList.add("visible");
      });
    });
  }

  function init() {
    window.CanvasApp.UI.initCommon();
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
