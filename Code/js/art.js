(function () {
  function getCreationId() {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("id") || "";
    return value.trim();
  }

  function resolveCreationById(rawId) {
    if (!rawId) return null;

    const candidates = new Set([rawId, rawId.trim()]);
    try { candidates.add(decodeURIComponent(rawId)); } catch {}
    try { candidates.add(decodeURIComponent(decodeURIComponent(rawId))); } catch {}

    for (const candidate of candidates) {
      if (!candidate) continue;
      const found = window.CanvasApp.Store.getCreationById(candidate);
      if (found) return found;
    }

    return null;
  }

  function gridSize(grid) {
    if (!Array.isArray(grid) || !grid.length || !Array.isArray(grid[0])) return 16;
    return Math.max(1, grid.length);
  }

  function draw(canvas, grid) {
    const ctx = canvas.getContext("2d");
    const size = gridSize(grid);
    const cell = canvas.width / size;
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        ctx.fillStyle = grid[y][x];
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }

  function exportImage(creation, type) {
    const size = gridSize(creation.grid);
    const pxSize = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size * pxSize;
    canvas.height = size * pxSize;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        ctx.fillStyle = creation.grid[y][x];
        ctx.fillRect(x * pxSize, y * pxSize, pxSize, pxSize);
      }
    }

    const safeTitle = (creation.title || "obra").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 48);
    const quality = type === "image/jpeg" ? 0.94 : (type === "image/webp" ? 0.95 : undefined);
    const data = canvas.toDataURL(type, quality);
    const ext = type === "image/jpeg" ? "jpg" : (type === "image/webp" ? "webp" : "png");

    const link = document.createElement("a");
    link.href = data;
    link.download = `${safeTitle || "obra"}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function render(creation) {
    const detail = document.getElementById("artDetail");
    const title = document.getElementById("artDetailTitle");
    const meta = document.getElementById("artDetailMeta");
    const canvas = document.getElementById("artDetailCanvas");
    const actions = document.getElementById("artDetailActions");
    const exports = document.getElementById("artExportActions");
    const exportFormat = document.getElementById("artExportFormat");
    const exportBtn = document.getElementById("artExportBtn");
    const comments = document.getElementById("artDetailComments");

    detail.hidden = false;
    title.textContent = creation.title;
    meta.textContent = `${creation.author} · ${window.CanvasApp.Store.timeLabel(creation.createdAt)} · Likes ${creation.likes} · Boost ${creation.boosts}`;
    draw(canvas, creation.grid);

    actions.innerHTML = "";
    comments.innerHTML = "";

    const like = document.createElement("button");
    like.className = "btn ghost sm";
    like.textContent = "Like";
    like.addEventListener("click", () => {
      const res = window.CanvasApp.Store.likeCreation(creation.id);
      if (!res.ok && res.reason === "already") {
        alert("Ya diste like a esta pieza");
      }
      reload();
    });

    const boost = document.createElement("button");
    boost.className = "btn ghost sm";
    boost.textContent = "Aumentar";
    boost.addEventListener("click", () => {
      const res = window.CanvasApp.Store.boostCreation(creation.id);
      if (!res.ok && res.reason === "no_coins") {
        alert("Necesitas 5 monedas para boost");
      }
      reload();
    });

    const remix = document.createElement("button");
    remix.className = "btn ghost sm";
    remix.textContent = "Remix";
    remix.addEventListener("click", () => {
      window.location.href = `create.html?remix=${encodeURIComponent(creation.id)}`;
    });

    actions.append(like, boost, remix);

    if (exports && exportFormat && exportBtn) {
      exportBtn.onclick = () => {
        exportImage(creation, exportFormat.value || "image/png");
      };
    }

    if (window.CanvasApp.Store.isCurrentUserAdmin()) {
      const del = document.createElement("button");
      del.className = "btn ghost sm btn-danger";
      del.textContent = "Eliminar";
      del.addEventListener("click", () => {
        const ok = window.confirm("¿Eliminar esta obra de la galería?");
        if (!ok) return;
        const res = window.CanvasApp.Store.deleteCreationAdmin(creation.id);
        if (!res.ok) return;
        window.location.href = "gallery.html";
      });
      actions.appendChild(del);
    }

    creation.comments.slice(0, 20).forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      comments.appendChild(li);
    });
  }

  function reload() {
    const id = getCreationId();
    const creation = resolveCreationById(id);
    if (!creation) {
      document.getElementById("artDetail").hidden = true;
      document.getElementById("artNotFound").hidden = false;
      return;
    }
    render(creation);
  }

  function init() {
    window.CanvasApp.UI.initCommon();

    const id = getCreationId();
    const creation = id ? resolveCreationById(id) : null;

    if (!creation) {
      document.getElementById("artNotFound").hidden = false;
      return;
    }

    document.getElementById("artDetailSend")?.addEventListener("click", () => {
      const input = document.getElementById("artDetailComment");
      if (!input) return;
      const res = window.CanvasApp.Store.commentCreation(creation.id, input.value);
      if (!res.ok) return;
      input.value = "";
      reload();
    });

    reload();
  }

  document.addEventListener("DOMContentLoaded", init);
})();