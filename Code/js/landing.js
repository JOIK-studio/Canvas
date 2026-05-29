(function () {
  function setupReveal() {
    const items = Array.from(document.querySelectorAll(".reveal"));
    if (!items.length) return;

    items.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index * 40, 260)}ms`;
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15 });

    items.forEach((item) => io.observe(item));
  }

  function setupFaq() {
    const items = Array.from(document.querySelectorAll(".faq-item"));
    if (!items.length) return;

    items.forEach((item) => {
      const button = item.querySelector(".faq-question");
      if (!button) return;

      button.addEventListener("click", () => {
        const open = item.classList.contains("is-open");
        items.forEach((entry) => {
          entry.classList.remove("is-open");
          const q = entry.querySelector(".faq-question");
          if (q) q.setAttribute("aria-expanded", "false");
        });

        if (!open) {
          item.classList.add("is-open");
          button.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  function animateEconomyCounters() {
    const numbers = Array.from(document.querySelectorAll(".economy-number[data-target]"));
    if (!numbers.length) return;

    const format = new Intl.NumberFormat("es-ES");
    let done = false;

    const run = () => {
      if (done) return;
      done = true;
      const start = performance.now();
      const duration = 1200;

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        numbers.forEach((node) => {
          const target = Number(node.dataset.target || 0);
          const current = Math.round(target * eased);
          node.textContent = format.format(current);
        });

        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
    };

    const trigger = document.getElementById("economy") || numbers[0];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run();
        io.disconnect();
      });
    }, { threshold: 0.2 });
    io.observe(trigger);
  }

  function init() {
    const user = localStorage.getItem("canvas_user");
    if (user) {
      window.location.replace("app.html");
      return;
    }

    if (window.CanvasApp?.UI) {
      window.CanvasApp.UI.initCommon();
    }

    setupReveal();
    setupFaq();
    animateEconomyCounters();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
