(function () {
  "use strict";

  var btn = document.querySelector("[data-scroll-to-top]");
  if (!btn) {
    return;
  }

  var lens = btn.querySelector(".scroll-to-top__glass-lens");
  var reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ticking = false;
  var glassTicking = false;
  var MAX_DPR = 2;
  var SAMPLE_STEP_CSS = 2;
  /* Оптика ближе к макету: сильнее зум и дуга стыка */
  var SCROLL_LENS_SCALE = 1.2;
  var SCROLL_LENS_OPTICS = {
    displaceScale: 48,
    blurPx: 1.6,
    bulge: 0,
  };

  var HERO_SELECTORS = [
    ".home-page__hero",
    ".about-hero",
    ".portfolio-detail-page__hero",
    ".portfolio-detail-page__hero-media",
    ".portfolio-page__hero",
    ".rooms-detail__figure--gallery",
    ".rooms-page__head",
    ".hero",
    "[data-home-slider]",
    "[data-about-hero-slider]",
  ];

  function getHeroOrFirstSection() {
    var i;
    var el;

    for (i = 0; i < HERO_SELECTORS.length; i += 1) {
      el = document.querySelector(HERO_SELECTORS[i]);
      if (el) {
        return el;
      }
    }

    var main = document.querySelector("main");
    if (!main) {
      return null;
    }

    el = main.querySelector("section, header, [class*='__hero'], [class*='-hero']");
    if (el) {
      return el;
    }

    return main.firstElementChild;
  }

  function getRevealThreshold() {
    var block = getHeroOrFirstSection();
    if (!block) {
      return Math.max((window.innerHeight || 0) * 0.6, 320);
    }

    var top = block.getBoundingClientRect().top + window.scrollY;
    return Math.max(top + block.offsetHeight, 120);
  }

  function isSkippableOverlay(el) {
    return !el || el === btn || btn.contains(el);
  }

  function isTransparentColor(color) {
    if (!color || color === "transparent") {
      return true;
    }
    var m = color.match(/rgba?\(([^)]+)\)/i);
    if (!m) {
      return false;
    }
    var parts = m[1].split(",");
    if (parts.length < 4) {
      return false;
    }
    return parseFloat(parts[3]) === 0;
  }

  function sampleFillStyleAt(x, y) {
    var stack =
      typeof document.elementsFromPoint === "function"
        ? document.elementsFromPoint(x, y)
        : [document.elementFromPoint(x, y)];
    var i;
    var el;
    var style;
    var bg;

    for (i = 0; i < stack.length; i += 1) {
      el = stack[i];
      if (isSkippableOverlay(el)) {
        continue;
      }
      style = window.getComputedStyle(el);
      bg = style.backgroundColor;
      if (!isTransparentColor(bg)) {
        return bg;
      }
    }

    style = window.getComputedStyle(document.body);
    bg = style.backgroundColor;
    return isTransparentColor(bg) ? "#ffffff" : bg;
  }

  function clearLensCanvas() {
    if (!lens) {
      return;
    }
    var canvas = lens.querySelector("canvas.demo-glass-lens-canvas");
    if (canvas) {
      var ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    lens.classList.remove("is-canvas-lens");
    btn.classList.remove("is-glass-lens");
  }

  function drawMediaInto(ctx, mediaEl, region, pixelW, pixelH) {
    var mediaRect = mediaEl.getBoundingClientRect();
    if (mediaRect.width < 1 || mediaRect.height < 1) {
      return false;
    }

    var natW =
      mediaEl.naturalWidth || mediaEl.videoWidth || mediaRect.width;
    var natH =
      mediaEl.naturalHeight || mediaEl.videoHeight || mediaRect.height;
    if (!natW || !natH) {
      return false;
    }

    var sx = ((region.left - mediaRect.left) / mediaRect.width) * natW;
    var sy = ((region.top - mediaRect.top) / mediaRect.height) * natH;
    var sw = (region.width / mediaRect.width) * natW;
    var sh = (region.height / mediaRect.height) * natH;

    try {
      ctx.drawImage(mediaEl, sx, sy, sw, sh, 0, 0, pixelW, pixelH);
      return true;
    } catch (err) {
      return false;
    }
  }

  /*
   * Canvas lens samples the raw <img>, but hero darkening often lives in a
   * sibling/pseudo overlay with pointer-events:none (skipped by elementsFromPoint).
   * Re-apply those scrims so the button matches the masked photo.
   */
  var HERO_SCRIM_ROOT =
    ".portfolio-page__hero, .about-hero, .home-page__hero, .portfolio-detail-page__hero-media, .portfolio-detail-page__hero";
  var HERO_SCRIM_NODES =
    ".portfolio-page__overlay:not(.portfolio-page__overlay_hover), .about-hero__scrim, .about-projects__scrim";

  function extractUniformBlackFill(backgroundImage) {
    if (!backgroundImage || backgroundImage === "none") {
      return "";
    }
    var solid = backgroundImage.match(
      /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([0-9.]+)\s*\)\s+0%\s*,\s*rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*\1\s*\)\s+100%/i
    );
    if (solid) {
      return "rgba(0, 0, 0, " + solid[1] + ")";
    }
    return "";
  }

  function fillFromComputedBackground(ctx, style, pixelW, pixelH) {
    var opacity = parseFloat(style.opacity);
    if (isNaN(opacity)) {
      opacity = 1;
    }
    if (opacity <= 0 || style.visibility === "hidden" || style.display === "none") {
      return false;
    }

    var fill = "";
    if (!isTransparentColor(style.backgroundColor)) {
      fill = style.backgroundColor;
    } else {
      fill = extractUniformBlackFill(style.backgroundImage);
    }
    if (!fill) {
      return false;
    }

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, pixelW, pixelH);
    ctx.restore();
    return true;
  }

  function compositeMediaScrims(ctx, mediaEl, pixelW, pixelH) {
    var root = mediaEl.closest(HERO_SCRIM_ROOT);
    if (!root) {
      return;
    }

    var nodes = root.querySelectorAll(HERO_SCRIM_NODES);
    var i;
    for (i = 0; i < nodes.length; i += 1) {
      fillFromComputedBackground(ctx, window.getComputedStyle(nodes[i]), pixelW, pixelH);
    }

    var pseudoHosts = [root];
    if (mediaEl.parentElement && mediaEl.parentElement !== root) {
      pseudoHosts.push(mediaEl.parentElement);
    }

    var host;
    var style;
    var p;
    for (i = 0; i < pseudoHosts.length; i += 1) {
      host = pseudoHosts[i];
      for (p = 0; p < 2; p += 1) {
        style = window.getComputedStyle(host, p === 0 ? "::before" : "::after");
        if (style && style.content !== "none") {
          fillFromComputedBackground(ctx, style, pixelW, pixelH);
        }
      }
    }
  }

  function findUnderlyingVisual(region) {
    var cx = region.left + region.width / 2;
    var cy = region.top + region.height / 2;
    var stack =
      typeof document.elementsFromPoint === "function"
        ? document.elementsFromPoint(cx, cy)
        : [document.elementFromPoint(cx, cy)];
    var glass = window.DemoGlassCanvas;
    var i;
    var el;
    var style;
    var url;

    for (i = 0; i < stack.length; i += 1) {
      el = stack[i];
      if (isSkippableOverlay(el)) {
        continue;
      }

      if (el.tagName === "IMG" && el.complete && el.naturalWidth) {
        return { type: "media", el: el };
      }
      if (el.tagName === "VIDEO" && el.readyState >= 2) {
        return { type: "media", el: el };
      }

      if (!glass || typeof glass.extractBackgroundUrl !== "function") {
        continue;
      }

      style = window.getComputedStyle(el);
      url = glass.extractBackgroundUrl(style.backgroundImage);
      if (url) {
        return {
          type: "bg",
          url: url,
          heroRect: el.getBoundingClientRect(),
        };
      }
    }

    return { type: "colors" };
  }

  function buildCapture(lensRect) {
    var glass = window.DemoGlassCanvas;
    var dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    var cssW = Math.max(1, Math.round(lensRect.width));
    var cssH = Math.max(1, Math.round(lensRect.height));
    var pixelW = Math.max(1, Math.round(cssW * dpr));
    var pixelH = Math.max(1, Math.round(cssH * dpr));
    var scale = SCROLL_LENS_SCALE;
    var shiftXRatio = (glass && glass.LENS_SHIFT_X) || 0.02;
    var shiftYRatio = (glass && glass.LENS_SHIFT_Y) || -0.02;
    var regionW = cssW / scale;
    var regionH = cssH / scale;
    var region = {
      left: lensRect.left + (cssW - regionW) / 2 + cssW * shiftXRatio,
      top: lensRect.top + (cssH - regionH) / 2 + cssH * shiftYRatio,
      width: regionW,
      height: regionH,
    };

    var visual = findUnderlyingVisual(region);
    if (visual.type === "bg") {
      return { mode: "paintLens", url: visual.url, heroRect: visual.heroRect };
    }

    var canvas = document.createElement("canvas");
    canvas.width = pixelW;
    canvas.height = pixelH;
    var ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    if (visual.type === "media" && drawMediaInto(ctx, visual.el, region, pixelW, pixelH)) {
      compositeMediaScrims(ctx, visual.el, pixelW, pixelH);
      return { mode: "source", canvas: canvas };
    }

    /* Сэмпл с учётом выпуклости: стык цветов гнётся как на макете */
    var step = Math.max(1, Math.round(SAMPLE_STEP_CSS * dpr));
    var py;
    var px;
    var x;
    var y;
    var nx;
    var ny;
    var r2;
    var zoom;
    var cx = (pixelW - 1) * 0.5;
    var cy = (pixelH - 1) * 0.5;
    var maxR = Math.max(cx, cy);
    var bulge = 0.42;

    for (py = 0; py < pixelH; py += step) {
      for (px = 0; px < pixelW; px += step) {
        nx = (px + step / 2 - cx) / maxR;
        ny = (py + step / 2 - cy) / maxR;
        r2 = nx * nx + ny * ny;
        zoom = 1 + bulge * (1 - Math.min(1, r2));
        x = region.left + ((cx + (nx * maxR) / zoom) / pixelW) * region.width;
        y = region.top + ((cy + (ny * maxR) / zoom) / pixelH) * region.height;
        ctx.fillStyle = sampleFillStyleAt(x, y);
        ctx.fillRect(px, py, step, step);
      }
    }

    return { mode: "source", canvas: canvas };
  }

  function paintGlass() {
    if (!btn.classList.contains("is-visible") || !lens || reducedMotion) {
      return;
    }

    var glass = window.DemoGlassCanvas;
    if (!glass || typeof glass.paintLensFromSource !== "function") {
      clearLensCanvas();
      return;
    }

    var lensRect = lens.getBoundingClientRect();
    if (lensRect.width < 2 || lensRect.height < 2) {
      return;
    }

    var capture = buildCapture(lensRect);
    if (!capture) {
      clearLensCanvas();
      return;
    }

    btn.classList.add("is-glass-lens");

    if (capture.mode === "paintLens" && typeof glass.paintLens === "function") {
      glass.paintLens(lens, lensRect, capture.url, null, capture.heroRect, {
        scale: SCROLL_LENS_SCALE,
        shiftX: 0.02,
        shiftY: -0.02,
      });
      return;
    }

    if (capture.mode === "source" && capture.canvas) {
      glass.paintLensFromSource(lens, capture.canvas, lensRect, SCROLL_LENS_OPTICS);
    }
  }

  function scheduleGlassPaint() {
    if (glassTicking) {
      return;
    }
    glassTicking = true;
    window.requestAnimationFrame(function () {
      glassTicking = false;
      paintGlass();
    });
  }

  function update() {
    var visible = window.scrollY >= getRevealThreshold();
    btn.classList.toggle("is-visible", visible);
    btn.setAttribute("aria-hidden", visible ? "false" : "true");
    btn.tabIndex = visible ? 0 : -1;

    /*
     * Фиксированный bottom: не поднимаем кнопку над футером —
     * иначе она «прыгает» вверх и зависает в зазоре между контентом и футером.
     * Остаётся чуть ниже и лежит поверх футера у края экрана.
     */
    btn.style.bottom = "";

    if (visible) {
      scheduleGlassPaint();
    } else {
      clearLensCanvas();
    }
  }

  function onScrollOrResize() {
    if (ticking) {
      return;
    }
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      update();
    });
  }

  btn.addEventListener("click", function (event) {
    event.preventDefault();
    if (reducedMotion) {
      window.scrollTo(0, 0);
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize);
  window.addEventListener("load", function () {
    update();
    scheduleGlassPaint();
  });
  update();
})();
