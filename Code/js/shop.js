(function () {
  const ITEMS = window.CanvasApp.ShopCatalog.ITEMS;

  function goToDetail(itemId) {
    document.body.classList.add("shop-to-detail-leaving");
    window.setTimeout(() => {
      window.location.href = `shop-item.html?id=${encodeURIComponent(itemId)}&fx=zoom`;
    }, 170);
  }

  function buy(itemId) {
    const result = window.CanvasApp.Store.buyItem(itemId);
    if (!result.ok) {
      if (result.reason === "no_coins") alert("No tienes monedas suficientes");
      if (result.reason === "min_recharge") alert("Ya tienes la recarga minima permitida");
      if (result.reason === "max_charges") alert("Tus cargas estan al maximo");
      if (result.reason === "already_owned") alert("Ya compraste este item");
      if (result.reason === "max_cap") alert("Ya alcanzaste el tope de cargas maximas");
      if (result.reason === "max_editor_size") alert("Tu editor ya esta en el tamano maximo (32x32)");
    }
    render();
  }

  function render() {
    const root = document.getElementById("shopGrid");
    root.innerHTML = "";

    ITEMS.forEach((item) => {
      const card = document.createElement("article");
      card.className = "glass shop-card reveal";
      card.innerHTML = `
        <div class="shop-head">
          <p class="shop-symbol" aria-hidden="true">${item.icon}</p>
          <span class="shop-logo">${item.logo}</span>
        </div>
        <h2>${item.name}</h2>
        <p>${item.desc}</p>
        <p class="shop-gives-title">Te da:</p>
        <ul class="shop-gives-list">${item.gives.map((line) => `<li>${line}</li>`).join("")}</ul>
        <p class="badge">${item.price} monedas</p>
      `;
      card.addEventListener("click", (event) => {
        if (event.target.closest(".btn")) return;
        goToDetail(item.id);
      });

      const button = document.createElement("button");
      button.className = "btn solid sm";
      button.textContent = "Comprar";
      button.addEventListener("click", () => buy(item.id));

      const details = document.createElement("a");
      details.className = "btn ghost sm";
      details.href = `shop-item.html?id=${encodeURIComponent(item.id)}`;
      details.textContent = "Ver detalle";
      details.addEventListener("click", (event) => {
        event.preventDefault();
        goToDetail(item.id);
      });

      const row = document.createElement("div");
      row.className = "shop-card-actions";
      row.append(button, details);
      card.appendChild(row);
      root.appendChild(card);
    });

    window.CanvasApp.UI.applySequentialMotion(root.parentElement || document);

    requestAnimationFrame(() => {
      document.querySelectorAll(".reveal").forEach((node, i) => {
        node.style.transitionDelay = `${i * 40}ms`;
        node.classList.add("visible");
      });
    });

    window.CanvasApp.UI.updateTopStats();
  }

  function init() {
    window.CanvasApp.UI.initCommon();
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
