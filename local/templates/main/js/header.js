(function () {
	var BP = 992;
	var HEADER_CHROME_TRANSITION_MS = 320;
	var HEADER_HOVER_LEAVE_DELAY_MS = 280;
	var heroIntersectVisible = true;
	/** Зона нечувствительности у нижней границы hero (px), чтобы не дребезжать transparent/fixed возле порога скролла */
	var HERO_SCROLL_HYSTERESIS_PX = 48;
	var SCROLL_DIRECTION_DELTA_PX = 2;
	var HEADER_REVEAL_START_PX = 4;
	/**
	 * При скролле вверх начинать уезд белой шапки за ~0.7vh до низа hero
	 * (середина / ниже 2-го блока — как на about «Преимущества»).
	 */
	var HEADER_UP_RETREAT_VH = 0.7;
	/** Сдвиг порога скрытия шапки выше по странице (главная / о компании). */
	var HEADER_HIDE_NUDGE_PX = 50;
	var lastScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
	var scrollDirection = 'none';
	var headerScrollRaf = 0;
	var layoutScrollSuppressDepth = 0;
	var heroHideToTransparentTimer = null;

	function getHeader() {
		return document.querySelector('.site-header');
	}

	/**
	 * Если шаблон ошибочно даёт data-header-mode=default на странице с hero (типично — /ru/about/), приводим к режиму главной.
	 */
	function ensureHeroModeFromDom() {
		if (document.body.classList.contains('demo-layout-404')) {
			return;
		}
		var header = getHeader();
		if (!header || header.getAttribute('data-header-mode') !== 'default') {
			return;
		}
		var hasHero =
			document.querySelector('main.home-page [data-home-slider]') ||
			document.querySelector('main.about-page .about-hero');
		if (!hasHero) {
			return;
		}
		header.setAttribute('data-header-mode', 'hero');
		setHeaderChrome(header, 'transparent', { instant: true });
		document.body.classList.add('demo-layout-hero');
	}

	/** hero-лейаут (отступы/прокладка) привязан к body.demo-layout-hero — восстанавливаем, если шапка уже в режиме hero */
	function ensureHeroBodyClassFromDom() {
		if (document.body.classList.contains('demo-layout-404')) {
			return;
		}
		var header = getHeader();
		if (!header || header.getAttribute('data-header-mode') !== 'hero') {
			return;
		}
		var hasHero =
			document.querySelector('main.home-page [data-home-slider]') ||
			document.querySelector('main.about-page .about-hero');
		if (hasHero) {
			document.body.classList.add('demo-layout-hero');
		}
	}

	function isDesktop() {
		return window.innerWidth >= BP;
	}

	function snapHeaderBarHeightPx() {
		/* Фиксированные значения макета — без субпиксельных измерений при загрузке (иначе тряска gap/hero). */
		return window.innerWidth < BP ? 56 : 88;
	}

	function syncBarHeight() {
		var header = getHeader();
		if (!header) {
			return;
		}
		var next = snapHeaderBarHeightPx() + 'px';
		var prev = header.style.getPropertyValue('--site-header-bar-height');
		if (prev === next) {
			return;
		}
		header.style.setProperty('--site-header-bar-height', next);
		document.documentElement.style.setProperty('--site-header-bar-height', next);
	}

	function isHomeRoot() {
		var path = window.location.pathname || '';
		return /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?$/i.test(path);
	}

	function isAboutRootWithoutHash() {
		var path = window.location.pathname || '';
		return /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?about\/?$/i.test(path) && !window.location.hash;
	}

	function shouldDeferHeroChromeForAboutPin() {
		return isAboutRootWithoutHash() && !window.__demoAboutScrollPinned;
	}

	function shouldDeferHeroChromeForHomePin() {
		return isHomeRoot() && !window.__demoHomeScrollPinned;
	}

	function shouldDeferHeroChromeForPin() {
		return shouldDeferHeroChromeForAboutPin() || shouldDeferHeroChromeForHomePin();
	}

	/** Единственная точка смены transparent/solid: data-header-chrome + синхронные классы для CSS. */
	function setHeaderChrome(header, chrome, options) {
		if (!header || (chrome !== 'transparent' && chrome !== 'solid')) {
			return false;
		}
		options = options || {};
		var instant = options.instant === true;
		var changed = header.getAttribute('data-header-chrome') !== chrome;

		if (!changed) {
			return false;
		}

		if (instant) {
			header.classList.add('site-header_chrome-no-transition');
		}

		header.setAttribute('data-header-chrome', chrome);
		header.classList.remove('site-header_state_transparent', 'site-header_state_solid');
		header.classList.add(
			chrome === 'transparent' ? 'site-header_state_transparent' : 'site-header_state_solid'
		);

		if (instant) {
			void header.offsetWidth;
			window.requestAnimationFrame(function () {
				window.requestAnimationFrame(function () {
					header.classList.remove('site-header_chrome-no-transition');
				});
			});
		}

		return true;
	}

	function syncHeroHeaderChrome() {
		syncHeaderScrollState();
	}

	function getStickyBarHeightPx() {
		return snapHeaderBarHeightPx();
	}

	function getHeroObserveTarget() {
		var hpMain = document.querySelector('main.home-page');
		if (hpMain) {
			var hHero =
				hpMain.querySelector('[data-home-slider]') || hpMain.querySelector('.home-page__hero');
			if (hHero) {
				return hHero;
			}
		}
		var abMain = document.querySelector('main.about-page');
		if (abMain) {
			var aHero =
				abMain.querySelector('[data-about-hero-slider]') || abMain.querySelector('.about-hero');
			if (aHero) {
				return aHero;
			}
		}
		return (
			document.querySelector('[data-about-hero-slider]') ||
			document.querySelector('[data-home-slider]') ||
			document.querySelector('.home-page__hero') ||
			document.querySelector('.about-hero')
		);
	}

	/** Hero перекрывает полосу шапки (без гистерезиса — для resize / закрытия меню). */
	function measureHeroUnderHeaderBar() {
		var tg = getHeroObserveTarget();
		if (!tg) {
			return true;
		}
		var rect = tg.getBoundingClientRect();
		if (!rect.height || rect.height < 48) {
			return true;
		}
		return rect.bottom > getStickyBarHeightPx();
	}

	function updateHeroIntersectHysteresis() {
		var tg = getHeroObserveTarget();
		if (!tg) {
			return;
		}
		var r = tg.getBoundingClientRect();
		if (!r.height || r.height < 48) {
			return;
		}
		var bottom = r.bottom;
		var barH = getStickyBarHeightPx();
		var h = HERO_SCROLL_HYSTERESIS_PX;

		if (heroIntersectVisible) {
			/* +NUDGE: уходим с hero (скрытие при скролле вниз) выше по странице */
			if (bottom <= barH - h + HEADER_HIDE_NUDGE_PX) {
				heroIntersectVisible = false;
			}
		} else if (bottom > barH + h - HEADER_HIDE_NUDGE_PX) {
			/* −NUDGE: возврат на hero чуть раньше при скролле вверх */
			heroIntersectVisible = true;
		}
	}

	/**
	 * Зона подъезда к hero при скролле вверх: белая шапка начинает уезжать
	 * ещё на 2-м блоке (середина / ниже), а не резко на границе hero.
	 */
	function isInHeaderUpRetreatZone() {
		var tg = getHeroObserveTarget();
		if (!tg) {
			return false;
		}
		var r = tg.getBoundingClientRect();
		if (!r.height || r.height < 48) {
			return false;
		}
		var barH = getStickyBarHeightPx();
		var vh = window.innerHeight || 800;
		/*
		 * +NUDGE: порог выше по странице — уезд раньше при подъезде к hero
		 * (главная и о компании, один observe-target).
		 */
		return r.bottom > barH - vh * HEADER_UP_RETREAT_VH + HEADER_HIDE_NUDGE_PX;
	}

	function getWindowScrollY() {
		return (
			window.pageYOffset ||
			(document.documentElement && document.documentElement.scrollTop) ||
			(document.body && document.body.scrollTop) ||
			0
		);
	}

	function updateScrollDirection() {
		var y = getWindowScrollY();

		if (layoutScrollSuppressDepth > 0) {
			lastScrollY = y;
			return y;
		}

		var delta = y - lastScrollY;

		if (Math.abs(delta) >= SCROLL_DIRECTION_DELTA_PX) {
			scrollDirection = delta > 0 ? 'down' : 'up';
			lastScrollY = y;
		}

		return y;
	}

	function setHeaderScrollVisibility(header, state) {
		if (!header) {
			return false;
		}
		var nextHidden = state === 'hidden';
		var nextVisible = state === 'visible';
		var wasHidden = header.classList.contains('site-header_state_scroll-hidden');
		var wasVisible = header.classList.contains('site-header_state_scroll-visible');
		var changed = wasHidden !== nextHidden || wasVisible !== nextVisible;
		if (!changed) {
			return false;
		}
		header.classList.remove('site-header_state_scroll-hidden', 'site-header_state_scroll-visible');
		if (nextHidden) {
			header.classList.add('site-header_state_scroll-hidden');
		} else if (nextVisible) {
			header.classList.add('site-header_state_scroll-visible');
		}
		return true;
	}

	function clearHeroHideToTransparentTimer() {
		if (heroHideToTransparentTimer !== null) {
			window.clearTimeout(heroHideToTransparentTimer);
			heroHideToTransparentTimer = null;
		}
	}

	/** После плавного hide solid → transparent на первом экране (без резкого пропадания). */
	function scheduleHeroTransparentAfterHide(header) {
		clearHeroHideToTransparentTimer();
		heroHideToTransparentTimer = window.setTimeout(function () {
			heroHideToTransparentTimer = null;
			if (!isHeroHeaderMode(header)) {
				return;
			}
			updateHeroIntersectHysteresis();
			if (
				(getWindowScrollY() || 0) <= 1 ||
				(heroIntersectVisible &&
					!header.classList.contains('site-header_state_menu-open') &&
					!header.classList.contains('site-header_state_hovered'))
			) {
				setHeaderChrome(header, 'transparent', { instant: true });
				setHeaderScrollVisibility(header, null);
			}
		}, HEADER_CHROME_TRANSITION_MS);
	}

	function isHeroHeaderMode(header) {
		return header && header.getAttribute('data-header-mode') === 'hero';
	}

	function isSolidHeaderMode(header) {
		if (!header) {
			return false;
		}
		var mode = header.getAttribute('data-header-mode');
		return mode === 'default' || mode === 'rooms';
	}

	function ensure404HeaderMode() {
		if (!document.body.classList.contains('demo-layout-404')) {
			return;
		}
		var header = getHeader();
		if (!header) {
			return;
		}
		document.body.classList.remove('demo-layout-hero');
		header.setAttribute('data-header-mode', 'default');
		header.classList.remove('site-header_state_transparent');
		header.classList.add('site-header_state_solid');
		setHeaderChrome(header, 'solid');
		setHeaderScrollVisibility(header, null);
	}

	function isPinnedHeaderPage() {
		return document.body.classList.contains('demo-layout-404');
	}

	function syncHeaderScrollState() {
		var header = getHeader();
		if (!header) {
			return;
		}

		syncBarHeight();

		if (layoutScrollSuppressDepth > 0) {
			return;
		}

		if (isPinnedHeaderPage()) {
			clearHeroHideToTransparentTimer();
			ensure404HeaderMode();
			return;
		}

		if (
			header.classList.contains('site-header_state_menu-open') ||
			header.classList.contains('site-header_state_hovered') ||
			header.classList.contains('site-header_open')
		) {
			clearHeroHideToTransparentTimer();
			setHeaderScrollVisibility(header, 'visible');
			return;
		}

		var y = getWindowScrollY();
		var atTop = y <= 1;

		if (isSolidHeaderMode(header)) {
			clearHeroHideToTransparentTimer();
			setHeaderChrome(header, 'solid');
			if (atTop) {
				setHeaderScrollVisibility(header, null);
			} else if (scrollDirection === 'up') {
				setHeaderScrollVisibility(header, 'visible');
			} else if (scrollDirection === 'down' && y > HEADER_REVEAL_START_PX) {
				setHeaderScrollVisibility(header, 'hidden');
			}
			return;
		}

		if (!isHeroHeaderMode(header)) {
			return;
		}

		if (shouldDeferHeroChromeForPin()) {
			clearHeroHideToTransparentTimer();
			if ((getWindowScrollY() || 0) <= 1) {
				pinAboutPageTop();
				pinHomePageTop();
			}
			setHeaderChrome(header, 'transparent', { instant: true });
			setHeaderScrollVisibility(header, null);
			return;
		}

		updateHeroIntersectHysteresis();

		if (atTop) {
			clearHeroHideToTransparentTimer();
			setHeaderChrome(header, 'transparent', { instant: true });
			setHeaderScrollVisibility(header, null);
			return;
		}

		if (heroIntersectVisible) {
			/*
			 * На первом блоке сразу transparent (белый логотип),
			 * без промежуточного solid (чёрный логотип) — иначе мигание.
			 */
			clearHeroHideToTransparentTimer();
			setHeaderChrome(header, 'transparent', { instant: true });
			setHeaderScrollVisibility(header, null);
			return;
		}

		if (scrollDirection === 'up') {
			clearHeroHideToTransparentTimer();
			setHeaderChrome(header, 'solid');
			/*
			 * Раньше границы hero: в зоне 2-го блока шапка уже уезжает вверх —
			 * к моменту hero она не «обрывается».
			 */
			if (isInHeaderUpRetreatZone()) {
				setHeaderScrollVisibility(header, 'hidden');
			} else {
				setHeaderScrollVisibility(header, 'visible');
			}
		} else {
			clearHeroHideToTransparentTimer();
			setHeaderChrome(header, 'solid', { instant: true });
			setHeaderScrollVisibility(header, 'hidden');
		}
	}

	function scheduleHeaderScrollState() {
		if (headerScrollRaf) {
			return;
		}
		headerScrollRaf = window.requestAnimationFrame(function () {
			headerScrollRaf = 0;
			syncHeaderScrollState();
		});
	}

	var ABOUT_DROPDOWN_WIDTH_DESIGN = 497;
	var ABOUT_DROPDOWN_VIEWPORT_MARGIN = 12;

	function resetAboutMegaPopupDimensions(popup) {
		popup.style.left = '';
		popup.style.right = '';
		popup.style.width = '';
	}

	function positionAboutMegaMenu(li) {
		var popup = li.querySelector('.header-menu__portfolio-wide-popup_about');
		var link = li.querySelector('.header-menu__link');
		if (!popup || !link) {
			return;
		}

		var w = ABOUT_DROPDOWN_WIDTH_DESIGN;
		w = Math.min(w, window.innerWidth - 2 * ABOUT_DROPDOWN_VIEWPORT_MARGIN);
		w = Math.max(264, w);

		var lr = link.getBoundingClientRect();
		var cx = lr.left + lr.width / 2 - w / 2;
		cx = Math.max(
			ABOUT_DROPDOWN_VIEWPORT_MARGIN,
			Math.min(cx, window.innerWidth - ABOUT_DROPDOWN_VIEWPORT_MARGIN - w)
		);

		popup.style.left = cx + 'px';
		popup.style.right = 'auto';
		popup.style.width = w + 'px';
	}

	function syncOpenAboutMegaPosition() {
		var header = getHeader();
		if (!header || !isDesktop()) {
			return;
		}
		var openAbout = header.querySelector(
			'.header-menu__item_about.header-menu__item_dropdown-open'
		);
		if (openAbout) {
			positionAboutMegaMenu(openAbout);
		}
	}

	function syncHeaderHoveredFromPointer() {
		var header = getHeader();
		if (!header || !isDesktop()) {
			return;
		}
		var surface = header.querySelector('.site-header__surface');
		if (surface && surface.matches(':hover')) {
			header.classList.add('site-header_state_hovered');
		}
	}

	function closeAllMegaMenus() {
		var header = getHeader();
		if (!header) {
			return;
		}

		var headerItems = header.querySelectorAll('.header-menu__item_has-popup');
		headerItems.forEach(function (li) {
			li.classList.remove('header-menu__item_dropdown-open');
			var pop = li.querySelector('.header-menu__portfolio-wide-popup');
			if (pop) {
				pop.setAttribute('aria-hidden', 'true');
				pop.setAttribute('hidden', '');
				if (pop.classList.contains('header-menu__portfolio-wide-popup_about')) {
					resetAboutMegaPopupDimensions(pop);
				}
			}
		});

		header.classList.remove('site-header_state_menu-open');
		header.classList.remove('header-menu-open');

		header.querySelectorAll('.header-menu__portfolio-wide-popup_about').forEach(function (p) {
			resetAboutMegaPopupDimensions(p);
		});

		syncHeaderHoveredFromPointer();

		if (header.getAttribute('data-header-mode') === 'hero') {
			heroIntersectVisible = measureHeroUnderHeaderBar();
			if (
				!header.classList.contains('site-header_state_hovered') &&
				!header.classList.contains('site-header_state_menu-open')
			) {
				syncHeroHeaderChrome();
			}
		}
	}

	function initHeaderHover() {
		var header = getHeader();
		if (!header || header.getAttribute('data-header-mode') !== 'hero') {
			return;
		}

		var surface = header.querySelector('.site-header__surface');
		if (!surface) {
			return;
		}

		var hoverOffTimer = null;

		function clearHoverOffTimer() {
			if (hoverOffTimer !== null) {
				window.clearTimeout(hoverOffTimer);
				hoverOffTimer = null;
			}
		}

		function setHeaderHovered(isHovered) {
			header.classList.toggle('site-header_state_hovered', isHovered);
			if (isHovered) {
				return;
			}
			if (header.classList.contains('site-header_state_menu-open')) {
				return;
			}
			window.setTimeout(function () {
				if (
					!header.classList.contains('site-header_state_hovered') &&
					!header.classList.contains('site-header_state_menu-open')
				) {
					syncHeroHeaderChrome();
				}
			}, HEADER_CHROME_TRANSITION_MS);
		}

		function scheduleHeaderHoverOff() {
			clearHoverOffTimer();
			hoverOffTimer = window.setTimeout(function () {
				if (!header.classList.contains('site-header_state_menu-open')) {
					setHeaderHovered(false);
				}
			}, HEADER_HOVER_LEAVE_DELAY_MS);
		}

		surface.addEventListener('mouseenter', function () {
			if (!isDesktop()) {
				return;
			}
			clearHoverOffTimer();
			setHeaderHovered(true);
		});

		surface.addEventListener('mouseleave', function () {
			if (!isDesktop()) {
				return;
			}
			scheduleHeaderHoverOff();
		});
	}

	function initMegaMenu() {
		var header = getHeader();
		if (!header) {
			return;
		}

		var items = header.querySelectorAll('.header-menu__item_has-popup');
		if (!items.length) {
			return;
		}

		var hoverTimer = null;

		function clearHoverTimer() {
			if (hoverTimer !== null) {
				window.clearTimeout(hoverTimer);
				hoverTimer = null;
			}
		}

		function scheduleClose() {
			clearHoverTimer();
			hoverTimer = window.setTimeout(closeAllMegaMenus, 260);
		}

		function cancelClose() {
			clearHoverTimer();
		}

		function closeMegaItem(li) {
			li.classList.remove('header-menu__item_dropdown-open');
			var popup = li.querySelector('.header-menu__portfolio-wide-popup');
			if (popup) {
				popup.setAttribute('aria-hidden', 'true');
				popup.setAttribute('hidden', '');
				if (popup.classList.contains('header-menu__portfolio-wide-popup_about')) {
					resetAboutMegaPopupDimensions(popup);
				}
			}
		}

		function openMega(item) {
			if (!isDesktop()) {
				return;
			}

			cancelClose();

			/* Сначала закрыть все, затем открыть — без двух панелей при переходе О компании ↔ Портфель */
			items.forEach(function (li) {
				if (li !== item) {
					closeMegaItem(li);
				}
			});

			var popup = item.querySelector('.header-menu__portfolio-wide-popup');
			item.classList.add('header-menu__item_dropdown-open');
			if (popup) {
				popup.setAttribute('aria-hidden', 'false');
				popup.removeAttribute('hidden');
			}
			syncBarHeight();
			if (item.classList.contains('header-menu__item_about')) {
				positionAboutMegaMenu(item);
			}
			header.classList.add('site-header_state_menu-open');
			header.classList.add('header-menu-open');
			/* Белый chrome даёт site-header_state_menu-open */
		}

		items.forEach(function (item) {
			var popup = item.querySelector('.header-menu__portfolio-wide-popup');
			item.addEventListener('mouseenter', function () {
				if (!isDesktop()) {
					return;
				}
				openMega(item);
			});
			item.addEventListener('mouseleave', function () {
				if (!isDesktop()) {
					return;
				}
				scheduleClose();
			});
			if (popup) {
				popup.addEventListener('mouseenter', cancelClose);
				popup.addEventListener('mouseleave', scheduleClose);
			}
		});
	}

	function pinAboutPageTop() {
		if (!isAboutRootWithoutHash() || window.__demoUserScrolledDuringLoad) {
			return false;
		}
		window.scrollTo(0, 0);
		return window.scrollY === 0;
	}

	function pinHomePageTop() {
		if (!isHomeRoot() || window.__demoUserScrolledDuringLoad) {
			return false;
		}
		window.scrollTo(0, 0);
		return window.scrollY === 0;
	}

	function setScrollRestoration(mode) {
		if ('scrollRestoration' in window.history) {
			window.history.scrollRestoration = mode;
		}
	}

	/**
	 * После hero-pin не оставляем manual на всю сессию —
	 * иначе reload на rooms/portfolio/etc сбрасывает скролл в начало.
	 * На главной / about оставляем manual, чтобы вход всегда был с верха hero.
	 */
	function ensureDefaultScrollRestoration() {
		if (isHomeRoot() || isAboutRootWithoutHash()) {
			setScrollRestoration('manual');
			return;
		}
		setScrollRestoration('auto');
	}

	/**
	 * Если пользователь уже скроллил, а load/layout/pageshow отбросил вверх — вернуть позицию.
	 * На всех страницах, включая hero: pin к верху только до первого жеста.
	 */
	function initScrollLoadStability() {
		var lastUserY = Number(window.__demoLastUserScrollY) || 0;
		var userMoved = window.__demoUserScrolledDuringLoad === true || lastUserY > 1;
		var settling = false;
		var settleUntil = Date.now() + 4000;

		function readY() {
			return window.pageYOffset || document.documentElement.scrollTop || 0;
		}

		function noteUserY() {
			var y = readY();
			if (y > 1) {
				userMoved = true;
				lastUserY = y;
				window.__demoUserScrolledDuringLoad = true;
				window.__demoLastUserScrollY = y;
			}
		}

		function restoreIfJumped() {
			if (!userMoved || lastUserY <= 40 || settling) {
				return;
			}
			var y = readY();
			if (y <= 1 || y < lastUserY * 0.35) {
				settling = true;
				applyWindowScrollY(lastUserY);
				window.requestAnimationFrame(function () {
					settling = false;
				});
			}
		}

		function onMaybeJump() {
			noteUserY();
			if (Date.now() <= settleUntil) {
				restoreIfJumped();
			}
		}

		noteUserY();
		window.addEventListener('scroll', noteUserY, { passive: true });
		window.addEventListener('wheel', noteUserY, { passive: true });
		window.addEventListener('touchstart', noteUserY, { passive: true });
		window.addEventListener('touchmove', noteUserY, { passive: true });
		window.addEventListener('resize', onMaybeJump, { passive: true });
		window.addEventListener('pageshow', restoreIfJumped);
		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', onMaybeJump, { passive: true });
		}

		function onLoadSettle() {
			noteUserY();
			settleUntil = Date.now() + 2800;
			restoreIfJumped();
			window.requestAnimationFrame(restoreIfJumped);
			[0, 50, 120, 250, 500, 1000, 1800, 2800].forEach(function (ms) {
				window.setTimeout(restoreIfJumped, ms);
			});
		}

		if (document.readyState === 'complete') {
			onLoadSettle();
		} else {
			window.addEventListener('load', onLoadSettle, { once: true });
		}
	}

	function initHeroLandingScrollPin(options) {
		if (!options.isTargetPage()) {
			return;
		}

		var docEl = document.documentElement;
		var pinReleased = false;
		var gestureUnlockBound = false;
		/**
		 * Пока true — можно (и нужно) вернуть scrollY=0.
		 * Становится false только после жеста пользователя (wheel/touch/key).
		 * Восстановление скролла браузером жестом не считается.
		 */
		var allowForceTop = true;
		var userEngaged = false;
		/* Жесты не снимаем на release — иначе до load (на мобилке это секунды) снова кинет вверх. */
		var loadSettled = false;

		setScrollRestoration('manual');

		function getY() {
			return window.pageYOffset || document.documentElement.scrollTop || 0;
		}

		function markUserEngaged() {
			userEngaged = true;
			allowForceTop = false;
			window.__demoUserScrolledDuringLoad = true;
		}

		/* Ранний скрипт уже поймал жест до boot — не сбрасываем флаг и не кидаем вверх. */
		if (window.__demoUserScrolledDuringLoad || getY() > 1) {
			markUserEngaged();
		}

		function forceTop() {
			window.scrollTo(0, 0);
			docEl.scrollTop = 0;
			if (document.body) {
				document.body.scrollTop = 0;
			}
			return getY() === 0;
		}

		function pinTopIfAllowed() {
			if (!allowForceTop || userEngaged) {
				return false;
			}
			options.pinTop();
			return forceTop();
		}

		function releaseScrollPin() {
			if (pinReleased) {
				return;
			}
			pinReleased = true;
			if (!userEngaged) {
				pinTopIfAllowed();
			}
			/* На hero оставляем manual — иначе reload/вход чуть ниже хедера. */
			setScrollRestoration('manual');
			if (options.pinnedFlag) {
				window[options.pinnedFlag] = true;
			}
			if (options.pinnedEvent) {
				window.dispatchEvent(new Event(options.pinnedEvent));
			}
			if (loadSettled) {
				unbindGestureUnlock();
			}
		}

		function scheduleReleaseScrollPin() {
			window.requestAnimationFrame(function () {
				window.requestAnimationFrame(releaseScrollPin);
			});
		}

		function onGestureUnlock() {
			markUserEngaged();
			releaseScrollPin();
		}

		function bindGestureUnlock() {
			if (gestureUnlockBound) {
				return;
			}
			gestureUnlockBound = true;
			window.addEventListener('wheel', onGestureUnlock, { passive: true });
			window.addEventListener('touchstart', onGestureUnlock, { passive: true });
			window.addEventListener('touchmove', onGestureUnlock, { passive: true });
			window.addEventListener('keydown', onGestureUnlock, { passive: true });
		}

		function unbindGestureUnlock() {
			if (!gestureUnlockBound) {
				return;
			}
			gestureUnlockBound = false;
			window.removeEventListener('wheel', onGestureUnlock);
			window.removeEventListener('touchstart', onGestureUnlock);
			window.removeEventListener('touchmove', onGestureUnlock);
			window.removeEventListener('keydown', onGestureUnlock);
		}

		function onScrollWatch() {
			if (userEngaged) {
				return;
			}
			/* Любой уход с верха = жест пользователя. Не возвращаем на 0 — это отбрасывает после load. */
			if (getY() > 1) {
				markUserEngaged();
				releaseScrollPin();
				unbindGestureUnlock();
			}
		}

		/* Без overflow:hidden — иначе на ~120ms пропадает scrollbar и хедер трясётся по ширине. */
		pinTopIfAllowed();
		bindGestureUnlock();
		window.addEventListener('scroll', onScrollWatch, { passive: true });
		window.setTimeout(releaseScrollPin, 120);

		function onWindowLoadPin() {
			loadSettled = true;
			/* Уже проскроллили во время загрузки — не отбрасываем наверх. */
			if (userEngaged || window.__demoUserScrolledDuringLoad || getY() > 1) {
				markUserEngaged();
				releaseScrollPin();
				unbindGestureUnlock();
				return;
			}
			pinTopIfAllowed();
			releaseScrollPin();
			unbindGestureUnlock();
		}

		if (document.readyState === 'complete') {
			scheduleReleaseScrollPin();
			loadSettled = true;
			unbindGestureUnlock();
		} else if (document.readyState === 'interactive') {
			scheduleReleaseScrollPin();
			window.addEventListener('load', onWindowLoadPin, { once: true });
		} else {
			document.addEventListener('DOMContentLoaded', scheduleReleaseScrollPin, { once: true });
			window.addEventListener('load', onWindowLoadPin, { once: true });
		}

		window.addEventListener('pageshow', function (event) {
			if (!options.isTargetPage()) {
				return;
			}
			if (window.location.hash) {
				return;
			}
			/*
			 * pageshow на первой загрузке идёт после load. Повторный pin сбрасывает
			 * скролл пользователя в начало — и на мобилке, и на десктопе.
			 */
			if (!event.persisted) {
				if (window.__demoUserScrolledDuringLoad || getY() > 1) {
					markUserEngaged();
				}
				return;
			}
			if (getY() > 1 || window.__demoUserScrolledDuringLoad) {
				markUserEngaged();
			}
		});
	}

	/** Главная: сброс scroll restoration, чтобы hero начинался под прозрачным хедером. */
	function initHomeScrollPin() {
		initHeroLandingScrollPin({
			isTargetPage: isHomeRoot,
			pinTop: pinHomePageTop,
			pinnedFlag: '__demoHomeScrollPinned',
			pinnedEvent: 'demo-home-scroll-pinned',
		});
	}

	/** Только /about/ без hash: фиксация скролла до layout (без класса на html — как на главной). */
	function initAboutScrollPin() {
		initHeroLandingScrollPin({
			isTargetPage: isAboutRootWithoutHash,
			pinTop: pinAboutPageTop,
			pinnedFlag: '__demoAboutScrollPinned',
			pinnedEvent: 'demo-about-scroll-pinned',
		});
	}

	function initHeaderScroll() {
		var header = getHeader();
		if (!header) {
			return;
		}

		var target = getHeroObserveTarget();
		/* Не сбрасываем скролл, если пользователь уже ушёл с верха до boot header.js. */
		if ((window.pageYOffset || document.documentElement.scrollTop || 0) <= 1) {
			pinAboutPageTop();
			pinHomePageTop();
		}
		if (isHeroHeaderMode(header)) {
			heroIntersectVisible = shouldDeferHeroChromeForPin() ? true : measureHeroUnderHeaderBar();
		}
		syncHeaderScrollState();

		window.addEventListener('demo-about-scroll-pinned', function () {
			if (isAboutRootWithoutHash()) {
				window.__demoAboutScrollPinned = true;
			}
			heroIntersectVisible = measureHeroUnderHeaderBar();
			scheduleHeaderScrollState();
		});

		window.addEventListener('demo-home-scroll-pinned', function () {
			if (isHomeRoot()) {
				window.__demoHomeScrollPinned = true;
			}
			heroIntersectVisible = measureHeroUnderHeaderBar();
			scheduleHeaderScrollState();
		});

		window.addEventListener('resize', function () {
			heroIntersectVisible = measureHeroUnderHeaderBar();
			scheduleHeaderScrollState();
		});

		if (isHeroHeaderMode(header) && target && typeof ResizeObserver !== 'undefined') {
			new ResizeObserver(function () {
				/* Гистерезис — без дребезга transparent/fixed на границе hero при resize контента */
				updateHeroIntersectHysteresis();
				scheduleHeaderScrollState();
			}).observe(target);
		}

		scheduleHeaderScrollState();
	}

	function getBurger(header) {
		return header ? header.querySelector('.site-header__burger') : null;
	}

	function setOpenState(header, isOpen) {
		if (!header) {
			return;
		}

		var burger = getBurger(header);
		header.classList.toggle('site-header_open', isOpen);

		if (burger) {
			burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
		}

		document.body.style.overflow = isOpen ? 'hidden' : '';
	}

	window.addEventListener('demo-layout-scroll-suppress', function (event) {
		var active = !!(event.detail && event.detail.active);
		if (active) {
			layoutScrollSuppressDepth += 1;
			return;
		}
		layoutScrollSuppressDepth = Math.max(0, layoutScrollSuppressDepth - 1);
		if (layoutScrollSuppressDepth === 0) {
			lastScrollY = getWindowScrollY();
			scrollDirection = 'none';
			scheduleHeaderScrollState();
		}
	});

	window.addEventListener(
		'scroll',
		function () {
			updateScrollDirection();
			var header = getHeader();
			if (isDesktop() && header && header.classList.contains('site-header_state_menu-open')) {
				closeAllMegaMenus();
			}
			scheduleHeaderScrollState();
		},
		{ passive: true }
	);

	document.addEventListener('click', function (event) {
		var header = getHeader();
		if (!header) {
			return;
		}

		var burger = event.target.closest('.site-header__burger');
		if (burger && header.contains(burger)) {
			setOpenState(header, !header.classList.contains('site-header_open'));
			return;
		}

		var closeBtn = event.target.closest('.site-header__close');
		if (closeBtn && header.contains(closeBtn)) {
			setOpenState(header, false);
			return;
		}

		if (window.innerWidth > BP - 1 || !header.classList.contains('site-header_open')) {
			return;
		}

		if (!header.contains(event.target)) {
			setOpenState(header, false);
		}
	});

	document.addEventListener('keydown', function (event) {
		if (event.key !== 'Escape') {
			return;
		}

		var header = getHeader();
		if (!header) {
			return;
		}

		setOpenState(header, false);
		closeAllMegaMenus();
	});

	window.addEventListener('resize', function () {
		if (window.innerWidth < BP) {
			closeAllMegaMenus();
			setOpenState(getHeader(), false);
			var headerOnResize = getHeader();
			if (headerOnResize) {
				headerOnResize.classList.remove('site-header_state_hovered');
			}
		}
		syncBarHeight();
		syncOpenAboutMegaPosition();
	});

	var DEMO_LEAVE_SCROLL_KEY = 'demo.nav.leaveScroll';
	var DEMO_RESTORE_SCROLL_KEY = 'demo.nav.restoreScroll';

	function applyWindowScrollY(y) {
		window.scrollTo(0, y);
		if (document.documentElement) {
			document.documentElement.scrollTop = y;
		}
		if (document.body) {
			document.body.scrollTop = y;
		}
	}

	function scheduleWindowScrollY(y) {
		function apply() {
			var current = getWindowScrollY();
			if (
				window.__demoUserScrolledDuringLoad &&
				current > 40 &&
				Math.abs(current - y) > 80
			) {
				return;
			}
			applyWindowScrollY(y);
		}

		apply();
		if (window.requestAnimationFrame) {
			window.requestAnimationFrame(function () {
				apply();
				window.requestAnimationFrame(apply);
			});
		}
		window.setTimeout(apply, 50);
		window.setTimeout(apply, 150);
		window.setTimeout(apply, 400);
		window.addEventListener('load', apply, { once: true });
		window.addEventListener('pageshow', apply, { once: true });
	}

	function saveLeaveScroll() {
		if (document.querySelector('.portfolio-page')) {
			return;
		}

		try {
			sessionStorage.setItem(
				DEMO_LEAVE_SCROLL_KEY,
				JSON.stringify({
					href: window.location.href,
					y: getWindowScrollY(),
				})
			);
		} catch (err) {
			/* private mode / quota */
		}
	}

	function restorePendingScroll() {
		if (isHomeRoot() || isAboutRootWithoutHash()) {
			return;
		}

		var data = null;
		try {
			var raw = sessionStorage.getItem(DEMO_RESTORE_SCROLL_KEY);
			if (!raw) {
				return;
			}
			data = JSON.parse(raw);
			// Список портфеля сам дочитает section и снимет ключ.
			if (!document.querySelector('.portfolio-page')) {
				sessionStorage.removeItem(DEMO_RESTORE_SCROLL_KEY);
			}
		} catch (errRead) {
			return;
		}

		if (!data || typeof data.path !== 'string') {
			return;
		}

		if (data.path !== window.location.pathname || String(data.search || '') !== window.location.search) {
			return;
		}

		var y = Number(data.y);
		if (!isFinite(y) || y < 0) {
			return;
		}

		scheduleWindowScrollY(y);
	}

	window.addEventListener('pagehide', saveLeaveScroll);
	document.addEventListener('visibilitychange', function () {
		if (document.visibilityState === 'hidden') {
			saveLeaveScroll();
		}
	});

	function boot() {
		ensureDefaultScrollRestoration();
		initHomeScrollPin();
		initAboutScrollPin();
		initScrollLoadStability();
		restorePendingScroll();
		ensure404HeaderMode();
		ensureHeroModeFromDom();
		ensureHeroBodyClassFromDom();
		syncBarHeight();
		if (typeof ResizeObserver !== 'undefined') {
			var innerBar = document.querySelector('.site-header__inner');
			if (innerBar) {
				new ResizeObserver(function () {
					syncBarHeight();
					syncOpenAboutMegaPosition();
				}).observe(innerBar);
			}
		}
		initHeaderScroll();
		initHeaderHover();
		initMegaMenu();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
