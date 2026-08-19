
; /* Start:"a:4:{s:4:"full";s:53:"/local/templates/main/js/home-page.js?178637016314094";s:6:"source";s:37:"/local/templates/main/js/home-page.js";s:3:"min";s:0:"";s:3:"map";s:0:"";}"*/
(function () {
  function initHomePage() {
    var slider = document.querySelector("[data-home-slider]");
    if (!slider) {
      return;
    }

    var slides = slider.querySelectorAll(".home-page__hero-slide");
    var dots = slider.querySelectorAll(".home-page__hero-dot");
    var dragLayer = slider.querySelector(".home-page__hero-drag");
    if (!slides.length || !dragLayer) {
      return;
    }

    /* Лёгкое увеличение линзы: сильный zoom без blur/преломления выглядит как «обрезка» */
    var glass = window.DemoGlassCanvas;
    var currentIndex = 0;
    var timer = null;
    var DELAY = 3000;
    var dragStartX = null;
    var dragStartY = null;
    var dragPointerId = null;
    var DRAG_THRESHOLD = 56;
    var syncRaf = null;
    var glassTransitionGen = 0;
    var glassLayerPairs = setupGlassLayers();

    function getSlideBackgroundImage(slide) {
      if (!slide) {
        return "";
      }
      var img = slide.querySelector(".home-page__hero-slide-img");
      if (img && img.getAttribute("src")) {
        return 'url("' + img.getAttribute("src") + '")';
      }
      var inline = slide.style.backgroundImage;
      if (inline) {
        return inline;
      }
      return window.getComputedStyle(slide).backgroundImage || "";
    }

    function extractBackgroundUrl(bgImage) {
      return glass ? glass.extractBackgroundUrl(bgImage) : "";
    }

    function loadImageSize(url, done) {
      if (glass) {
        glass.loadImageSize(url, done);
        return;
      }
      done(null);
    }

    function ensureGlassBgStructure(bgWrapper) {
      var lens = bgWrapper.querySelector(".home-page__stat-glass-lens");
      if (!lens) {
        lens = document.createElement("span");
        lens.className = "home-page__stat-glass-lens";
        lens.setAttribute("aria-hidden", "true");
        bgWrapper.appendChild(lens);
      }
      var scrim = bgWrapper.querySelector(".home-page__stat-glass-scrim");
      if (!scrim) {
        scrim = document.createElement("span");
        scrim.className = "home-page__stat-glass-scrim";
        scrim.setAttribute("aria-hidden", "true");
        bgWrapper.appendChild(scrim);
      }
    }

    function setupGlassLayers() {
      if (slider._glassLayerPairs && slider._glassLayerPairs.length) {
        return slider._glassLayerPairs;
      }

      var pairs = [];
      var cards = slider.querySelectorAll(
        ".home-page__hero-stats-row > .home-page__stat-card.demo-glass"
      );

      for (var c = 0; c < cards.length; c++) {
        var primary = cards[c].querySelector(
          ".home-page__stat-glass-bg[data-glass-layer='primary']"
        );
        if (!primary) {
          primary = cards[c].querySelector(
            ".home-page__stat-glass-bg:not([data-glass-layer='alt'])"
          );
        }
        if (!primary) {
          continue;
        }

        primary.setAttribute("data-glass-layer", "primary");
        primary.classList.add("is-visible");
        ensureGlassBgStructure(primary);

        var alt = cards[c].querySelector(".home-page__stat-glass-bg[data-glass-layer='alt']");
        if (!alt) {
          alt = document.createElement("span");
          alt.className = "home-page__stat-glass-bg";
          alt.setAttribute("data-glass-layer", "alt");
          alt.setAttribute("aria-hidden", "true");
          primary.parentNode.insertBefore(alt, primary.nextSibling);
        }
        ensureGlassBgStructure(alt);

        pairs.push({ primary: primary, alt: alt });
      }

      slider._glassLayerPairs = pairs;
      return pairs;
    }

    function getFrontLayer(pair) {
      return pair.primary.classList.contains("is-visible") ? pair.primary : pair.alt;
    }

    function getBackLayer(pair) {
      return pair.primary.classList.contains("is-visible") ? pair.alt : pair.primary;
    }

    function captureLayerTargets() {
      var targets = [];
      for (var i = 0; i < glassLayerPairs.length; i++) {
        targets.push({
          front: getFrontLayer(glassLayerPairs[i]),
          back: getBackLayer(glassLayerPairs[i]),
        });
      }
      return targets;
    }

    function applyLensToWrapper(bgWrapper, bgImage, imageSize, heroRect) {
      if (!glass) {
        return;
      }
      var lens = bgWrapper.querySelector(".home-page__stat-glass-lens");
      if (!lens) {
        return;
      }
      glass.applyLensBackground(lens, bgWrapper, bgImage, imageSize, heroRect);
    }

    function commitGlassToSlide(slideIndex, generation) {
      if (!glassLayerPairs.length) {
        return;
      }

      var slide = slides[slideIndex];
      var bgImage = getSlideBackgroundImage(slide);
      if (!bgImage || bgImage === "none") {
        return;
      }

      var heroRect = slider.getBoundingClientRect();
      var url = extractBackgroundUrl(bgImage);

      for (var i = 0; i < glassLayerPairs.length; i++) {
        applyLensToWrapper(glassLayerPairs[i].primary, bgImage, null, heroRect);
        applyLensToWrapper(glassLayerPairs[i].alt, bgImage, null, heroRect);
        glassLayerPairs[i].primary.classList.add("is-visible");
        glassLayerPairs[i].alt.classList.remove("is-visible");
      }

      loadImageSize(url, function (imageSize) {
        if (generation !== glassTransitionGen) {
          return;
        }
        heroRect = slider.getBoundingClientRect();
        for (var j = 0; j < glassLayerPairs.length; j++) {
          applyLensToWrapper(glassLayerPairs[j].primary, bgImage, imageSize, heroRect);
          applyLensToWrapper(glassLayerPairs[j].alt, bgImage, imageSize, heroRect);
        }
      });
    }

    function syncGlassLensesInstant(slideIndex) {
      if (!glassLayerPairs.length) {
        return;
      }
      glassTransitionGen += 1;
      commitGlassToSlide(slideIndex, glassTransitionGen);
    }

    function transitionGlassLenses(fromIndex, toIndex) {
      if (!glassLayerPairs.length || fromIndex === toIndex) {
        syncGlassLensesInstant(toIndex);
        return;
      }

      var duration = getSlideTransitionMs(slides[toIndex] || slides[0]);
      if (duration <= 0) {
        syncGlassLensesInstant(toIndex);
        return;
      }

      glassTransitionGen += 1;
      var generation = glassTransitionGen;

      var toSlide = slides[toIndex];
      var bgImage = getSlideBackgroundImage(toSlide);
      if (!bgImage || bgImage === "none") {
        return;
      }

      var targets = captureLayerTargets();
      var heroRect = slider.getBoundingClientRect();
      var url = extractBackgroundUrl(bgImage);

      for (var i = 0; i < targets.length; i++) {
        applyLensToWrapper(targets[i].back, bgImage, null, heroRect);
      }

      for (var k = 0; k < targets.length; k++) {
        targets[k].front.classList.remove("is-visible");
        targets[k].back.classList.add("is-visible");
      }

      loadImageSize(url, function (imageSize) {
        if (generation !== glassTransitionGen) {
          return;
        }

        heroRect = slider.getBoundingClientRect();
        for (var j = 0; j < targets.length; j++) {
          applyLensToWrapper(targets[j].back, bgImage, imageSize, heroRect);
        }
      });
    }

    function scheduleLensSync() {
      if (syncRaf !== null) {
        return;
      }
      syncRaf = window.requestAnimationFrame(function () {
        syncRaf = null;
        syncGlassLensesInstant(currentIndex);
      });
    }

    function getSlideTransitionMs(slide) {
      if (!slide || typeof window.getComputedStyle !== "function") {
        return 0;
      }

      var styles = window.getComputedStyle(slide);
      var rawDur = String(styles.transitionDuration || "0s").split(",")[0].trim();
      var rawDelay = String(styles.transitionDelay || "0s").split(",")[0].trim();

      function toMs(value) {
        if (!value) {
          return 0;
        }
        if (value.indexOf("ms") !== -1) {
          return parseFloat(value) || 0;
        }
        if (value.indexOf("s") !== -1) {
          return (parseFloat(value) || 0) * 1000;
        }
        return parseFloat(value) || 0;
      }

      return Math.max(0, toMs(rawDur) + toMs(rawDelay));
    }

    function setActive(index) {
      var prevIndex = currentIndex;
      currentIndex = index;
      for (var i = 0; i < slides.length; i++) {
        slides[i].classList.toggle("is-active", i === index);
      }
      for (var j = 0; j < dots.length; j++) {
        if (dots[j]) {
          dots[j].classList.toggle("is-active", j === index);
          dots[j].setAttribute("aria-selected", j === index ? "true" : "false");
        }
      }
      transitionGlassLenses(prevIndex, index);
    }

    function nextSlide() {
      var nextIndex = currentIndex + 1;
      if (nextIndex >= slides.length) {
        nextIndex = 0;
      }
      setActive(nextIndex);
    }

    function prevSlide() {
      var prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = slides.length - 1;
      }
      setActive(prevIndex);
    }

    function startAuto() {
      stopAuto();
      timer = window.setInterval(nextSlide, DELAY);
    }

    function stopAuto() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function onManualNav() {
      startAuto();
    }

    function endDrag() {
      dragLayer.classList.remove("is-dragging");
      dragPointerId = null;
      dragStartX = null;
      dragStartY = null;
    }

    for (var i = 0; i < dots.length; i++) {
      (function (idx) {
        dots[idx].addEventListener("click", function () {
          setActive(idx);
          startAuto();
        });
      })(i);
    }

    dragLayer.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragPointerId = event.pointerId;
      dragLayer.classList.add("is-dragging");
      dragLayer.setPointerCapture(event.pointerId);
    });

    dragLayer.addEventListener("pointerup", function (event) {
      if (dragPointerId !== event.pointerId || dragStartX == null) {
        return;
      }
      try {
        dragLayer.releasePointerCapture(event.pointerId);
      } catch (e) {
        /* ignore */
      }
      var dx = event.clientX - dragStartX;
      var dy = event.clientY - dragStartY;
      endDrag();
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.12) {
        return;
      }
      if (dx < 0) {
        nextSlide();
      } else {
        prevSlide();
      }
      onManualNav();
    });

    dragLayer.addEventListener("pointercancel", function (event) {
      if (dragPointerId !== event.pointerId) {
        return;
      }
      try {
        dragLayer.releasePointerCapture(event.pointerId);
      } catch (e) {
        /* ignore */
      }
      endDrag();
    });

    dragLayer.addEventListener("lostpointercapture", endDrag);
    slider.addEventListener("mouseenter", stopAuto);
    slider.addEventListener("mouseleave", startAuto);
    window.addEventListener("resize", scheduleLensSync, { passive: true });
    window.addEventListener("orientationchange", scheduleLensSync, { passive: true });
    window.addEventListener("demo-home-scroll-pinned", scheduleLensSync, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleLensSync, { passive: true });
    }

    for (var s = 0; s < slides.length; s++) {
      var preloadUrl = extractBackgroundUrl(getSlideBackgroundImage(slides[s]));
      if (preloadUrl) {
        loadImageSize(preloadUrl, function () {});
      }
    }

    setActive(0);
    startAuto();
    /* Повторный sync после layout на мобилках (адресная строка / шрифты) */
    window.setTimeout(scheduleLensSync, 120);
    window.setTimeout(scheduleLensSync, 480);
  }

  function initHomeCtaForm() {
    var form = document.querySelector("[data-home-cta-form]");
    if (!form) {
      return;
    }

    var groups = form.querySelectorAll("[data-chip-group]");

    function syncGroupValue(group) {
      var groupName = group.getAttribute("data-chip-group");
      var valueInput = form.querySelector("[data-chip-value-" + groupName + "]");
      if (!valueInput) {
        return;
      }
      var activeChip = group.querySelector(".home-page__chip.is-active");
      valueInput.value = activeChip ? activeChip.getAttribute("data-chip-value") || activeChip.textContent.trim() : "";
    }

    function activateChip(group, chip) {
      if (!group || !chip) {
        return;
      }
      var chips = group.querySelectorAll(".home-page__chip");
      for (var i = 0; i < chips.length; i++) {
        chips[i].classList.remove("is-active");
      }
      chip.classList.add("is-active");
      syncGroupValue(group);
    }

    for (var g = 0; g < groups.length; g++) {
      (function (group) {
        var chips = group.querySelectorAll(".home-page__chip");
        for (var i = 0; i < chips.length; i++) {
          chips[i].addEventListener("click", function () {
            activateChip(group, this);
          });
        }
        syncGroupValue(group);
      })(groups[g]);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      form.reset();
      for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        var chips = group.querySelectorAll(".home-page__chip");
        var defaultChip = group.querySelector(".home-page__chip[data-chip-default='true']");
        for (var c = 0; c < chips.length; c++) {
          chips[c].classList.remove("is-active");
        }
        if (defaultChip) {
          defaultChip.classList.add("is-active");
        }
        syncGroupValue(group);
      }
    });
  }

  function init() {
    initHomePage();
    initHomeCtaForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* End */
;
; /* Start:"a:4:{s:4:"full";s:91:"/local/templates/main/components/bitrix/news.list/company_history/script.js?178670675318994";s:6:"source";s:75:"/local/templates/main/components/bitrix/news.list/company_history/script.js";s:3:"min";s:0:"";s:3:"map";s:0:"";}"*/
(function () {
  if (window.__demoHomeHistoryInit) {
    return;
  }
  window.__demoHomeHistoryInit = true;

  function attachHomeHistoryDragScroll(rail) {
    var dragActive = false;
    var dragStartX = 0;
    var dragStartScrollLeft = 0;

    function shouldIgnoreStart(target) {
      if (!target || !target.closest) {
        return false;
      }
      if (target.closest('button, a')) {
        return true;
      }
      if (target.closest('.home-page__history-marker')) {
        return true;
      }
      return false;
    }

    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') {
        return;
      }
      if (e.button !== 0) {
        return;
      }
      if (shouldIgnoreStart(e.target)) {
        return;
      }
      dragActive = true;
      dragStartX = e.clientX;
      dragStartScrollLeft = rail.scrollLeft;
      rail.classList.add('is-dragging');
      try {
        rail.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
    });

    rail.addEventListener('pointermove', function (e) {
      if (!dragActive) {
        return;
      }
      var dx = e.clientX - dragStartX;
      rail.scrollLeft = dragStartScrollLeft - dx;
    });

    function endDrag(e) {
      if (!dragActive) {
        return;
      }
      dragActive = false;
      rail.classList.remove('is-dragging');
      if (e) {
        try {
          rail.releasePointerCapture(e.pointerId);
        } catch (e2) {
          /* ignore */
        }
      }
    }

    rail.addEventListener('pointerup', endDrag);
    rail.addEventListener('pointercancel', function () {
      dragActive = false;
      rail.classList.remove('is-dragging');
    });
    rail.addEventListener('lostpointercapture', function () {
      if (dragActive) {
        dragActive = false;
        rail.classList.remove('is-dragging');
      }
    });
  }

  function measureSilhouetteEnd(silhouette, track) {
    var silRect = silhouette.getBoundingClientRect();
    var trackRect = track.getBoundingClientRect();
    if (silRect.width <= 0 || silRect.height <= 0) {
      return 0;
    }

    return Math.max(0, Math.round(silRect.right - trackRect.left));
  }

  function updateHistoryTimelineEnd(root) {
    var track = root.querySelector('.home-page__history-track');
    if (!track) {
      return;
    }

    var lastCol = track.querySelector('.home-page__history-col_last');
    if (!lastCol) {
      var cols = track.querySelectorAll('.home-page__history-col');
      lastCol = cols[cols.length - 1];
    }
    if (!lastCol) {
      track.classList.remove('is-history-line-ready');
      track.style.removeProperty('--history-line-end');
      return;
    }

    var silhouette = lastCol.querySelector('.home-page__history-silhouette');
    if (!silhouette) {
      track.classList.remove('is-history-line-ready');
      track.style.removeProperty('--history-line-end');
      return;
    }

    var endX = measureSilhouetteEnd(silhouette, track);
    if (endX <= 0) {
      track.classList.remove('is-history-line-ready');
      track.style.removeProperty('--history-line-end');
      return;
    }

    track.style.setProperty('--history-line-end', endX + 'px');
    track.classList.add('is-history-line-ready');
  }

  function scheduleHistoryTimelineEndUpdate(root) {
    window.requestAnimationFrame(function () {
      updateHistoryTimelineEnd(root);
    });
  }

  /**
   * Высота карусели = высота самого высокого столбца (обычно последний).
   * Фиксируем и на мобилке, иначе при подгрузке силуэтов блок «прыгает».
   */
  function syncHistoryBodyHeight(root) {
    var track = root.querySelector('.home-page__history-track');
    var cols = root.querySelectorAll('.home-page__history-col');
    if (!track || !cols.length) {
      return;
    }

    track.style.height = 'auto';
    track.style.minHeight = '0';

    var i;
    for (i = 0; i < cols.length; i++) {
      cols[i].style.height = 'auto';
    }

    var maxH = 0;
    for (i = 0; i < cols.length; i++) {
      maxH = Math.max(maxH, cols[i].offsetHeight);
    }

    for (i = 0; i < cols.length; i++) {
      cols[i].style.height = '';
    }
    track.style.height = '';
    track.style.minHeight = '';

    if (maxH <= 0) {
      return;
    }

    var next = Math.round(maxH) + 'px';
    if (root.style.getPropertyValue('--history-body-h') !== next) {
      root.style.setProperty('--history-body-h', next);
    }
  }

  function scheduleHistoryBodyHeightSync(root) {
    window.requestAnimationFrame(function () {
      syncHistoryBodyHeight(root);
      scheduleHistoryTimelineEndUpdate(root);
    });
  }

  function updateHistoryNavState(viewport, prevBtn, nextBtn) {
    if (!viewport) {
      return;
    }
    var maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    var left = viewport.scrollLeft;
    var epsilon = 2;

    if (prevBtn) {
      prevBtn.disabled = left <= epsilon;
    }
    if (nextBtn) {
      nextBtn.disabled = left >= maxScroll - epsilon;
    }
  }

  function getHistoryScrollStep(viewport) {
    var col = viewport.querySelector('.home-page__history-col');
    if (col) {
      return Math.max(col.getBoundingClientRect().width, 220);
    }
    return Math.max(Math.round(viewport.clientWidth * 0.8), 220);
  }

  function bindHistoryNav(root, viewport) {
    var prevBtn = root.querySelector('[data-history-prev]');
    var nextBtn = root.querySelector('[data-history-next]');
    if (!viewport || (!prevBtn && !nextBtn)) {
      return;
    }

    function refresh() {
      updateHistoryNavState(viewport, prevBtn, nextBtn);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        viewport.scrollBy({ left: -getHistoryScrollStep(viewport), behavior: 'smooth' });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        viewport.scrollBy({ left: getHistoryScrollStep(viewport), behavior: 'smooth' });
      });
    }

    viewport.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);
    refresh();
  }

  function bindHistoryTimelineEnd(root) {
    scheduleHistoryTimelineEndUpdate(root);

    window.addEventListener('resize', function () {
      scheduleHistoryBodyHeightSync(root);
    });
    window.addEventListener('load', function () {
      scheduleHistoryBodyHeightSync(root);
    });

    var track = root.querySelector('.home-page__history-track');
    if (!track) {
      return;
    }

    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function () {
        scheduleHistoryBodyHeightSync(root);
      });
      ro.observe(track);

      var silhouettes = root.querySelectorAll('.home-page__history-silhouette');
      for (var s = 0; s < silhouettes.length; s++) {
        ro.observe(silhouettes[s]);
      }
    }

    var images = root.querySelectorAll('.home-page__history-silhouette');
    for (var j = 0; j < images.length; j++) {
      images[j].addEventListener('load', function () {
        scheduleHistoryBodyHeightSync(root);
      });
      if (images[j].complete) {
        scheduleHistoryBodyHeightSync(root);
      }
    }
  }

  function applyHistoryInlineLayout(root) {
    var cols = root.querySelectorAll('.home-page__history-col[data-history-col-w]');
    for (var i = 0; i < cols.length; i++) {
      var col = cols[i];
      var colW = parseInt(col.getAttribute('data-history-col-w') || '', 10);
      var mapH = parseInt(col.getAttribute('data-history-map-min-h') || '', 10);
      if (colW > 0) {
        col.style.setProperty('--history-col-w', colW + 'px');
      }
      if (mapH > 0) {
        col.style.setProperty('--history-map-min-h', mapH + 'px');
      }
    }

    var markers = root.querySelectorAll(
      '.home-page__history-marker[data-history-marker-left][data-history-marker-top]'
    );
    for (var j = 0; j < markers.length; j++) {
      var marker = markers[j];
      var left = marker.getAttribute('data-history-marker-left');
      var top = marker.getAttribute('data-history-marker-top');
      if (left !== null && left !== '') {
        marker.style.left = left + '%';
      }
      if (top !== null && top !== '') {
        marker.style.top = top + '%';
      }
    }
  }

  function initHistorySection() {
    var root = document.querySelector('[data-home-history]');
    if (!root) {
      return;
    }

    applyHistoryInlineLayout(root);

    var viewport = root.querySelector('[data-history-viewport]');
    if (viewport) {
      attachHomeHistoryDragScroll(viewport);
      bindHistoryNav(root, viewport);
    }

    scheduleHistoryBodyHeightSync(root);
    bindHistoryTimelineEnd(root);

    var markers = root.querySelectorAll('.home-page__history-marker');
    var POP_PAD = 8;
    var POP_GAP = 10;
    var canHover =
      window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var suppressScrollCloseUntil = 0;
    var lastViewportScrollLeft = viewport ? viewport.scrollLeft : 0;

    /* Единый слой поверх всех зданий — без переносов DOM на каждый hover */
    var popLayer = document.querySelector('[data-history-pop-layer]');
    if (!popLayer) {
      popLayer = document.createElement('div');
      popLayer.className = 'home-page__history-pop-layer';
      popLayer.setAttribute('data-history-pop-layer', '');
      document.body.appendChild(popLayer);
    }

    function getPop(marker) {
      if (!marker) {
        return null;
      }
      if (marker._historyPop && marker._historyPop.isConnected) {
        return marker._historyPop;
      }
      var pop = marker.querySelector('.home-page__history-pop');
      if (pop) {
        marker._historyPop = pop;
        pop._historyMarker = marker;
      }
      return pop;
    }

    for (var pi = 0; pi < markers.length; pi++) {
      var initPop = getPop(markers[pi]);
      if (initPop && initPop.parentElement !== popLayer) {
        popLayer.appendChild(initPop);
        initPop.classList.add('is-anchored');
      }
    }

    function hidePop(marker) {
      var pop = getPop(marker);
      if (!pop) {
        return;
      }
      pop.classList.remove('is-visible', 'is-measuring');
      pop.setAttribute('aria-hidden', 'true');
    }

    function placeHistoryPop(marker) {
      var pop = getPop(marker);
      if (!pop) {
        return;
      }

      if (pop.parentElement !== popLayer) {
        popLayer.appendChild(pop);
      }

      var wasVisible = pop.classList.contains('is-visible');
      pop.classList.add('is-anchored');
      if (!wasVisible) {
        pop.classList.remove('is-visible');
        pop.classList.add('is-measuring');
        pop.style.setProperty('--pop-x', '0px');
        pop.style.setProperty('--pop-y', '0px');
      }

      var markerRect = marker.getBoundingClientRect();
      var popW = pop.offsetWidth || 204;
      var popH = pop.offsetHeight || 140;
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var pad = POP_PAD;
      var gap = POP_GAP;
      var scrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
      var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;

      /* Сторону выбираем по viewport, координаты пишем в document — слой absolute */
      var xRight = markerRect.right + gap;
      var xLeft = markerRect.left - gap - popW;
      var x;
      if (xRight + popW <= vw - pad) {
        x = xRight;
      } else if (xLeft >= pad) {
        x = xLeft;
      } else {
        x = markerRect.left + markerRect.width / 2 - popW / 2;
        x = Math.max(pad, Math.min(x, vw - pad - popW));
      }

      var yAbove = markerRect.top - gap - popH;
      var yBelow = markerRect.bottom + gap;
      var y;
      if (yAbove >= pad) {
        y = yAbove;
      } else if (yBelow + popH <= vh - pad) {
        y = yBelow;
      } else {
        y = Math.max(pad, Math.min(markerRect.top + markerRect.height / 2 - popH / 2, vh - pad - popH));
      }

      pop.style.setProperty('--pop-x', Math.round(x + scrollX) + 'px');
      pop.style.setProperty('--pop-y', Math.round(y + scrollY) + 'px');
      pop.classList.remove('is-measuring');
      pop.classList.add('is-visible');
      pop.setAttribute('aria-hidden', 'false');
      suppressScrollCloseUntil = Date.now() + 120;
    }

    function repositionOpenPops() {
      for (var i = 0; i < markers.length; i++) {
        var marker = markers[i];
        var pop = getPop(marker);
        if (
          marker.classList.contains('is-open') ||
          (pop && pop.classList.contains('is-visible'))
        ) {
          placeHistoryPop(marker);
        }
      }
    }

    function setMarkerOpen(marker, open) {
      if (open) {
        marker.classList.add('is-open');
        placeHistoryPop(marker);
      } else {
        marker.classList.remove('is-open');
        hidePop(marker);
      }
    }

    function closeAllMarkers(except) {
      for (var i = 0; i < markers.length; i++) {
        var m = markers[i];
        if (except && m === except) {
          continue;
        }
        setMarkerOpen(m, false);
        var otherBtn = m.querySelector('.home-page__history-dot');
        if (otherBtn) {
          otherBtn.blur();
        }
      }
    }

    function hideAllHoverPops(except) {
      for (var i = 0; i < markers.length; i++) {
        if (except && markers[i] === except) {
          continue;
        }
        if (!markers[i].classList.contains('is-open')) {
          hidePop(markers[i]);
        }
      }
    }

    function hasOpenMarker() {
      return !!root.querySelector('.home-page__history-marker.is-open');
    }

    function isRelatedToPopOrMarker(related, marker, pop) {
      if (!related || !related.closest) {
        return false;
      }
      if (marker && (related === marker || marker.contains(related))) {
        return true;
      }
      if (pop && (related === pop || pop.contains(related))) {
        return true;
      }
      return false;
    }

    function pointerStillOnMarkerOrPop(marker) {
      var pop = getPop(marker);
      try {
        if (marker.matches(':hover')) {
          return true;
        }
        if (pop && pop.matches(':hover')) {
          return true;
        }
      } catch (err) {
        /* ignore */
      }
      return false;
    }

    for (var m = 0; m < markers.length; m++) {
      (function (marker) {
        var btn = marker.querySelector('.home-page__history-dot');
        var pop = getPop(marker);
        var leaveTimer = null;
        if (!btn) {
          return;
        }

        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (leaveTimer) {
            clearTimeout(leaveTimer);
            leaveTimer = null;
          }
          var wasOpen = marker.classList.contains('is-open');
          closeAllMarkers();
          if (!wasOpen) {
            setMarkerOpen(marker, true);
          } else {
            btn.blur();
          }
        });

        if (canHover) {
          marker.addEventListener('mouseenter', function () {
            if (leaveTimer) {
              clearTimeout(leaveTimer);
              leaveTimer = null;
            }
            if (hasOpenMarker()) {
              return;
            }
            hideAllHoverPops(marker);
            placeHistoryPop(marker);
          });

          marker.addEventListener('mouseleave', function (e) {
            if (marker.classList.contains('is-open')) {
              return;
            }
            if (isRelatedToPopOrMarker(e.relatedTarget, marker, getPop(marker))) {
              return;
            }
            if (leaveTimer) {
              clearTimeout(leaveTimer);
            }
            leaveTimer = setTimeout(function () {
              leaveTimer = null;
              if (marker.classList.contains('is-open')) {
                return;
              }
              if (pointerStillOnMarkerOrPop(marker)) {
                return;
              }
              hidePop(marker);
            }, 80);
          });

          if (pop) {
            pop.addEventListener('mouseenter', function () {
              if (leaveTimer) {
                clearTimeout(leaveTimer);
                leaveTimer = null;
              }
            });
            pop.addEventListener('mouseleave', function (e) {
              if (marker.classList.contains('is-open')) {
                return;
              }
              if (isRelatedToPopOrMarker(e.relatedTarget, marker, pop)) {
                return;
              }
              if (leaveTimer) {
                clearTimeout(leaveTimer);
              }
              leaveTimer = setTimeout(function () {
                leaveTimer = null;
                if (marker.classList.contains('is-open')) {
                  return;
                }
                if (pointerStillOnMarkerOrPop(marker)) {
                  return;
                }
                hidePop(marker);
              }, 80);
            });
            pop.addEventListener('click', function (e) {
              e.stopPropagation();
            });
          }
        }
      })(markers[m]);
    }

    document.addEventListener('click', function (e) {
      if (
        e.target &&
        e.target.closest &&
        (e.target.closest('.home-page__history-marker') ||
          e.target.closest('.home-page__history-pop') ||
          e.target.closest('[data-history-pop-layer]'))
      ) {
        return;
      }
      closeAllMarkers();
    });

    window.addEventListener('resize', repositionOpenPops);
    window.addEventListener(
      'scroll',
      function (e) {
        if (viewport && e.target === viewport) {
          var left = viewport.scrollLeft;
          var delta = Math.abs(left - lastViewportScrollLeft);
          lastViewportScrollLeft = left;
          /* Игнор микродвижений scroll-snap и скролла сразу после открытия попапа */
          if (Date.now() < suppressScrollCloseUntil || delta < 2) {
            return;
          }
          closeAllMarkers();
          hideAllHoverPops();
          return;
        }
        /* Document-absolute: попап едет со страницей; hover при скролле закрываем сразу
           (иначе картинка остаётся под курсором и не пропадает) */
        if (Date.now() < suppressScrollCloseUntil) {
          return;
        }
        hideAllHoverPops();
      },
      true
    );
  }

  function init() {
    initHistorySection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* End */
;
; /* Start:"a:4:{s:4:"full";s:104:"/bitrix/components/bitrix/main.userconsent.request/templates/.default/user_consent.min.js?17695912748434";s:6:"source";s:85:"/bitrix/components/bitrix/main.userconsent.request/templates/.default/user_consent.js";s:3:"min";s:89:"/bitrix/components/bitrix/main.userconsent.request/templates/.default/user_consent.min.js";s:3:"map";s:89:"/bitrix/components/bitrix/main.userconsent.request/templates/.default/user_consent.map.js";}"*/
(function(){function t(t){this.caller=t.caller;this.formNode=t.formNode;this.controlNode=t.controlNode;this.inputNode=t.inputNode;this.config=t.config;this.saved=false}t.prototype={};BX.UserConsent={msg:{title:"MAIN_USER_CONSENT_REQUEST_TITLE",btnAccept:"MAIN_USER_CONSENT_REQUEST_BTN_ACCEPT",btnReject:"MAIN_USER_CONSENT_REQUEST_BTN_REJECT",loading:"MAIN_USER_CONSENT_REQUEST_LOADING",errTextLoad:"MAIN_USER_CONSENT_REQUEST_ERR_TEXT_LOAD"},events:{save:"main-user-consent-request-save",refused:"main-user-consent-request-refused",accepted:"main-user-consent-request-accepted",afterAccepted:"main-user-consent-request-after-accepted"},current:null,autoSave:false,isFormSubmitted:false,attributeControl:"data-bx-user-consent",items:[],load:function(t){var e=this.find(t)[0];if(!e){return null}this.bind(e);return e},loadAll:function(t,e){var n=this.find(t,e);if(n.length>0){n.forEach(this.bind,this);this.items=this.items.concat(n)}},getItems:function(){return this.items},loadFromForms:function(){var t=document.getElementsByTagName("FORM");t=BX.convert.nodeListToArray(t);t.forEach(this.loadAll,this)},find:function(t){if(!t){return[]}var e=t.querySelectorAll("["+this.attributeControl+"]");e=BX.convert.nodeListToArray(e);return e.map(this.createItem.bind(this,t)).filter((function(t){return!!t}))},bind:function(t){if(t.config.submitEventName){BX.addCustomEvent(t.config.submitEventName,this.onSubmit.bind(this,t))}else if(t.formNode){BX.bind(t.formNode,"submit",this.onSubmit.bind(this,t))}BX.bind(t.inputNode,"click",this.onClick.bind(this,t))},createItem:function(e,n){var i=n.querySelector('input[type="checkbox"]');if(!i){return}try{var s=JSON.parse(n.getAttribute(this.attributeControl));var o={formNode:null,controlNode:n,inputNode:i,config:s};if(e.tagName=="FORM"){o.formNode=e}else{o.formNode=BX.findParent(i,{tagName:"FORM"})}o.caller=this;return new t(o)}catch(t){return null}},onClick:function(t,e){if(t.config.url){if(t.inputNode.checked){BX.onCustomEvent(t,this.events.afterAccepted,[t]);BX.onCustomEvent(this,this.events.afterAccepted,[t])}else{BX.onCustomEvent(t,this.events.refused,[t]);BX.onCustomEvent(this,this.events.refused,[t])}return}this.requestForItem(t);e.preventDefault()},onSubmit:function(t,e){this.isFormSubmitted=true;if(this.check(t)){return true}else{if(e){e.preventDefault()}return false}},check:function(t){if(t.inputNode.checked){this.saveConsent(t,(()=>{t.saved=true}));return true}this.requestForItem(t);return false},requestForItem:function(t){this.setCurrent(t);this.requestConsent(t.config.id,{sec:t.config.sec,replace:t.config.replace},this.onAccepted,this.onRefused)},setCurrent:function(t){this.current=t;this.autoSave=t.config.autoSave;this.actionRequestUrl=t.config.actionUrl},onAccepted:function(){if(!this.current){return}var t=this.current;this.saveConsent(this.current,(function(){BX.onCustomEvent(t,this.events.accepted,[]);BX.onCustomEvent(this,this.events.accepted,[t]);t.saved=true;if(this.isFormSubmitted&&t.formNode&&!t.config.submitEventName){BX.submit(t.formNode)}this.current.inputNode.checked=true;this.current=null;BX.onCustomEvent(t,this.events.afterAccepted,[t]);BX.onCustomEvent(this,this.events.afterAccepted,[t])}))},onRefused:function(){BX.onCustomEvent(this.current,this.events.refused,[this.current]);BX.onCustomEvent(this,this.events.refused,[this.current]);this.current.inputNode.checked=false;this.current=null;this.isFormSubmitted=false},initPopup:function(){if(this.popup){return}this.popup={}},popup:{isInit:false,caller:null,nodes:{container:null,shadow:null,head:null,loader:null,content:null,textarea:null,buttonAccept:null,buttonReject:null},onAccept:function(){this.hide();BX.onCustomEvent(this,"accept",[])},onReject:function(){this.hide();BX.onCustomEvent(this,"reject",[])},init:function(){if(this.isInit){return true}var t=document.querySelector("div[data-bx-template]");if(!t){return false}var e=document.createElement("DIV");e.innerHTML=t.innerHTML;e=e.children[0];if(!e){return false}document.body.insertBefore(e,document.body.children[0]);this.isInit=true;this.nodes.container=e;this.nodes.shadow=this.nodes.container.querySelector("[data-bx-shadow]");this.nodes.head=this.nodes.container.querySelector("[data-bx-head]");this.nodes.loader=this.nodes.container.querySelector("[data-bx-loader]");this.nodes.content=this.nodes.container.querySelector("[data-bx-content]");this.nodes.textarea=this.nodes.container.querySelector("[data-bx-textarea]");this.nodes.link=this.nodes.container.querySelector("[data-bx-link]");this.nodes.linkA=this.nodes.link?this.nodes.link.querySelector("a"):null;this.nodes.buttonAccept=this.nodes.container.querySelector("[data-bx-btn-accept]");this.nodes.buttonReject=this.nodes.container.querySelector("[data-bx-btn-reject]");this.nodes.buttonAccept.textContent=BX.message(this.caller.msg.btnAccept);this.nodes.buttonReject.textContent=BX.message(this.caller.msg.btnReject);BX.bind(this.nodes.buttonAccept,"click",this.onAccept.bind(this));BX.bind(this.nodes.buttonReject,"click",this.onReject.bind(this));return true},setTitle:function(t){if(!this.nodes.head){return}this.nodes.head.innerHTML=t},setContent:function(t){if(!this.nodes.textarea){return}this.nodes.textarea.innerHTML=t;this.nodes.link.style.display="none";this.nodes.textarea.style.display=""},setUrl:function(t){if(!this.nodes.link){return}this.nodes.linkA.textContent=t;this.nodes.linkA.href=t;this.nodes.link.style.display="";this.nodes.textarea.style.display="none"},show:function(t){if(typeof t=="boolean"){this.nodes.loader.style.display=!t?"":"none";this.nodes.content.style.display=t?"":"none"}this.nodes.container.style.display=""},hide:function(){this.nodes.container.style.display="none"}},cache:{list:[],stringifyKey:function(t){return BX.type.isString(t)?t:JSON.stringify({key:t})},set:function(t,e){var n=this.get(t);if(n){n.data=e}else{this.list.push({key:this.stringifyKey(t),data:e})}},getData:function(t){var e=this.get(t);return e?e.data:null},get:function(t){t=this.stringifyKey(t);var e=this.list.filter((function(e){return e.key==t}));return e.length>0?e[0]:null},has:function(t){return!!this.get(t)}},requestConsent:function(t,e,n,i){e=e||{};e.id=t;var s=this.cache.stringifyKey(e);if(!this.popup.isInit){this.popup.caller=this;if(!this.popup.init()){return}BX.addCustomEvent(this.popup,"accept",n.bind(this));BX.addCustomEvent(this.popup,"reject",i.bind(this))}if(this.current&&this.current.config.text){this.cache.set(s,this.current.config.text)}if(this.current&&this.current.config.url){this.setTextToPopup("",this.current.config.url)}else if(this.cache.has(s)){this.setTextToPopup(this.cache.getData(s))}else{this.popup.setTitle(BX.message(this.msg.loading));this.popup.show(false);BX.ajax.runAction("main.agreement.get",{data:e}).then((t=>{this.cache.set(s,t.data.content.html||"");this.setTextToPopup(this.cache.getData(s))})).catch((()=>{this.popup.hide();alert(BX.message(this.msg.errTextLoad))}))}},setTextToPopup:function(t,e){var n="";var i=t.indexOf("\n");var s=t.indexOf(".");i=i<s?i:s;if(i>=0&&i<=100){n=t.substr(0,i).trim();n=n.split(".").map(Function.prototype.call,String.prototype.trim).filter(String)[0]}this.popup.setTitle(n?n:BX.message(this.msg.title));if(e){this.popup.setUrl(e)}else{this.popup.setContent(t)}this.popup.show(true)},saveConsent:function(t,e){this.setCurrent(t);var n={id:t.config.id,sec:t.config.sec,url:window.location.href};if(t.config.originId){var i=t.config.originId;if(t.formNode&&i.indexOf("%")>=0){var s=t.formNode.querySelectorAll('input[type="text"], input[type="hidden"]');s=BX.convert.nodeListToArray(s);s.forEach((function(t){if(!t.name){return}i=i.replace("%"+t.name+"%",t.value?t.value:"")}))}n.originId=i}if(t.config.originatorId){n.originatorId=t.config.originatorId}BX.onCustomEvent(t,this.events.save,[n]);BX.onCustomEvent(this,this.events.save,[t,n]);if(t.saved||!t.config.autoSave){if(e){e.apply(this,[])}}else{this.sendActionRequest("saveConsent",n,e,e)}},sendActionRequest:function(t,e,n,i){n=n||null;i=i||null;e.action=t;e.sessid=BX.bitrix_sessid();e.action=t;BX.ajax({url:this.actionRequestUrl,method:"POST",data:e,timeout:10,dataType:"json",processData:true,onsuccess:BX.proxy((function(t){t=t||{};if(t.error){i.apply(this,[t])}else if(n){n.apply(this,[t])}}),this),onfailure:BX.proxy((function(){var t={error:true,text:""};if(i){i.apply(this,[t])}}),this)})}};BX.ready((function(){BX.UserConsent.loadFromForms()}))})();
/* End */
;; /* /local/templates/main/js/home-page.js?178637016314094*/
; /* /local/templates/main/components/bitrix/news.list/company_history/script.js?178670675318994*/
; /* /bitrix/components/bitrix/main.userconsent.request/templates/.default/user_consent.min.js?17695912748434*/

//# sourceMappingURL=page_f40dd8a9cf3d42c677b6479f5715a549.map.js