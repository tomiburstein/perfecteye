// Applies the saved theme/language before the app loads (avoids a flash).
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('perfecteye.settings') || '{}');
    if (s.theme === 'dark' || s.theme === 'light') document.documentElement.setAttribute('data-theme', s.theme);
    if (s.lang === 'es' || s.lang === 'en') document.documentElement.lang = s.lang;
  } catch (e) {
    /* storage unavailable: defaults apply */
  }
})();
