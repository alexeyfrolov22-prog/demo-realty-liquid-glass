(function () {
	var BANNER_ID = 'cookie-banner';
	var COOKIE_NAME = 'demo_analytics_consent';
	var COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
	var CONSENT_ACCEPTED = 'accepted';
	var CONSENT_REJECTED = 'rejected';

	var metrikaInitialized = false;

	function readCookie(name) {
		var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + escaped + '=([^;]*)'));
		return match ? decodeURIComponent(match[1]) : null;
	}

	function writeCookie(name, value) {
		var secure = window.location.protocol === 'https:' ? '; Secure' : '';
		document.cookie =
			name +
			'=' +
			encodeURIComponent(value) +
			'; Max-Age=' +
			COOKIE_MAX_AGE +
			'; Path=/' +
			'; SameSite=Lax' +
			secure;
	}

	function getAnalyticsConsent() {
		var value = readCookie(COOKIE_NAME);
		if (value === CONSENT_ACCEPTED || value === CONSENT_REJECTED) {
			return value;
		}

		return null;
	}

	function getAnalyticsConfig() {
		if (window.DemoAnalyticsConfig && typeof window.DemoAnalyticsConfig === 'object') {
			return window.DemoAnalyticsConfig;
		}
		var dataEl = document.getElementById('demo-analytics-config');
		if (!dataEl) {
			return {};
		}
		try {
			var parsed = JSON.parse(dataEl.textContent || '{}');
			if (parsed && typeof parsed === 'object') {
				window.DemoAnalyticsConfig = parsed;
				return parsed;
			}
		} catch (e) {}
		return {};
	}

	function getMetrikaCounterId() {
		var config = getAnalyticsConfig();
		var counterId = parseInt(config.yandexMetrikaId, 10);
		return Number.isFinite(counterId) && counterId > 0 ? counterId : 0;
	}

	function initYandexMetrika() {
		if (metrikaInitialized) {
			return;
		}

		var counterId = getMetrikaCounterId();
		if (!counterId) {
			return;
		}

		metrikaInitialized = true;

		(function (m, e, t, r, i, k, a) {
			m[i] =
				m[i] ||
				function () {
					(m[i].a = m[i].a || []).push(arguments);
				};
			m[i].l = 1 * new Date();
			for (var j = 0; j < document.scripts.length; j++) {
				if (document.scripts[j].src === r) {
					return;
				}
			}
			k = e.createElement(t);
			a = e.getElementsByTagName(t)[0];
			k.async = 1;
			k.src = r;
			a.parentNode.insertBefore(k, a);
		})(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

		window.ym(counterId, 'init', {
			clickmap: true,
			trackLinks: true,
			accurateTrackBounce: true,
			webvisor: true,
		});
	}

	function setAnalyticsConsent(value) {
		if (value !== CONSENT_ACCEPTED && value !== CONSENT_REJECTED) {
			return;
		}

		writeCookie(COOKIE_NAME, value);

		if (value === CONSENT_ACCEPTED) {
			initYandexMetrika();
		}
	}

	function initCookieBanner() {
		var banner = document.getElementById(BANNER_ID);
		if (!banner) {
			return;
		}

		var consent = getAnalyticsConsent();
		if (consent !== null) {
			banner.hidden = true;
			return;
		}

		banner.hidden = false;

		var acceptButton = banner.querySelector('[data-cookie-banner-accept]');
		if (acceptButton) {
			acceptButton.addEventListener('click', function () {
				setAnalyticsConsent(CONSENT_ACCEPTED);
				banner.hidden = true;
			});
		}

		var closeButton = banner.querySelector('[data-cookie-banner-close]');
		if (closeButton) {
			closeButton.addEventListener('click', function () {
				setAnalyticsConsent(CONSENT_REJECTED);
				banner.hidden = true;
			});
		}
	}

	window.DemoAnalyticsConsent = {
		get: getAnalyticsConsent,
		set: setAnalyticsConsent,
		isAccepted: function () {
			return getAnalyticsConsent() === CONSENT_ACCEPTED;
		},
	};

	if (getAnalyticsConsent() === CONSENT_ACCEPTED) {
		initYandexMetrika();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initCookieBanner);
	} else {
		initCookieBanner();
	}
})();
