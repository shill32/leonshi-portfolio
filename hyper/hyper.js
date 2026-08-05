(() => {
  "use strict";

  const POINT_COUNT = 512 * 512;
  const REDUCED_TIME = 9.625;
  const HYPER_FAMILIES = [
    "Hopf Fibration", "Clifford Manifold", "Tesseract Section", "Calabi Fold",
    "Quaternion Orbit", "Brane Weave", "Klein Morph", "Gyroid Projection",
    "Hypersphere Slice", "String Compactification"
  ];
  const SELECTED_FAMILIES = [
    "Shock Ridge", "Nested Hypersphere", "Pentachoron Drift", "Brane Fold",
    "Manifold Nest", "Klein Projection", "Seven-Lobed Colony"
  ];
  const STUDIES = [...HYPER_FAMILIES, ...SELECTED_FAMILIES].flatMap((family) =>
    Array.from({ length: 10 }, (_, index) => `${family} ${String(index + 1).padStart(2, "0")}`)
  );

  function start() {
    const canvas = document.querySelector("#field");
    const controls = document.querySelector("#controls");
    const number = document.querySelector("#number");
    const name = document.querySelector("#name");
    const family = document.querySelector("#family");
    const previous = document.querySelector("#previous");
    const next = document.querySelector("#next");
    const copy = document.querySelector("#copy");
    const fallback = document.querySelector("#fallback");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const renderer = window.createMuseumStudyRenderer?.(canvas, POINT_COUNT);
    if (!renderer) { fallback.hidden = false; return; }

    const query = Number.parseInt(new URLSearchParams(location.search).get("study"), 10);
    let active = Number.isFinite(query) ? Math.max(0, Math.min(STUDIES.length - 1, query)) : 0;
    let from = active;
    let transitionStart = performance.now() * 0.001;
    let frame = 0;
    let pointer = [0, 0, 0];
    let pointerTarget = [0, 0, 0];

    STUDIES.forEach((_, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(index + 1).padStart(3, "0");
      button.dataset.study = index;
      button.setAttribute("aria-label", STUDIES[index]);
      button.addEventListener("click", () => select(index));
      controls.append(button);
    });

    function update() {
      number.textContent = `Study ${String(active + 1).padStart(3, "0")} / ${STUDIES.length}`;
      name.textContent = STUDIES[active];
      family.textContent = active < 100 ? "Hyperdimensional forms" : "Selected museum variations";
      document.title = `${STUDIES[active]} — Hyperdimensional Field Index`;
      controls.querySelectorAll("button").forEach((button) =>
        button.setAttribute("aria-current", Number(button.dataset.study) === active ? "true" : "false")
      );
      requestAnimationFrame(() => {
        const button = controls.querySelector('button[aria-current="true"]');
        const panel = controls.parentElement;
        if (!button || panel.scrollHeight <= panel.clientHeight) return;
        const panelRect = panel.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        if (buttonRect.top < panelRect.top || buttonRect.bottom > panelRect.bottom) {
          panel.scrollTop += buttonRect.top - panelRect.top - panel.clientHeight * 0.42;
        }
      });
    }

    function select(index, push = true) {
      const nextIndex = (index + STUDIES.length) % STUDIES.length;
      if (nextIndex === active) return;
      from = active;
      active = nextIndex;
      transitionStart = performance.now() * 0.001;
      if (push) history.pushState({ study: active }, "", `?study=${active}`);
      update();
      requestRender();
    }

    function requestRender() { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); }
    function tick(now) {
      frame = 0;
      const reduced = motionQuery.matches;
      const seconds = reduced ? REDUCED_TIME : now * 0.001;
      const transition = reduced ? 1 : Math.min(1, (seconds - transitionStart) / 0.72);
      if (reduced) { from = active; pointer = [0, 0, 0]; }
      else {
        pointer[0] += (pointerTarget[0] - pointer[0]) * 0.14;
        pointer[1] += (pointerTarget[1] - pointer[1]) * 0.14;
        pointer[2] += (pointerTarget[2] - pointer[2]) * 0.09;
      }
      renderer.render(seconds, 72 + from, 72 + active, transition, pointer);
      if (!reduced || transition < 1) requestRender();
    }

    previous.addEventListener("click", () => select(active - 1));
    next.addEventListener("click", () => select(active + 1));
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(location.href);
      copy.textContent = "Copied";
      setTimeout(() => { copy.textContent = "Copy URL"; }, 900);
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") select(active - 1);
      if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); select(active + 1); }
    });
    window.addEventListener("popstate", () => {
      const value = Number.parseInt(new URLSearchParams(location.search).get("study"), 10);
      select(Number.isFinite(value) ? value : 0, false);
    });
    window.addEventListener("pointermove", (event) => {
      pointerTarget = [event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2, 1];
      requestRender();
    }, { passive: true });
    window.addEventListener("pointerout", () => { pointerTarget[2] = 0; }, { passive: true });
    window.addEventListener("resize", requestRender, { passive: true });
    document.addEventListener("visibilitychange", requestRender);
    motionQuery.addEventListener("change", requestRender);

    update();
    requestRender();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
