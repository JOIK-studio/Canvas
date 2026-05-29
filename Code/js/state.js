(function () {
  const STORAGE_KEY = "canvas_app_state_v3";
  const MAX_CHARGES = 6;
  const OPEN_CANVAS_SIZE = 500;
  const OPEN_CANVAS_HISTORY_LIMIT = 30;
  const ADMIN_EMAILS = ["jaimegamingpro@gmail.com"];
  const GRID_SYMBOLS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";

  function readStoredUser() {
    try {
      return JSON.parse(localStorage.getItem("canvas_user") || "null");
    } catch {
      return null;
    }
  }

  function getStoredUserName() {
    const user = readStoredUser();
    return user?.user_metadata?.username || user?.email?.split("@")[0] || "Artista";
  }

  function getStoredUserEmail() {
    const user = readStoredUser();
    return (user?.email || "").trim().toLowerCase();
  }

  function isAdminEmail(email) {
    if (!email) return false;
    return ADMIN_EMAILS.includes(String(email).trim().toLowerCase());
  }

  function isCurrentUserAdmin() {
    return isAdminEmail(getStoredUserEmail());
  }

  function nowMs() {
    return Date.now();
  }

  function makeId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function defaultSocialLinks() {
    return {
      google: { linked: false, visible: false, handle: "" },
      discord: { linked: false, visible: false, handle: "" }
    };
  }

  function normalizeHandle(value) {
    return String(value || "").trim().slice(0, 40);
  }

  function normalizeSocialLinks(value) {
    const base = defaultSocialLinks();
    const source = value && typeof value === "object" ? value : {};

    ["google", "discord"].forEach((provider) => {
      const item = source[provider] && typeof source[provider] === "object" ? source[provider] : {};
      base[provider] = {
        linked: Boolean(item.linked),
        visible: Boolean(item.visible),
        handle: normalizeHandle(item.handle)
      };
    });

    return base;
  }

  function inferSocialLinksFromSession() {
    const user = readStoredUser();
    const out = defaultSocialLinks();
    if (!user) return out;

    const provider = String(user?.app_metadata?.provider || "").toLowerCase();
    const providers = Array.isArray(user?.app_metadata?.providers)
      ? user.app_metadata.providers.map((entry) => String(entry).toLowerCase())
      : provider
        ? [provider]
        : [];

    const baseHandle = normalizeHandle(
      user?.user_metadata?.preferred_username
      || user?.user_metadata?.user_name
      || user?.user_metadata?.username
      || user?.email?.split("@")[0]
      || ""
    );

    if (providers.includes("google")) {
      out.google.linked = true;
      out.google.handle = baseHandle || normalizeHandle(user?.email);
    }

    if (providers.includes("discord")) {
      out.discord.linked = true;
      out.discord.handle = baseHandle;
    }

    return out;
  }

  function syncSocialLinksFromSession() {
    const inferred = inferSocialLinksFromSession();
    const current = normalizeSocialLinks(state.user.socialLinks);

    ["google", "discord"].forEach((provider) => {
      if (!inferred[provider].linked) return;
      current[provider].linked = true;
      if (!current[provider].handle) {
        current[provider].handle = inferred[provider].handle;
      }
    });

    state.user.socialLinks = current;
  }

  function normalizeHexColor(value) {
    if (typeof value !== "string") return "#ffffff";
    if (!value.startsWith("#")) return "#ffffff";
    if (value.length === 4) {
      const r = value[1];
      const g = value[2];
      const b = value[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    if (value.length === 7) return value.toLowerCase();
    return "#ffffff";
  }

  function encodeGrid(grid) {
    if (!Array.isArray(grid) || !grid.length || !Array.isArray(grid[0])) {
      return { s: 0, p: ["#ffffff"], d: "" };
    }

    const size = grid.length;
    const palette = [];
    const indexMap = new Map();
    let encoded = "";

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const color = normalizeHexColor(grid[y][x]);
        if (!indexMap.has(color)) {
          indexMap.set(color, palette.length);
          palette.push(color);
        }
        const idx = indexMap.get(color);
        encoded += GRID_SYMBOLS[idx] || GRID_SYMBOLS[0];
      }
    }

    return { s: size, p: palette, d: encoded };
  }

  function decodeGrid(payload) {
    const size = Number.isFinite(payload?.s) ? payload.s : 0;
    if (!size || typeof payload?.d !== "string" || !Array.isArray(payload?.p)) return [];
    const data = payload.d;
    const palette = payload.p;

    const out = Array.from({ length: size }, () => Array(size).fill("#ffffff"));
    for (let i = 0; i < Math.min(data.length, size * size); i += 1) {
      const y = Math.floor(i / size);
      const x = i % size;
      const paletteIndex = GRID_SYMBOLS.indexOf(data[i]);
      out[y][x] = normalizeHexColor(palette[paletteIndex] || "#ffffff");
    }
    return out;
  }

  function packCreation(creation) {
    return {
      i: creation.id,
      t: creation.title,
      a: creation.author,
      l: creation.likes,
      b: creation.boosts,
      c: creation.comments,
      g: encodeGrid(creation.grid),
      r: creation.remixOf,
      ts: creation.createdAt
    };
  }

  function unpackCreation(raw) {
    return {
      id: raw.i,
      title: raw.t,
      author: raw.a,
      likes: raw.l || 0,
      boosts: raw.b || 0,
      comments: Array.isArray(raw.c) ? raw.c : [],
      grid: decodeGrid(raw.g),
      remixOf: raw.r || null,
      createdAt: raw.ts || nowMs()
    };
  }

  function packOpenCanvasSnapshot(snapshot) {
    return {
      i: snapshot.id,
      t: snapshot.ts,
      r: snapshot.reason,
      a: snapshot.actor,
      p: Object.entries(snapshot.pixels || {}),
      u: Object.entries(snapshot.authors || {})
    };
  }

  function unpackOpenCanvasSnapshot(raw) {
    return {
      id: raw.i,
      ts: raw.t,
      reason: raw.r,
      actor: raw.a,
      pixels: Object.fromEntries(Array.isArray(raw.p) ? raw.p : []),
      authors: Object.fromEntries(Array.isArray(raw.u) ? raw.u : [])
    };
  }

  function packState(source) {
    return {
      __packed: 1,
      v: 2,
      u: {
        n: source.user.name,
        c: source.user.coins,
        px: source.user.pixelsInventory,
        ch: source.user.charges,
        mc: source.user.maxCharges,
        rs: source.user.rechargeSeconds,
        l: source.user.lastChargeAt,
        p: source.user.unlockedPalettes,
        eg: source.user.editorGrid,
        sl: normalizeSocialLinks(source.user.socialLinks)
      },
      cr: (source.creations || []).map(packCreation),
      oc: {
        p: Object.entries(source.openCanvas?.pixels || {}),
        a: Object.entries(source.openCanvas?.authors || {}),
        h: (source.openCanvas?.history || []).map(packOpenCanvasSnapshot),
        t: source.openCanvas?.updatedAt || nowMs()
      },
      ev: (source.events || []).map((event) => [event.id, event.text, event.ts]),
      lg: source.likesGiven || [],
      r: source.remixSourceId || null
    };
  }

  function unpackState(raw) {
    return {
      user: {
        name: raw.u?.n || getStoredUserName(),
        coins: raw.u?.c ?? 40,
        pixelsInventory: raw.u?.px ?? 96,
        charges: raw.u?.ch ?? 2,
        maxCharges: raw.u?.mc ?? MAX_CHARGES,
        rechargeSeconds: raw.u?.rs ?? 30,
        lastChargeAt: raw.u?.l || nowMs(),
        unlockedPalettes: Array.isArray(raw.u?.p) ? raw.u.p : [],
        editorGrid: raw.u?.eg ?? 16,
        socialLinks: normalizeSocialLinks(raw.u?.sl)
      },
      creations: Array.isArray(raw.cr) ? raw.cr.map(unpackCreation) : [],
      openCanvas: {
        width: OPEN_CANVAS_SIZE,
        height: OPEN_CANVAS_SIZE,
        pixels: Object.fromEntries(Array.isArray(raw.oc?.p) ? raw.oc.p : []),
        authors: Object.fromEntries(Array.isArray(raw.oc?.a) ? raw.oc.a : []),
        history: Array.isArray(raw.oc?.h) ? raw.oc.h.map(unpackOpenCanvasSnapshot) : [],
        updatedAt: raw.oc?.t || nowMs()
      },
      events: Array.isArray(raw.ev)
        ? raw.ev.map((event) => ({ id: event[0], text: event[1], ts: event[2] }))
        : [],
      likesGiven: Array.isArray(raw.lg) ? raw.lg : [],
      remixSourceId: raw.r || null
    };
  }

  function makeOpenCanvasSnapshot(reason, actor, sourcePixels, sourceAuthors, ts) {
    return {
      id: makeId(),
      ts: ts || nowMs(),
      reason: reason || "update",
      actor: actor || getStoredUserName(),
      pixels: clone(sourcePixels || {}),
      authors: clone(sourceAuthors || {})
    };
  }

  function createDefaultState() {
    const createdAt = nowMs();
    const base = {
      user: {
        name: getStoredUserName(),
        coins: 40,
        pixelsInventory: 96,
        charges: 2,
        maxCharges: MAX_CHARGES,
        rechargeSeconds: 30,
        lastChargeAt: createdAt,
        unlockedPalettes: [],
        editorGrid: 16,
        socialLinks: defaultSocialLinks()
      },
      creations: [],
      openCanvas: {
        width: OPEN_CANVAS_SIZE,
        height: OPEN_CANVAS_SIZE,
        pixels: {},
        authors: {},
        history: [],
        updatedAt: createdAt
      },
      events: [
        { id: makeId(), text: "Canvas activo: recibiste un pack inicial para publicar tus primeras piezas.", ts: createdAt },
        { id: makeId(), text: "Consejo: usa el editor 16x16 y publica cuando tu pieza esté lista para entrar al mural.", ts: createdAt - 1000 }
      ],
      likesGiven: [],
      remixSourceId: null
    };

    base.openCanvas.history = [
      makeOpenCanvasSnapshot("seed", base.user.name, base.openCanvas.pixels, base.openCanvas.authors, createdAt)
    ];

    return base;
  }

  function parseState(raw) {
    if (!raw) return createDefaultState();
    try {
      const parsed = JSON.parse(raw);
      const state = parsed?.__packed ? unpackState(parsed) : parsed;
      if (!state.user || !Array.isArray(state.creations) || !Array.isArray(state.events)) {
        return createDefaultState();
      }

      if (!state.openCanvas || typeof state.openCanvas !== "object") {
        state.openCanvas = createDefaultState().openCanvas;
      }

      state.openCanvas.width = OPEN_CANVAS_SIZE;
      state.openCanvas.height = OPEN_CANVAS_SIZE;
      state.openCanvas.pixels = state.openCanvas.pixels && typeof state.openCanvas.pixels === "object"
        ? state.openCanvas.pixels
        : {};
      state.openCanvas.authors = state.openCanvas.authors && typeof state.openCanvas.authors === "object"
        ? state.openCanvas.authors
        : {};
      state.openCanvas.history = Array.isArray(state.openCanvas.history)
        ? state.openCanvas.history
        : [];
      state.openCanvas.updatedAt = state.openCanvas.updatedAt || nowMs();

      if (!state.openCanvas.history.length) {
        state.openCanvas.history = [
          makeOpenCanvasSnapshot(
            "seed",
            state.user.name || getStoredUserName(),
            state.openCanvas.pixels,
            state.openCanvas.authors,
            state.openCanvas.updatedAt
          )
        ];
      }

      if (
        state.user.coins === 0 &&
        state.user.pixelsInventory === 0 &&
        state.creations.length === 0 &&
        state.events.length === 0
      ) {
        const fresh = createDefaultState();
        state.user.coins = fresh.user.coins;
        state.user.pixelsInventory = fresh.user.pixelsInventory;
        state.user.charges = fresh.user.charges;
        state.user.lastChargeAt = fresh.user.lastChargeAt;
        state.events = fresh.events;
      }

      state.user.name = state.user.name || getStoredUserName();
      state.user.unlockedPalettes = Array.isArray(state.user.unlockedPalettes)
        ? state.user.unlockedPalettes
        : [];
      state.user.editorGrid = Number.isFinite(state.user.editorGrid)
        ? Math.max(16, Math.min(32, Math.floor(state.user.editorGrid)))
        : 16;
      state.user.socialLinks = normalizeSocialLinks(state.user.socialLinks);
      return state;
    } catch {
      return createDefaultState();
    }
  }

  let state = parseState(localStorage.getItem(STORAGE_KEY));

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packState(state)));
  }

  function chargeTick() {
    const user = state.user;
    const rechargeMs = user.rechargeSeconds * 1000;
    const now = nowMs();

    if (user.charges >= user.maxCharges) {
      user.lastChargeAt = now;
      return;
    }

    const elapsed = now - user.lastChargeAt;
    if (elapsed < rechargeMs) return;

    const gained = Math.floor(elapsed / rechargeMs);
    user.charges = Math.min(user.maxCharges, user.charges + gained);
    user.lastChargeAt += gained * rechargeMs;

    if (user.charges >= user.maxCharges) {
      user.lastChargeAt = now;
    }
  }

  function getCooldownSeconds() {
    const user = state.user;
    if (user.charges >= user.maxCharges) return 0;
    const rechargeMs = user.rechargeSeconds * 1000;
    const elapsed = nowMs() - user.lastChargeAt;
    const remain = Math.max(0, rechargeMs - elapsed);
    return Math.ceil(remain / 1000);
  }

  function addEvent(text) {
    state.events.unshift({ id: makeId(), text, ts: nowMs() });
    state.events = state.events.slice(0, 80);
  }

  function pushOpenCanvasHistory(reason, actor) {
    state.openCanvas.history.push(
      makeOpenCanvasSnapshot(reason, actor, state.openCanvas.pixels, state.openCanvas.authors)
    );

    if (state.openCanvas.history.length > OPEN_CANVAS_HISTORY_LIMIT) {
      state.openCanvas.history = state.openCanvas.history.slice(-OPEN_CANVAS_HISTORY_LIMIT);
    }
  }

  function getCreationById(id) {
    return state.creations.find((item) => item.id === id);
  }

  function getOpenCanvasBoard() {
    return clone(state.openCanvas);
  }

  function getOpenCanvasPixelKey(x, y) {
    return `${x},${y}`;
  }

  function paintOpenCanvasPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= OPEN_CANVAS_SIZE || y >= OPEN_CANVAS_SIZE) {
      return { ok: false, reason: "out_of_bounds" };
    }

    const safeColor = typeof color === "string" && color ? color : "#ffffff";
    const key = getOpenCanvasPixelKey(x, y);

    if (safeColor === "#ffffff") {
      delete state.openCanvas.pixels[key];
      delete state.openCanvas.authors[key];
    } else {
      state.openCanvas.pixels[key] = safeColor;
      state.openCanvas.authors[key] = state.user.name;
    }

    state.openCanvas.updatedAt = nowMs();
    pushOpenCanvasHistory("paint", state.user.name);
    addEvent(`${state.user.name} marcó (${x}, ${y}) en Open Canvas.`);
    save();
    return { ok: true };
  }

  function consumeOpenCanvasCharge() {
    chargeTick();
    if (state.user.charges <= 0) {
      return { ok: false, reason: "no_charges" };
    }

    state.user.charges -= 1;
    state.user.lastChargeAt = nowMs();
    save();
    return { ok: true };
  }

  function publishCreation(payload) {
    chargeTick();
    const user = state.user;
    const pixelsUsed = payload.pixelsUsed;

    if (user.charges <= 0) return { ok: false, reason: "no_charges" };
    if (pixelsUsed <= 0) return { ok: false, reason: "empty" };
    if (user.pixelsInventory < pixelsUsed) return { ok: false, reason: "no_pixels" };

    user.charges -= 1;
    user.lastChargeAt = nowMs();
    user.pixelsInventory -= pixelsUsed;

    const creation = {
      id: makeId(),
      title: (payload.title || "Creacion").trim().slice(0, 60),
      author: user.name,
      likes: 0,
      boosts: 0,
      comments: [],
      grid: clone(payload.grid),
      remixOf: payload.remixOf || null,
      createdAt: nowMs()
    };

    state.creations.unshift(creation);
    addEvent(`${creation.title} entro al Open Canvas.`);
    save();
    return { ok: true, creation };
  }

  function likeCreation(id) {
    if (state.likesGiven.includes(id)) return { ok: false, reason: "already" };
    const creation = getCreationById(id);
    if (!creation) return { ok: false, reason: "not_found" };
    creation.likes += 1;
    state.likesGiven.push(id);
    addEvent(`${creation.title} recibio un like.`);
    save();
    return { ok: true };
  }

  function boostCreation(id) {
    const creation = getCreationById(id);
    if (!creation) return { ok: false, reason: "not_found" };
    if (state.user.coins < 5) return { ok: false, reason: "no_coins" };
    state.user.coins -= 5;
    creation.boosts += 1;
    creation.likes += 2;
    addEvent(`${creation.title} subio tendencia por boost.`);
    save();
    return { ok: true };
  }

  function commentCreation(id, text) {
    const creation = getCreationById(id);
    if (!creation) return { ok: false, reason: "not_found" };
    const value = text.trim();
    if (!value) return { ok: false, reason: "empty" };
    creation.comments.unshift(value.slice(0, 140));
    creation.comments = creation.comments.slice(0, 20);
    addEvent(`Nuevo comentario en ${creation.title}.`);
    save();
    return { ok: true };
  }

  function setRemixSource(id) {
    state.remixSourceId = id;
    save();
  }

  function clearRemixSource() {
    state.remixSourceId = null;
    save();
  }

  function buyItem(type) {
    const user = state.user;

    const knownTypes = [
      "pixels_50", "pixels_180", "speed_upgrade", "charge_now",
      "palette_neon", "max_charge_plus", "recharge_chip", "artist_box", "editor_grid_plus"
    ];
    if (!knownTypes.includes(type)) return { ok: false, reason: "unknown_item" };

    if (type === "pixels_50") {
      if (user.coins < 20) return { ok: false, reason: "no_coins" };
      user.coins -= 20;
      user.pixelsInventory += 50;
      addEvent("Compra: Pack Pixeles x50");
    }

    if (type === "pixels_180") {
      if (user.coins < 65) return { ok: false, reason: "no_coins" };
      user.coins -= 65;
      user.pixelsInventory += 180;
      addEvent("Compra: Pack Pixeles x180");
    }

    if (type === "speed_upgrade") {
      if (user.coins < 50) return { ok: false, reason: "no_coins" };
      if (user.rechargeSeconds <= 10) return { ok: false, reason: "min_recharge" };
      user.coins -= 50;
      user.rechargeSeconds = Math.max(10, user.rechargeSeconds - 5);
      addEvent(`Upgrade recarga: ahora ${user.rechargeSeconds}s`);
    }

    if (type === "charge_now") {
      if (user.coins < 32) return { ok: false, reason: "no_coins" };
      if (user.charges >= user.maxCharges) return { ok: false, reason: "max_charges" };
      user.coins -= 32;
      user.charges += 1;
      user.lastChargeAt = nowMs();
      addEvent("Compra: Carga instantanea");
    }

    if (type === "palette_neon") {
      if (user.coins < 48) return { ok: false, reason: "no_coins" };
      if (user.unlockedPalettes.includes("neon")) return { ok: false, reason: "already_owned" };
      user.coins -= 48;
      user.unlockedPalettes.push("neon");
      addEvent("Compra: Paleta Neon desbloqueada");
    }

    if (type === "max_charge_plus") {
      if (user.coins < 70) return { ok: false, reason: "no_coins" };
      if (user.maxCharges >= 10) return { ok: false, reason: "max_cap" };
      user.coins -= 70;
      user.maxCharges += 1;
      user.charges = Math.min(user.maxCharges, user.charges + 1);
      addEvent(`Upgrade cargas: maximo ${user.maxCharges}`);
    }

    if (type === "recharge_chip") {
      if (user.coins < 38) return { ok: false, reason: "no_coins" };
      if (user.rechargeSeconds <= 8) return { ok: false, reason: "min_recharge" };
      user.coins -= 38;
      user.rechargeSeconds = Math.max(8, user.rechargeSeconds - 2);
      addEvent(`Chip recarga: ahora ${user.rechargeSeconds}s`);
    }

    if (type === "artist_box") {
      if (user.coins < 95) return { ok: false, reason: "no_coins" };
      user.coins -= 95;
      user.pixelsInventory += 260;
      user.charges = Math.min(user.maxCharges, user.charges + 2);
      addEvent("Compra: Artist Box (260 px + 2 cargas)");
    }

    if (type === "editor_grid_plus") {
      if (user.coins < 84) return { ok: false, reason: "no_coins" };
      if (user.editorGrid >= 32) return { ok: false, reason: "max_editor_size" };
      user.coins -= 84;
      user.editorGrid = Math.min(32, user.editorGrid + 8);
      addEvent(`Upgrade editor: ahora ${user.editorGrid}x${user.editorGrid}`);
    }

    save();
    return { ok: true };
  }

  function getPixelInfo(x, y) {
    const key = getOpenCanvasPixelKey(x, y);
    return {
      color: state.openCanvas.pixels[key] || "#ffffff",
      author: state.openCanvas.authors[key] || null
    };
  }

  function deleteCreationAdmin(id) {
    if (!isCurrentUserAdmin()) return { ok: false, reason: "unauthorized" };
    const current = getCreationById(id);
    if (!current) return { ok: false, reason: "not_found" };

    state.creations = state.creations.filter((item) => item.id !== id);
    addEvent(`Admin eliminó la obra: ${current.title}.`);
    save();
    return { ok: true };
  }

  function rollbackOpenCanvas(steps) {
    if (!isCurrentUserAdmin()) return { ok: false, reason: "unauthorized" };
    if (!state.openCanvas.history.length) return { ok: false, reason: "no_history" };

    const safeSteps = Math.max(1, Number.isFinite(steps) ? Math.floor(steps) : 1);
    const targetIndex = Math.max(0, state.openCanvas.history.length - 1 - safeSteps);
    const target = state.openCanvas.history[targetIndex];

    if (!target) return { ok: false, reason: "no_history" };

    state.openCanvas.pixels = clone(target.pixels || {});
    state.openCanvas.authors = clone(target.authors || {});
    state.openCanvas.updatedAt = nowMs();
    state.openCanvas.history = state.openCanvas.history.slice(0, targetIndex + 1);
    addEvent(`Admin revirtió Open Canvas ${safeSteps} paso(s).`);
    save();
    return { ok: true };
  }

  function clearOpenCanvasAdmin() {
    if (!isCurrentUserAdmin()) return { ok: false, reason: "unauthorized" };

    state.openCanvas.pixels = {};
    state.openCanvas.authors = {};
    state.openCanvas.updatedAt = nowMs();
    pushOpenCanvasHistory("clear", state.user.name);
    addEvent("Admin limpió Open Canvas.");
    save();
    return { ok: true };
  }

  function clearEventsAdmin() {
    if (!isCurrentUserAdmin()) return { ok: false, reason: "unauthorized" };
    state.events = [];
    addEvent("Admin limpió el feed de eventos.");
    save();
    return { ok: true };
  }

  function adminTuneUser(payload) {
    if (!isCurrentUserAdmin()) return { ok: false, reason: "unauthorized" };
    const user = state.user;

    if (Number.isFinite(payload?.coinsDelta) && payload.coinsDelta !== 0) {
      user.coins = Math.max(0, user.coins + Math.floor(payload.coinsDelta));
    }

    if (Number.isFinite(payload?.pixelsDelta) && payload.pixelsDelta !== 0) {
      user.pixelsInventory = Math.max(0, user.pixelsInventory + Math.floor(payload.pixelsDelta));
    }

    if (Number.isFinite(payload?.chargesDelta) && payload.chargesDelta !== 0) {
      user.charges = Math.max(0, Math.min(user.maxCharges, user.charges + Math.floor(payload.chargesDelta)));
      user.lastChargeAt = nowMs();
    }

    if (Number.isFinite(payload?.rechargeSeconds)) {
      user.rechargeSeconds = Math.max(8, Math.min(60, Math.floor(payload.rechargeSeconds)));
    }

    if (Number.isFinite(payload?.editorGrid)) {
      user.editorGrid = Math.max(16, Math.min(32, Math.floor(payload.editorGrid)));
    }

    addEvent("Admin ajustó recursos y configuración de cuenta.");
    save();
    return { ok: true };
  }

  function getStorageStats() {
    const packed = JSON.stringify(packState(state));
    const unpacked = JSON.stringify(state);
    return {
      packedBytes: packed.length,
      unpackedBytes: unpacked.length,
      savedBytes: Math.max(0, unpacked.length - packed.length),
      ratio: unpacked.length > 0 ? Number((packed.length / unpacked.length).toFixed(3)) : 1
    };
  }

  function compactStorageAdmin() {
    if (!isCurrentUserAdmin()) return { ok: false, reason: "unauthorized" };
    const before = getStorageStats();
    state.openCanvas.history = (state.openCanvas.history || []).slice(-OPEN_CANVAS_HISTORY_LIMIT);
    save();
    const after = getStorageStats();
    addEvent("Admin ejecutó compactación de base local de sesión.");
    return { ok: true, before, after };
  }

  function linkSocialAccount(provider, handle) {
    const key = String(provider || "").toLowerCase();
    if (!["google", "discord"].includes(key)) return { ok: false, reason: "invalid_provider" };

    const social = normalizeSocialLinks(state.user.socialLinks);
    social[key].linked = true;
    if (handle !== undefined) {
      social[key].handle = normalizeHandle(handle);
    }

    state.user.socialLinks = social;
    addEvent(`Cuenta ${key} vinculada en perfil.`);
    save();
    return { ok: true, social: clone(social[key]) };
  }

  function unlinkSocialAccount(provider) {
    const key = String(provider || "").toLowerCase();
    if (!["google", "discord"].includes(key)) return { ok: false, reason: "invalid_provider" };

    const social = normalizeSocialLinks(state.user.socialLinks);
    social[key] = { linked: false, visible: false, handle: "" };
    state.user.socialLinks = social;
    addEvent(`Cuenta ${key} desvinculada en perfil.`);
    save();
    return { ok: true };
  }

  function setSocialVisibility(provider, visible) {
    const key = String(provider || "").toLowerCase();
    if (!["google", "discord"].includes(key)) return { ok: false, reason: "invalid_provider" };

    const social = normalizeSocialLinks(state.user.socialLinks);
    if (!social[key].linked) return { ok: false, reason: "not_linked" };

    social[key].visible = Boolean(visible);
    state.user.socialLinks = social;
    save();
    return { ok: true, social: clone(social[key]) };
  }

  function setSocialHandle(provider, handle) {
    const key = String(provider || "").toLowerCase();
    if (!["google", "discord"].includes(key)) return { ok: false, reason: "invalid_provider" };

    const social = normalizeSocialLinks(state.user.socialLinks);
    social[key].handle = normalizeHandle(handle);
    state.user.socialLinks = social;
    save();
    return { ok: true, social: clone(social[key]) };
  }

  function getSocialLinks() {
    syncSocialLinksFromSession();
    save();
    return clone(state.user.socialLinks);
  }

  function getState() {
    chargeTick();
    state.user.name = getStoredUserName();
    syncSocialLinksFromSession();
    save();
    const snapshot = clone(state);
    snapshot.user.isAdmin = isCurrentUserAdmin();
    return snapshot;
  }

  function timeLabel(ts) {
    return new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }

  window.CanvasApp = window.CanvasApp || {};
  window.CanvasApp.Store = {
    getState,
    save,
    getCooldownSeconds,
    timeLabel,
    publishCreation,
    likeCreation,
    boostCreation,
    commentCreation,
    buyItem,
    getOpenCanvasBoard,
    paintOpenCanvasPixel,
    consumeOpenCanvasCharge,
    getPixelInfo,
    isCurrentUserAdmin,
    deleteCreationAdmin,
    rollbackOpenCanvas,
    clearOpenCanvasAdmin,
    clearEventsAdmin,
    adminTuneUser,
    compactStorageAdmin,
    getStorageStats,
    getSocialLinks,
    linkSocialAccount,
    unlinkSocialAccount,
    setSocialVisibility,
    setSocialHandle,
    setRemixSource,
    clearRemixSource,
    getCreationById
  };
})();
