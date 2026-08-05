(() => {
  "use strict";

  const POINT_COUNT = 512 * 512;
  const REDUCED_TIME = 9.625;
  const TRANSITION_SECONDS = 0.72;
  const HYPER_FAMILIES = [
    "Hopf Fibration", "Clifford Manifold", "Tesseract Section", "Calabi Fold",
    "Quaternion Orbit", "Brane Weave", "Klein Morph", "Gyroid Projection",
    "Hypersphere Slice", "String Compactification"
  ];
  const SELECTED_FAMILIES = [
    "Shock Ridge", "Nested Hypersphere", "Pentachoron Drift", "Brane Fold",
    "Manifold Nest", "Klein Projection", "Seven-Lobed Colony"
  ];
  const FEATURED_STUDIES = Array.from({ length: 170 }, (_, index) => 72 + index);

  function studyMeta(study) {
    const reviewIndex = study - 72;
    const familyIndex = Math.floor(reviewIndex / 10);
    const variant = reviewIndex % 10 + 1;
    const selectedIndex = familyIndex - HYPER_FAMILIES.length;
    const name = selectedIndex >= 0 ? SELECTED_FAMILIES[selectedIndex] : HYPER_FAMILIES[familyIndex];
    const family = selectedIndex === 0
      ? "volatility terrain study"
      : selectedIndex === 6 ? "amorphous growth" : "hyperdimensional study";
    return { name: `${name} ${String(variant).padStart(2, "0")}`, family };
  }

  function start() {
    const canvas = document.querySelector("#museum-field");
    const label = document.querySelector("[data-field-label]");
    const sections = Array.from(document.querySelectorAll("[data-field-state]"));
    if (!canvas || typeof window.createMuseumStudyRenderer !== "function") return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const requested = Number.parseInt(new URLSearchParams(window.location.search).get("study"), 10);
    const lockedStudy = FEATURED_STUDIES.includes(requested) ? requested : null;
    let activeStudy = lockedStudy ?? randomStudy();
    let fromStudy = activeStudy;
    let activeSection = -1;
    let transitionStart = performance.now() * 0.001;
    let frame = 0;
    let lastDraw = -Infinity;
    let pageVisible = !document.hidden;
    let pointer = [0, 0, 0];
    let pointerTarget = [0, 0, 0];
    const renderer = window.createMuseumStudyRenderer(canvas, POINT_COUNT, {
      displayScale: 1.4,
      densityScale: 1.8,
      shockDensityScale: 0.6,
      shockDisplayScale: 0.6
    });
    if (!renderer) return;

    function randomStudy() {
      return FEATURED_STUDIES[Math.floor(Math.random() * FEATURED_STUDIES.length)];
    }

    function nextRandomStudy() {
      if (lockedStudy !== null) return lockedStudy;
      let next = randomStudy();
      while (next === activeStudy && FEATURED_STUDIES.length > 1) next = randomStudy();
      return next;
    }

    function updateLabel() {
      if (!label) return;
      const study = studyMeta(activeStudy);
      label.textContent = study.name;
    }

    function selectStudy(study) {
      if (study === activeStudy) return;
      fromStudy = activeStudy;
      activeStudy = study;
      transitionStart = performance.now() * 0.001;
      updateLabel();
      requestRender();
    }

    function selectForSection(section) {
      if (section === activeSection) return;
      activeSection = section;
      selectStudy(nextRandomStudy());
    }

    function requestRender() {
      if (!frame && pageVisible) frame = requestAnimationFrame(tick);
    }

    function tick(now) {
      frame = 0;
      if (!pageVisible) return;
      const reduced = motionQuery.matches;
      const seconds = reduced ? REDUCED_TIME : now * 0.001;
      const transition = reduced ? 1 : Math.min(1, Math.max(0, (seconds - transitionStart) / TRANSITION_SECONDS));
      if (reduced) {
        fromStudy = activeStudy;
        pointer = [0, 0, 0];
      } else {
        pointer[0] += (pointerTarget[0] - pointer[0]) * 0.14;
        pointer[1] += (pointerTarget[1] - pointer[1]) * 0.14;
        pointer[2] += (pointerTarget[2] - pointer[2]) * 0.09;
      }
      if (reduced || now - lastDraw > 30 || transition < 1) {
        renderer.render(seconds, fromStudy, activeStudy, transition, pointer);
        lastDraw = now;
      }
      if (!reduced || transition < 1) requestRender();
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      selectForSection(Number(visible.target.dataset.fieldState) || 0);
    }, { threshold: [0.2, 0.42, 0.68], rootMargin: "-12% 0px -22% 0px" });
    sections.forEach((section) => observer.observe(section));

    window.addEventListener("pointermove", (event) => {
      if (motionQuery.matches) return;
      const rect = canvas.getBoundingClientRect();
      pointerTarget[0] = (event.clientX - rect.left) / rect.width * 2 - 1;
      pointerTarget[1] = 1 - (event.clientY - rect.top) / rect.height * 2;
      pointerTarget[2] = event.clientX >= rect.left && event.clientX <= rect.right
        && event.clientY >= rect.top && event.clientY <= rect.bottom ? 1 : 0;
      requestRender();
    }, { passive: true });
    window.addEventListener("pointerout", () => { pointerTarget[2] = 0; }, { passive: true });
    window.addEventListener("resize", requestRender, { passive: true });
    document.addEventListener("visibilitychange", () => {
      pageVisible = !document.hidden;
      if (pageVisible) requestRender();
    });
    motionQuery.addEventListener("change", requestRender);

    updateLabel();
    requestRender();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
