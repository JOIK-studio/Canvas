(function () {
  const STORAGE_KEY = "canvas_app_state_v3";
  const MAX_CHARGES = 6;
  const OPEN_CANVAS_SIZE = 500;
  const OPEN_CANVAS_HISTORY_LIMIT = 30;
  const ADMIN_EMAILS = ["jaimegamingpro@gmail.com", "jaimeferrerasg@safa-grial.es"];
  const GRID_SYMBOLS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
  const REMOTE_CREATIONS_LIMIT = 120;
  const LOCAL_CREATIONS_BUFFER = 30;
  const MAX_REMOTE_ERROR_LENGTH = 180;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const LEGACY_STORAGE_KEYS = [
    STORAGE_KEY,
    "canvas_ui_settings_v1",
    "canvas_auth_mode",
    "canvas_supabase_url",
    "canvas_supabase_key",
    "supabase_url",
    "SUPABASE_URL",
    "supabase_anon_key",
    "SUPABASE_ANON_KEY"
  ];
  const PROFILE_SETTINGS_KEY = "canvas_state";
  const SYSTEM_SCREEN_CONFIG_KEY = "system_screen";

  let supabaseClientPromise = null;
  let remoteBootPromise = null;
  let hadLegacyStoredState = false;
  const remoteStatus = {
    enabled: false,
    ready: false,
    lastSyncAt: 0,
    lastError: "",
    source: "local"
  };

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

  function isUuid(value) {
    return UUID_RE.test(String(value || "").trim());
  }

  function getSupabaseConfig() {
    if (window.CanvasApp?.SupabaseConfig?.read) {
      return window.CanvasApp.SupabaseConfig.read();
    }
    const url = String(window.CANVAS_SUPABASE_URL || "").trim();
    const key = String(window.CANVAS_SUPABASE_KEY || "").trim();
    return { url, key, valid: Boolean(url && key) };
  }

  function hasRemoteConfig(config) {
    if (!config?.url || !config?.key) return false;
    if (window.CanvasApp?.SupabaseConfig?.hasValid) {
      return window.CanvasApp.SupabaseConfig.hasValid(config.url, config.key);
    }
    return true;
  }

  async function loadSupabaseLibrary() {
    if (window.supabase?.createClient) return true;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return Boolean(window.supabase?.createClient);
  }

  async function getSupabaseClient() {
    if (supabaseClientPromise) return supabaseClientPromise;
    supabaseClientPromise = (async () => {
      const config = getSupabaseConfig();
      if (!hasRemoteConfig(config)) return null;
      remoteStatus.enabled = true;
      try {
        const loaded = await loadSupabaseLibrary();
        if (!loaded) return null;
        return window.supabase.createClient(config.url, config.key);
      } catch {
        return null;
      }
    })();
    return supabaseClientPromise;
  }

  function readStoredUserId() {
    const user = readStoredUser();
    return user?.id || null;
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

  function clearLegacyBrowserState() {
    try {
      hadLegacyStoredState = Boolean(localStorage.getItem(STORAGE_KEY));
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      Object.keys(localStorage)
        .filter((key) => key.startsWith("canvas_onboarding_done_"))
        .forEach((key) => localStorage.removeItem(key));
    } catch {}

    try {
      sessionStorage.removeItem("canvas_shop_detail_fx");
    } catch {}
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

  function defaultSystemScreen() {
    return {
      mode: "off",
      title: "",
      message: "",
      updatedAt: 0,
      updatedBy: ""
    };
  }

  function normalizeSystemScreen(value) {
    const base = defaultSystemScreen();
    const source = value && typeof value === "object" ? value : {};
    const mode = String(source.mode || "off").toLowerCase();
    base.mode = ["off", "maintenance", "notice"].includes(mode) ? mode : "off";
    base.title = String(source.title || "").trim().slice(0, 80);
    base.message = String(source.message || "").trim().slice(0, 420);
    base.updatedAt = Number.isFinite(source.updatedAt) ? source.updatedAt : 0;
    base.updatedBy = String(source.updatedBy || "").trim().slice(0, 80);
    return base;
  }

  function defaultProfileSettings() {
    return {
      charges: 2,
      maxCharges: MAX_CHARGES,
      lastChargeAt: nowMs(),
      unlockedPalettes: [],
      editorGrid: 16,
      socialLinks: defaultSocialLinks()
    };
  }

  function normalizeProfileSettings(value) {
    const base = defaultProfileSettings();
    const source = value && typeof value === "object" ? value : {};
    return {
      charges: Number.isFinite(source.charges) ? Math.max(0, Math.floor(source.charges)) : base.charges,
      maxCharges: Number.isFinite(source.maxCharges) ? Math.max(1, Math.floor(source.maxCharges)) : base.maxCharges,
      lastChargeAt: Number.isFinite(source.lastChargeAt) ? source.lastChargeAt : base.lastChargeAt,
      unlockedPalettes: Array.isArray(source.unlockedPalettes) ? source.unlockedPalettes : base.unlockedPalettes,
      editorGrid: Number.isFinite(source.editorGrid) ? Math.max(16, Math.min(32, Math.floor(source.editorGrid))) : base.editorGrid,
      socialLinks: normalizeSocialLinks(source.socialLinks)
    };
  }

  function getProfileSettingsPayload() {
    return {
      charges: state.user.charges,
      maxCharges: state.user.maxCharges,
      lastChargeAt: state.user.lastChargeAt,
      unlockedPalettes: clone(state.user.unlockedPalettes),
      editorGrid: state.user.editorGrid,
      socialLinks: normalizeSocialLinks(state.user.socialLinks)
    };
  }

  function countPixelsInGrid(grid) {
    return Array.isArray(grid)
      ? grid.flat().filter((color) => color !== "#ffffff").length
      : 0;
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
      r: source.remixSourceId || null,
      ss: normalizeSystemScreen(source.systemScreen)
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
      remixSourceId: raw.r || null,
      systemScreen: normalizeSystemScreen(raw.ss)
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
      remixSourceId: null,
      systemScreen: defaultSystemScreen()
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
      state.systemScreen = normalizeSystemScreen(state.systemScreen);
      return state;
    } catch {
      return createDefaultState();
    }
  }

  let state = parseState((() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  })());
  clearLegacyBrowserState();
  bootRemoteState();

  function save() {
    return clone(state);
  }

  function markRemoteSyncOk(source) {
    remoteStatus.ready = true;
    remoteStatus.lastSyncAt = nowMs();
    remoteStatus.lastError = "";
    remoteStatus.source = source || remoteStatus.source;
  }

  function markRemoteSyncError(error) {
    remoteStatus.ready = false;
    remoteStatus.lastError = String(error?.message || error || "sync_error").slice(0, MAX_REMOTE_ERROR_LENGTH);
  }

  async function getRemoteUserContext(client) {
    const storedUser = readStoredUser();
    const userId = storedUser?.id || null;
    if (!client || !userId) return { userId, email: getStoredUserEmail() };
    try {
      const { data } = await client.auth.getUser();
      const user = data?.user;
      return {
        userId: user?.id || userId,
        email: String(user?.email || storedUser?.email || "").trim().toLowerCase()
      };
    } catch {
      return { userId, email: getStoredUserEmail() };
    }
  }

  async function loadRemoteProfile(client) {
    const userId = readStoredUserId();
    if (!userId) return;

    const { data, error } = await client
      .from("profiles")
      .select("id,username,coins,pixels_inventory,recharge_seconds,settings")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return;

    const remoteSettings = normalizeProfileSettings(data.settings?.[PROFILE_SETTINGS_KEY]);
    state.user.name = String(data.username || state.user.name || getStoredUserName()).trim() || getStoredUserName();
    state.user.coins = Number.isFinite(data.coins) ? Math.max(0, Math.floor(data.coins)) : state.user.coins;
    state.user.pixelsInventory = Number.isFinite(data.pixels_inventory)
      ? Math.max(0, Math.floor(data.pixels_inventory))
      : state.user.pixelsInventory;
    state.user.rechargeSeconds = Number.isFinite(data.recharge_seconds)
      ? Math.max(8, Math.min(60, Math.floor(data.recharge_seconds)))
      : state.user.rechargeSeconds;
    state.user.charges = Math.min(remoteSettings.maxCharges, remoteSettings.charges);
    state.user.maxCharges = remoteSettings.maxCharges;
    state.user.lastChargeAt = remoteSettings.lastChargeAt;
    state.user.unlockedPalettes = remoteSettings.unlockedPalettes;
    state.user.editorGrid = remoteSettings.editorGrid;
    state.user.socialLinks = remoteSettings.socialLinks;
  }

  async function syncProfileRemote() {
    const client = await getSupabaseClient();
    const userId = readStoredUserId();
    if (!client || !userId) return;

    const { data: current, error: currentError } = await client
      .from("profiles")
      .select("settings")
      .eq("id", userId)
      .maybeSingle();
    if (currentError) throw currentError;

    const currentSettings = current?.settings && typeof current.settings === "object" ? current.settings : {};
    const nextSettings = {
      ...currentSettings,
      [PROFILE_SETTINGS_KEY]: getProfileSettingsPayload()
    };

    const { error } = await client
      .from("profiles")
      .update({
        coins: state.user.coins,
        pixels_inventory: state.user.pixelsInventory,
        recharge_seconds: state.user.rechargeSeconds,
        settings: nextSettings
      })
      .eq("id", userId);

    if (error) throw error;
    markRemoteSyncOk("remote");
  }

  async function loadRemoteLikes(client) {
    const userId = readStoredUserId();
    if (!userId) return;
    const { data, error } = await client
      .from("creation_likes")
      .select("creation_id")
      .eq("user_id", userId);
    if (error) throw error;
    state.likesGiven = Array.isArray(data) ? data.map((entry) => entry.creation_id).filter(Boolean) : [];
  }

  async function loadRemoteComments(client) {
    const creationIds = (state.creations || []).map((entry) => entry.id).filter(isUuid);
    if (!creationIds.length) return;
    const { data, error } = await client
      .from("comments")
      .select("creation_id,content,created_at")
      .in("creation_id", creationIds)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const grouped = {};
    (data || []).forEach((entry) => {
      if (!grouped[entry.creation_id]) grouped[entry.creation_id] = [];
      if (grouped[entry.creation_id].length < 20) {
        grouped[entry.creation_id].push(String(entry.content || "").slice(0, 140));
      }
    });

    state.creations.forEach((creation) => {
      creation.comments = grouped[creation.id] || [];
    });
  }

  function mapRemoteEvent(entry) {
    const payload = entry?.payload && typeof entry.payload === "object" ? entry.payload : {};
    const text = String(payload.text || "").trim();
    const fallback = {
      publish: "Nueva publicación en el mural.",
      like: "Una obra recibió un like.",
      boost: "Una obra recibió un boost.",
      remix: "Se publicó un remix.",
      shop: "Se registró una compra.",
      paint: "Se actualizó Open Canvas.",
      comment: "Nuevo comentario publicado.",
      admin: "Acción de administración aplicada.",
      system: "Estado global actualizado.",
      social: "Perfil social actualizado."
    };

    return {
      id: entry.id || makeId(),
      text: text || fallback[entry?.event_type] || "Actividad registrada.",
      ts: entry?.created_at ? new Date(entry.created_at).getTime() : nowMs()
    };
  }

  async function loadRemoteEvents(client) {
    const { data, error } = await client
      .from("open_canvas_events")
      .select("id,event_type,payload,created_at")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) throw error;
    state.events = Array.isArray(data) ? data.map(mapRemoteEvent) : [];
  }

  async function syncEventRemote(eventType, text, payload = {}, creationId = null) {
    const client = await getSupabaseClient();
    if (!client) return;
    const body = {
      event_type: String(eventType || "system").trim().slice(0, 32),
      payload: {
        ...payload,
        text: String(text || "").trim().slice(0, 220)
      }
    };
    if (isUuid(creationId)) body.creation_id = creationId;
    const { error } = await client.from("open_canvas_events").insert(body);
    if (error) throw error;
    markRemoteSyncOk("remote");
  }

  async function loadRemoteSystemScreen(client) {
    const { data, error } = await client
      .from("app_config")
      .select("key,value")
      .eq("key", SYSTEM_SCREEN_CONFIG_KEY)
      .maybeSingle();
    if (error) throw error;
    state.systemScreen = normalizeSystemScreen(data?.value);
  }

  async function syncSystemScreenRemote(screen) {
    const client = await getSupabaseClient();
    if (!client) return;
    const { error } = await client
      .from("app_config")
      .upsert({ key: SYSTEM_SCREEN_CONFIG_KEY, value: normalizeSystemScreen(screen) }, { onConflict: "key" });
    if (error) throw error;
    markRemoteSyncOk("remote");
  }

  async function syncLikeRemote(creationId) {
    const client = await getSupabaseClient();
    const userId = readStoredUserId();
    if (!client || !userId || !isUuid(creationId)) return;
    const { error } = await client.from("creation_likes").insert({ user_id: userId, creation_id: creationId });
    if (error) throw error;
    await client.rpc("recount_creation_stats", { p_creation_id: creationId });
    markRemoteSyncOk("remote");
  }

  async function syncBoostRemote(creationId) {
    const client = await getSupabaseClient();
    const userId = readStoredUserId();
    if (!client || !userId || !isUuid(creationId)) return;
    const { error } = await client.from("boosts").insert({ author_id: userId, creation_id: creationId, coins_spent: 5 });
    if (error) throw error;
    await client.rpc("recount_creation_stats", { p_creation_id: creationId });
    markRemoteSyncOk("remote");
  }

  async function syncCommentRemote(creationId, text) {
    const client = await getSupabaseClient();
    const userId = readStoredUserId();
    if (!client || !userId || !isUuid(creationId)) return;
    const { error } = await client.from("comments").insert({
      creation_id: creationId,
      author_id: userId,
      content: String(text || "").trim().slice(0, 140)
    });
    if (error) throw error;
    markRemoteSyncOk("remote");
  }

  async function syncShopOrderRemote(type, pixelsAmount, coinsSpent) {
    const client = await getSupabaseClient();
    const userId = readStoredUserId();
    if (!client || !userId) return;
    const payload = {
      user_id: userId,
      pack_key: String(type || "shop_item").slice(0, 80),
      pixels_amount: Math.max(1, Math.floor(pixelsAmount || 1)),
      coins_spent: Math.max(1, Math.floor(coinsSpent || 1))
    };
    const { error } = await client.from("pixel_shop_orders").insert(payload);
    if (error) throw error;
    markRemoteSyncOk("remote");
  }

  async function syncDeleteCreationRemote(creationId) {
    const client = await getSupabaseClient();
    if (!client || !isUuid(creationId)) return;
    const { error } = await client.from("creations").delete().eq("id", creationId);
    if (error) throw error;
    markRemoteSyncOk("remote");
  }

  async function syncReplaceOpenCanvasRemote(pixels, authors) {
    const client = await getSupabaseClient();
    const { userId } = await getRemoteUserContext(client);
    if (!client || !userId) return;

    const { error: deleteError } = await client.from("open_canvas_pixels").delete().gte("x", 0).gte("y", 0);
    if (deleteError) throw deleteError;

    const entries = Object.entries(pixels || {});
    if (entries.length) {
      const payload = entries.map(([key, color]) => {
        const [x, y] = key.split(",").map(Number);
        return {
          x,
          y,
          author_id: userId,
          color: normalizeHexColor(color),
          author_name: String((authors || {})[key] || state.user.name || "Artista").trim().slice(0, 32),
          updated_at: new Date().toISOString()
        };
      });
      const { error: upsertError } = await client.from("open_canvas_pixels").upsert(payload);
      if (upsertError) throw upsertError;
    }

    markRemoteSyncOk("remote");
  }

  async function loadRemoteCreations(client) {
    const { data: rows, error } = await client
      .from("creations")
      .select("id,author_id,title,grid,like_count,boost_count,remix_of,created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(REMOTE_CREATIONS_LIMIT);

    if (error) throw error;
    if (!Array.isArray(rows)) return;

    const authorIds = [...new Set(rows.map((entry) => entry.author_id).filter(Boolean))];
    let authorsById = {};
    if (authorIds.length) {
      const { data: profiles, error: profilesError } = await client
        .from("profiles")
        .select("id,username")
        .in("id", authorIds);
      if (profilesError) throw profilesError;
      authorsById = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile.username]));
    }

    const remoteCreations = rows.map((entry) => ({
      id: entry.id,
      title: String(entry.title || "Creación").slice(0, 60),
      author: authorsById[entry.author_id] || "Artista",
      likes: entry.like_count || 0,
      boosts: entry.boost_count || 0,
      comments: [],
      grid: decodeGrid(entry.grid),
      remixOf: entry.remix_of || null,
      createdAt: entry.created_at ? new Date(entry.created_at).getTime() : nowMs()
    }));

    const existing = state.creations || [];
    const remoteIds = new Set(remoteCreations.map((entry) => entry.id));
    const extras = existing.filter((entry) => entry.id && !remoteIds.has(entry.id));
    state.creations = [...remoteCreations, ...extras].slice(0, REMOTE_CREATIONS_LIMIT + LOCAL_CREATIONS_BUFFER);
  }

  async function loadRemoteOpenCanvas(client) {
    const { data, error } = await client
      .from("open_canvas_pixels")
      .select("x,y,color,author_name,updated_at");
    if (error) throw error;
    if (!Array.isArray(data)) return;

    const pixels = {};
    const authors = {};
    data.forEach((entry) => {
      const x = Number(entry.x);
      const y = Number(entry.y);
      if (!Number.isInteger(x) || !Number.isInteger(y)) return;
      const key = getOpenCanvasPixelKey(x, y);
      const color = normalizeHexColor(entry.color);
      if (color === "#ffffff") return;
      pixels[key] = color;
      authors[key] = String(entry.author_name || "").slice(0, 32) || "Artista";
    });

    state.openCanvas.pixels = pixels;
    state.openCanvas.authors = authors;
    state.openCanvas.updatedAt = nowMs();
    pushOpenCanvasHistory("remote_sync", "sync");
  }

  async function bootRemoteState() {
    if (remoteBootPromise) return remoteBootPromise;
    remoteBootPromise = (async () => {
      const client = await getSupabaseClient();
      if (!client) return;
      try {
        await Promise.all([
          loadRemoteProfile(client),
          loadRemoteCreations(client),
          loadRemoteOpenCanvas(client),
          loadRemoteLikes(client),
          loadRemoteEvents(client),
          loadRemoteSystemScreen(client)
        ]);
        await loadRemoteComments(client);
        markRemoteSyncOk("remote");
        if (hadLegacyStoredState) {
          syncProfileRemote().catch(markRemoteSyncError);
          state.creations
            .filter((creation) => creation.author === state.user.name)
            .forEach((creation) => {
              syncCreationRemote(creation, countPixelsInGrid(creation.grid)).catch(markRemoteSyncError);
            });
          hadLegacyStoredState = false;
        }
      } catch (error) {
        markRemoteSyncError(error);
      }
    })();
    return remoteBootPromise;
  }

  async function syncCreationRemote(creation, pixelsUsed) {
    const client = await getSupabaseClient();
    const authorId = readStoredUserId();
    if (!client || !authorId) return;
    const usedPixels = Number.isFinite(pixelsUsed) ? Math.floor(pixelsUsed) : 0;

    const payload = {
      author_id: authorId,
      title: String(creation?.title || "Creación").trim().slice(0, 80),
      grid: encodeGrid(creation?.grid),
      pixels_used: Math.max(0, usedPixels),
      like_count: creation?.likes || 0,
      boost_count: creation?.boosts || 0,
      remix_of: isUuid(creation?.remixOf) ? creation.remixOf : null,
      is_public: true
    };
    if (isUuid(creation?.id)) payload.id = creation.id;

    const { error } = await client.from("creations").upsert(payload, { onConflict: "id" });
    if (error) throw error;
    markRemoteSyncOk("remote");
  }

  async function syncOpenCanvasPixelRemote(x, y, color, authorName) {
    const client = await getSupabaseClient();
    const userId = readStoredUserId();
    if (!client || !userId) return;

    if (normalizeHexColor(color) === "#ffffff") {
      const { error } = await client
        .from("open_canvas_pixels")
        .delete()
        .eq("x", x)
        .eq("y", y)
        .eq("author_id", userId);
      if (error) throw error;
      markRemoteSyncOk("remote");
      return;
    }

    const payload = {
      x,
      y,
      author_id: userId,
      color: normalizeHexColor(color),
      author_name: String(authorName || "Artista").trim().slice(0, 32),
      updated_at: new Date().toISOString()
    };
    const { error } = await client.from("open_canvas_pixels").upsert(payload);
    if (error) throw error;
    markRemoteSyncOk("remote");
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

  function addEvent(text, options = {}) {
    const event = { id: makeId(), text, ts: nowMs() };
    state.events.unshift(event);
    state.events = state.events.slice(0, 80);
    if (options.remote !== false) {
      syncEventRemote(options.type || "system", text, options.payload || {}, options.creationId || null)
        .catch(markRemoteSyncError);
    }
    return event;
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
    addEvent(`${state.user.name} marcó (${x}, ${y}) en Open Canvas.`, {
      type: "paint",
      payload: { x, y, color: safeColor, author: state.user.name }
    });
    syncOpenCanvasPixelRemote(x, y, safeColor, state.user.name).catch(markRemoteSyncError);
    return { ok: true };
  }

  function consumeOpenCanvasCharge() {
    chargeTick();
    if (state.user.charges <= 0) {
      return { ok: false, reason: "no_charges" };
    }

    state.user.charges -= 1;
    state.user.lastChargeAt = nowMs();
    syncProfileRemote().catch(markRemoteSyncError);
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
      title: (payload.title || "Creación").trim().slice(0, 60),
      author: user.name,
      likes: 0,
      boosts: 0,
      comments: [],
      grid: clone(payload.grid),
      remixOf: payload.remixOf || null,
      createdAt: nowMs()
    };

    state.creations.unshift(creation);
    addEvent(`${creation.title} entro al Open Canvas.`, {
      type: payload.remixOf ? "remix" : "publish",
      creationId: creation.id,
      payload: { title: creation.title, author: creation.author }
    });
    syncProfileRemote().catch(markRemoteSyncError);
    syncCreationRemote(creation, pixelsUsed).catch(markRemoteSyncError);
    return { ok: true, creation };
  }

  function likeCreation(id) {
    if (state.likesGiven.includes(id)) return { ok: false, reason: "already" };
    const creation = getCreationById(id);
    if (!creation) return { ok: false, reason: "not_found" };
    creation.likes += 1;
    state.likesGiven.push(id);
    addEvent(`${creation.title} recibio un like.`, {
      type: "like",
      creationId: creation.id,
      payload: { title: creation.title }
    });
    syncLikeRemote(creation.id).catch(markRemoteSyncError);
    return { ok: true };
  }

  function boostCreation(id) {
    const creation = getCreationById(id);
    if (!creation) return { ok: false, reason: "not_found" };
    if (state.user.coins < 5) return { ok: false, reason: "no_coins" };
    state.user.coins -= 5;
    creation.boosts += 1;
    creation.likes += 2;
    addEvent(`${creation.title} subio tendencia por boost.`, {
      type: "boost",
      creationId: creation.id,
      payload: { title: creation.title }
    });
    syncProfileRemote().catch(markRemoteSyncError);
    syncBoostRemote(creation.id).catch(markRemoteSyncError);
    return { ok: true };
  }

  function commentCreation(id, text) {
    const creation = getCreationById(id);
    if (!creation) return { ok: false, reason: "not_found" };
    const value = text.trim();
    if (!value) return { ok: false, reason: "empty" };
    creation.comments.unshift(value.slice(0, 140));
    creation.comments = creation.comments.slice(0, 20);
    addEvent(`Nuevo comentario en ${creation.title}.`, {
      type: "comment",
      creationId: creation.id,
      payload: { title: creation.title }
    });
    syncCommentRemote(creation.id, value).catch(markRemoteSyncError);
    return { ok: true };
  }

  function setRemixSource(id) {
    state.remixSourceId = id;
  }

  function clearRemixSource() {
    state.remixSourceId = null;
  }

  function buyItem(type) {
    const user = state.user;
    let pixelsAmount = 1;
    let coinsSpent = 0;

    const knownTypes = [
      "pixels_50", "pixels_180", "speed_upgrade", "charge_now",
      "palette_neon", "max_charge_plus", "recharge_chip", "artist_box", "editor_grid_plus"
    ];
    if (!knownTypes.includes(type)) return { ok: false, reason: "unknown_item" };

    if (type === "pixels_50") {
      if (user.coins < 20) return { ok: false, reason: "no_coins" };
      user.coins -= 20;
      user.pixelsInventory += 50;
      pixelsAmount = 50;
      coinsSpent = 20;
      addEvent("Compra: Pack Pixeles x50", { type: "shop", payload: { item: type } });
    }

    if (type === "pixels_180") {
      if (user.coins < 65) return { ok: false, reason: "no_coins" };
      user.coins -= 65;
      user.pixelsInventory += 180;
      pixelsAmount = 180;
      coinsSpent = 65;
      addEvent("Compra: Pack Pixeles x180", { type: "shop", payload: { item: type } });
    }

    if (type === "speed_upgrade") {
      if (user.coins < 50) return { ok: false, reason: "no_coins" };
      if (user.rechargeSeconds <= 10) return { ok: false, reason: "min_recharge" };
      user.coins -= 50;
      user.rechargeSeconds = Math.max(10, user.rechargeSeconds - 5);
      pixelsAmount = 1;
      coinsSpent = 50;
      addEvent(`Upgrade recarga: ahora ${user.rechargeSeconds}s`, { type: "shop", payload: { item: type } });
    }

    if (type === "charge_now") {
      if (user.coins < 32) return { ok: false, reason: "no_coins" };
      if (user.charges >= user.maxCharges) return { ok: false, reason: "max_charges" };
      user.coins -= 32;
      user.charges += 1;
      user.lastChargeAt = nowMs();
      pixelsAmount = 1;
      coinsSpent = 32;
      addEvent("Compra: Carga instantanea", { type: "shop", payload: { item: type } });
    }

    if (type === "palette_neon") {
      if (user.coins < 48) return { ok: false, reason: "no_coins" };
      if (user.unlockedPalettes.includes("neon")) return { ok: false, reason: "already_owned" };
      user.coins -= 48;
      user.unlockedPalettes.push("neon");
      pixelsAmount = 1;
      coinsSpent = 48;
      addEvent("Compra: Paleta Neon desbloqueada", { type: "shop", payload: { item: type } });
    }

    if (type === "max_charge_plus") {
      if (user.coins < 70) return { ok: false, reason: "no_coins" };
      if (user.maxCharges >= 10) return { ok: false, reason: "max_cap" };
      user.coins -= 70;
      user.maxCharges += 1;
      user.charges = Math.min(user.maxCharges, user.charges + 1);
      pixelsAmount = 1;
      coinsSpent = 70;
      addEvent(`Upgrade cargas: maximo ${user.maxCharges}`, { type: "shop", payload: { item: type } });
    }

    if (type === "recharge_chip") {
      if (user.coins < 38) return { ok: false, reason: "no_coins" };
      if (user.rechargeSeconds <= 8) return { ok: false, reason: "min_recharge" };
      user.coins -= 38;
      user.rechargeSeconds = Math.max(8, user.rechargeSeconds - 2);
      pixelsAmount = 1;
      coinsSpent = 38;
      addEvent(`Chip recarga: ahora ${user.rechargeSeconds}s`, { type: "shop", payload: { item: type } });
    }

    if (type === "artist_box") {
      if (user.coins < 95) return { ok: false, reason: "no_coins" };
      user.coins -= 95;
      user.pixelsInventory += 260;
      user.charges = Math.min(user.maxCharges, user.charges + 2);
      pixelsAmount = 260;
      coinsSpent = 95;
      addEvent("Compra: Artist Box (260 px + 2 cargas)", { type: "shop", payload: { item: type } });
    }

    if (type === "editor_grid_plus") {
      if (user.coins < 84) return { ok: false, reason: "no_coins" };
      if (user.editorGrid >= 32) return { ok: false, reason: "max_editor_size" };
      user.coins -= 84;
      user.editorGrid = Math.min(32, user.editorGrid + 8);
      pixelsAmount = 1;
      coinsSpent = 84;
      addEvent(`Upgrade editor: ahora ${user.editorGrid}x${user.editorGrid}`, { type: "shop", payload: { item: type } });
    }

    syncProfileRemote().catch(markRemoteSyncError);
    syncShopOrderRemote(type, pixelsAmount, coinsSpent).catch(markRemoteSyncError);
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
    addEvent(`Admin eliminó la obra: ${current.title}.`, {
      type: "admin",
      creationId: current.id,
      payload: { action: "delete_creation", title: current.title }
    });
    syncDeleteCreationRemote(current.id).catch(markRemoteSyncError);
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
    addEvent(`Admin revirtió Open Canvas ${safeSteps} paso(s).`, {
      type: "admin",
      payload: { action: "rollback_canvas", steps: safeSteps }
    });
    syncReplaceOpenCanvasRemote(state.openCanvas.pixels, state.openCanvas.authors).catch(markRemoteSyncError);
    return { ok: true };
  }

  function clearOpenCanvasAdmin() {
    if (!isCurrentUserAdmin()) return { ok: false, reason: "unauthorized" };

    state.openCanvas.pixels = {};
    state.openCanvas.authors = {};
    state.openCanvas.updatedAt = nowMs();
    pushOpenCanvasHistory("clear", state.user.name);
    addEvent("Admin limpió Open Canvas.", {
      type: "admin",
      payload: { action: "clear_canvas" }
    });
    syncReplaceOpenCanvasRemote({}, {}).catch(markRemoteSyncError);
    return { ok: true };
  }

  function clearEventsAdmin() {
    if (!isCurrentUserAdmin()) return { ok: false, reason: "unauthorized" };
    state.events = [];
    addEvent("Admin limpió el feed de eventos.", {
      type: "admin",
      payload: { action: "clear_events" }
    });
    (async () => {
      try {
        const client = await getSupabaseClient();
        if (!client) return;
        const { error } = await client.from("open_canvas_events").delete().gte("created_at", "1970-01-01T00:00:00.000Z");
        if (error) throw error;
        await syncEventRemote("admin", "Admin limpió el feed de eventos.", { action: "clear_events" });
      } catch (error) {
        markRemoteSyncError(error);
      }
    })();
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

    addEvent("Admin ajustó recursos y configuración de cuenta.", {
      type: "admin",
      payload: { action: "tune_profile" }
    });
    syncProfileRemote().catch(markRemoteSyncError);
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
    const after = getStorageStats();
    addEvent("Admin ejecutó compactación de base local de sesión.", {
      type: "admin",
      payload: { action: "compact_memory" }
    });
    return { ok: true, before, after };
  }

  function getSystemScreen() {
    return clone(normalizeSystemScreen(state.systemScreen));
  }

  function setSystemScreenAdmin(payload) {
    if (!isCurrentUserAdmin()) return { ok: false, reason: "unauthorized" };
    const mode = String(payload?.mode || "off").toLowerCase();
    if (!["off", "maintenance", "notice"].includes(mode)) {
      return { ok: false, reason: "invalid_mode" };
    }

    const title = String(payload?.title || "").trim().slice(0, 80);
    const message = String(payload?.message || "").trim().slice(0, 420);
    if (mode !== "off" && !message) return { ok: false, reason: "empty_message" };

    const user = readStoredUser();
    const actor = (user?.email || state.user?.name || "admin").trim().slice(0, 80);

    state.systemScreen = {
      mode,
      title: mode === "off" ? "" : title,
      message: mode === "off" ? "" : message,
      updatedAt: nowMs(),
      updatedBy: actor
    };

    if (mode === "off") {
      addEvent("Admin desactivó la pantalla global.", {
        type: "system",
        payload: { action: "disable_system_screen" }
      });
    } else if (mode === "maintenance") {
      addEvent("Admin activó modo mantenimiento global.", {
        type: "system",
        payload: { action: "maintenance_system_screen" }
      });
    } else {
      addEvent("Admin publicó un aviso global.", {
        type: "system",
        payload: { action: "notice_system_screen" }
      });
    }
    syncSystemScreenRemote(state.systemScreen).catch(markRemoteSyncError);
    return { ok: true, screen: clone(state.systemScreen) };
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
    addEvent(`Cuenta ${key} vinculada en perfil.`, {
      type: "social",
      payload: { provider: key, action: "link" }
    });
    syncProfileRemote().catch(markRemoteSyncError);
    return { ok: true, social: clone(social[key]) };
  }

  function unlinkSocialAccount(provider) {
    const key = String(provider || "").toLowerCase();
    if (!["google", "discord"].includes(key)) return { ok: false, reason: "invalid_provider" };

    const social = normalizeSocialLinks(state.user.socialLinks);
    social[key] = { linked: false, visible: false, handle: "" };
    state.user.socialLinks = social;
    addEvent(`Cuenta ${key} desvinculada en perfil.`, {
      type: "social",
      payload: { provider: key, action: "unlink" }
    });
    syncProfileRemote().catch(markRemoteSyncError);
    return { ok: true };
  }

  function setSocialVisibility(provider, visible) {
    const key = String(provider || "").toLowerCase();
    if (!["google", "discord"].includes(key)) return { ok: false, reason: "invalid_provider" };

    const social = normalizeSocialLinks(state.user.socialLinks);
    if (!social[key].linked) return { ok: false, reason: "not_linked" };

    social[key].visible = Boolean(visible);
    state.user.socialLinks = social;
    syncProfileRemote().catch(markRemoteSyncError);
    return { ok: true, social: clone(social[key]) };
  }

  function setSocialHandle(provider, handle) {
    const key = String(provider || "").toLowerCase();
    if (!["google", "discord"].includes(key)) return { ok: false, reason: "invalid_provider" };
    const social = normalizeSocialLinks(state.user.socialLinks);
    social[key].handle = normalizeHandle(handle);
    state.user.socialLinks = social;
    state.user.socialLinks = social;
    return { ok: true, social: clone(social[key]) };
  }
  }
  function getSocialLinks() {
    syncSocialLinksFromSession();
    syncSocialLinksFromSession();
    return clone(state.user.socialLinks);
  }

  function getRemoteStatus() {
    return {
      enabled: Boolean(remoteStatus.enabled),
      ready: Boolean(remoteStatus.ready),
      source: remoteStatus.source,
      lastSyncAt: remoteStatus.lastSyncAt || 0,
      lastError: remoteStatus.lastError || ""
    };
  }

  function getState() {
    chargeTick();
    state.user.name = getStoredUserName();
    syncSocialLinksFromSession();
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
    getRemoteStatus,
    linkSocialAccount,
    unlinkSocialAccount,
    setSocialVisibility,
    setSocialHandle,
    getSystemScreen,
    setSystemScreenAdmin,
    setRemixSource,
    clearRemixSource,
    getCreationById
  };
})();
