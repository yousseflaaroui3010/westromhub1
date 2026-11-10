// Mobile header menu toggle for the static pages (/analysis, /guarantees).
// Lives in a file, not an inline <script>, so the CSP can forbid inline JS.
(function () {
  var t = document.querySelector('.site-nav-toggle');
  var n = document.getElementById('site-nav');
  if (!t || !n) return;
  t.addEventListener('click', function () {
    var open = n.classList.toggle('open');
    t.setAttribute('aria-expanded', open ? 'true' : 'false');
    t.innerHTML = open ? '&#10005;' : '&#9776;';
  });
})();
