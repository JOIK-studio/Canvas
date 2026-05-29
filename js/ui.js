(function () {
  const THEME_KEY = "canvas_theme";

  function getTheme() {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    const nextTheme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(THEME_KEY, nextTheme);

    const chip = document.getElementById("themeToggleChip");
    if (chip) chip.textContent = nextTheme === "light" ? "Claro" : "Oscuro";

    const headerLabel = document.getElementById("headerThemeLabel");
    if (headerLabel) headerLabel.textContent = nextTheme === "light" ? "Claro" : "Oscuro";
  }

  function toggleTheme() {
    applyTheme(getTheme() === "light" ? "dark" : "light");
  }

  function ensureTopStatValue(id) {
    const stat = document.getElementById(id);
    if (!stat) return null;

    let valueNode = stat.querySelector(".topstat-value");
    if (valueNode) return valueNode;

    valueNode = document.createElement("strong");
    valueNode.className = "topstat-value";

    const text = Array.from(stat.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(" ")
      .trim();

    Array.from(stat.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .forEach((node) => stat.removeChild(node));

    valueNode.textContent = text;
    stat.appendChild(valueNode);
    return valueNode;
  }

  function replaceBrandLogos() {
    document.querySelectorAll(".brand").forEach((brand) => {
      const existing = brand.querySelector("img.brand-logo");
      if (existing) return;

      const svg = brand.querySelector("svg");
      if (!svg) return;

      const img = document.createElement("img");
      img.src = "images/logo.svg";
      img.alt = "Canvas";
      img.className = "brand-logo";
      svg.replaceWith(img);
    });

    if (document.body.dataset.page !== "landing") {
      document.querySelectorAll('.brand[href="index.html"]').forEach((brand) => {
        brand.setAttribute("href", "app.html");
      });
    }
  }

  function normalizeProfileLinks() {
    document.querySelectorAll('.dropdown-item[href="#profile"]').forEach((link) => {
      link.setAttribute("href", "profile.html");
    });
  }

  function ensureSettingsLinks() {
    document.querySelectorAll("#userDropdown").forEach((menu) => {
      if (menu.querySelector('a[href="ajustes.html"]')) return;

      const logoutButton = menu.querySelector("button.dropdown-item");
      const link = document.createElement("a");
      link.href = "ajustes.html";
      link.className = "dropdown-item";
      link.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        Ajustes
      `;

      if (logoutButton) {
        menu.insertBefore(link, logoutButton);
      } else {
        menu.appendChild(link);
      }
    });
  }

  function ensureAdminTab() {
    if (!window.CanvasApp?.Store?.isCurrentUserAdmin) return;
    if (!window.CanvasApp.Store.isCurrentUserAdmin()) return;

    const nav = document.querySelector(".topnav");
    if (!nav || nav.querySelector('[href="admin.html"]')) return;

    const anchor = document.createElement("a");
    anchor.href = "admin.html";
    if (document.body.dataset.page === "admin") {
      anchor.classList.add("active");
    }
    anchor.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      Admin
    `;
    nav.appendChild(anchor);
  }

  function initThemeControl() {
    const headerRight = document.querySelector(".header-right");
    const dropdown = document.getElementById("userDropdown");
    if (headerRight && !document.getElementById("headerThemeToggle")) {
      const headerButton = document.createElement("button");
      headerButton.type = "button";
      headerButton.id = "headerThemeToggle";
      headerButton.className = "user-btn theme-switch";
      headerButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3c0 .28 0 .57.02.85A7 7 0 0 0 20.15 12c.28.02.57.02.85.79Z" />
        </svg>
        <span id="headerThemeLabel" class="theme-switch-label"></span>
      `;
      headerButton.addEventListener("click", toggleTheme);
      headerRight.insertBefore(headerButton, document.querySelector(".user-menu") || null);
    }

    if (!dropdown) {
      applyTheme(getTheme());
      return;
    }

    if (document.getElementById("themeToggleItem")) {
      applyTheme(getTheme());
      return;
    }

    const logoutButton = dropdown.querySelector("button.dropdown-item");
    const button = document.createElement("button");
    button.type = "button";
    button.id = "themeToggleItem";
    button.className = "dropdown-item theme-toggle-item";
    button.innerHTML = `
      <span class="theme-toggle-meta">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm0 15a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zm9-6a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zM6 12a1 1 0 0 1-1 1H4a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zm11.95-5.536a1 1 0 0 1 0 1.414l-.707.708a1 1 0 0 1-1.414-1.415l.707-.707a1 1 0 0 1 1.414 0zM8.172 15.828a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.415-1.414l.708-.707a1 1 0 0 1 1.414 0zm9.071 2.121a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 1 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414zM8.172 8.172a1 1 0 0 1-1.414 0L6.05 7.465A1 1 0 1 1 7.465 6.05l.707.708a1 1 0 0 1 0 1.414z" />
          <circle cx="12" cy="12" r="4" />
        </svg>
        Tema
      </span>
      <span id="themeToggleChip" class="theme-toggle-chip"></span>
    `;
    button.addEventListener("click", toggleTheme);

    if (logoutButton) {
      dropdown.insertBefore(button, logoutButton);
    } else {
      dropdown.appendChild(button);
    }

    applyTheme(getTheme());
  }

  function updateTopStats() {
    if (!window.CanvasApp?.Store?.getState) return;
    const state = window.CanvasApp.Store.getState();
    const coins = ensureTopStatValue("coinsStat");
    const pixels = ensureTopStatValue("pixelsStat");
    const charges = ensureTopStatValue("chargesStat");
    if (coins) coins.textContent = `${state.user.coins}`;
    if (pixels) pixels.textContent = `${state.user.pixelsInventory} px`;
    if (charges) charges.textContent = `${state.user.charges} cargas`;
  }

  function initReveal() {
    const targets = document.querySelectorAll(".reveal");
    if (!targets.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    targets.forEach((target, i) => {
      target.style.transitionDelay = `${i * 60}ms`;
      observer.observe(target);
    });
  }

  function applySequentialMotion(root = document) {
    const selectors = [
      ".cta-row",
      ".dashboard-grid",
      ".gallery-grid",
      ".shop-grid",
      ".shortcuts-grid",
      ".metric-grid",
      ".landing-meta",
      ".landing-feature-grid",
      ".landing-stat-grid",
      ".profile-actions",
      ".toolbar",
      ".publish-row",
      ".kv-grid",
      ".hero-grid",
      ".activity-list",
      ".feed"
    ];

    selectors.forEach((selector) => {
      root.querySelectorAll(selector).forEach((container) => {
        Array.from(container.children).forEach((child, index) => {
          child.classList.add("seq-item");
          child.style.setProperty("--seq-delay", `${index * 70}ms`);
        });
      });
    });
  }

  function routeByKey(key) {
    const map = {
      g: document.body.dataset.page === "landing" ? "index.html" : "app.html",
      e: "create.html",
      l: "gallery.html",
      s: "shop.html",
      o: "open-canvas.html",
      h: "shortcuts.html",
      a: "admin.html"
    };
    return map[key];
  }

  function initGlobalShortcuts() {
    document.addEventListener("keydown", (event) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
      const target = routeByKey(event.key.toLowerCase());
      if (!target) return;
      if (location.pathname.endsWith(target)) return;
      window.location.href = target;
    });
  }

  function initPageTransitions() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link) return;

      const href = link.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target && link.target !== "_self") return;

      const current = location.pathname.split("/").pop();
      const next = href.split("/").pop();
      if (current === next) return;

      event.preventDefault();
      document.body.classList.add("page-leaving");
      window.setTimeout(() => {
        window.location.href = href;
      }, 170);
    });
  }

  function initCommon() {
    replaceBrandLogos();
    normalizeProfileLinks();
    ensureSettingsLinks();
    ensureAdminTab();
    initThemeControl();
    updateTopStats();
    initReveal();
    applySequentialMotion();
    initGlobalShortcuts();
    initPageTransitions();
    if (window.CanvasApp?.Store?.getState) {
      setInterval(updateTopStats, 1000);
    }
  }

  window.CanvasApp = window.CanvasApp || {};
  window.CanvasApp.UI = {
    initCommon,
    updateTopStats,
    applySequentialMotion,
    applyTheme,
    getTheme,
    toggleTheme
  };
})();
