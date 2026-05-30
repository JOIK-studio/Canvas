(function () {

  function normalize(value) {
    return String(value || "").trim();
  }

  function hasValid(url, key) {
    if (!url || !key) return false;
    if (url.includes("your-project") || key.includes("your-public-key") || key.includes("your-anon-key")) {
      return false;
    }
    try {
      const parsed = new URL(url);
      return /^https?:$/.test(parsed.protocol);
    } catch {
      return false;
    }
  }

  function read() {
    const fromWindow = window.CANVAS_SUPABASE_CONFIG || {};
    const urlMeta = document.querySelector('meta[name="supabase-url"]');
    const keyMeta = document.querySelector('meta[name="supabase-key"]');
    const url = normalize(
      window.CANVAS_SUPABASE_URL ||
      fromWindow.url ||
      urlMeta?.content ||
      ""
    );
    const key = normalize(
      window.CANVAS_SUPABASE_KEY ||
      fromWindow.key ||
      keyMeta?.content ||
      ""
    );

    return { url, key, valid: hasValid(url, key) };
  }

  function save(url, key) {
    const nextUrl = normalize(url);
    const nextKey = normalize(key);

    window.CANVAS_SUPABASE_URL = nextUrl;
    window.CANVAS_SUPABASE_KEY = nextKey;

    return { url: nextUrl, key: nextKey, valid: hasValid(nextUrl, nextKey) };
  }

  const current = read();
  if (current.url) window.CANVAS_SUPABASE_URL = current.url;
  if (current.key) window.CANVAS_SUPABASE_KEY = current.key;

  window.CanvasApp = window.CanvasApp || {};
  window.CanvasApp.SupabaseConfig = {
    read,
    save,
    hasValid
  };
})();
