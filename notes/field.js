(() => {
  "use strict";

  if (typeof window.createMuseumStudyRenderer !== "function") return;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const refreshMs = Number.parseInt(document.body.dataset.refresh || "0", 10);
  const items = [...document.querySelectorAll("[data-drift]")].map((canvas) => {
    const study = Number.parseInt(canvas.dataset.drift || "144", 10);
    return {
      canvas,
      study,
      fromStudy: study,
      toStudy: study,
      transitionStart: 0,
      renderer: window.createMuseumStudyRenderer(canvas, 512 * 512, {
        displayScale: 1.15,
        densityScale: 1.35,
        shockDensityScale: 0.6,
        shockDisplayScale: 0.6
      }),
      pointer: [0, 0, 0],
      target: [0, 0, 0],
      visible: canvas.id === "note-field"
    };
  }).filter((item) => item.renderer);

  if (!items.length) return;

  let frame = 0;
  let observer;

  function draw(now) {
    frame = 0;
    let visible = false;
    items.forEach((item) => {
      if (!item.visible) return;
      visible = true;
      item.pointer[0] += (item.target[0] - item.pointer[0]) * 0.08;
      item.pointer[1] += (item.target[1] - item.pointer[1]) * 0.08;
      item.pointer[2] += (item.target[2] - item.pointer[2]) * 0.08;
      const progress = item.transitionStart
        ? Math.min(1, (now - item.transitionStart) / 900)
        : 1;
      if (progress === 1) item.study = item.toStudy;
      const ease = progress * progress * (3 - 2 * progress);
      item.renderer.render(motion.matches ? 14 : now * 0.001, item.fromStudy, item.toStudy, ease, item.pointer);
    });
    if (visible && !motion.matches && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function requestDraw() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
  }

  items.forEach((item) => {
    item.canvas.addEventListener("pointermove", (event) => {
      const rect = item.canvas.getBoundingClientRect();
      item.target = [
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (1 - (event.clientY - rect.top) / rect.height) * 2 - 1,
        1
      ];
      requestDraw();
    }, { passive: true });
    item.canvas.addEventListener("pointerleave", () => { item.target[2] = 0; }, { passive: true });
  });

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const item = items.find((candidate) => candidate.canvas === entry.target);
        if (item) item.visible = entry.isIntersecting;
      });
      requestDraw();
    }, { threshold: 0.01 });
    items.filter((item) => item.canvas.id !== "note-field").forEach((item) => observer.observe(item.canvas));
  }

  motion.addEventListener("change", requestDraw);
  document.addEventListener("visibilitychange", requestDraw);

  if (refreshMs > 0) {
    window.setInterval(() => {
      if (document.hidden) return;
      items.forEach((item) => {
        const next = 72 + Math.floor(Math.random() * 170);
        item.fromStudy = item.study;
        item.toStudy = next === item.study ? (next + 1) : next;
        item.transitionStart = motion.matches ? 0 : performance.now();
        if (motion.matches) item.study = item.toStudy;
      });
      requestDraw();
    }, refreshMs);
  }

  requestDraw();
})();
