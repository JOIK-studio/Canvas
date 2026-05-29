(function () {
  function renderHomeStats() {
    const state = window.CanvasApp.Store.getState();
    const recharge = document.getElementById("rechargeStat");
    const next = document.getElementById("nextChargeStat");
    const count = document.getElementById("creationCountStat");
    if (recharge) recharge.textContent = `${state.user.rechargeSeconds}s`;
    if (next) next.textContent = `${window.CanvasApp.Store.getCooldownSeconds()}s`;
    if (count) count.textContent = `${state.creations.length}`;
  }

  function init() {
    window.CanvasApp.UI.initCommon();
    document.body.classList.add("app-loaded");
    renderHomeStats();
    window.CanvasApp.UI.applySequentialMotion();
    setInterval(renderHomeStats, 1000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
