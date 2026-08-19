(function () {
    var SHOW_MODAL_ID = "show-request-modal";
    var COST_MODAL_ID = "cost-request-modal";
    var CONTACT_MODAL_ID = "connect-with-us-modal";
    var SUCCESS_MODAL_ID = "show-request-success-modal";
    var ERROR_MODAL_ID = "show-request-error-modal";
    var SHOW_ATTR = "data-show-request-modal";
    var COST_ATTR = "data-cost-request-modal";
    var CONTACT_ATTR = "data-connect-with-us-modal";
    var MAP_ACTION_ATTR = "data-map-premise-action";
    var ACTION_REQUEST_SHOW = "request_show";
    var ACTION_REQUEST_PRICE = "request_price";
    var lastFocusEl = null;

    function setPremiseField(modal, dataKey, value) {
        var el = modal.querySelector("[data-show-request-field=\"" + dataKey + "\"]");
        if (!el) {
            return;
        }
        var text = value != null && String(value).trim() ? String(value).trim() : "—";
        el.textContent = text;
    }

    function cellByLabel(row, label) {
        var td = row.querySelector('td[data-label="' + label + '"]');
        if (!td) {
            return "";
        }
        return td.textContent.trim();
    }

    var OBJECT_FIELD_MAP = {
        object: "OBJECT_NAME",
        type: "TYPE",
        room: "ROOM_NUMBER",
        floor: "FLOOR",
        area: "AREA",
    };

    function normalizeContextValue(value) {
        var text = value != null ? String(value).trim() : "";
        return text === "—" ? "" : text;
    }

    /**
     * @param {Element} modal
     * @param {{object?: string, type?: string, room?: string, floor?: string, area?: string}} ctx
     */
    function writeObjectInput(input, text) {
        if (!input) {
            return;
        }
        input.value = text;
        try {
            input.defaultValue = text;
        } catch (errDefault) {}
        input.setAttribute("value", text);
        if (!input.getAttribute("autocomplete")) {
            input.setAttribute("autocomplete", "off");
        }
    }

    /**
     * Re-copy display cells → hidden object inputs (call before FormData).
     * Defeats Firefox autofill clearing previously-empty text controls.
     * @param {Element} modal
     */
    function syncObjectContextInputs(modal) {
        if (!modal) {
            return;
        }
        var root = modal.querySelector('[data-demo-webform="Y"]');
        if (!root) {
            return;
        }
        Object.keys(OBJECT_FIELD_MAP).forEach(function (dataKey) {
            var cell = modal.querySelector('[data-show-request-field="' + dataKey + '"]');
            var text = cell && cell.textContent ? normalizeContextValue(cell.textContent) : "";
            var sid = OBJECT_FIELD_MAP[dataKey];
            var wrap = root.querySelector('[data-field-sid="' + sid + '"]');
            if (!wrap) {
                return;
            }
            writeObjectInput(wrap.querySelector("input, textarea, select"), text);
        });
    }

    function fillObjectContext(modal, ctx) {
        ctx = ctx || {};
        var root = modal.querySelector('[data-demo-webform="Y"]');
        Object.keys(OBJECT_FIELD_MAP).forEach(function (dataKey) {
            var raw = Object.prototype.hasOwnProperty.call(ctx, dataKey) ? ctx[dataKey] : "";
            var text = normalizeContextValue(raw);
            setPremiseField(modal, dataKey, text);
            if (!root) {
                return;
            }
            var sid = OBJECT_FIELD_MAP[dataKey];
            var wrap = root.querySelector('[data-field-sid="' + sid + '"]');
            if (!wrap) {
                return;
            }
            writeObjectInput(wrap.querySelector("input, textarea, select"), text);
        });
        try {
            modal._demoObjectContext = ctx;
        } catch (errCtx) {}
    }

    if (typeof window !== "undefined") {
        window.DemoShowRequestModal = window.DemoShowRequestModal || {};
        window.DemoShowRequestModal.syncObjectContextInputs = syncObjectContextInputs;
        window.DemoShowRequestModal.fillObjectContext = fillObjectContext;
        window.DemoShowRequestModal.openShow = function (trigger) {
            openRequestModal(getShowModal(), trigger);
        };
        window.DemoShowRequestModal.openCost = function (trigger) {
            openRequestModal(getCostModal(), trigger);
        };
        window.DemoShowRequestModal.openSuccess = openSuccessModal;
        window.DemoShowRequestModal.openError = openErrorModal;
    }

    function readShowAttr(el, key) {
        if (!el || !el.getAttribute) {
            return "";
        }
        return normalizeContextValue(el.getAttribute("data-show-" + key));
    }

    function collectObjectContextFromTrigger(trigger) {
        var ctx = {
            object: "",
            type: "",
            room: "",
            floor: "",
            area: "",
        };
        var row = trigger && trigger.closest ? trigger.closest("tr") : null;
        var source = row || trigger;
        var keys = ["object", "type", "room", "floor", "area"];
        var hasDataAttrs = false;
        var i;
        for (i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (source && source.hasAttribute && source.hasAttribute("data-show-" + key)) {
                hasDataAttrs = true;
                ctx[key] = readShowAttr(source, key);
            }
        }
        if (hasDataAttrs) {
            if (row && row.closest && row.closest(".portfolio-detail-page__premises-table") && !ctx.object) {
                var titleEl = document.querySelector(
                    ".portfolio-detail-page__hero-title, .portfolio-detail-page__title"
                );
                ctx.object = titleEl ? normalizeContextValue(titleEl.textContent) : "";
            }
            return ctx;
        }
        if (row && row.closest && row.closest(".portfolio-detail-page__premises-table")) {
            var cells = row.querySelectorAll("td:not(.portfolio-detail-page__premises-td-action)");
            if (cells.length >= 3) {
                ctx.room = normalizeContextValue(cells[0].textContent);
                ctx.floor = normalizeContextValue(cells[1].textContent);
                ctx.area = normalizeContextValue(cells[2].textContent);
            }
            var titleEl2 = document.querySelector(
                ".portfolio-detail-page__hero-title, .portfolio-detail-page__title"
            );
            ctx.object = titleEl2 ? normalizeContextValue(titleEl2.textContent) : "";
            // type: only from data-show-type (no TYPE column); leave empty if missing
            return ctx;
        }
        if (row && row.querySelector && row.querySelector("td[data-label]")) {
            ctx.object = normalizeContextValue(cellByLabel(row, "Объект"));
            ctx.room = normalizeContextValue(cellByLabel(row, "Помещение"));
            ctx.type = normalizeContextValue(cellByLabel(row, "Тип"));
            ctx.floor = normalizeContextValue(cellByLabel(row, "Этаж"));
            ctx.area = normalizeContextValue(cellByLabel(row, "Площадь"));
            return ctx;
        }
        if (trigger) {
            for (i = 0; i < keys.length; i++) {
                ctx[keys[i]] = readShowAttr(trigger, keys[i]);
            }
        }
        return ctx;
    }

    function textFromPopupCell(row, classSuffix) {
        if (!row || !row.querySelector) {
            return "";
        }
        var cell = row.querySelector(".portfolio-map-popup__cell_" + classSuffix);
        if (!cell) {
            return "";
        }
        var link = cell.querySelector("a");
        var raw = link ? link.textContent : cell.textContent;
        return normalizeContextValue(raw);
    }

    function collectObjectContextFromMapAction(trigger) {
        var ctx = {
            object: "",
            type: "",
            room: "",
            floor: "",
            area: "",
        };
        var row = trigger && trigger.closest ? trigger.closest(".portfolio-map-popup__row") : null;
        var popup = trigger && trigger.closest ? trigger.closest(".portfolio-map-popup") : null;
        if (popup) {
            var titleEl = popup.querySelector(".portfolio-map-popup__title");
            ctx.object = titleEl ? normalizeContextValue(titleEl.textContent) : "";
        }
        if (row) {
            ctx.room = textFromPopupCell(row, "premise");
            ctx.type = textFromPopupCell(row, "type");
            ctx.floor = textFromPopupCell(row, "floor");
            ctx.area = textFromPopupCell(row, "area");
        }
        return ctx;
    }

    function fillPremises(trigger, modal) {
        fillObjectContext(modal, collectObjectContextFromTrigger(trigger));
    }

    function getShowModal() {
        return document.getElementById(SHOW_MODAL_ID);
    }

    function getCostModal() {
        return document.getElementById(COST_MODAL_ID);
    }

    /** @deprecated Use getShowModal — kept for older call sites that expect getModal */
    function getModal() {
        return getShowModal();
    }

    function getContactModal() {
        return document.getElementById(CONTACT_MODAL_ID);
    }

    function getSuccessModal() {
        return document.getElementById(SUCCESS_MODAL_ID);
    }

    function getErrorModal() {
        return document.getElementById(ERROR_MODAL_ID);
    }

    function isResultModalOpen(modal) {
        return !!(modal && modal.classList.contains("is-open"));
    }

    function isSuccessOpen() {
        return isResultModalOpen(getSuccessModal());
    }

    function isErrorOpen() {
        return isResultModalOpen(getErrorModal());
    }

    function isAnyResultModalOpen() {
        return isSuccessOpen() || isErrorOpen();
    }

    function closeResultModal(modal) {
        if (!modal) {
            return;
        }
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        if (!isAnyResultModalOpen() && !anyRequestModalOpen()) {
            var contactModal = getContactModal();
            if (!contactModal || !contactModal.classList.contains("is-open")) {
                document.body.classList.remove("show-request-modal-open");
            }
            if (lastFocusEl && lastFocusEl.focus) {
                try {
                    lastFocusEl.focus();
                } catch (err) {
                    /* ignore */
                }
            }
            lastFocusEl = null;
        }
    }

    function isRequestModalOpen(modal) {
        return !!(modal && modal.classList.contains("is-open"));
    }

    function anyRequestModalOpen() {
        return isRequestModalOpen(getShowModal()) || isRequestModalOpen(getCostModal());
    }

    function closeRequestModal(modal, options) {
        options = options || {};
        if (!modal) {
            return;
        }
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        if (options.restoreFocus === false) {
            return;
        }
        if (!isAnyResultModalOpen() && !anyRequestModalOpen()) {
            var contactModal = getContactModal();
            if (!contactModal || !contactModal.classList.contains("is-open")) {
                document.body.classList.remove("show-request-modal-open");
            }
            if (lastFocusEl && lastFocusEl.focus) {
                try {
                    lastFocusEl.focus();
                } catch (err) {
                    /* ignore */
                }
            }
            lastFocusEl = null;
        }
    }

    function hideSiblingModals(exceptModal) {
        var showModal = getShowModal();
        var costModal = getCostModal();
        var contactModal = getContactModal();
        var successModal = getSuccessModal();
        var errorModal = getErrorModal();
        if (showModal && showModal !== exceptModal && showModal.classList.contains("is-open")) {
            showModal.classList.remove("is-open");
            showModal.setAttribute("aria-hidden", "true");
        }
        if (costModal && costModal !== exceptModal && costModal.classList.contains("is-open")) {
            costModal.classList.remove("is-open");
            costModal.setAttribute("aria-hidden", "true");
        }
        if (contactModal && contactModal !== exceptModal && contactModal.classList.contains("is-open")) {
            contactModal.classList.remove("is-open");
            contactModal.setAttribute("aria-hidden", "true");
        }
        if (successModal && successModal !== exceptModal && successModal.classList.contains("is-open")) {
            successModal.classList.remove("is-open");
            successModal.setAttribute("aria-hidden", "true");
        }
        if (errorModal && errorModal !== exceptModal && errorModal.classList.contains("is-open")) {
            errorModal.classList.remove("is-open");
            errorModal.setAttribute("aria-hidden", "true");
        }
    }

    function focusFirstField(modal) {
        var form = modal.querySelector(".show-request-modal__form");
        var firstField = null;
        if (form) {
            var candidates = form.querySelectorAll(
                'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
            );
            for (var i = 0; i < candidates.length; i++) {
                var candidate = candidates[i];
                if (candidate.closest(".demo-webform__modal-object-hidden")) {
                    continue;
                }
                firstField = candidate;
                break;
            }
        }
        if (firstField && firstField.focus && !isMobileRequestModalViewport()) {
            try {
                firstField.focus({ preventScroll: true });
            } catch (errFocus) {
                firstField.focus();
            }
        }

        modal.scrollTop = 0;
    }

    function isMobileRequestModalViewport() {
        return window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
    }

    function openRequestModal(modal, trigger, context) {
        if (!modal) {
            return;
        }
        hideSiblingModals(modal);
        lastFocusEl = document.activeElement;
        var form = modal.querySelector(".show-request-modal__form");
        if (form) {
            form.reset();
        }
        if (context) {
            fillObjectContext(modal, context);
        } else {
            fillPremises(trigger, modal);
        }
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("show-request-modal-open");
        focusFirstField(modal);
        window.requestAnimationFrame(function () {
            modal.scrollTop = 0;
        });
    }

    function openModal(trigger) {
        openRequestModal(getShowModal(), trigger);
    }

    function openCostModal(trigger, context) {
        openRequestModal(getCostModal(), trigger, context);
    }

    function openContactModal() {
        var modal = getContactModal();
        if (!modal) {
            return;
        }
        hideSiblingModals(modal);
        lastFocusEl = document.activeElement;
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("show-request-modal-open");
        var firstUnified = modal.querySelector('[data-unified-form] input[name="company"]');
        if (firstUnified && firstUnified.focus) {
            try {
                firstUnified.focus();
            } catch (errC) {
                /* ignore */
            }
        }
    }

    function closeContactModal() {
        var modal = getContactModal();
        if (!modal) {
            return;
        }
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        if (!isAnyResultModalOpen() && !anyRequestModalOpen()) {
            document.body.classList.remove("show-request-modal-open");
            if (lastFocusEl && lastFocusEl.focus) {
                try {
                    lastFocusEl.focus();
                } catch (err) {
                    /* ignore */
                }
            }
            lastFocusEl = null;
        }
    }

    function closeModal() {
        closeRequestModal(getShowModal());
    }

    function closeCostModal() {
        closeRequestModal(getCostModal());
    }

    function openSuccessModal() {
        var successModal = getSuccessModal();
        if (!successModal) {
            return;
        }
        hideSiblingModals(successModal);
        successModal.classList.add("is-open");
        successModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("show-request-modal-open");
        var okBtn = successModal.querySelector(".show-request-result-modal__btn");
        if (okBtn && okBtn.focus) {
            okBtn.focus();
        }
    }

    function openErrorModal() {
        var errorModal = getErrorModal();
        if (!errorModal) {
            return;
        }
        hideSiblingModals(errorModal);
        errorModal.classList.add("is-open");
        errorModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("show-request-modal-open");
        var okBtn = errorModal.querySelector(".show-request-result-modal__btn");
        if (okBtn && okBtn.focus) {
            okBtn.focus();
        }
    }

    function closeSuccessModal() {
        closeResultModal(getSuccessModal());
    }

    function closeErrorModal() {
        closeResultModal(getErrorModal());
    }

    function onDocClick(e) {
        var t = e.target;
        if (!t || !t.closest) {
            return;
        }
        /* Не открывать форму с кликов внутри уже открытых модалок */
        if (
            t.closest("#" + SHOW_MODAL_ID) ||
            t.closest("#" + COST_MODAL_ID) ||
            t.closest("#" + SUCCESS_MODAL_ID) ||
            t.closest("#" + ERROR_MODAL_ID) ||
            t.closest("#" + CONTACT_MODAL_ID)
        ) {
            return;
        }
        var contactTrigger = t.closest("[" + CONTACT_ATTR + "]");
        if (contactTrigger && (contactTrigger.tagName === "A" || contactTrigger.tagName === "BUTTON")) {
            e.preventDefault();
            openContactModal();
            return;
        }
        var mapAction = t.closest("[" + MAP_ACTION_ATTR + "]");
        if (mapAction && (mapAction.tagName === "A" || mapAction.tagName === "BUTTON")) {
            var actionCode = mapAction.getAttribute(MAP_ACTION_ATTR) || ACTION_REQUEST_SHOW;
            e.preventDefault();
            var mapCtx = collectObjectContextFromMapAction(mapAction);
            if (actionCode === ACTION_REQUEST_PRICE) {
                openCostModal(mapAction, mapCtx);
            } else {
                openRequestModal(getShowModal(), mapAction, mapCtx);
            }
            return;
        }
        var costTrigger = t.closest("[" + COST_ATTR + "]");
        if (costTrigger && (costTrigger.tagName === "A" || costTrigger.tagName === "BUTTON")) {
            e.preventDefault();
            openCostModal(costTrigger);
            return;
        }
        var trigger = t.closest("[" + SHOW_ATTR + "]");
        if (!trigger) {
            return;
        }
        if (trigger.tagName !== "A" && trigger.tagName !== "BUTTON") {
            return;
        }
        e.preventDefault();
        openModal(trigger);
    }

    function onCloseClick(e) {
        var t = e.target;
        if (!t || !t.closest) {
            return;
        }
        if (t.closest("[data-show-request-result-close]") || t.closest("[data-show-request-success-close]")) {
            e.preventDefault();
            if (isErrorOpen()) {
                closeErrorModal();
                return;
            }
            closeSuccessModal();
            return;
        }
        if (t.closest("[data-show-request-modal-close]")) {
            e.preventDefault();
            closeModal();
            return;
        }
        if (t.closest("[data-cost-request-modal-close]")) {
            e.preventDefault();
            closeCostModal();
            return;
        }
        if (t.closest("[data-connect-with-us-modal-close]")) {
            e.preventDefault();
            closeContactModal();
        }
    }

    function onKeydown(e) {
        if (e.key !== "Escape") {
            return;
        }
        if (isErrorOpen()) {
            closeErrorModal();
            return;
        }
        if (isSuccessOpen()) {
            closeSuccessModal();
            return;
        }
        var costModal = getCostModal();
        if (costModal && costModal.classList.contains("is-open")) {
            closeCostModal();
            return;
        }
        var modal = getShowModal();
        if (modal && modal.classList.contains("is-open")) {
            closeModal();
            return;
        }
        var cModal = getContactModal();
        if (cModal && cModal.classList.contains("is-open")) {
            closeContactModal();
        }
    }

    function formUsesDemoWebform(form) {
        if (!form) {
            return false;
        }
        return !!form.closest('[data-demo-webform="Y"]');
    }

    function bindFormOnce(modal) {
        if (!modal) {
            return;
        }
        var form = modal.querySelector(".show-request-modal__form");
        if (!form || form.getAttribute("data-bound") === "1" || formUsesDemoWebform(form)) {
            return;
        }
        form.setAttribute("data-bound", "1");
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            openSuccessModal();
        });
    }

    function onSubmitButtonPointer(e) {
        var t = e.target;
        if (!t || !t.closest) {
            return;
        }
        var btn = t.closest(".show-request-modal__submit");
        if (!btn) {
            return;
        }
        var showModal = getShowModal();
        var costModal = getCostModal();
        var modal = null;
        if (showModal && showModal.contains(btn) && showModal.classList.contains("is-open")) {
            modal = showModal;
        } else if (costModal && costModal.contains(btn) && costModal.classList.contains("is-open")) {
            modal = costModal;
        }
        if (!modal) {
            return;
        }
        var form = btn.closest(".show-request-modal__form");
        if (formUsesDemoWebform(form)) {
            return;
        }
        e.preventDefault();
        openSuccessModal();
    }

    function init() {
        bindFormOnce(getShowModal());
        bindFormOnce(getCostModal());
        document.addEventListener("click", onSubmitButtonPointer, true);
        document.addEventListener("click", onDocClick);
        document.addEventListener("click", onCloseClick);
        document.addEventListener("keydown", onKeydown);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
