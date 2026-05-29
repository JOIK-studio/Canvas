(function () {
  function reasonLabel(reason) {
    if (reason === "no_coins") return "No tienes monedas suficientes.";
    if (reason === "min_recharge") return "Ya tienes la recarga minima permitida.";
    if (reason === "max_charges") return "Tus cargas estan al maximo.";
    if (reason === "already_owned") return "Ya compraste este item.";
    if (reason === "max_cap") return "Ya alcanzaste el tope de cargas maximas.";
    if (reason === "max_editor_size") return "Tu editor ya esta en el tamano maximo (32x32).";
    if (reason === "invalid_item") return "Este item ya no esta disponible.";
    return "No se pudo completar la compra.";
  }

  function readItemId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || "";
  }

  function buy(itemId) {
    const result = window.CanvasApp.Store.buyItem(itemId);
    const status = document.getElementById("shopDetailStatus");

    if (!status) return;

    if (!result.ok) {
      status.textContent = reasonLabel(result.reason);
      status.className = "shop-detail-status bad";
      window.CanvasApp.UI.updateTopStats();
      return;
    }

    status.textContent = "Compra realizada correctamente.";
    status.className = "shop-detail-status ok";
    window.CanvasApp.UI.updateTopStats();
  }

  function renderNotFound() {
    const root = document.getElementById("shopDetailShell");
    if (!root) return;
    root.innerHTML = `
      <p class="section-kicker">Tienda</p>
      <h1>Articulo no encontrado</h1>
      <p class="lead mini">No existe ese item o el enlace no es valido.</p>
      <a class="btn ghost" href="shop.html">Volver a tienda</a>
    `;
  }

  function render(item) {
    const root = document.getElementById("shopDetailShell");
    if (!root) return;

    root.innerHTML = `
      <div class="shop-detail-grid">
        <article class="glass shop-detail-media reveal">
          <div class="shop-detail-logo-wrap">
            <span class="shop-logo big">${item.logo}</span>
            <p class="shop-symbol big" aria-hidden="true">${item.icon}</p>
            <div class="shop-item-preview" aria-hidden="true">
              <span class="sip-cell c1"></span>
              <span class="sip-cell c2"></span>
              <span class="sip-cell c3"></span>
              <span class="sip-cell c4"></span>
              <span class="sip-cell c5"></span>
              <span class="sip-cell c6"></span>
              <span class="sip-glow"></span>
            </div>
          </div>
          <div class="shop-detail-badge">${item.price} monedas</div>
        </article>

        <article class="glass shop-detail-copy reveal">
          <p class="section-kicker">Detalle de compra</p>
          <h1>${item.name}</h1>
          <p class="lead mini">${item.desc}</p>
          <p class="shop-gives-title">Incluye:</p>
          <ul class="shop-gives-list">${item.gives.map((line) => `<li>${line}</li>`).join("")}</ul>
          <p id="shopDetailStatus" class="shop-detail-status">Listo para comprar.</p>
          <div class="shop-card-actions">
            <button id="shopDetailBuy" class="btn solid">Comprar ahora</button>
            <a class="btn ghost" href="shop.html">Volver a tienda</a>
          </div>
        </article>
      </div>
    `;

    document.getElementById("shopDetailBuy")?.addEventListener("click", () => buy(item.id));

    window.CanvasApp.UI.applySequentialMotion(root);
    requestAnimationFrame(() => {
      root.querySelectorAll(".reveal").forEach((node, i) => {
        node.style.transitionDelay = `${i * 70}ms`;
        node.classList.add("visible");
      });
    });
  }

  function bindBackTransition() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest('a[href="shop.html"]');
      if (!link) return;
      event.preventDefault();
      document.body.classList.add("detail-to-shop-leaving");
      window.setTimeout(() => {
        window.location.href = "shop.html";
      }, 180);
    });
  }

  function applyEnterFx() {
    if (sessionStorage.getItem("canvas_shop_detail_fx") !== "zoom") return;
    sessionStorage.removeItem("canvas_shop_detail_fx");
    document.body.classList.add("shop-detail-entering");
    requestAnimationFrame(() => {
      document.body.classList.add("shop-detail-entered");
    });
    window.setTimeout(() => {
      document.body.classList.remove("shop-detail-entering", "shop-detail-entered");
    }, 440);
  }

  function init() {
    window.CanvasApp.UI.initCommon();
    applyEnterFx();
    bindBackTransition();
    const id = readItemId();
    const item = window.CanvasApp.ShopCatalog.getById(id);
    if (!item) {
      renderNotFound();
      return;
    }
    render(item);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
