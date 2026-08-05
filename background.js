(() => {
  "use strict";

  function placeBackground() {
    const background = document.querySelector("#background");
    const collection = document.querySelector("#collection");
    const footer = document.querySelector("#colophon");
    if (!background || !collection || !footer) return;

    const requested = new URLSearchParams(window.location.search).get("background");
    const placement = ["after-intro", "after-work", "colophon"].includes(requested)
      ? requested
      : "after-work";

    document.body.dataset.backgroundPlacement = placement;
    if (placement === "after-intro") {
      collection.parentNode.insertBefore(background, collection);
    } else if (placement === "colophon") {
      footer.insertBefore(background, footer.querySelector(".colophon-statement"));
    } else {
      footer.parentNode.insertBefore(background, footer);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", placeBackground, { once: true });
  } else {
    placeBackground();
  }
})();
