
; /* Start:"a:4:{s:4:"full";s:64:"/local/templates/main/js/unified-request-form.js?178670675385592";s:6:"source";s:48:"/local/templates/main/js/unified-request-form.js";s:3:"min";s:0:"";s:3:"map";s:0:"";}"*/

(function () {
  if (window.__unifiedRequestFormBound) {
    return;
  }
  window.__unifiedRequestFormBound = true;

  const SCENARIOS = ["home", "connect_us", "write_to_us", "portfolio", "rooms_show", "request_show"];

  function parseScenarios(attr) {
    if (!attr || typeof attr !== "string") {
      return [];
    }
    return attr
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  function blockMatches(block, scenario) {
    const raw = block.getAttribute("data-unified-scenarios") || "";
    if (raw === "*") {
      return true;
    }
    const list = parseScenarios(raw);
    if (!list.length) {
      return false;
    }
    return list.indexOf(scenario) !== -1;
  }

  function setHiddenDisabled(root, hidden) {
    const fields = root.querySelectorAll("input, select, textarea, button");
    for (let i = 0; i < fields.length; i++) {
      const el = fields[i];
      if (hidden) {
        el.setAttribute("data-unified-was-required", el.required ? "1" : "0");
        el.required = false;
        el.setAttribute("disabled", "disabled");
      } else {
        el.removeAttribute("disabled");
        const was = el.getAttribute("data-unified-was-required");
        if (was === "1") {
          el.required = true;
        }
        el.removeAttribute("data-unified-was-required");
      }
    }
  }

  function parseWatchValues(raw) {
    if (!raw || typeof raw !== "string") {
      return [];
    }
    return raw
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  function scenarioBlockVisibleForForm(form, el) {
    let p = el.parentElement;
    while (p && p !== form) {
      if (p.getAttribute && p.getAttribute("data-unified-scenarios")) {
        if (p.classList.contains("unified-request-form__block--hidden")) {
          return false;
        }
      }
      p = p.parentElement;
    }
    return true;
  }

  function getChipGroupSymbol(form, targetEl) {
    if (!targetEl) {
      return "";
    }
    if (targetEl.getAttribute && targetEl.getAttribute("data-demo-chip-radios") === "Y") {
      const checked = targetEl.querySelector('input[type="radio"]:checked');
      if (!checked) {
        return "";
      }
      const wrap = checked.closest("[data-demo-type-value]");
      if (wrap) {
        return (wrap.getAttribute("data-demo-type-value") || "").trim();
      }
      return "";
    }
    if (typeof targetEl.value === "string") {
      return targetEl.value.trim();
    }
    return "";
  }

  function findChipHiddenTarget(form, rawSel) {
    const sel = (rawSel || "").trim();
    if (!sel) {
      return null;
    }
    try {
      const bySel = form.querySelector(sel);
      if (bySel) {
        return bySel;
      }
    } catch (errSel) {}
    if (sel.charAt(0) === "#") {
      const bareId = sel.slice(1).trim();
      if (bareId) {
        if (typeof CSS !== "undefined" && CSS.escape) {
          try {
            const byEsc = form.querySelector("#" + CSS.escape(bareId));
            if (byEsc) {
              return byEsc;
            }
          } catch (errEsc) {}
        }
        try {
          return form.querySelector('[id="' + bareId.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"]');
        } catch (errId) {}
      }
    }
    return null;
  }

  function isUnifiedFormStepVisible(form, stepEl) {
    if (!form || !stepEl || !form.contains(stepEl)) {
      return false;
    }
    let p = stepEl.parentElement;
    while (p && p !== form) {
      if (p.classList && p.classList.contains("unified-request-form__block--hidden")) {
        return false;
      }
      p = p.parentElement;
    }
    return true;
  }

  function syncFormStepIndexes(form) {
    if (!form) {
      return;
    }
    const steps = form.querySelectorAll(".home-page__form-step");
    let n = 0;
    for (let i = 0; i < steps.length; i++) {
      if (!isUnifiedFormStepVisible(form, steps[i])) {
        continue;
      }
      n += 1;
      const badge = steps[i].querySelector(".home-page__form-step-index");
      if (badge) {
        badge.textContent = String(n);
      }
    }
  }

  function isFormStepMarkerVisible(form, stepEl) {
    return isUnifiedFormStepVisible(form, stepEl);
  }

  function stepMarkerComesBefore(marker, node) {
    if (!marker || !node) {
      return false;
    }
    const pos = marker.compareDocumentPosition(node);
    return (pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  }

  function getVisibleFormStepMarkers(form) {
    if (!form) {
      return [];
    }
    const all = form.querySelectorAll(".home-page__form-step");
    const out = [];
    for (let i = 0; i < all.length; i++) {
      if (isFormStepMarkerVisible(form, all[i])) {
        out.push(all[i]);
      }
    }
    if (out.length) {
      return out;
    }
    const groups = form.querySelectorAll(
      ".unified-request-form__block.home-page__form-group"
    );
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      if (!isUnifiedFormStepVisible(form, group)) {
        continue;
      }
      const stepEl = group.querySelector(".home-page__form-step");
      if (stepEl && isFormStepMarkerVisible(form, stepEl)) {
        out.push(stepEl);
      }
    }
    return out;
  }

  function getFormStepIndexForNode(form, node) {
    const steps = getVisibleFormStepMarkers(form);
    if (!steps.length || !node || !form.contains(node)) {
      return 0;
    }
    let idx = 0;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].contains(node) || stepMarkerComesBefore(steps[i], node)) {
        idx = i;
      }
    }
    return idx;
  }

  function syncFormStepErrorMarkers(form, root) {
    if (!form || !root) {
      return;
    }
    const steps = getVisibleFormStepMarkers(form);
    for (let i = 0; i < steps.length; i++) {
      let hasError = false;
      const errBlocks = root.querySelectorAll("[data-field-sid].unified-request-form__field--error");
      for (let j = 0; j < errBlocks.length; j++) {
        if (getFormStepIndexForNode(form, errBlocks[j]) === i) {
          hasError = true;
          break;
        }
      }
      steps[i].classList.toggle("home-page__form-step--has-error", hasError);
    }
  }

  function beginLayoutScrollSuppress() {
    try {
      window.dispatchEvent(
        new CustomEvent("demo-layout-scroll-suppress", {
          detail: { active: true },
        })
      );
    } catch (errSuppressBegin) {}
  }

  function endLayoutScrollSuppress() {
    try {
      window.dispatchEvent(
        new CustomEvent("demo-layout-scroll-suppress", {
          detail: { active: false },
        })
      );
    } catch (errSuppressEnd) {}
  }

  function findFormTypeSwitchAnchor(form) {
    if (!form) {
      return null;
    }
    // Якорь — блок с переключателем TYPE (шаг 1). Иначе после «Жилое»
    // самым видимым часто становится блок контактов, и scrollBy удерживает
    // шаг 3 на месте — визуально «отбрасывает» на контакты.
    const typeBox = form.querySelector('[data-demo-connect-type="Y"]');
    if (typeBox) {
      const typeBlock = typeBox.closest(".unified-request-form__block");
      if (typeBlock) {
        return typeBlock;
      }
      const typeChoice = typeBox.closest(".home-page__form-choice");
      if (typeChoice) {
        return typeChoice;
      }
      return typeBox;
    }
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
    const blocks = form.querySelectorAll(".unified-request-form__block:not(.unified-request-form__block--hidden)");
    let best = null;
    let bestVisible = 0;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.hasAttribute("data-demo-step-type-block")) {
        continue;
      }
      const rect = block.getBoundingClientRect();
      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(viewportH, rect.bottom);
      const visible = Math.max(0, visibleBottom - visibleTop);
      if (visible > bestVisible) {
        bestVisible = visible;
        best = block;
      }
    }
    if (best) {
      return best;
    }
    return form.closest(".portfolio-detail-page__cta-inner") || form;
  }

  function withStableFormTypeSwitch(form, run) {
    const anchor = findFormTypeSwitchAnchor(form);
    const anchorTop = anchor ? anchor.getBoundingClientRect().top : 0;

    beginLayoutScrollSuppress();
    run();

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (anchor) {
          const delta = anchor.getBoundingClientRect().top - anchorTop;
          if (Math.abs(delta) >= 0.5) {
            window.scrollBy(0, delta);
          }
        }

        endLayoutScrollSuppress();
      });
    });
  }

  function applyConditionalWatchers(form) {
    const nodes = form.querySelectorAll("[data-unified-watch-field][data-unified-watch-values]");
    for (let n = 0; n < nodes.length; n++) {
      const node = nodes[n];
      const fieldSelRaw = node.getAttribute("data-unified-watch-field") || "";
      const fieldSelectors = fieldSelRaw
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      const values = parseWatchValues(node.getAttribute("data-unified-watch-values") || "");
      let match = false;
      for (let s = 0; s < fieldSelectors.length; s++) {
        const watchInput = findChipHiddenTarget(form, fieldSelectors[s]);
        const current = getChipGroupSymbol(form, watchInput);
        for (let v = 0; v < values.length; v++) {
          if (values[v] === current) {
            match = true;
            break;
          }
        }
        if (match) {
          break;
        }
      }
      const inVisibleScenarioBlock = scenarioBlockVisibleForForm(form, node);
      const effectiveShow = match && inVisibleScenarioBlock;
      node.classList.toggle("unified-request-form__block--hidden", !effectiveShow);
      node.setAttribute("aria-hidden", effectiveShow ? "false" : "true");
      setHiddenDisabled(node, !effectiveShow);
    }
  }

  function applyScenario(form, scenario) {
    if (SCENARIOS.indexOf(scenario) === -1) {
      scenario = "home";
    }

    const hiddenScenario = form.querySelector('[data-unified-role="scenario-value"]');
    if (hiddenScenario) {
      hiddenScenario.value = scenario;
    }

    const blocks = form.querySelectorAll("[data-unified-scenarios]");
    for (let b = 0; b < blocks.length; b++) {
      const block = blocks[b];
      const show = blockMatches(block, scenario);
      block.classList.toggle("unified-request-form__block--hidden", !show);
      block.setAttribute("aria-hidden", show ? "false" : "true");
      setHiddenDisabled(block, !show);
    }

    form.setAttribute("data-unified-active-scenario", scenario);
    applyConditionalWatchers(form);
    syncFormStepIndexes(form);
  }

  let unifiedProfileComboDocBound = false;

  function bindProfileComboDocumentOnce() {
    if (unifiedProfileComboDocBound) {
      return;
    }
    unifiedProfileComboDocBound = true;
    document.addEventListener("mousedown", function (e) {
      const open = document.querySelectorAll(".unified-request-form__profile-combobox.is-open");
      for (let i = 0; i < open.length; i++) {
        const bx = open[i];
        if (!bx.contains(e.target)) {
          const fn = bx._ufProfileClose;
          if (typeof fn === "function") {
            fn();
          }
        }
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") {
        return;
      }
      const open = document.querySelectorAll(".unified-request-form__profile-combobox.is-open");
      for (let i = 0; i < open.length; i++) {
        const fn = open[i]._ufProfileClose;
        if (typeof fn === "function") {
          fn();
        }
        const tr = open[i].querySelector("[data-unified-profile-trigger]");
        if (tr) {
          try {
            tr.focus();
          } catch (err) {}
        }
      }
    });
  }

  function matchesProfilePrefix(label, query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) {
      return true;
    }
    return String(label).toLowerCase().indexOf(q) === 0;
  }

  function initProfileComboboxes(form) {
    bindProfileComboDocumentOnce();
    const boxes = form.querySelectorAll("[data-unified-profile-combobox]");
    for (let b = 0; b < boxes.length; b++) {
      (function (box) {
        const trigger = box.querySelector("[data-unified-profile-trigger]");
        const hidden = box.querySelector("[data-unified-profile-hidden]");
        const dd = box.querySelector("[data-unified-profile-dropdown]");
        const search = box.querySelector("[data-unified-profile-search]");
        const list = box.querySelector(".unified-request-form__profile-combobox__list");
        const empty = box.querySelector("[data-unified-profile-empty]");
        const ph = box.querySelector("[data-unified-caption-placeholder]");
        const capVal = box.querySelector("[data-unified-caption-value]");
        if (!(trigger && hidden && dd && search && list && empty && ph && capVal)) {
          return;
        }

        const options = list.querySelectorAll("[data-unified-profile-option]");

        function selectedLabel() {
          const hv = String(hidden.value || "").trim();
          if (!hv) {
            return "";
          }
          for (let i = 0; i < options.length; i++) {
            if (String(options[i].getAttribute("data-value") || "") === hv) {
              const labEl = options[i].querySelector(".unified-request-form__profile-combobox__label");
              return labEl ? String(labEl.textContent || "").trim() : "";
            }
          }
          return "";
        }

        function syncCaption() {
          const label = selectedLabel();
          if (label) {
            ph.hidden = true;
            capVal.hidden = false;
            capVal.textContent = label;
            return;
          }
          ph.hidden = false;
          capVal.hidden = true;
          capVal.textContent = "";
        }

        function setSelectedOption(btn) {
          for (let i = 0; i < options.length; i++) {
            options[i].classList.remove("is-selected");
          }
          if (btn) {
            btn.classList.add("is-selected");
          }
        }

        function applyFilter() {
          const q = search.value || "";
          let any = false;
          for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const labEl = opt.querySelector(".unified-request-form__profile-combobox__label");
            const lab = labEl ? labEl.textContent : "";
            const ok = matchesProfilePrefix(lab, q);
            opt.hidden = !ok;
            if (ok) {
              any = true;
            }
          }
          const showEmpty = !!String(q).trim() && !any;
          empty.hidden = !showEmpty;
        }

        function closeD() {
          box.classList.remove("is-open");
          dd.hidden = true;
          trigger.setAttribute("aria-expanded", "false");
          search.value = "";
          for (let i = 0; i < options.length; i++) {
            options[i].hidden = false;
          }
          empty.hidden = true;
        }

        function openD() {
          box.classList.add("is-open");
          dd.hidden = false;
          trigger.setAttribute("aria-expanded", "true");
          search.value = "";
          applyFilter();
          try {
            search.focus();
          } catch (e) {}
        }

        function toggleD() {
          if (dd.hidden) {
            openD();
          } else {
            closeD();
          }
        }

        box._ufProfileClose = closeD;

        trigger.addEventListener("click", function (ev) {
          if (trigger.disabled) {
            return;
          }
          ev.preventDefault();
          toggleD();
        });

        search.addEventListener("input", applyFilter);
        search.addEventListener("click", function (e) {
          e.stopPropagation();
        });

        for (let j = 0; j < options.length; j++) {
          (function (optBtn) {
            optBtn.addEventListener("click", function (e) {
              e.preventDefault();
              e.stopPropagation();
              const val = optBtn.getAttribute("data-value") || "";
              const labNode = optBtn.querySelector(".unified-request-form__profile-combobox__label");
              hidden.value = val;
              setSelectedOption(optBtn);
              syncCaption();
              closeD();
              try {
                form.dispatchEvent(
                  new CustomEvent("unifiedprofilechange", {
                    bubbles: false,
                    detail: {
                      fieldName: hidden.name || "",
                      value: val,
                      label: labNode ? labNode.textContent : "",
                    },
                  })
                );
              } catch (err) {}
              applyConditionalWatchers(form);
              syncFormStepIndexes(form);
            });
          })(options[j]);
        }

        const hv = String(hidden.value || "").trim();
        if (hv) {
          for (let k = 0; k < options.length; k++) {
            if (String(options[k].getAttribute("data-value") || "") === hv) {
              setSelectedOption(options[k]);
              break;
            }
          }
        }
        syncCaption();
        box._ufProfileSyncCaption = syncCaption;
        box._ufProfileReset = function () {
          hidden.value = "";
          setSelectedOption(null);
          syncCaption();
          closeD();
        };
      })(boxes[b]);
    }
  }

  function resetProfileComboboxes(form) {
    const boxes = form.querySelectorAll("[data-unified-profile-combobox]");
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (typeof box._ufProfileReset === "function") {
        box._ufProfileReset();
        continue;
      }
      const hidden = box.querySelector("[data-unified-profile-hidden]");
      const ph = box.querySelector("[data-unified-caption-placeholder]");
      const capVal = box.querySelector("[data-unified-caption-value]");
      const options = box.querySelectorAll("[data-unified-profile-option]");
      if (hidden) {
        hidden.value = "";
      }
      for (let o = 0; o < options.length; o++) {
        options[o].classList.remove("is-selected");
      }
      if (ph && capVal) {
        ph.hidden = false;
        capVal.hidden = true;
        capVal.textContent = "";
      }
    }
  }

  function fileDedupeKey(file) {
    return file.name + "\0" + file.size + "\0" + file.lastModified;
  }

  function truncateFileNameDisplay(name, maxChars) {
    const str = String(name || "");
    const max = maxChars > 0 ? maxChars : 15;
    if (str.length <= max) {
      return str;
    }
    return str.slice(0, max) + "…";
  }

  function setInputFilesFromFileArray(input, files) {
    const dt = new DataTransfer();
    for (let i = 0; i < files.length; i++) {
      try {
        dt.items.add(files[i]);
      } catch (err) {}
    }
    input.files = dt.files;
  }

  function initFileAttachLists(form) {
    const wraps = form.querySelectorAll("[data-unified-file-attach]");
    const demoRoot = getDemoRoot(form);
    const cfg = demoRoot ? getDemoConfig(demoRoot) : {};
    for (let w = 0; w < wraps.length; w++) {
      (function (wrap) {
        if (wrap._ufFileAttachInit) {
          return;
        }
        wrap._ufFileAttachInit = true;

        let max = parseInt(wrap.getAttribute("data-unified-file-max") || "10", 10);
        if (!max || max < 1 || max > 50) {
          max = 10;
        }
        // ТЗ: 1 файл
        if (max > 1) {
          max = 1;
        }
        const input = wrap.querySelector("[data-unified-file-input]");
        const listEl = wrap.querySelector("[data-unified-file-list]");
        const attachBtn = wrap.querySelector(".unified-request-form__file-field--attach");
        if (!input || !listEl) {
          return;
        }
        input.setAttribute(
          "accept",
          ".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        );

        wrap._ufStoredFiles = [];
        let loadDelayTimer = null;
        let pickerOpen = false;

        function setAttachLoading(on) {
          if (!attachBtn) {
            return;
          }
          if (loadDelayTimer) {
            clearTimeout(loadDelayTimer);
            loadDelayTimer = null;
          }
          if (on) {
            if (!attachBtn.style.minWidth) {
              attachBtn.style.minWidth = attachBtn.offsetWidth + "px";
            }
            attachBtn.classList.add("is-loading");
            attachBtn.setAttribute("aria-busy", "true");
          } else {
            attachBtn.classList.remove("is-loading");
            attachBtn.removeAttribute("aria-busy");
            if (!wrap._ufFileUploading) {
              attachBtn.style.minWidth = "";
            }
          }
        }

        function scheduleAttachLoading() {
          if (!attachBtn || attachBtn.classList.contains("is-loading")) {
            return;
          }
          if (loadDelayTimer) {
            clearTimeout(loadDelayTimer);
          }
          loadDelayTimer = setTimeout(function () {
            loadDelayTimer = null;
            setAttachLoading(true);
          }, 200);
        }

        function fieldBlock() {
          return (
            wrap.closest("[data-field-sid]") ||
            wrap.closest(".home-page__form-choice") ||
            wrap
          );
        }

        function render() {
          const files = wrap._ufStoredFiles;
          while (listEl.firstChild) {
            listEl.removeChild(listEl.firstChild);
          }
          if (!files.length) {
            listEl.hidden = true;
            return;
          }
          listEl.hidden = false;
          for (let i = 0; i < files.length; i++) {
            (function (idx, file) {
              const li = document.createElement("li");
              li.className = "unified-request-form__file-list__item";
              li.setAttribute("data-file-index", String(idx));
              const doc = document.createElement("span");
              doc.className = "unified-request-form__file-list__doc";
              doc.setAttribute("aria-hidden", "true");
              const nameSpan = document.createElement("span");
              nameSpan.className = "unified-request-form__file-list__name";
              nameSpan.textContent = truncateFileNameDisplay(file.name, 15);
              nameSpan.title = file.name;
              const rm = document.createElement("button");
              rm.type = "button";
              rm.className = "unified-request-form__file-list__remove";
              rm.setAttribute("aria-label", "Удалить «" + file.name + "»");
              rm.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                const ix = parseInt(li.getAttribute("data-file-index") || "-1", 10);
                if (ix < 0 || ix >= wrap._ufStoredFiles.length) {
                  return;
                }
                wrap._ufStoredFiles.splice(ix, 1);
                setInputFilesFromFileArray(input, wrap._ufStoredFiles);
                const block = fieldBlock();
                if (block) {
                  setFieldError(block, "");
                }
                render();
                if (demoRoot) {
                  syncSubmitEnabled(demoRoot, form);
                }
              });
              li.appendChild(doc);
              li.appendChild(nameSpan);
              li.appendChild(rm);
              listEl.appendChild(li);
            })(i, files[i]);
          }
        }

        function processIncomingFiles() {
          const incoming = Array.prototype.slice.call(input.files || [], 0);
          const block = fieldBlock();
          let stored = [];
          let rejectMsg = "";
          for (let n = 0; n < incoming.length; n++) {
            const fileErr = getFileValidationError(incoming[n], cfg);
            if (fileErr) {
              rejectMsg = fileErr;
              continue;
            }
            stored.push(incoming[n]);
          }
          if (stored.length > max) {
            stored = stored.slice(0, max);
          }
          wrap._ufStoredFiles = stored;
          setInputFilesFromFileArray(input, stored);
          if (block) {
            setFieldError(block, rejectMsg || "");
          }
          render();
          if (demoRoot) {
            syncSubmitEnabled(demoRoot, form);
          }
        }

        input.addEventListener("click", function () {
          pickerOpen = true;
          scheduleAttachLoading();
        });

        input.addEventListener("cancel", function () {
          pickerOpen = false;
          setAttachLoading(false);
        });

        input.addEventListener("change", function () {
          pickerOpen = false;
          const incoming = input.files || [];
          const heavy =
            incoming.length > 0 &&
            Array.prototype.some.call(incoming, function (f) {
              return f && f.size > 512 * 1024;
            });
          if (heavy || (attachBtn && attachBtn.classList.contains("is-loading"))) {
            setAttachLoading(true);
            requestAnimationFrame(function () {
              setTimeout(function () {
                try {
                  processIncomingFiles();
                } finally {
                  if (!wrap._ufFileUploading) {
                    setAttachLoading(false);
                  }
                }
              }, 0);
            });
            return;
          }
          setAttachLoading(false);
          processIncomingFiles();
        });

        // Диалог закрыли без выбора (нет cancel в старых браузерах)
        window.addEventListener("focus", function () {
          if (!pickerOpen || wrap._ufFileUploading) {
            return;
          }
          setTimeout(function () {
            if (!pickerOpen || wrap._ufFileUploading) {
              return;
            }
            pickerOpen = false;
            setAttachLoading(false);
          }, 350);
        });

        wrap._ufSetAttachLoading = setAttachLoading;

        render();
      })(wraps[w]);
    }
  }

  function activateUnifiedChipGroup(form, group, hidden, activeBtn) {
    const targetSel = (group.getAttribute("data-unified-chip-target") || "").trim();
    const buttons = group.querySelectorAll('button[type="button"][data-unified-chip-value]');
    const symbol = activeBtn ? activeBtn.getAttribute("data-unified-chip-value") || "" : "";
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].classList.remove("is-active");
      buttons[i].setAttribute("aria-pressed", "false");
    }
    if (activeBtn) {
      activeBtn.classList.add("is-active");
      activeBtn.setAttribute("aria-pressed", "true");
    }
    if (hidden.getAttribute && hidden.getAttribute("data-demo-chip-radios") === "Y") {
      const spans = hidden.querySelectorAll("[data-demo-type-value]");
      for (let s = 0; s < spans.length; s++) {
        const span = spans[s];
        const val = span.getAttribute("data-demo-type-value") || "";
        const radio = span.querySelector('input[type="radio"]');
        if (!radio) {
          continue;
        }
        const match = symbol !== "" && val === symbol;
        radio.checked = match;
        if (match) {
          try {
            radio.dispatchEvent(new Event("change", { bubbles: true }));
          } catch (errRadio) {}
        }
      }
    } else if (activeBtn) {
      hidden.value = symbol;
    } else {
      hidden.value = "";
    }
    const isConnectType = hidden.getAttribute && hidden.getAttribute("data-demo-connect-type") === "Y";
    const finishChipActivation = function () {
      try {
        form.dispatchEvent(
          new CustomEvent("unifiedchipchange", {
            bubbles: false,
            detail: {
              targetSelector: targetSel,
              fieldName: hidden.name || "",
              value: hidden.value,
            },
          })
        );
      } catch (err) {}
      applyConditionalWatchers(form);
      syncFormStepIndexes(form);
    };
    if (isConnectType) {
      withStableFormTypeSwitch(form, finishChipActivation);
    } else {
      finishChipActivation();
    }
  }

  function bindUnifiedChipDelegation(form) {
    if (form._ufUnifiedChipDelegation) {
      return;
    }
    form._ufUnifiedChipDelegation = true;
    form.addEventListener("click", function (ev) {
      const chip = ev.target.closest('button[type="button"][data-unified-chip-value]');
      if (!chip || chip.disabled || !form.contains(chip)) {
        return;
      }
      const group = chip.closest("[data-unified-chip-target]");
      if (!group || !form.contains(group)) {
        return;
      }
      const hidden = findChipHiddenTarget(form, group.getAttribute("data-unified-chip-target"));
      if (!hidden) {
        return;
      }
      activateUnifiedChipGroup(form, group, hidden, chip);
    });
  }

  function initChipGroup(form, group) {
    const hidden = findChipHiddenTarget(form, group.getAttribute("data-unified-chip-target"));
    if (!hidden) {
      return;
    }
    const defaultBtn = group.querySelector("button[data-unified-chip-default]");
    if (defaultBtn) {
      activateUnifiedChipGroup(form, group, hidden, defaultBtn);
    } else {
      activateUnifiedChipGroup(form, group, hidden, null);
    }
  }

  const DEMO_HIDDEN_CLASS = "unified-request-form__block--hidden";

  function getDemoRoot(form) {
    return form.closest('[data-demo-webform="Y"]');
  }

  function getFormValidationRoot(form) {
    if (!form) {
      return null;
    }
    const demoRoot = getDemoRoot(form);
    if (demoRoot) {
      return demoRoot;
    }
    const unifiedRoot = form.closest(".unified-request-form");
    return unifiedRoot || form;
  }

  function getDemoConfig(root) {
    const raw = root.getAttribute("data-demo-config") || "{}";
    try {
      return JSON.parse(raw);
    } catch (eCfg) {
      return {};
    }
  }

  function getSelectedTypeSymbol(root) {
    const typeField = (root.getAttribute("data-demo-type-field") || "").trim();
    if (!typeField) {
      return "";
    }
    const box = root.querySelector('[data-demo-connect-type="Y"]');
    if (!box) {
      return "";
    }
    const checked = box.querySelector('input[type="radio"]:checked');
    if (!checked) {
      return "";
    }
    const wrap = checked.closest("[data-demo-type-value]");
    if (wrap) {
      return (wrap.getAttribute("data-demo-type-value") || "").trim();
    }
    return "";
  }

  function applyDemoTypeVisibility(root, selected) {
    if (root.getAttribute("data-demo-use-type") !== "Y") {
      return;
    }
    root.querySelectorAll("[data-demo-types]").forEach(function (el) {
      const raw = el.getAttribute("data-demo-types") || "";
      const types = raw.split(",").map(function (s) {
        return s.trim();
      }).filter(Boolean);
      const show = selected !== "" && types.indexOf(selected) !== -1;
      el.classList.toggle(DEMO_HIDDEN_CLASS, !show);
      el.setAttribute("aria-hidden", show ? "false" : "true");
      setHiddenDisabled(el, !show);
    });
    applyConditionalWatchers(root.querySelector("form[data-unified-form]") || root);
    syncWriteToUsTypeStepBlock(root);
    syncWriteToUsResidentialLayout(root);
    syncWriteToUsStep2Title(root);
    const form = root.querySelector("form[data-unified-form]") || root.querySelector("form");
    if (form) {
      syncFormStepIndexes(form);
    }
  }

  function syncWriteToUsTypeStepBlock(root) {
    if (!root) {
      return;
    }
    const block = root.querySelector("[data-demo-step-type-block]");
    if (!block) {
      return;
    }
    const type = getSelectedTypeSymbol(root);
    const show = type === "OFFICE" || type === "RETAIL";
    block.classList.toggle("unified-request-form__block--hidden", !show);
    block.setAttribute("aria-hidden", show ? "false" : "true");
    setHiddenDisabled(block, !show);
  }

  function syncWriteToUsResidentialLayout(root) {
    if (!root) {
      return;
    }
    const form = root.querySelector("form");
    if (!form) {
      return;
    }
    const contactsBlocks = form.querySelectorAll(".home-page__form-group_contacts");
    const isResidential = getSelectedTypeSymbol(root) === "RESIDENTIAL";
    for (let i = 0; i < contactsBlocks.length; i++) {
      contactsBlocks[i].classList.toggle("unified-request-form__contacts--residential", isResidential);
    }
  }

  function syncWriteToUsStep2Title(root) {
    if (!root) {
      return;
    }
    const titleEl = root.querySelector("[data-demo-step-title-dynamic]");
    if (!titleEl) {
      return;
    }
    const type = getSelectedTypeSymbol(root);
    if (type === "RETAIL") {
      titleEl.textContent = titleEl.getAttribute("data-demo-step-title-retail") || titleEl.textContent;
      return;
    }
    titleEl.textContent = titleEl.getAttribute("data-demo-step-title-office") || titleEl.textContent;
  }

  function ensureDemoDefaultRadios(form) {
    const byName = new Map();
    const radios = form.querySelectorAll('input[type="radio"]');
    for (let i = 0; i < radios.length; i++) {
      const input = radios[i];
      const name = input.getAttribute("name");
      if (!name) {
        continue;
      }
      if (!byName.has(name)) {
        byName.set(name, []);
      }
      byName.get(name).push(input);
    }
    byName.forEach(function (list) {
      const active = list.filter(function (r) {
        return !r.disabled;
      });
      if (!active.length) {
        return;
      }
      if (active.some(function (r) {
        return r.checked;
      })) {
        return;
      }
      const chipBox = active[0].closest('[data-demo-chip-radios="Y"]');
      if (chipBox) {
        if (chipBox.getAttribute("data-demo-connect-type") === "Y") {
          const officeRadio = chipBox.querySelector('[data-demo-type-value="OFFICE"] input[type="radio"]');
          if (officeRadio) {
            officeRadio.checked = true;
            try {
              officeRadio.dispatchEvent(new Event("change", { bubbles: true }));
            } catch (errOffice) {}
          }
        }
        return;
      }
      active[0].checked = true;
      try {
        active[0].dispatchEvent(new Event("change", { bubbles: true }));
      } catch (errDef) {}
    });
  }

  /* ——— Frontend validation (ТЗ: формы захвата) ——— */
  const FIELD_MAX = {
    COMPANY: 100,
    WEBSITE: 255,
    NAME: 50,
    SURNAME: 50,
    EMAIL: 254,
    COMMENT: 1000,
    MESSAGE: 1000,
    OFFICE_IMPORTANCE: 500,
    OFFICE_BUDGET: 100,
    OFFICE_MOVE_TIME: 100,
    OFFICE_CURRENT_LOCATION: 255,
    COMMERCIAL_MOSCOW_OPEN_POINTS: 4,
    COMMERCIAL_AVERAGE_RECEIPT: 9,
  };

  const FIELD_MIN = {
    COMPANY: 1,
    NAME: 1,
    SURNAME: 1,
  };

  const TEXT_VALIDATE_SIDS = {
    COMPANY: true,
    WEBSITE: true,
    NAME: true,
    SURNAME: true,
    PHONE: true,
    EMAIL: true,
    COMMENT: true,
    MESSAGE: true,
    OFFICE_IMPORTANCE: true,
    OFFICE_BUDGET: true,
    OFFICE_MOVE_TIME: true,
    OFFICE_CURRENT_LOCATION: true,
    COMMERCIAL_MOSCOW_OPEN_POINTS: true,
    COMMERCIAL_AVERAGE_RECEIPT: true,
  };

  const NAME_RE = /^[А-Яа-яЁёA-Za-z]+([ '\-][А-Яа-яЁёA-Za-z]+)*$/;
  const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/;
  const WEBSITE_RE = /^(https?:\/\/)?([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/i;
  const E164_RE = /^\+[1-9]\d{7,14}$/;
  const FILE_MAX_BYTES = 10 * 1024 * 1024;
  const FILE_EXT_RE = /\.(pdf|doc|docx|png|jpe?g)$/i;
  const SUBMIT_TIMEOUT_MS = 30000;

  function msgFromCfg(cfg, key, fallback) {
    if (cfg && cfg.messages && cfg.messages[key]) {
      return cfg.messages[key];
    }
    return fallback;
  }

  function isFieldBlockVisible(block) {
    if (!block) {
      return false;
    }
    if (block.classList.contains(DEMO_HIDDEN_CLASS) || block.getAttribute("aria-hidden") === "true") {
      return false;
    }
    let parent = block.parentElement;
    while (parent) {
      if (
        parent.classList &&
        (parent.classList.contains("visually-hidden") ||
          parent.classList.contains("demo-webform__modal-object-hidden"))
      ) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  }

  function getFieldControl(block) {
    if (!block) {
      return null;
    }
    return block.querySelector(
      'input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]):not([type="file"]):not([type="search"]),textarea'
    );
  }

  function getContactFieldControl(block) {
    return getFieldControl(block);
  }

  function ensureFieldErrorEl(block) {
    let err = block.querySelector(".unified-request-form__field-error");
    if (err) {
      return err;
    }
    err = document.createElement("span");
    err.className = "unified-request-form__field-error";
    err.setAttribute("hidden", "hidden");
    err.setAttribute("role", "alert");

    const fileWrap = block.querySelector
      ? block.querySelector("[data-unified-file-attach]")
      : null;
    const fileChoice =
      (fileWrap && fileWrap.closest(".home-page__form-choice")) ||
      (block.classList && block.classList.contains("home-page__form-choice")
        ? block
        : null);
    if (fileChoice && (fileChoice === block || block.contains(fileChoice))) {
      fileChoice.appendChild(err);
      return err;
    }

    const label = block.querySelector("label.home-page__field");
    if (label && label.parentNode === block) {
      if (label.nextSibling) {
        block.insertBefore(err, label.nextSibling);
      } else {
        block.appendChild(err);
      }
    } else {
      block.appendChild(err);
    }
    return err;
  }

  function setFieldError(block, message) {
    if (!block) {
      return;
    }
    const err = ensureFieldErrorEl(block);
    if (message) {
      err.textContent = message;
      err.removeAttribute("hidden");
      block.classList.add("unified-request-form__field--error");
    } else {
      err.textContent = "";
      err.setAttribute("hidden", "hidden");
      block.classList.remove("unified-request-form__field--error");
    }
    const demoRoot = block.closest('[data-demo-webform="Y"]');
    const validationRoot =
      demoRoot || block.closest(".unified-request-form") || block.closest("form");
    if (validationRoot) {
      const form = validationRoot.querySelector("form") || block.closest("form");
      if (form) {
        syncFormStepErrorMarkers(form, validationRoot);
      }
    }
  }

  function clearFieldErrors(root) {
    root.querySelectorAll(".unified-request-form__field--error").forEach(function (n) {
      n.classList.remove("unified-request-form__field--error");
    });
    root.querySelectorAll(".unified-request-form__field-error").forEach(function (n) {
      n.textContent = "";
      n.setAttribute("hidden", "hidden");
    });
    const form = root.querySelector("form");
    if (form) {
      form.querySelectorAll(".home-page__form-step--has-error").forEach(function (n) {
        n.classList.remove("home-page__form-step--has-error");
      });
    }
  }

  function stripControlChars(value) {
    return String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  }

  function normalizeTextValue(value) {
    return stripControlChars(value).replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ");
  }

  function forbidHtmlChars(value) {
    return String(value || "").replace(/[<>]/g, "");
  }

  function preventLeadingSpace(value) {
    return String(value || "").replace(/^\s+/, "");
  }

  function phoneDigitsOnly(value) {
    return String(value || "").replace(/\D+/g, "");
  }

  function normalizePhoneDigits(digits) {
    let d = phoneDigitsOnly(digits);
    if (!d) {
      return "";
    }
    if (d.charAt(0) === "8") {
      d = "7" + d.slice(1);
    }
    if (d.charAt(0) !== "7") {
      d = "7" + d;
    }
    return d.slice(0, 11);
  }

  function toE164Phone(value) {
    const d = normalizePhoneDigits(value);
    return d ? "+" + d : "";
  }

  function formatPhoneMask(digits) {
    const d = normalizePhoneDigits(digits);
    if (!d) {
      return "";
    }
    let out = "+7";
    const local = d.slice(1);
    if (local.length > 0) {
      out += " (" + local.slice(0, Math.min(3, local.length));
      if (local.length >= 3) {
        out += ")";
      }
    }
    if (local.length > 3) {
      out += " " + local.slice(3, Math.min(6, local.length));
    }
    if (local.length > 6) {
      out += "-" + local.slice(6, Math.min(8, local.length));
    }
    if (local.length > 8) {
      out += "-" + local.slice(8, Math.min(10, local.length));
    }
    return out;
  }

  function isValidE164Phone(value) {
    const e164 = toE164Phone(value);
    return E164_RE.test(e164) && normalizePhoneDigits(value).length === 11;
  }

  function isValidEmailValue(email) {
    const v = String(email || "").trim();
    if (!v || v.length > 254) {
      return false;
    }
    return EMAIL_RE.test(v);
  }

  function isValidWebsiteValue(website) {
    const v = String(website || "").trim();
    if (!v) {
      return true;
    }
    if (v.length > 255) {
      return false;
    }
    return WEBSITE_RE.test(v);
  }

  function ensureWebsiteScheme(value) {
    const v = normalizeTextValue(value);
    if (!v) {
      return "";
    }
    if (/^https?:\/\//i.test(v)) {
      return v;
    }
    return "https://" + v;
  }

  function capitalizeNameParts(value) {
    const str = String(value || "");
    if (!str) {
      return str;
    }
    return str.replace(/(^|[\s'\-])(\S)/g, function (_m, sep, ch) {
      return sep + ch.toLocaleUpperCase("ru-RU");
    });
  }

  function applyPhoneMaskToInput(input) {
    if (!input) {
      return;
    }
    const masked = formatPhoneMask(input.value);
    if (input.value === masked) {
      return;
    }
    input.value = masked;
    try {
      const pos = masked.length;
      input.setSelectionRange(pos, pos);
    } catch (errCaret) {}
  }

  function maxLengthMessage(cfg, max) {
    const tpl = msgFromCfg(cfg, "maxLengthTpl", "");
    if (tpl && tpl.indexOf("{n}") !== -1) {
      return tpl.replace("{n}", String(max));
    }
    return msgFromCfg(cfg, "maxLength", "Максимум " + max + " символов");
  }

  function getTextFieldError(sid, value, opts) {
    const cfg = (opts && opts.cfg) || {};
    const requireEmpty = !!(opts && opts.requireEmpty);
    const raw = String(value || "");
    const trimmed = normalizeTextValue(raw);
    const max = FIELD_MAX[sid];
    const min = FIELD_MIN[sid];

    if (requireEmpty && !trimmed) {
      if (sid === "COMPANY") {
        return msgFromCfg(cfg, "companyRequired", "Укажите название компании");
      }
      if (sid === "WEBSITE") {
        return msgFromCfg(cfg, "websiteRequired", "Укажите адрес сайта, например company.ru");
      }
      if (sid === "NAME") {
        return msgFromCfg(cfg, "nameRequired", "Укажите имя");
      }
      if (sid === "SURNAME") {
        return msgFromCfg(cfg, "surnameRequired", "Укажите фамилию");
      }
      if (sid === "PHONE") {
        return msgFromCfg(cfg, "phoneRequired", "Укажите телефон");
      }
      if (sid === "EMAIL") {
        return msgFromCfg(cfg, "emailRequired", "Укажите e-mail");
      }
      if (sid === "AREA") {
        return msgFromCfg(cfg, "areaRequired", "Выберите метраж помещения");
      }
      if (sid === "TYPE") {
        return msgFromCfg(cfg, "typeRequired", "Выберите тип помещения");
      }
      if (sid === "COMMERCIAL_OCCUPATION") {
        return msgFromCfg(cfg, "occupationRequired", "Выберите направление деятельности");
      }
      if (sid === "COMMERCIAL_CONCEPT") {
        return msgFromCfg(cfg, "conceptRequired", "Выберите концепцию проекта");
      }
      if (sid === "PRESENTATION" || sid === "COMMERCIAL_PRESENTATION") {
        return msgFromCfg(cfg, "presentationRequired", "Прикрепите презентацию");
      }
      if (
        sid === "OFFICE_IMPORTANCE" ||
        sid === "OFFICE_BUDGET" ||
        sid === "OFFICE_MOVE_TIME" ||
        sid === "OFFICE_CURRENT_LOCATION"
      ) {
        return msgFromCfg(cfg, "requiredField", "Заполните обязательное поле");
      }
      return msgFromCfg(cfg, "requiredField", "Заполните обязательное поле");
    }

    if (!trimmed) {
      return "";
    }

    if (typeof max === "number" && raw.length > max) {
      return maxLengthMessage(cfg, max);
    }

    if (sid === "COMPANY") {
      if (/[<>]/.test(raw)) {
        return msgFromCfg(cfg, "companyRequired", "Укажите название компании");
      }
      if (typeof min === "number" && trimmed.length < min) {
        return msgFromCfg(cfg, "companyRequired", "Укажите название компании");
      }
    }

    if (sid === "NAME" || sid === "SURNAME") {
      if (typeof min === "number" && trimmed.length < min) {
        return sid === "NAME"
          ? msgFromCfg(cfg, "nameRequired", "Укажите имя")
          : msgFromCfg(cfg, "surnameRequired", "Укажите фамилию");
      }
      if (!NAME_RE.test(trimmed)) {
        return msgFromCfg(
          cfg,
          "nameFormat",
          "Допустимы только буквы, пробел, дефис и апостроф"
        );
      }
    }

    if (sid === "PHONE" && !isValidE164Phone(raw)) {
      return msgFromCfg(cfg, "invalidPhone", "Введите корректный номер телефона");
    }

    if (sid === "EMAIL") {
      if (!isValidEmailValue(trimmed)) {
        return msgFromCfg(
          cfg,
          "invalidEmail",
          "Введите корректный e-mail, например name@company.ru"
        );
      }
    }

    if (sid === "WEBSITE" && !isValidWebsiteValue(trimmed)) {
      return msgFromCfg(cfg, "invalidWebsite", "Укажите адрес сайта, например company.ru");
    }

    if (sid === "COMMERCIAL_MOSCOW_OPEN_POINTS") {
      if (!/^\d{1,4}$/.test(trimmed) || Number(trimmed) > 9999) {
        return msgFromCfg(cfg, "digitsOnly", "Укажите количество цифрами");
      }
    }

    if (sid === "COMMERCIAL_AVERAGE_RECEIPT") {
      const digits = trimmed.replace(/\s+/g, "");
      if (!/^\d+$/.test(digits) || digits.length > 9) {
        return msgFromCfg(cfg, "amountDigits", "Укажите сумму цифрами");
      }
    }

    return "";
  }

  function validateTextFieldBlock(block, opts) {
    const sid = (block && block.getAttribute("data-field-sid")) || "";
    if (!TEXT_VALIDATE_SIDS[sid]) {
      return "";
    }
    if (!isFieldBlockVisible(block)) {
      setFieldError(block, "");
      return "";
    }
    const control = getFieldControl(block);
    if (!control) {
      return "";
    }
    const required = block.getAttribute("data-required") === "Y";
    const checkRequired = opts && opts.checkRequired;
    const message = getTextFieldError(sid, control.value, {
      cfg: opts && opts.cfg,
      requireEmpty: !!(checkRequired && required),
    });
    if (!(opts && opts.silent)) {
      setFieldError(block, message);
    }
    return message;
  }

  function validateContactField(block, opts) {
    return validateTextFieldBlock(block, opts);
  }

  function getFileValidationError(file, cfg) {
    if (!file) {
      return "";
    }
    if (file.size > FILE_MAX_BYTES) {
      return msgFromCfg(cfg, "fileTooLarge", "Размер файла превышает 10 МБ");
    }
    if (!FILE_EXT_RE.test(file.name || "")) {
      return msgFromCfg(
        cfg,
        "fileBadFormat",
        "Формат файла не поддерживается. Допустимы: PDF, DOC, DOCX, PNG, JPG"
      );
    }
    return "";
  }

  function validateFileBlock(block, opts) {
    if (!isFieldBlockVisible(block)) {
      setFieldError(block, "");
      return "";
    }
    const cfg = (opts && opts.cfg) || {};
    const required = block.getAttribute("data-required") === "Y";
    const input = block.querySelector('input[type="file"]');
    const wrap = block.querySelector("[data-unified-file-attach]");
    const files =
      wrap && Array.isArray(wrap._ufStoredFiles)
        ? wrap._ufStoredFiles
        : input && input.files
          ? Array.prototype.slice.call(input.files, 0)
          : [];
    if (!files.length) {
      if (opts && opts.checkRequired && required) {
        const msg = msgFromCfg(cfg, "presentationRequired", "Прикрепите презентацию");
        if (!(opts && opts.silent)) {
          setFieldError(block, msg);
        }
        return msg;
      }
      if (!(opts && opts.silent)) {
        setFieldError(block, "");
      }
      return "";
    }
    const err = getFileValidationError(files[0], cfg);
    if (!(opts && opts.silent)) {
      setFieldError(block, err);
    }
    return err;
  }

  function requiredChoiceMessage(sid, cfg) {
    if (sid === "AREA") {
      return msgFromCfg(cfg, "areaRequired", "Выберите метраж помещения");
    }
    if (sid === "TYPE") {
      return msgFromCfg(cfg, "typeRequired", "Выберите тип помещения");
    }
    if (sid === "COMMERCIAL_OCCUPATION") {
      return msgFromCfg(cfg, "occupationRequired", "Выберите направление деятельности");
    }
    if (sid === "COMMERCIAL_CONCEPT") {
      return msgFromCfg(cfg, "conceptRequired", "Выберите концепцию проекта");
    }
    return msgFromCfg(cfg, "requiredField", "Заполните обязательное поле");
  }

  function stripPhoneMasksForSubmit(form) {
    const restored = [];
    if (!form) {
      return restored;
    }
    const blocks = form.querySelectorAll('[data-field-sid="PHONE"]');
    for (let i = 0; i < blocks.length; i++) {
      const input = getFieldControl(blocks[i]);
      if (!input) {
        continue;
      }
      const masked = input.value;
      restored.push({ input: input, value: masked });
      input.value = toE164Phone(masked);
    }
    return restored;
  }

  function restorePhoneMasks(restored) {
    if (!restored || !restored.length) {
      return;
    }
    for (let i = 0; i < restored.length; i++) {
      const item = restored[i];
      if (item && item.input) {
        item.input.value = item.value;
      }
    }
  }

  function normalizeWebsiteFieldsForSubmit(form) {
    const restored = [];
    if (!form) {
      return restored;
    }
    const blocks = form.querySelectorAll('[data-field-sid="WEBSITE"]');
    for (let i = 0; i < blocks.length; i++) {
      const input = getFieldControl(blocks[i]);
      if (!input || !String(input.value || "").trim()) {
        continue;
      }
      restored.push({ input: input, value: input.value });
      input.value = ensureWebsiteScheme(input.value);
    }
    return restored;
  }

  function normalizeEmailFieldsForSubmit(form) {
    const restored = [];
    if (!form) {
      return restored;
    }
    const blocks = form.querySelectorAll('[data-field-sid="EMAIL"]');
    for (let i = 0; i < blocks.length; i++) {
      const input = getFieldControl(blocks[i]);
      if (!input) {
        continue;
      }
      restored.push({ input: input, value: input.value });
      input.value = normalizeTextValue(input.value).toLowerCase();
    }
    return restored;
  }

  function ensureCharCounter(block, control, max) {
    let counter = block.querySelector(".unified-request-form__char-counter");
    if (!counter) {
      counter = document.createElement("span");
      counter.className = "unified-request-form__char-counter";
      counter.setAttribute("aria-live", "polite");
      const label = block.querySelector("label.home-page__field");
      if (label && label.parentNode === block) {
        block.insertBefore(counter, label.nextSibling);
      } else {
        block.appendChild(counter);
      }
    }
    const left = Math.max(0, max - String(control.value || "").length);
    counter.textContent = String(left);
    counter.hidden = false;
    return counter;
  }

  function blockHasValue(block) {
    if (!block || !isFieldBlockVisible(block)) {
      return true;
    }
    const form = block.closest("form");
    const chipGroup = block.querySelector("[data-unified-chip-target]");
    if (chipGroup && form) {
      const hidden = findChipHiddenTarget(
        form,
        chipGroup.getAttribute("data-unified-chip-target")
      );
      if (hidden) {
        if ((hidden.value || "").trim()) {
          return true;
        }
        if (chipGroup.querySelector(".home-page__chip.is-active")) {
          return true;
        }
      }
    }
    const profileHid = block.querySelector("[data-unified-profile-hidden]");
    if (profileHid) {
      return !!(profileHid.value || "").trim();
    }
    const radios = block.querySelectorAll('input[type="radio"]');
    if (radios.length) {
      return !!block.querySelector('input[type="radio"]:checked');
    }
    const checks = block.querySelectorAll('input[type="checkbox"]');
    if (checks.length) {
      return !!block.querySelector('input[type="checkbox"]:checked');
    }
    const sel = block.querySelector("select");
    if (sel) {
      return !!(sel.value || "").trim();
    }
    const file = block.querySelector('input[type="file"]');
    if (file) {
      const wrap = block.querySelector("[data-unified-file-attach]");
      if (wrap && Array.isArray(wrap._ufStoredFiles)) {
        return wrap._ufStoredFiles.length > 0;
      }
      return !!(file.files && file.files.length);
    }
    const textLike = getFieldControl(block);
    if (textLike) {
      if ((block.getAttribute("data-field-sid") || "") === "PHONE") {
        return normalizePhoneDigits(textLike.value).length >= 11;
      }
      return !!normalizeTextValue(textLike.value);
    }
    return true;
  }

  function areRequiredFieldsFilled(root) {
    const form = root.querySelector("form");
    if (!form) {
      return false;
    }
    const consentRequired = form.querySelector(
      'input[name="DEMO_CONSENT_REQUIRED"][value="Y"]'
    );
    if (consentRequired) {
      const consentInput = form.querySelector(
        'input[name="DEMO_USER_CONSENT"][type="checkbox"]'
      );
      if (!consentInput || !consentInput.checked) {
        return false;
      }
    }
    const blocks = root.querySelectorAll("[data-field-sid]");
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!isFieldBlockVisible(block)) {
        continue;
      }
      if (block.getAttribute("data-required") !== "Y") {
        continue;
      }
      if (!blockHasValue(block)) {
        return false;
      }
    }
    return true;
  }

  function getSubmitButton(form) {
    return (
      form.querySelector('.home-page__form-footer button[type="submit"]') ||
      form.querySelector('button[type="submit"]') ||
      form.querySelector('input[type="submit"]')
    );
  }

  function syncSubmitEnabled(root, form) {
    const btn = getSubmitButton(form);
    if (!btn) {
      return;
    }
    if (form._ufSubmitting) {
      btn.disabled = true;
      return;
    }
    const ok = areRequiredFieldsFilled(root);
    btn.disabled = !ok;
    if (ok) {
      btn.removeAttribute("aria-disabled");
    } else {
      btn.setAttribute("aria-disabled", "true");
    }
  }

  function setSubmittingState(root, form, on) {
    form._ufSubmitting = !!on;
    const btn = getSubmitButton(form);
    if (btn) {
      if (on) {
        btn.classList.add("is-loading");
        btn.setAttribute("aria-busy", "true");
        if (!btn.getAttribute("data-demo-label")) {
          btn.setAttribute("data-demo-label", btn.textContent || "");
        }
      } else {
        btn.classList.remove("is-loading");
        btn.removeAttribute("aria-busy");
        const label = btn.getAttribute("data-demo-label");
        if (label != null && btn.tagName === "BUTTON") {
          btn.textContent = label;
        }
      }
    }
    const wraps = form.querySelectorAll("[data-unified-file-attach]");
    for (let i = 0; i < wraps.length; i++) {
      const wrap = wraps[i];
      const fileInput = wrap.querySelector("[data-unified-file-input]");
      const hasFiles =
        (Array.isArray(wrap._ufStoredFiles) && wrap._ufStoredFiles.length > 0) ||
        !!(fileInput && fileInput.files && fileInput.files.length);
      wrap._ufFileUploading = !!(on && hasFiles);
      if (typeof wrap._ufSetAttachLoading === "function") {
        wrap._ufSetAttachLoading(!!(on && hasFiles));
      }
    }
    syncSubmitEnabled(root, form);
  }

  function annotateStaticUnifiedFields(form) {
    if (!form || form._ufStaticAnnotated) {
      return;
    }
    form._ufStaticAnnotated = true;

    function labelHasRequiredStar(labelEl) {
      if (!labelEl) {
        return false;
      }
      return !!labelEl.querySelector("span");
    }

    function isStaticChoiceRequired(choice, formEl) {
      if (choice.getAttribute("data-required") === "Y") {
        return true;
      }
      const subtitle = choice.querySelector(".home-page__form-subtitle");
      if (labelHasRequiredStar(subtitle)) {
        return true;
      }
      const chipGroup = choice.querySelector("[data-unified-chip-target]");
      if (chipGroup && formEl) {
        const hidden = findChipHiddenTarget(
          formEl,
          chipGroup.getAttribute("data-unified-chip-target")
        );
        if (hidden) {
          if (hidden.required) {
            return true;
          }
          const hidId = (hidden.id || "").toLowerCase();
          if (
            hidId.indexOf("space-area") !== -1 ||
            hidId.indexOf("space-type") !== -1 ||
            hidId.indexOf("portfolio-area") !== -1 ||
            hidId.indexOf("portfolio-type") !== -1
          ) {
            return true;
          }
        }
      }
      return false;
    }

    form.querySelectorAll(".home-page__form-choice").forEach(function (choice) {
      if (choice.hasAttribute("data-field-sid")) {
        return;
      }
      const chipGroup = choice.querySelector("[data-unified-chip-target]");
      const fileInput = choice.querySelector("[data-unified-file-input]");
      let sid = "";
      if (chipGroup) {
        const hidden = findChipHiddenTarget(
          form,
          chipGroup.getAttribute("data-unified-chip-target")
        );
        if (hidden) {
          sid = hidden.name || hidden.id || "";
        }
      } else if (fileInput && fileInput.name) {
        sid = fileInput.name.replace(/\[\]$/, "");
      }
      if (!sid) {
        return;
      }
      choice.setAttribute("data-field-sid", sid);
      choice.classList.add("unified-request-form__field");
      choice.setAttribute(
        "data-required",
        isStaticChoiceRequired(choice, form) ? "Y" : "N"
      );
    });

    form.querySelectorAll(".home-page__field").forEach(function (field) {
      if (field.hasAttribute("data-field-sid")) {
        return;
      }
      const input = field.querySelector("input, textarea, select");
      if (!input || input.type === "hidden") {
        return;
      }
      const name = input.name || "";
      if (!name) {
        return;
      }
      field.setAttribute("data-field-sid", name);
      field.classList.add("unified-request-form__field");
      field.setAttribute(
        "data-required",
        input.required || labelHasRequiredStar(field) ? "Y" : "N"
      );
    });

    form.querySelectorAll("[data-unified-profile-combobox]").forEach(function (combo) {
      if (combo.hasAttribute("data-field-sid")) {
        return;
      }
      const hid = combo.querySelector("[data-unified-profile-hidden]");
      const sid = (hid && hid.name) || "commercial_project_profile";
      combo.setAttribute("data-field-sid", sid);
      combo.classList.add("unified-request-form__field");
      combo.setAttribute(
        "data-required",
        hid && (hid.required || labelHasRequiredStar(combo)) ? "Y" : "N"
      );
    });
  }

  function bindUnifiedStepAdvanceValidation(root, form, cfg) {
    if (!form || form._ufStepAdvanceValidationBound) {
      return;
    }
    form._ufStepAdvanceValidationBound = true;
    form.addEventListener("focusin", function (ev) {
      const target = ev.target;
      if (!target || !form.contains(target)) {
        return;
      }
      if (target.type === "hidden") {
        return;
      }
      const stepIdx = getFormStepIndexForNode(form, target);
      if (stepIdx <= 0) {
        return;
      }
      validatePreviousFormSteps(root, form, cfg || {}, stepIdx);
    });
  }

  function bindFormValidation(root, form, cfg) {
    if (!root || !form || form._ufContactValidationBound) {
      return;
    }
    form._ufContactValidationBound = true;

    Object.keys(FIELD_MAX).forEach(function (sid) {
      const block = root.querySelector('[data-field-sid="' + sid + '"]');
      const control = getFieldControl(block);
      if (control) {
        control.setAttribute("maxlength", String(FIELD_MAX[sid]));
      }
      if ((sid === "COMMENT" || sid === "MESSAGE") && block && control) {
        ensureCharCounter(block, control, FIELD_MAX[sid]);
      }
    });

    const phoneBlock = root.querySelector('[data-field-sid="PHONE"]');
    const phoneInput = getFieldControl(phoneBlock);
    if (phoneInput) {
      phoneInput.setAttribute("inputmode", "tel");
      phoneInput.setAttribute("autocomplete", "tel");
      if (phoneInput.value) {
        applyPhoneMaskToInput(phoneInput);
      }
    }

    form.addEventListener("input", function (ev) {
      const target = ev.target;
      if (!target || !form.contains(target)) {
        return;
      }
      if (target.type === "checkbox" || target.type === "radio" || target.type === "file") {
        syncSubmitEnabled(root, form);
        return;
      }
      const block = target.closest("[data-field-sid]");
      if (!block || !root.contains(block)) {
        syncSubmitEnabled(root, form);
        return;
      }
      const sid = block.getAttribute("data-field-sid") || "";

      if (TEXT_VALIDATE_SIDS[sid] || sid === "PHONE" || sid === "EMAIL" || sid === "WEBSITE") {
        let next = preventLeadingSpace(forbidHtmlChars(stripControlChars(target.value)));
        if (sid === "COMMERCIAL_MOSCOW_OPEN_POINTS") {
          next = next.replace(/\D+/g, "").slice(0, 4);
        }
        if (sid === "COMMERCIAL_AVERAGE_RECEIPT") {
          next = next.replace(/[^\d\s]/g, "").slice(0, 11);
        }
        if (sid === "PHONE") {
          target.value = next;
          applyPhoneMaskToInput(target);
        } else if (sid === "NAME" || sid === "SURNAME") {
          const start = target.selectionStart;
          const end = target.selectionEnd;
          next = capitalizeNameParts(next.replace(/[^А-Яа-яЁёA-Za-z '\-]/g, ""));
          if (next !== target.value) {
            target.value = next;
            try {
              if (typeof start === "number" && typeof end === "number") {
                target.setSelectionRange(Math.min(start, next.length), Math.min(end, next.length));
              }
            } catch (errSel) {}
          }
        } else if (next !== target.value) {
          const start = target.selectionStart;
          target.value = next;
          try {
            if (typeof start === "number") {
              target.setSelectionRange(start, start);
            }
          } catch (errPos) {}
        }

        if (sid === "COMMENT" || sid === "MESSAGE") {
          ensureCharCounter(block, target, FIELD_MAX[sid] || 1000);
        }

        // ТЗ: ошибка снимается при первом изменении значения
        setFieldError(block, "");
      }

      syncSubmitEnabled(root, form);
    });

    form.addEventListener("change", function () {
      syncSubmitEnabled(root, form);
    });

    bindUnifiedStepAdvanceValidation(root, form, cfg);

    form.addEventListener(
      "blur",
      function (ev) {
        const target = ev.target;
        if (!target || !form.contains(target)) {
          return;
        }
        const block = target.closest("[data-field-sid]");
        if (!block || !root.contains(block)) {
          return;
        }
        const sid = block.getAttribute("data-field-sid") || "";
        if (!TEXT_VALIDATE_SIDS[sid]) {
          return;
        }

        // Нормализация на blur
        if (sid === "PHONE") {
          applyPhoneMaskToInput(target);
        } else if (sid === "EMAIL") {
          target.value = normalizeTextValue(target.value).toLowerCase();
        } else if (sid === "NAME" || sid === "SURNAME") {
          target.value = capitalizeNameParts(normalizeTextValue(target.value));
        } else if (sid !== "COMMERCIAL_AVERAGE_RECEIPT") {
          target.value = normalizeTextValue(forbidHtmlChars(target.value));
        } else {
          target.value = preventLeadingSpace(forbidHtmlChars(stripControlChars(target.value)));
        }

        block.setAttribute("data-demo-touched", "Y");

        // blur: формат для заполненных + обязательные (в т.ч. OFFICE_BUDGET и др.)
        const required = block.getAttribute("data-required") === "Y";
        const hasValue =
          !!normalizeTextValue(target.value) ||
          (sid === "PHONE" && !!phoneDigitsOnly(target.value));
        if (hasValue || required) {
          validateTextFieldBlock(block, { cfg: cfg, checkRequired: required });
        } else {
          setFieldError(block, "");
        }
        syncSubmitEnabled(root, form);
      },
      true
    );

    syncSubmitEnabled(root, form);
  }

  function bindContactFieldValidation(root, form, cfg) {
    bindFormValidation(root, form, cfg);
  }

  function validateSingleFieldBlock(block, cfg, opts) {
    opts = opts || {};
    const checkRequired = opts.checkRequired !== false;
    const silent = !!opts.silent;
    const normalize = !!opts.normalize;

    if (!isFieldBlockVisible(block)) {
      if (!silent) {
        setFieldError(block, "");
      }
      return "";
    }

    const sid = block.getAttribute("data-field-sid") || "";

    if (
      sid === "PRESENTATION" ||
      sid === "COMMERCIAL_PRESENTATION" ||
      block.querySelector('input[type="file"]')
    ) {
      if (block.querySelector('input[type="file"]')) {
        return validateFileBlock(block, {
          cfg: cfg,
          checkRequired: checkRequired,
          silent: silent,
        });
      }
    }

    if (TEXT_VALIDATE_SIDS[sid]) {
      if (normalize) {
        const control = getFieldControl(block);
        if (control) {
          if (sid === "EMAIL") {
            control.value = normalizeTextValue(control.value).toLowerCase();
          } else if (sid === "PHONE") {
            applyPhoneMaskToInput(control);
          } else if (sid === "NAME" || sid === "SURNAME") {
            control.value = capitalizeNameParts(normalizeTextValue(control.value));
          } else if (sid !== "COMMERCIAL_AVERAGE_RECEIPT") {
            control.value = normalizeTextValue(forbidHtmlChars(control.value));
          }
        }
      }
      return validateTextFieldBlock(block, {
        cfg: cfg,
        checkRequired: checkRequired,
        silent: silent,
      });
    }

    if (block.getAttribute("data-required") !== "Y") {
      if (!silent) {
        setFieldError(block, "");
      }
      return "";
    }

    const radios = block.querySelectorAll('input[type="radio"]');
    if (radios.length) {
      if (!block.querySelector('input[type="radio"]:checked')) {
        const msg = requiredChoiceMessage(sid, cfg);
        if (!silent) {
          setFieldError(block, msg);
        }
        return msg;
      }
      if (!silent) {
        setFieldError(block, "");
      }
      return "";
    }

    const checks = block.querySelectorAll('input[type="checkbox"]');
    if (checks.length) {
      if (!block.querySelector('input[type="checkbox"]:checked')) {
        const msg = requiredChoiceMessage(sid, cfg);
        if (!silent) {
          setFieldError(block, msg);
        }
        return msg;
      }
      if (!silent) {
        setFieldError(block, "");
      }
      return "";
    }

    const sel = block.querySelector("select");
    if (sel) {
      if (!sel.value || sel.value === "") {
        const msg = requiredChoiceMessage(sid, cfg);
        if (!silent) {
          setFieldError(block, msg);
        }
        return msg;
      }
      if (!silent) {
        setFieldError(block, "");
      }
      return "";
    }

    const textLike = getFieldControl(block);
    if (textLike) {
      if (!(textLike.value || "").trim()) {
        const msg = requiredChoiceMessage(sid, cfg);
        if (!silent) {
          setFieldError(block, msg);
        }
        return msg;
      }
      if (!silent) {
        setFieldError(block, "");
      }
      return "";
    }

    if (!blockHasValue(block)) {
      const msg = requiredChoiceMessage(sid, cfg);
      if (!silent) {
        setFieldError(block, msg);
      }
      return msg;
    }
    if (!silent) {
      setFieldError(block, "");
    }
    return "";
  }

  function validatePreviousFormSteps(root, form, cfg, beforeStepIdx) {
    if (!root || !form || beforeStepIdx <= 0) {
      return { ok: true, fields: [] };
    }
    const invalidFields = [];
    const blocks = root.querySelectorAll("[data-field-sid]");
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (getFormStepIndexForNode(form, block) >= beforeStepIdx) {
        continue;
      }
      const sid = block.getAttribute("data-field-sid") || "";
      const err = validateSingleFieldBlock(block, cfg, { checkRequired: true });
      if (err) {
        invalidFields.push(sid);
      }
    }
    syncFormStepErrorMarkers(form, root);
    return { ok: invalidFields.length === 0, fields: invalidFields };
  }

  function validateDemoVisible(root, cfg) {
    const form = root.querySelector("form");
    if (!form) {
      return { ok: true, message: "", fields: [] };
    }
    const consentRequired = form.querySelector(
      'input[name="DEMO_CONSENT_REQUIRED"][value="Y"]'
    );
    if (consentRequired) {
      const consentInput = form.querySelector(
        'input[name="DEMO_USER_CONSENT"][type="checkbox"]'
      );
      if (!consentInput || !consentInput.checked) {
        return { ok: false, message: "consent", consent: true, fields: [] };
      }
    }

    const invalidFields = [];
    const blocks = root.querySelectorAll("[data-field-sid]");
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const sid = block.getAttribute("data-field-sid") || "";
      const err = validateSingleFieldBlock(block, cfg, {
        checkRequired: true,
        normalize: true,
      });
      if (err) {
        invalidFields.push(sid);
      }
    }

    syncFormStepErrorMarkers(form, root);

    if (invalidFields.length) {
      return {
        ok: false,
        message: invalidFields[0],
        fields: invalidFields,
      };
    }
    return { ok: true, message: "", fields: [] };
  }

  function showDemoGlobalError(root, message) {
    const box = root.querySelector(".demo-webform-global-error");
    if (!box) {
      return;
    }
    if (message) {
      const plain = String(message)
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .trim();
      box.textContent = plain;
      box.hidden = false;
    } else {
      box.textContent = "";
      box.hidden = true;
    }
  }

  function findDemoRequestModal(form) {
    if (!form || !form.closest) {
      return null;
    }
    return form.closest("#show-request-modal, #cost-request-modal");
  }

  function openDemoErrorModal() {
    if (
      window.DemoShowRequestModal &&
      typeof window.DemoShowRequestModal.openError === "function"
    ) {
      window.DemoShowRequestModal.openError();
      return;
    }
    const em = document.getElementById("show-request-error-modal");
    if (!em) {
      return;
    }
    const cwModal = document.getElementById("connect-with-us-modal");
    if (cwModal) {
      cwModal.classList.remove("is-open");
      cwModal.setAttribute("aria-hidden", "true");
    }
    const showModal = document.getElementById("show-request-modal");
    if (showModal && showModal.classList.contains("is-open")) {
      showModal.classList.remove("is-open");
      showModal.setAttribute("aria-hidden", "true");
    }
    const costModal = document.getElementById("cost-request-modal");
    if (costModal && costModal.classList.contains("is-open")) {
      costModal.classList.remove("is-open");
      costModal.setAttribute("aria-hidden", "true");
    }
    const successModal = document.getElementById("show-request-success-modal");
    if (successModal && successModal.classList.contains("is-open")) {
      successModal.classList.remove("is-open");
      successModal.setAttribute("aria-hidden", "true");
    }
    em.classList.add("is-open");
    em.setAttribute("aria-hidden", "false");
    document.body.classList.add("show-request-modal-open");
    const okBtn = em.querySelector(".show-request-result-modal__btn");
    if (okBtn && okBtn.focus) {
      try {
        okBtn.focus();
      } catch (errFocus) {}
    }
  }

  function openDemoSuccessModal() {
    if (
      window.DemoShowRequestModal &&
      typeof window.DemoShowRequestModal.openSuccess === "function"
    ) {
      window.DemoShowRequestModal.openSuccess();
      return;
    }
    const sm = document.getElementById("show-request-success-modal");
    if (!sm) {
      return;
    }
    const cwModal = document.getElementById("connect-with-us-modal");
    if (cwModal) {
      cwModal.classList.remove("is-open");
      cwModal.setAttribute("aria-hidden", "true");
    }
    const showModal = document.getElementById("show-request-modal");
    if (showModal && showModal.classList.contains("is-open")) {
      showModal.classList.remove("is-open");
      showModal.setAttribute("aria-hidden", "true");
    }
    const costModal = document.getElementById("cost-request-modal");
    if (costModal && costModal.classList.contains("is-open")) {
      costModal.classList.remove("is-open");
      costModal.setAttribute("aria-hidden", "true");
    }
    const errorModal = document.getElementById("show-request-error-modal");
    if (errorModal && errorModal.classList.contains("is-open")) {
      errorModal.classList.remove("is-open");
      errorModal.setAttribute("aria-hidden", "true");
    }
    sm.classList.add("is-open");
    sm.setAttribute("aria-hidden", "false");
    document.body.classList.add("show-request-modal-open");
    const okBtn = sm.querySelector(".show-request-result-modal__btn");
    if (okBtn && okBtn.focus) {
      try {
        okBtn.focus();
      } catch (errFocus) {}
    }
  }

  function syncShowRequestObjectContext(form) {
    const modal = findDemoRequestModal(form);
    if (!modal || !form || !modal.contains(form)) {
      return;
    }
    if (
      window.DemoShowRequestModal &&
      typeof window.DemoShowRequestModal.syncObjectContextInputs === "function"
    ) {
      window.DemoShowRequestModal.syncObjectContextInputs(modal);
      return;
    }
    const map = {
      object: "OBJECT_NAME",
      type: "TYPE",
      room: "ROOM_NUMBER",
      floor: "FLOOR",
      area: "AREA",
    };
    Object.keys(map).forEach(function (dataKey) {
      const cell = modal.querySelector('[data-show-request-field="' + dataKey + '"]');
      let text = cell && cell.textContent ? String(cell.textContent).trim() : "";
      if (text === "—") {
        text = "";
      }
      const wrap = form.querySelector('[data-field-sid="' + map[dataKey] + '"]');
      if (!wrap) {
        return;
      }
      const input = wrap.querySelector("input, textarea, select");
      if (!input) {
        return;
      }
      input.value = text;
      try {
        input.defaultValue = text;
      } catch (errDefault) {}
      input.setAttribute("value", text);
    });
  }

  function submitDemoWebform(root, form, cfg) {
    if (typeof BX === "undefined" || !BX.ajax || !BX.ajax.runAction) {
      return;
    }
    if (form._ufSubmitting) {
      return;
    }
    setSubmittingState(root, form, true);
    syncShowRequestObjectContext(form);
    const phoneRestore = stripPhoneMasksForSubmit(form);
    const websiteRestore = normalizeWebsiteFieldsForSubmit(form);
    const emailRestore = normalizeEmailFieldsForSubmit(form);
    const fd = new FormData(form);
    restorePhoneMasks(phoneRestore);
    restorePhoneMasks(websiteRestore);
    restorePhoneMasks(emailRestore);
    fd.set("sessid", BX.bitrix_sessid());

    let settled = false;
    const finish = function () {
      if (settled) {
        return;
      }
      settled = true;
      if (form._ufSubmitTimer) {
        clearTimeout(form._ufSubmitTimer);
        form._ufSubmitTimer = null;
      }
      setSubmittingState(root, form, false);
    };

    form._ufSubmitTimer = setTimeout(function () {
      finish();
      showDemoGlobalError(root, "");
      openDemoErrorModal();
    }, SUBMIT_TIMEOUT_MS);

    BX.ajax
      .runAction("demo:site.webform.submit", {
        method: "POST",
        data: fd,
      })
      .then(function (response) {
        finish();
        if (!response || response.status === "error") {
          throw new Error("ajax");
        }
        const data = response.data || {};
        if (data.success) {
          showDemoGlobalError(root, "");
          openDemoSuccessModal();
          form.reset();
          resetProfileComboboxes(form);
          ensureDemoDefaultRadios(form);
          applyDemoTypeVisibility(root, getSelectedTypeSymbol(root));
          clearFieldErrors(root);
          root.querySelectorAll("[data-demo-touched]").forEach(function (n) {
            n.removeAttribute("data-demo-touched");
          });
          root.querySelectorAll("[data-unified-file-attach]").forEach(function (wrap) {
            wrap._ufStoredFiles = [];
            const listEl = wrap.querySelector("[data-unified-file-list]");
            const input = wrap.querySelector("[data-unified-file-input]");
            if (listEl) {
              while (listEl.firstChild) {
                listEl.removeChild(listEl.firstChild);
              }
              listEl.hidden = true;
            }
            if (input) {
              setInputFilesFromFileArray(input, []);
            }
          });
          root.querySelectorAll(".unified-request-form__char-counter").forEach(function (c) {
            const sidBlock = c.closest("[data-field-sid]");
            const sid = sidBlock ? sidBlock.getAttribute("data-field-sid") : "";
            const max = FIELD_MAX[sid] || 1000;
            c.textContent = String(max);
          });
          const chipGroups = form.querySelectorAll("[data-unified-chip-target]");
          for (let g = 0; g < chipGroups.length; g++) {
            initChipGroup(form, chipGroups[g]);
          }
          syncSubmitEnabled(root, form);
          return;
        }
        const globals = (data.globalErrors || [])
          .map(function (e) {
            return e.message || "";
          })
          .filter(Boolean);
        const first = globals.length
          ? globals.join("\n")
          : (cfg.messages && cfg.messages.genericError) || "Error";
        const fieldErrors = data.fieldErrors || {};
        const fieldErrorKeys = Object.keys(fieldErrors);
        if (fieldErrorKeys.length === 0) {
          showDemoGlobalError(root, "");
          openDemoErrorModal();
        } else {
          showDemoGlobalError(root, first);
          clearFieldErrors(root);
          fieldErrorKeys.forEach(function (sid) {
            const el = root.querySelector('[data-field-sid="' + sid + '"]');
            if (!el) {
              return;
            }
            const list = fieldErrors[sid];
            let msg = "";
            if (Array.isArray(list) && list.length) {
              const firstErr = list[0];
              if (firstErr && typeof firstErr === "object") {
                msg = firstErr.message || "";
              } else {
                msg = String(firstErr || "");
              }
            }
            setFieldError(el, msg);
          });
        }
      })
      .catch(function () {
        finish();
        showDemoGlobalError(root, "");
        openDemoErrorModal();
      });
  }

  function bindStaticUnifiedSubmit(form) {
    if (!form || form._ufStaticSubmitBound) {
      return;
    }
    if (getDemoRoot(form)) {
      return;
    }
    form._ufStaticSubmitBound = true;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      openDemoSuccessModal();
    });
  }

  function bindDemoWebform(root, form) {
    const cfg = getDemoConfig(root);
    ensureDemoDefaultRadios(form);
    applyDemoTypeVisibility(root, getSelectedTypeSymbol(root));
    bindContactFieldValidation(root, form, cfg);
    form.addEventListener("unifiedchipchange", function () {
      applyDemoTypeVisibility(root, getSelectedTypeSymbol(root));
      ensureDemoDefaultRadios(form);
      syncSubmitEnabled(root, form);
    });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (form._ufSubmitting) {
        return;
      }
      clearFieldErrors(root);
      root.querySelectorAll(".unified-request-form__consent--error").forEach(function (n) {
        n.classList.remove("unified-request-form__consent--error");
      });
      showDemoGlobalError(root, "");
      const v = validateDemoVisible(root, cfg);
      if (!v.ok) {
        const consentMsg =
          v.consent && cfg.messages && cfg.messages.consentError
            ? cfg.messages.consentError
            : null;
        showDemoGlobalError(
          root,
          consentMsg ||
            (cfg.messages && cfg.messages.validationError) ||
            "Check required fields"
        );
        if (v.consent) {
          const consentLabel = form.querySelector(".unified-request-form__consent");
          if (consentLabel) {
            consentLabel.classList.add("unified-request-form__consent--error");
            try {
              consentLabel.scrollIntoView({ block: "nearest", behavior: "smooth" });
            } catch (errScroll) {}
          }
        } else if (v.fields && v.fields.length) {
          const firstSid = v.fields[0];
          const el = root.querySelector('[data-field-sid="' + firstSid + '"]');
          if (el) {
            try {
              el.scrollIntoView({ block: "nearest", behavior: "smooth" });
            } catch (errScrollField) {}
            const control = getContactFieldControl(el) || el.querySelector("input, textarea, select");
            if (control && control.focus) {
              try {
                control.focus();
              } catch (errFocus) {}
            }
          }
        }
        syncSubmitEnabled(root, form);
        return;
      }
      submitDemoWebform(root, form, cfg);
    });
    syncSubmitEnabled(root, form);
  }

  function initForm(form) {
    if (form.hasAttribute("data-unified-initial-scenario")) {
      const initial = form.getAttribute("data-unified-initial-scenario") || "home";
      applyScenario(form, initial);
    }

    bindUnifiedChipDelegation(form);

    const chipGroups = form.querySelectorAll("[data-unified-chip-target]");
    for (let g = 0; g < chipGroups.length; g++) {
      initChipGroup(form, chipGroups[g]);
    }

    initProfileComboboxes(form);

    initFileAttachLists(form);

    syncFormStepIndexes(form);

    const validationRoot = getFormValidationRoot(form);
    const demoRoot = getDemoRoot(form);
    let stepValidationCfg = {
      messages: {
        requiredField: "Заполните обязательное поле",
        areaRequired: "Выберите метраж помещения",
        typeRequired: "Выберите тип помещения",
        presentationRequired: "Прикрепите презентацию",
      },
    };
    if (demoRoot) {
      stepValidationCfg = getDemoConfig(demoRoot);
      bindDemoWebform(demoRoot, form);
    } else {
      annotateStaticUnifiedFields(form);
      bindStaticUnifiedSubmit(form);
    }
    if (validationRoot) {
      bindUnifiedStepAdvanceValidation(validationRoot, form, stepValidationCfg);
    }
  }

  function init() {
    const forms = document.querySelectorAll("form[data-unified-form]");
    for (let f = 0; f < forms.length; f++) {
      initForm(forms[f]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* End */
;
; /* Start:"a:4:{s:4:"full";s:61:"/local/templates/main/js/demo-glass-canvas.js?178663104215631";s:6:"source";s:45:"/local/templates/main/js/demo-glass-canvas.js";s:3:"min";s:0:"";s:3:"map";s:0:"";}"*/
/**
 * Преломление стеклянных линз через canvas (hero / about).
 */
(function (global) {
  'use strict';

  var DISPLACE_SCALE_CSS = 32;
  var BLUR_PX = 1.15;
  var MAX_DPR = 2;
  var LENS_SCALE = 1.06;
  var LENS_SHIFT_X = 0.02;
  var LENS_SHIFT_Y = -0.015;
  var edgeMapState = { status: 'idle', softData: null, softW: 0, softH: 0, waiters: [] };
  var sourceCache = {};
  var imageSizeCache = {};

  function edgeMapSrc() {
    if (typeof global.DEMO_GLASS_EDGE_MAP_DATA === 'string' && global.DEMO_GLASS_EDGE_MAP_DATA) {
      return global.DEMO_GLASS_EDGE_MAP_DATA;
    }
    var dataEl = document.getElementById('demo-glass-edge-map-data');
    if (!dataEl) {
      return '';
    }
    try {
      var parsed = JSON.parse(dataEl.textContent || '""');
      return typeof parsed === 'string' ? parsed : '';
    } catch (e) {
      return '';
    }
  }

  function extractBackgroundUrl(bgImage) {
    var match = /url\((['"]?)(.*?)\1\)/.exec(bgImage || '');
    return match ? match[2] : '';
  }

  function isSameOriginUrl(url) {
    if (!url || url.indexOf('data:') === 0 || url.indexOf('blob:') === 0) {
      return true;
    }
    var anchor = document.createElement('a');
    anchor.href = url;
    if (!anchor.hostname) {
      return true;
    }
    return anchor.hostname === global.location.hostname;
  }

  function loadImage(url, useCrossOrigin) {
    return new Promise(function (resolve, reject) {
      if (!url) {
        reject(new Error('empty url'));
        return;
      }
      var img = new Image();
      if (useCrossOrigin && !isSameOriginUrl(url)) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error('image load failed'));
      };
      img.src = url;
    });
  }

  function loadImageSmart(url) {
    if (isSameOriginUrl(url)) {
      return loadImage(url, false).catch(function () {
        return loadImage(url, true);
      });
    }
    return loadImage(url, true).catch(function () {
      return loadImage(url, false);
    });
  }

  function loadImageSize(url, done) {
    if (!url) {
      done(null);
      return;
    }
    if (imageSizeCache[url]) {
      done(imageSizeCache[url]);
      return;
    }
    loadImageSmart(url)
      .then(function (img) {
        var size = { width: img.naturalWidth, height: img.naturalHeight };
        imageSizeCache[url] = size;
        done(size);
      })
      .catch(function () {
        done(null);
      });
  }

  function ensureEdgeMap(done) {
    if (edgeMapState.status === 'ready') {
      done(true);
      return;
    }
    if (edgeMapState.status === 'error') {
      done(false);
      return;
    }
    if (edgeMapState.status === 'loading') {
      edgeMapState.waiters.push(done);
      return;
    }
    var src = edgeMapSrc();
    if (!src) {
      done(false);
      return;
    }
    edgeMapState.status = 'loading';
    edgeMapState.waiters = [done];

    loadImageSmart(src)
      .then(function (img) {
        var soft = document.createElement('canvas');
        soft.width = img.naturalWidth || img.width;
        soft.height = img.naturalHeight || img.height;
        var ctx = soft.getContext('2d');
        ctx.filter = 'blur(1.4px)';
        ctx.drawImage(img, 0, 0, soft.width, soft.height);
        ctx.filter = 'none';
        edgeMapState.softData = ctx.getImageData(0, 0, soft.width, soft.height);
        edgeMapState.softW = soft.width;
        edgeMapState.softH = soft.height;
        edgeMapState.status = 'ready';
        edgeMapState.waiters.forEach(function (fn) {
          fn(true);
        });
        edgeMapState.waiters = [];
      })
      .catch(function () {
        edgeMapState.status = 'error';
        edgeMapState.waiters.forEach(function (fn) {
          fn(false);
        });
        edgeMapState.waiters = [];
      });
  }

  function loadSource(url, done) {
    if (!url) {
      done(null);
      return;
    }
    if (sourceCache[url]) {
      done(sourceCache[url]);
      return;
    }
    loadImageSmart(url)
      .then(function (img) {
        sourceCache[url] = img;
        done(img);
      })
      .catch(function () {
        done(null);
      });
  }

  function ensureCanvas(lens) {
    var canvas = lens.querySelector('canvas.demo-glass-lens-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'demo-glass-lens-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      lens.appendChild(canvas);
    }
    lens.classList.add('is-canvas-lens');
    return canvas;
  }

  function sampleMap(mx, my) {
    var w = edgeMapState.softW;
    var h = edgeMapState.softH;
    var data = edgeMapState.softData.data;
    var x = Math.max(0, Math.min(w - 1, mx | 0));
    var y = Math.max(0, Math.min(h - 1, my | 0));
    var i = (y * w + x) * 4;
    return { r: data[i], g: data[i + 1] };
  }

  function displacePixels(srcData, outData, width, height, displaceScale) {
    var src = srcData.data;
    var out = outData.data;
    var mapW = edgeMapState.softW;
    var mapH = edgeMapState.softH;
    var x;
    var y;
    for (y = 0; y < height; y++) {
      for (x = 0; x < width; x++) {
        var map = sampleMap((x / width) * (mapW - 1), (y / height) * (mapH - 1));
        var dx = displaceScale * (map.r / 255 - 0.5);
        var dy = displaceScale * (map.g / 255 - 0.5);
        var sx = x + dx;
        var sy = y + dy;
        if (sx < 0) sx = 0;
        if (sy < 0) sy = 0;
        if (sx > width - 1) sx = width - 1;
        if (sy > height - 1) sy = height - 1;
        var si = ((sy | 0) * width + (sx | 0)) * 4;
        var oi = (y * width + x) * 4;
        out[oi] = src[si];
        out[oi + 1] = src[si + 1];
        out[oi + 2] = src[si + 2];
        out[oi + 3] = src[si + 3];
      }
    }
  }

  function drawToDisplay(ctx, sourceCanvas, blurPx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.filter = 'blur(' + blurPx + 'px) saturate(1.08)';
    ctx.drawImage(sourceCanvas, 0, 0);
    ctx.filter = 'none';
  }

  /**
   * 50% чёрного + вертикальный градиент сверху.
   * Canvas-линза рисует исходное фото, минуя DOM-оверлей — затемнение нужно здесь.
   */
  function applyHeroOverlayOnCanvas(ctx, pixelW, pixelH, lensRect, heroRect) {
    if (!ctx || !lensRect || !heroRect) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, pixelW, pixelH);

    var heroH = Math.max(1, heroRect.height);
    var lensH = Math.max(1, lensRect.height);
    var scaleY = pixelH / lensH;
    var y0 = (heroRect.top + heroH * 0.18256 - lensRect.top) * scaleY;
    var y1 = (heroRect.top + heroH * 0.98428 - lensRect.top) * scaleY;
    if (y1 === y0) {
      ctx.restore();
      return;
    }

    var grad = ctx.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.11)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, pixelW, pixelH);
    ctx.restore();
  }

  function paintLens(lens, lensRect, bgUrl, imageSize, heroRect, optics) {
    if (!lens || !bgUrl) {
      return false;
    }

    var scale = (optics && optics.scale) || LENS_SCALE;
    var shiftXRatio = (optics && optics.shiftX) || LENS_SHIFT_X;
    var shiftYRatio = (optics && optics.shiftY) || LENS_SHIFT_Y;
    var cssW = Math.max(1, Math.round(lensRect.width));
    var cssH = Math.max(1, Math.round(lensRect.height));
    var dpr = Math.min(MAX_DPR, global.devicePixelRatio || 1);
    var pixelW = Math.max(1, Math.round(cssW * dpr));
    var pixelH = Math.max(1, Math.round(cssH * dpr));
    var displaceScale = DISPLACE_SCALE_CSS * dpr;
    var generation = (lens._demoGlassPaintGen || 0) + 1;
    lens._demoGlassPaintGen = generation;

    ensureEdgeMap(function (edgeOk) {
      loadSource(bgUrl, function (img) {
        if (!img || lens._demoGlassPaintGen !== generation) {
          return;
        }

        var canvas = ensureCanvas(lens);
        canvas.width = pixelW;
        canvas.height = pixelH;
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';

        var ctx = canvas.getContext('2d');
        if (!ctx) {
          return;
        }

        var heroW = Math.max(1, heroRect.width);
        var heroH = Math.max(1, heroRect.height);
        var natW = (imageSize && imageSize.width) || img.naturalWidth || img.width;
        var natH = (imageSize && imageSize.height) || img.naturalHeight || img.height;
        var coverScale = Math.max(heroW / natW, heroH / natH);
        var baseW = natW * coverScale;
        var baseH = natH * coverScale;
        var coverLeft = heroRect.left + (heroW - baseW) / 2;
        var coverTop = heroRect.top + (heroH - baseH) / 2;
        var lensCenterX = lensRect.left + lensRect.width / 2;
        var lensCenterY = lensRect.top + lensRect.height / 2;
        var shiftX = lensRect.width * shiftXRatio;
        var shiftY = lensRect.height * shiftYRatio;
        var drawW = baseW * scale;
        var drawH = baseH * scale;
        var magnifiedLeft = lensCenterX - (lensCenterX - coverLeft) * scale + shiftX;
        var magnifiedTop = lensCenterY - (lensCenterY - coverTop) * scale + shiftY;
        var offsetX = (magnifiedLeft - lensRect.left) * dpr;
        var offsetY = (magnifiedTop - lensRect.top) * dpr;

        var srcCanvas = document.createElement('canvas');
        srcCanvas.width = pixelW;
        srcCanvas.height = pixelH;
        var srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(img, offsetX, offsetY, drawW * dpr, drawH * dpr);
        applyHeroOverlayOnCanvas(srcCtx, pixelW, pixelH, lensRect, heroRect);

        var blurPx = BLUR_PX * dpr;

        if (edgeOk && edgeMapState.softData) {
          try {
            var srcData = srcCtx.getImageData(0, 0, pixelW, pixelH);
            var outData = srcCtx.createImageData(pixelW, pixelH);
            displacePixels(srcData, outData, pixelW, pixelH, displaceScale);
            srcCtx.putImageData(outData, 0, 0);
          } catch (err) {
            /* tainted canvas — оставляем без displacement */
          }
        }

        drawToDisplay(ctx, srcCanvas, blurPx);
        lens.style.backgroundImage = 'none';
      });
    });

    return true;
  }

  function applyLensBackground(lens, bgWrapper, bgImage, imageSize, heroRect) {
    if (!lens || !bgImage || bgImage === 'none') {
      return;
    }
    paintLens(
      lens,
      bgWrapper.getBoundingClientRect(),
      extractBackgroundUrl(bgImage),
      imageSize,
      heroRect
    );
  }

  /**
   * Преломление по уже захваченному фрагменту (для плавающих элементов
   * вроде кнопки «наверх», когда под линзой произвольный контент страницы).
   * sourceCanvas — bitmap в device pixels размером с линзу.
   * optics: { displaceScale, blurPx, bulge } — усиление объёмной линзы.
   */
  function paintLensFromSource(lens, sourceCanvas, lensRect, optics) {
    if (!lens || !sourceCanvas || !lensRect) {
      return false;
    }

    var cssW = Math.max(1, Math.round(lensRect.width));
    var cssH = Math.max(1, Math.round(lensRect.height));
    var dpr = Math.min(MAX_DPR, global.devicePixelRatio || 1);
    var pixelW = Math.max(1, Math.round(cssW * dpr));
    var pixelH = Math.max(1, Math.round(cssH * dpr));
    var displaceScale =
      ((optics && optics.displaceScale) || DISPLACE_SCALE_CSS) * dpr;
    var blurPx = ((optics && optics.blurPx) || BLUR_PX) * dpr;
    var bulge = (optics && optics.bulge) || 0;
    var generation = (lens._demoGlassPaintGen || 0) + 1;
    lens._demoGlassPaintGen = generation;

    ensureEdgeMap(function (edgeOk) {
      if (lens._demoGlassPaintGen !== generation) {
        return;
      }

      var srcCanvas = document.createElement('canvas');
      srcCanvas.width = pixelW;
      srcCanvas.height = pixelH;
      var srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) {
        return;
      }

      if (bulge > 0) {
        drawBulged(srcCtx, sourceCanvas, pixelW, pixelH, bulge);
      } else {
        srcCtx.drawImage(sourceCanvas, 0, 0, pixelW, pixelH);
      }

      if (edgeOk && edgeMapState.softData) {
        try {
          var srcData = srcCtx.getImageData(0, 0, pixelW, pixelH);
          var outData = srcCtx.createImageData(pixelW, pixelH);
          displacePixels(srcData, outData, pixelW, pixelH, displaceScale);
          srcCtx.putImageData(outData, 0, 0);
        } catch (err) {
          /* tainted canvas — оставляем без displacement */
        }
      }

      var canvas = ensureCanvas(lens);
      canvas.width = pixelW;
      canvas.height = pixelH;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';

      var ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      drawToDisplay(ctx, srcCanvas, blurPx);
      lens.style.backgroundImage = 'none';
    });

    return true;
  }

  /** Выпуклая линза: центр увеличен, граница гнётся дугой. */
  function drawBulged(destCtx, sourceCanvas, pixelW, pixelH, bulge) {
    var tmp = document.createElement('canvas');
    tmp.width = pixelW;
    tmp.height = pixelH;
    var tmpCtx = tmp.getContext('2d');
    if (!tmpCtx) {
      destCtx.drawImage(sourceCanvas, 0, 0, pixelW, pixelH);
      return;
    }
    tmpCtx.drawImage(sourceCanvas, 0, 0, pixelW, pixelH);

    var srcData;
    try {
      srcData = tmpCtx.getImageData(0, 0, pixelW, pixelH);
    } catch (err) {
      destCtx.drawImage(sourceCanvas, 0, 0, pixelW, pixelH);
      return;
    }

    var out = destCtx.createImageData(pixelW, pixelH);
    var src = srcData.data;
    var dst = out.data;
    var cx = (pixelW - 1) * 0.5;
    var cy = (pixelH - 1) * 0.5;
    var maxR = Math.max(cx, cy);
    var k = bulge;
    var x;
    var y;

    for (y = 0; y < pixelH; y++) {
      for (x = 0; x < pixelW; x++) {
        var dx = (x - cx) / maxR;
        var dy = (y - cy) / maxR;
        var r2 = dx * dx + dy * dy;
        // barrel: края тянем наружу → горизонтальный стык становится дугой
        var zoom = 1 + k * (1 - Math.min(1, r2));
        var sx = cx + dx * maxR / zoom;
        var sy = cy + dy * maxR / zoom;
        if (sx < 0) sx = 0;
        if (sy < 0) sy = 0;
        if (sx > pixelW - 1) sx = pixelW - 1;
        if (sy > pixelH - 1) sy = pixelH - 1;
        var si = ((sy | 0) * pixelW + (sx | 0)) * 4;
        var oi = (y * pixelW + x) * 4;
        dst[oi] = src[si];
        dst[oi + 1] = src[si + 1];
        dst[oi + 2] = src[si + 2];
        dst[oi + 3] = src[si + 3];
      }
    }

    destCtx.putImageData(out, 0, 0);
  }

  global.DemoGlassCanvas = {
    extractBackgroundUrl: extractBackgroundUrl,
    loadImageSize: loadImageSize,
    applyLensBackground: applyLensBackground,
    paintLens: paintLens,
    paintLensFromSource: paintLensFromSource,
    ensureEdgeMap: ensureEdgeMap,
    LENS_SCALE: LENS_SCALE,
    LENS_SHIFT_X: LENS_SHIFT_X,
    LENS_SHIFT_Y: LENS_SHIFT_Y,
  };

  function warmEdgeMap() {
    ensureEdgeMap(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', warmEdgeMap);
  } else {
    warmEdgeMap();
  }
})(window);

/* End */
;; /* /local/templates/main/js/unified-request-form.js?178670675385592*/
; /* /local/templates/main/js/demo-glass-canvas.js?178663104215631*/
