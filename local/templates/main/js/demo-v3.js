/* ============================================================
   DEMO v3
   1) sticky-стек секций          4) курсор Spin
   2) интро Pixel Reveal          5) счётчики, заголовок, параллакс
   3) кнопки Liquid Carve
   ============================================================ */
(function () {
	'use strict';

	/* путь относительный: сборка может лежать не в корне домена */
	var LOGO = 'local/templates/main/images/header/mark-intro.svg';
	var EASE = 'cubic-bezier(.16,.84,.32,1)';

	var mq = window.matchMedia ? window.matchMedia.bind(window) : null;
	var REDUCED = mq ? mq('(prefers-reduced-motion: reduce)').matches : false;
	var COARSE = mq ? mq('(pointer: coarse)').matches : false;

	var clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };
	window.__demoIntro = REDUCED ? 'skipped' : 'pending';

	function afterIntro(fn) {
		var s = window.__demoIntro;
		if (s === 'pending' || s === 'running') {
			window.addEventListener('demo:intro-done', fn, { once: true });
			return;
		}
		fn();
	}

	/* =========================================================
	   1. СТЕК СЕКЦИЙ — следующая наезжает на предыдущую
	   ========================================================= */
	function initStack() {
		var main = document.querySelector('main.home-page');
		if (!main) return;

		var secs = [].slice.call(main.children).filter(function (e) {
			return e.tagName === 'SECTION';
		});
		if (secs.length < 2) return;

		/* Наложение нужно только на двух стыках: второй блок наезжает на герой,
		   и форма наезжает на предпоследнюю секцию. Середина листается обычно. */
		var pinned = [0, secs.length - 2];

		/* Слой растёт вниз по странице: каждая следующая секция накрывает предыдущую.
		   position: relative обязателен — z-index не действует на static-элементы,
		   и такие секции уходили бы под позиционированный герой независимо от слоя. */
		secs.forEach(function (s, i) {
			if (getComputedStyle(s).position === 'static') s.style.position = 'relative';
			s.style.zIndex = String(10 + i * 2);
			if (pinned.indexOf(i) !== -1) s.classList.add('demo-stack');
		});


		function layout() {
			var vh = window.innerHeight;
			pinned.forEach(function (i) {
				var s = secs[i];
				if (!s) return;
				var h = s.offsetHeight;
				/* секцию выше экрана прижимаем «за низ», иначе её конец не прочитать */
				s.style.top = (h > vh ? Math.round(vh - h) : 0) + 'px';
			});
		}

		var raf = 0;
		function paint() {
			var vh = window.innerHeight;
			pinned.forEach(function (i) {
				var s = secs[i], next = secs[i + 1];
				if (!s || !next) return;

				var cover = clamp(1 - next.getBoundingClientRect().top / vh, 0, 1);
				/* пока накрыто меньше 3/4 — секция просто стоит.
				   дальше уводим её вверх, чтобы она ушла, а не пряталась под следующей */
				var p = clamp((cover - 0.75) / 0.25, 0, 1);
				s.style.transform = p ? 'translate3d(0,' + (-p * vh * 0.35).toFixed(1) + 'px,0)' : '';
			});
			raf = 0;
		}

		function onScroll() { if (!raf) raf = requestAnimationFrame(paint); }

		layout(); paint();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', function () { layout(); paint(); });
		window.addEventListener('load', function () { layout(); paint(); });
	}

	/* =========================================================
	   2. ИНТРО LIQUID GLASS
	   Страница закрыта пеленой матового стекла; под ней перетекают
	   блики, стекло проясняется и уходит, открывая сайт.
	   ========================================================= */
	function runGlassReveal() {
		window.__demoIntro = 'running';

		var root = document.createElement('div');
		root.className = 'demo-gl';
		root.setAttribute('aria-hidden', 'true');
		root.innerHTML =
			'<div class="demo-gl__pane"></div>' +
			'<div class="demo-gl__brand"><img class="demo-gl__logo" src="' + LOGO + '" alt="DEMO"></div>';

		var pane = root.querySelector('.demo-gl__pane');
		var brand = root.querySelector('.demo-gl__brand');

		document.documentElement.classList.add('demo-gl-lock');
		window.scrollTo(0, 0);
		document.body.appendChild(root);

		var BLUR = 26, DUR = 2000, t0 = null;

		requestAnimationFrame(function frame(ts) {
			if (t0 === null) t0 = ts;
			var el = ts - t0;
			var t = clamp(el / DUR, 0, 1);
			var ease = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;   /* easeInOutQuad */

			root.style.setProperty('--gl-blur', (BLUR * (1 - ease)).toFixed(2) + 'px');

			if (t > 0.55) {
				brand.style.opacity = '0';
				brand.style.transform = 'translate(-50%,-50%) scale(1.07)';
			}
			if (t > 0.75) pane.style.opacity = '0';

			if (t < 1) { requestAnimationFrame(frame); return; }

			document.documentElement.classList.remove('demo-gl-lock');
			if (root.parentNode) root.parentNode.removeChild(root);
			window.__demoIntro = 'done';
			window.dispatchEvent(new CustomEvent('demo:intro-done'));
		});
	}

	/* =========================================================
	   3. КНОПКИ LIQUID CARVE
	   Капля идёт за курсором и вытягивается по направлению
	   движения, «вырезая» поверхность режимом difference.
	   ========================================================= */
	/* Жидкая линза на кнопках отключена по просьбе: на кнопках остаётся
	   только родная смена цвета из шаблона. */

	function initGlassCursor() {
		if (COARSE) return;

		var cur = document.createElement('div');
		cur.className = 'demo-cur';
		cur.setAttribute('aria-hidden', 'true');
		document.body.appendChild(cur);
		/* класс на <html> ДОЛЖЕН отличаться от класса самого курсора,
		   иначе правила .demo-cur применились бы и к корневому элементу */
		document.documentElement.classList.add('demo-cur-on');

		var HOT = 'a,button,[role="button"],input,textarea,select,label';
		/* зоны, где шаблон рисует ладонь-захват — вместо неё крупная линза */
		var GRAB = '.home-page__hero-drag,.home-page__history-viewport';
		var mx = window.innerWidth / 2, my = window.innerHeight / 2;
		var x = mx, y = my, s = 1, ts = 1, raf = 0;

		function tick() {
			x += (mx - x) * 0.34;
			y += (my - y) * 0.34;
			s += (ts - s) * 0.16;
			cur.style.transform =
				'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + s.toFixed(3) + ')';
			var live = Math.abs(mx - x) > 0.1 || Math.abs(my - y) > 0.1 || Math.abs(ts - s) > 0.002;
			raf = live ? requestAnimationFrame(tick) : 0;
		}

		document.addEventListener('mousemove', function (e) {
			mx = e.clientX; my = e.clientY;
			if (!raf) raf = requestAnimationFrame(tick);
		}, { passive: true });

		var overGrab = false, held = false;

		function resize() {
			/* захват — линза заметно крупнее; в момент зажима она «схватывает» и садится */
			ts = overGrab ? (held ? 1.5 : 2.6) : ((held ? 0.9 : 1) * (hot ? 1.35 : 1));
			cur.classList.toggle('is-grab', overGrab);
			if (!raf) raf = requestAnimationFrame(tick);
		}

		var hot = false;

		document.addEventListener('mouseover', function (e) {
			var t = e.target;
			hot = !!(t.closest && t.closest(HOT));
			overGrab = !!(t.closest && t.closest(GRAB));
			resize();
		});

		document.addEventListener('mousedown', function () { held = true; resize(); });
		document.addEventListener('mouseup', function () { held = false; resize(); });

		document.addEventListener('mouseleave', function () { cur.classList.add('is-hidden'); });
		document.addEventListener('mouseenter', function () { cur.classList.remove('is-hidden'); });
	}

	/* =========================================================
	   4. СВЕТОВОЙ БЛИК НА КАРТОЧКАХ
	   Тот же язык, что и у кнопок: свет собирается под курсором.
	   Системный курсор не трогаем — он ничего не перекрывает.
	   ========================================================= */
	function initSheen() {
		if (COARSE) return;

		/* карточки портфеля исключены: там свой ховер на фото, круг был лишним */
		var SEL = '.home-page__adv-card, .home-page__stat-card';

		[].slice.call(document.querySelectorAll(SEL)).forEach(function (el) {
			if (el._sheen) return;
			el._sheen = true;
			el.classList.add('demo-sheen');

			var light = document.createElement('span');
			light.className = 'demo-sheen__light';
			light.setAttribute('aria-hidden', 'true');
			el.appendChild(light);

			var tx = 0, ty = 0, cx = 0, cy = 0, op = 0, opT = 0, raf = 0;

			function tick() {
				cx += (tx - cx) * 0.14;
				cy += (ty - cy) * 0.14;
				op += (opT - op) * 0.12;
				light.style.opacity = op.toFixed(3);
				light.style.transform =
					'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
				var live = Math.abs(tx - cx) > 0.2 || Math.abs(ty - cy) > 0.2 || Math.abs(opT - op) > 0.004;
				raf = live ? requestAnimationFrame(tick) : 0;
			}

			el.addEventListener('mouseenter', function (e) {
				var b = el.getBoundingClientRect();
				cx = tx = e.clientX - b.left;
				cy = ty = e.clientY - b.top;
				opT = 1;
				if (!raf) raf = requestAnimationFrame(tick);
			});

			el.addEventListener('mousemove', function (e) {
				var b = el.getBoundingClientRect();
				tx = e.clientX - b.left;
				ty = e.clientY - b.top;
				if (!raf) raf = requestAnimationFrame(tick);
			});

			el.addEventListener('mouseleave', function () {
				opT = 0;
				if (!raf) raf = requestAnimationFrame(tick);
			});
		});
	}

	/* =========================================================
	   5. ПЕРЕНЕСЕНО ИЗ ВЕРСИИ WOW: параллакс, заголовок, счётчики
	   ========================================================= */
	function initHeroParallax() {
		var hero = document.querySelector('.home-page__hero');
		var bg = hero && hero.querySelector('.home-page__hero-bg');
		if (!bg) return;
		var SCALE = 1.2, FACTOR = 0.09, raf = 0;
		bg.style.willChange = 'transform';

		function apply() {
			var h = hero.getBoundingClientRect().height || 1;
			var shift = clamp(window.pageYOffset, 0, h) * FACTOR;
			bg.style.transform = 'translate3d(0,' + shift.toFixed(2) + 'px,0) scale(' + SCALE + ')';
			raf = 0;
		}
		window.addEventListener('scroll', function () {
			if (!raf) raf = requestAnimationFrame(apply);
		}, { passive: true });
		apply();
	}

	function initLayerParallax() {
		var LAYERS = [
			{ sel: '.home-page__about-buildings', amp: -46 },
			{ sel: '.home-page__cta-bg--left', amp: -34 },
			{ sel: '.home-page__cta-bg--right', amp: 34 }
		];
		var items = [];
		LAYERS.forEach(function (l) {
			[].slice.call(document.querySelectorAll(l.sel)).forEach(function (el) {
				var base = getComputedStyle(el).transform;
				items.push({ el: el, amp: l.amp, base: (base && base !== 'none') ? base + ' ' : '' });
				el.style.willChange = 'transform';
			});
		});
		if (!items.length) return;

		var raf = 0;
		function apply() {
			var vh = window.innerHeight || 1;
			items.forEach(function (it) {
				var r = it.el.getBoundingClientRect();
				if (r.bottom < -vh || r.top > vh * 2) return;
				var d = ((r.top + r.height / 2) - vh / 2) / vh;
				it.el.style.transform = it.base +
					'translate3d(0,' + (clamp(d, -1.4, 1.4) * it.amp).toFixed(2) + 'px,0)';
			});
			raf = 0;
		}
		window.addEventListener('scroll', function () {
			if (!raf) raf = requestAnimationFrame(apply);
		}, { passive: true });
		window.addEventListener('resize', function () {
			if (!raf) raf = requestAnimationFrame(apply);
		});
		apply();
	}

	var HERO_IN = '.home-page__hero-title-line, .home-page__hero-subtitle, .home-page__stat-card';

	/* прячем до интро, иначе элементы видны сквозь стекло и «моргают» на старте */
	function hideHeroBeforeIntro() {
		if (REDUCED) return;
		[].slice.call(document.querySelectorAll(HERO_IN)).forEach(function (el) {
			el.style.opacity = '0';
		});
	}

	function runHeroTitle() {
		/* после интро — только проявление: ничего не едет, всё всплывает светом */
		var lines = [].slice.call(document.querySelectorAll('.home-page__hero-title-line'));
		var sub = document.querySelector('.home-page__hero-subtitle');
		var cards = [].slice.call(document.querySelectorAll('.home-page__stat-card'));

		function fade(el, delay, dur) {
			var anim = el.animate([{ opacity: 0 }, { opacity: 1 }],
				{ duration: dur, delay: delay, easing: 'cubic-bezier(.33,0,.2,1)', fill: 'both' });
			/* inline-ноль снимаем только когда анимация уже держит кадр — без второго моргания */
			anim.ready.then(function () { el.style.opacity = ''; }, function () {});
			anim.finished.then(function () { anim.cancel(); }, function () {});
		}

		lines.forEach(function (line, i) { fade(line, i * 160, 900); });
		if (sub) fade(sub, 220 + lines.length * 160, 900);
		cards.forEach(function (c, i) { fade(c, 420 + i * 130, 950); });
	}

	function runCounters() {
		[].slice.call(document.querySelectorAll('.home-page__stat-number')).forEach(function (el, i) {
			var raw = (el.textContent || '').trim();
			var m = raw.match(/^(\D*)(\d[\d\s]*)(.*)$/);
			if (!m) return;
			var pre = m[1], suf = m[3];
			var target = parseInt(m[2].replace(/\s/g, ''), 10);
			if (!isFinite(target)) return;

			el.style.minWidth = Math.ceil(el.getBoundingClientRect().width) + 'px';
			el.style.display = el.style.display || 'inline-block';

			var dur = 1400, t0 = null;
			setTimeout(function () {
				requestAnimationFrame(function step(ts) {
					if (t0 === null) t0 = ts;
					var p = clamp((ts - t0) / dur, 0, 1);
					el.textContent = pre + Math.round(target * (1 - Math.pow(1 - p, 3))) + suf;
					if (p < 1) requestAnimationFrame(step); else el.textContent = raw;
				});
			}, i * 130);
		});
	}

	/* Отладочная кнопка повтора заставки в публичной сборке не нужна. */


	/* ---------------- Старт ---------------- */
	function boot() {
		initGlassCursor();
		initSheen();
		if (REDUCED) return;

		initStack();
		initHeroParallax();
		initLayerParallax();
		hideHeroBeforeIntro();
		runGlassReveal();

		afterIntro(function () { runHeroTitle(); runCounters(); });
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else { boot(); }
})();
