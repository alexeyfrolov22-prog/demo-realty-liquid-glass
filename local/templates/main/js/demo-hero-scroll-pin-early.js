/**
 * Ранний guard скролла (в <head>, до paint):
 * — на всех страницах запоминает жест пользователя;
 * — на hero-лендингах (главная / about без hash) один раз ставит top, если жеста ещё не было.
 * Не трогает scroll на load/pageshow: иначе после полной загрузки отбрасывает вниз вверх.
 */
(function () {
	try {
		window.__demoUserScrolledDuringLoad = window.__demoUserScrolledDuringLoad === true;
		window.__demoLastUserScrollY = Number(window.__demoLastUserScrollY) || 0;

		function getY() {
			return window.pageYOffset || document.documentElement.scrollTop || 0;
		}

		function markScrolled() {
			var y = getY();
			window.__demoUserScrolledDuringLoad = true;
			if (y > 1) {
				window.__demoLastUserScrollY = y;
			}
		}

		function isHeroLanding() {
			var path = window.location.pathname || '';
			if (window.location.hash) {
				return false;
			}
			return (
				/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?$/i.test(path) ||
				/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?about\/?$/i.test(path)
			);
		}

		function restoreIfJumped() {
			if (!window.__demoUserScrolledDuringLoad) {
				return;
			}
			var last = Number(window.__demoLastUserScrollY) || 0;
			if (last <= 40) {
				return;
			}
			var y = getY();
			if (y <= 1 || y < last * 0.35) {
				window.scrollTo(0, last);
				if (document.documentElement) {
					document.documentElement.scrollTop = last;
				}
				if (document.body) {
					document.body.scrollTop = last;
				}
			}
		}

		window.addEventListener('wheel', markScrolled, { passive: true });
		window.addEventListener('touchstart', markScrolled, { passive: true });
		window.addEventListener('touchmove', markScrolled, { passive: true });
		window.addEventListener('keydown', markScrolled, { passive: true });
		window.addEventListener(
			'scroll',
			function () {
				if (getY() > 1) {
					markScrolled();
				}
			},
			{ passive: true }
		);

		if (getY() > 1) {
			markScrolled();
		}

		if (isHeroLanding() && !window.__demoUserScrolledDuringLoad) {
			if ('scrollRestoration' in history) {
				history.scrollRestoration = 'manual';
			}
			window.scrollTo(0, 0);
			document.documentElement.scrollTop = 0;
			if (document.body) {
				document.body.scrollTop = 0;
			}
		}

		window.addEventListener('load', restoreIfJumped);
		window.addEventListener('pageshow', restoreIfJumped);
	} catch (e) {}
})();
