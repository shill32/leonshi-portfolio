(() => {
  "use strict";

  const POINT_COUNT = 512 * 512;
  const REDUCED_TIME = 9.625;
  const TRANSITION_SECONDS = 0.72;
  const STUDIES = [
    ["Bilateral Bloom", "Amorphous growth"],
    ["Quadrant Organism", "Amorphous growth"],
    ["Seven-Lobed Colony", "Amorphous growth"],
    ["Branching Seed", "Amorphous growth"],
    ["Double Helix", "Molecular structures"],
    ["Triple Helix", "Molecular structures"],
    ["Ladder Braid", "Molecular structures"],
    ["Molecular Chain", "Molecular structures"],
    ["Clifford Torus", "Hyperdimensional forms"],
    ["Tesseract Projection", "Hyperdimensional forms"],
    ["String Bundle", "Hyperdimensional forms"],
    ["Nested Hypersphere", "Hyperdimensional forms"],
    ["Rising Wings", "Ascending birds"],
    ["Swallow Ascent", "Ascending birds"],
    ["Flock Convergence", "Ascending birds"],
    ["Phoenix Fan", "Ascending birds"],
    ["Concentric Interference", "Top-down waves"],
    ["Cross Swell", "Top-down waves"],
    ["Vortex Ripple", "Top-down waves"],
    ["Caustic Tide", "Top-down waves"],
    ["Classic Smile", "Volatility terrains"],
    ["Skewed Saddle", "Volatility terrains"],
    ["Regime Peaks", "Volatility terrains"],
    ["Shock Ridge", "Volatility terrains"],
    ["Stretching Cell", "Amorphous growth"],
    ["Budding Pair", "Amorphous growth"],
    ["Branching Hyphae", "Amorphous growth"],
    ["Inflating Vesicle", "Amorphous growth"],
    ["Dividing Amoeba", "Amorphous growth"],
    ["Coral Reach", "Amorphous growth"],
    ["Drifting Spore", "Amorphous growth"],
    ["Uneven Colony", "Amorphous growth"],
    ["Digital DNA", "Molecular structures"],
    ["Paired Coils", "Molecular structures"],
    ["Base-Pair Ladder", "Molecular structures"],
    ["Stacked Nucleosomes", "Molecular structures"],
    ["Trefoil Molecule", "Molecular structures"],
    ["Coil Spool", "Molecular structures"],
    ["Chain Weave", "Molecular structures"],
    ["Base Cascade", "Molecular structures"],
    ["Pentachoron Drift", "Hyperdimensional forms"],
    ["Five-Axis Lattice", "Hyperdimensional forms"],
    ["Brane Fold", "Hyperdimensional forms"],
    ["Manifold Nest", "Hyperdimensional forms"],
    ["Rotating Cell", "Hyperdimensional forms"],
    ["String Loom", "Hyperdimensional forms"],
    ["Klein Projection", "Hyperdimensional forms"],
    ["Lattice Bloom", "Hyperdimensional forms"],
    ["Kitewing Rise", "Ascending birds"],
    ["Unfolding Gull", "Ascending birds"],
    ["Climbing Murmuration", "Ascending birds"],
    ["Dive and Return", "Ascending birds"],
    ["Spiral Flock", "Ascending birds"],
    ["Twin Swallows", "Ascending birds"],
    ["Thermal Riders", "Ascending birds"],
    ["Dawn Ascent", "Ascending birds"],
    ["Parallel Swells", "Top-down waves"],
    ["Rain Rings", "Top-down waves"],
    ["Shoreless Ripples", "Top-down waves"],
    ["Crossing Wavelets", "Top-down waves"],
    ["Current Bands", "Top-down waves"],
    ["Drifting Rings", "Top-down waves"],
    ["Quiet Interference", "Top-down waves"],
    ["Long Tide Lines", "Top-down waves"],
    ["Rolling Smile", "Volatility terrains"],
    ["Twin Peaks", "Volatility terrains"],
    ["Central Basin", "Volatility terrains"],
    ["Ridge and Valley", "Volatility terrains"],
    ["Skewed Trough", "Volatility terrains"],
    ["Three-Hill Surface", "Volatility terrains"],
    ["Sinuous Ridge", "Volatility terrains"],
    ["Calm Regime", "Volatility terrains"]
  ];
  const HYPER_ARCHIVE_FAMILIES = [
    "Hopf Fibration", "Clifford Manifold", "Tesseract Section", "Calabi Fold",
    "Quaternion Orbit", "Brane Weave", "Klein Morph", "Gyroid Projection",
    "Hypersphere Slice", "String Compactification"
  ];
  HYPER_ARCHIVE_FAMILIES.forEach((name) => {
    for (let variant = 1; variant <= 10; variant += 1) {
      STUDIES.push([`${name} ${String(variant).padStart(2, "0")}`, "Hyperdimensional forms"]);
    }
  });
  const FAMILY_NAMES = [
    "Amorphous", "Molecular", "Hyperdimensional", "Bird ascent", "Waves", "Volatility"
  ];
  const FAMILY_STUDIES = FAMILY_NAMES.map((_, family) => [
    family * 4, family * 4 + 1, family * 4 + 2, family * 4 + 3,
    ...Array.from({ length: 8 }, (__, offset) => 24 + family * 8 + offset),
    ...(family === 2 ? Array.from({ length: 100 }, (__, offset) => 72 + offset) : [])
  ]);

  const canvas = document.querySelector("#field");
  const fallback = document.querySelector("#fallback");
  const numberLabel = document.querySelector("#study-number");
  const nameLabel = document.querySelector("#study-name");
  const familyLabel = document.querySelector("#study-family");
  const controls = document.querySelector("#study-index");
  const previous = document.querySelector("#previous");
  const next = document.querySelector("#next");
  const copy = document.querySelector("#copy");
  const index = document.querySelector(".index");
  const indexToggle = document.querySelector("#index-toggle");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let active = readStudy();
  let fromStudy = active;
  let transitionStart = performance.now() * 0.001;
  let frame = 0;
  let lastDraw = -Infinity;
  let pointer = [0, 0, 0];
  let pointerTarget = [0, 0, 0];
  let renderer;

  function readStudy() {
    const value = Number.parseInt(new URLSearchParams(window.location.search).get("study"), 10);
    return Number.isFinite(value) ? Math.max(0, Math.min(STUDIES.length - 1, value)) : 0;
  }

  function buildControls() {
    FAMILY_NAMES.forEach((family, familyIndex) => {
      const group = document.createElement("section");
      group.className = "family-group";
      group.setAttribute("aria-labelledby", `family-${familyIndex}`);
      const label = document.createElement("span");
      label.className = "family-label";
      label.id = `family-${familyIndex}`;
      label.textContent = family;
      const buttons = document.createElement("div");
      buttons.className = "family-buttons";
      FAMILY_STUDIES[familyIndex].forEach((study) => {
        const button = document.createElement("button");
        button.className = "study-button";
        button.type = "button";
        button.dataset.study = String(study);
        button.textContent = String(study).padStart(2, "0");
        button.setAttribute("aria-label", `Study ${String(study).padStart(2, "0")}: ${STUDIES[study][0]}`);
        button.addEventListener("click", () => selectStudy(study));
        buttons.append(button);
      });
      group.append(label, buttons);
      controls.append(group);
    });
  }

  function revealActiveControl() {
    if (window.innerWidth <= 760 && !index.classList.contains("is-open")) return;
    const current = controls.querySelector('.study-button[aria-current="true"]');
    if (!current) return;
    const panel = controls.getBoundingClientRect();
    const button = current.getBoundingClientRect();
    if (button.top < panel.top || button.bottom > panel.bottom) {
      controls.scrollTop += button.top - panel.top - controls.clientHeight * 0.42;
    }
  }

  function updateInterface() {
    numberLabel.textContent = `Study ${String(active).padStart(2, "0")} / ${STUDIES.length - 1}`;
    nameLabel.textContent = STUDIES[active][0];
    familyLabel.textContent = STUDIES[active][1];
    document.title = `${String(active).padStart(2, "0")} ${STUDIES[active][0]} — Field Lab`;
    controls.querySelectorAll(".study-button").forEach((button) => {
      const current = Number(button.dataset.study) === active;
      button.setAttribute("aria-current", current ? "true" : "false");
    });
    requestAnimationFrame(revealActiveControl);
  }

  function selectStudy(study, push = true) {
    const nextStudy = (study + STUDIES.length) % STUDIES.length;
    if (nextStudy === active) return;
    fromStudy = active;
    active = nextStudy;
    transitionStart = performance.now() * 0.001;
    if (push) {
      const url = new URL(window.location.href);
      url.searchParams.set("study", String(active));
      window.history.pushState({ study: active }, "", url);
    }
    updateInterface();
    requestRender();
  }


  function requestRender() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = 0;
    const reduced = motionQuery.matches;
    const seconds = reduced ? REDUCED_TIME : now * 0.001;
    const transition = reduced ? 1 : Math.min(1, Math.max(0, (seconds - transitionStart) / TRANSITION_SECONDS));
    if (reduced) {
      fromStudy = active;
      pointer = [0, 0, 0];
    } else {
      pointer[0] += (pointerTarget[0] - pointer[0]) * 0.14;
      pointer[1] += (pointerTarget[1] - pointer[1]) * 0.14;
      pointer[2] += (pointerTarget[2] - pointer[2]) * 0.09;
    }
    if (reduced || now - lastDraw > 30 || transition < 1) {
      renderer.render(seconds, fromStudy, active, transition, pointer);
      lastDraw = now;
    }
    if (!reduced || transition < 1) requestRender();
  }

  buildControls();
  updateInterface();
  renderer = window.createMuseumStudyRenderer(canvas, POINT_COUNT);
  if (!renderer) {
    fallback.hidden = false;
    canvas.hidden = true;
    return;
  }

  previous.addEventListener("click", () => selectStudy(active - 1));
  next.addEventListener("click", () => selectStudy(active + 1));
  copy.addEventListener("click", async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("study", String(active));
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url.href);
      } else {
        const field = document.createElement("textarea");
        field.value = url.href;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.append(field);
        field.select();
        if (!document.execCommand("copy")) throw new Error("Copy command was rejected");
        field.remove();
      }
      copy.textContent = "URL copied";
      copy.classList.add("copied");
      window.setTimeout(() => {
        copy.textContent = "Use this study";
        copy.classList.remove("copied");
      }, 1500);
    } catch (error) {
      console.error("Unable to copy the study URL.", error);
      copy.textContent = "Copy unavailable";
    }
  });
  indexToggle.addEventListener("click", () => {
    const open = index.classList.toggle("is-open");
    indexToggle.setAttribute("aria-expanded", String(open));
    indexToggle.lastElementChild.textContent = open ? "−" : "＋";
    if (open) requestAnimationFrame(revealActiveControl);
  });
  window.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectStudy(active - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      selectStudy(active + 1);
    }
  });
  window.addEventListener("popstate", () => {
    const requested = readStudy();
    if (requested !== active) selectStudy(requested, false);
  });
  window.addEventListener("pointermove", (event) => {
    if (motionQuery.matches) return;
    pointerTarget[0] = event.clientX / window.innerWidth * 2 - 1;
    pointerTarget[1] = 1 - event.clientY / window.innerHeight * 2;
    pointerTarget[2] = 1;
    requestRender();
  }, { passive: true });
  window.addEventListener("pointerout", () => { pointerTarget[2] = 0; }, { passive: true });
  window.addEventListener("resize", requestRender, { passive: true });
  motionQuery.addEventListener("change", requestRender);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else if (!document.hidden) requestRender();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    fallback.hidden = false;
  });

  requestRender();
})();
