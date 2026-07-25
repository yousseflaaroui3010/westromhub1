/*
 * Westrom Group Guarantees widget.
 *
 * Self-contained, dependency-free. Renders the "Guarantees" poster into an
 * open shadow root so it survives any host page's CSS/CSP. Two consumers:
 *   1. wgcassetguide.com/guarantees  (our own page)
 *   2. westromgroup.com pricing page (Goodjuju drops the one-line embed below
 *      the price cards)
 *
 * Embed (host page):
 *   <div id="wgc-guarantees"></div>
 *   <script src="https://wgcassetguide.com/guarantees.js" async></script>
 *
 * Optional attributes on the <script> tag:
 *   data-variant="full"      full centered poster card (default)
 *   data-variant="embed"     flush, no outer max-width/shadow (blends into a section)
 *   data-asset-base="https://wgcassetguide.com"   override where fonts + logo load from
 *   data-mount="wgc-guarantees"                    override the target element id
 *
 * The Material Symbols icon font and Google-hosted images from the source
 * mockup are CSP-blocked on our own site, so icons are inline SVG (nearest
 * lucide equivalents) and the logo is served from our origin. Montserrat is
 * self-hosted (see /fonts) and injected as @font-face into the HOST document
 * head -- @font-face declared inside a shadow root is not honored, so it has to
 * live in the outer document for the shadow content to pick it up.
 */
(function () {
  'use strict';

  var RED = '#E31E24';
  var MOUNT_DEFAULT = 'wgc-guarantees';

  // ---- config from the <script> tag -------------------------------------
  var self = document.currentScript;

  function readConfig(el) {
    var base = el && el.getAttribute('data-asset-base');
    if (!base && el && el.src) {
      try { base = new URL(el.src).origin; } catch (e) { base = ''; }
    }
    base = (base || '').replace(/\/+$/, '');
    var variant = ((el && el.getAttribute('data-variant')) || 'full').toLowerCase();
    return {
      assetBase: base,
      variant: variant === 'embed' ? 'embed' : 'full',
      mount: (el && el.getAttribute('data-mount')) || MOUNT_DEFAULT
    };
  }

  // ---- icons (inline SVG, stroke = currentColor) ------------------------
  var ICON = {
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
    gavel: '<path d="m14 13-8.381 8.38a1 1 0 0 1-3.001-3l8.384-8.381"/><path d="m16 16 6-6"/><path d="m21.5 10.5-8-8"/><path d="m8 8 6-6"/><path d="m8.5 7.5 8 8"/>',
    paw: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
    dollar: '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'
  };

  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      ICON[name] + '</svg>';
  }

  // ---- content ----------------------------------------------------------
  // Copy is verbatim from the approved mockup. The one em dash in the
  // maintenance line is split into two sentences (house style: no em dashes);
  // meaning is unchanged.
  var GUARANTEES = [
    { num: '01', icon: 'calendar', title: '12-Month Tenant Placement Guarantee',
      body: 'If Westrom places a resident on a 12-month lease and that resident breaks the lease early, Westrom would find a replacement resident without charging another leasing fee.' },
    { num: '02', icon: 'gavel', title: 'Eviction Protection Guarantee',
      body: 'If a Westrom-screened resident has to be evicted, Westrom helps manage the eviction process and covers eligible eviction-related costs up to a set amount. This would be a strong trust builder for owners.' },
    { num: '03', icon: 'paw', title: '$3,000 Pet Assurance Guarantee', badge: 'Our Best Differentiator',
      body: "This should be one of the strongest guarantees we lead with. A lot of competitors only advertise $1,000 to $2,000 in pet damage protection, so Westrom's $3,000 pet guarantee could be a major differentiator." },
    { num: '04', icon: 'smile', title: 'Happiness Guarantee',
      body: "If you're not happy with our services for any reason, you can terminate. You're not obligated to stay with us. We believe in earning your trust every day and want you to feel confident that you're in the right hands." },
    { num: '05', icon: 'dollar', title: '90-Day Money-Back Guarantee',
      body: 'This could help reduce risk for new owners. The cleanest version would be refunding monthly management fees collected during the first 90 days if the owner is not satisfied. I would not include leasing fees, maintenance invoices, vendor bills, or third-party costs unless we intentionally decide to offer that.' },
    { num: '06', icon: 'wrench', title: 'Maintenance Guarantee',
      body: "We will never mark up maintenance. We don't make money off of you through maintenance. What you pay is what it costs. You'll receive the actual vendor invoice with every charge, so you always have complete transparency and peace of mind." }
  ];

  var TAGLINE = 'Built on confidence. Backed by protection. Focused on your peace of mind.';
  var FOOTER_TOP = 'We protect your investment.';
  var FOOTER_BOTTOM = 'So you can enjoy the returns.';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---- styles (compiled into the shadow root) ---------------------------
  function css(assetBase) {
    // Wide + narrow rule sets are applied under BOTH a container query (so a
    // narrow embed on a wide page still reflows) AND a viewport media query (so
    // phones reflow even where container queries are unavailable). Defined once.
    var wide = [
      '.wgc-g-head{padding-inline:2rem;}',
      '.wgc-g-brand{font-size:2.4rem;}',
      '.wgc-g-title{font-size:4.75rem;}',
      '.wgc-g-tag{font-size:1.15rem;}',
      '.wgc-g-list{padding-inline:3rem;}'
    ].join('');

    // narrow (phones / narrow embeds): the black number bar moves to the TOP of
    // each card and the copy flows full-width beneath, so nothing is crushed into
    // a sidebar. Compact sizing keeps the six cards from feeling oversized. The
    // duplicate brand line is dropped (the logo already carries it).
    var narrow = [
      '.wgc-g-head{padding:1.5rem 1.25rem 1.1rem;}',
      '.wgc-g-logo{height:3.75rem;margin-block-end:0.6rem;}',
      '.wgc-g-brand{display:none;}',
      '.wgc-g-title{font-size:2.5rem;margin-block-end:0.85rem;}',
      '.wgc-g-mark{margin-block-end:0.7rem;padding:0.4rem;}',
      '.wgc-g-mark svg{width:1.25rem;height:1.25rem;}',
      '.wgc-g-tag{font-size:0.9rem;}',
      '.wgc-g-list{padding:0 0.85rem 1.5rem;gap:0.7rem;}',
      '.wgc-g-card{flex-direction:column;overflow:hidden;}',
      '.wgc-g-side{width:auto;margin-inline-start:0;flex-direction:row;justify-content:space-between;',
      'align-items:center;gap:0.75rem;padding:0.5rem 1rem;border-radius:0.9rem 0.9rem 0 0;}',
      '.wgc-g-circle{position:static;transform:none;inset-inline-start:auto;width:40px;height:40px;',
      'border-width:2px;flex:0 0 auto;}',
      '.wgc-g-circle svg{width:22px;height:22px;}',
      '.wgc-g-num{font-size:1.35rem;}',
      '.wgc-g-body{padding:0.75rem 1rem 0.9rem;}',
      '.wgc-g-cardtitle{font-size:0.95rem;line-height:1.2;}',
      '.wgc-g-text{font-size:0.85rem;line-height:1.4;}',
      '.wgc-g-badge{position:static;display:inline-block;margin-block-end:0.4rem;}',
      '.wgc-g-card:hover{transform:none;box-shadow:0 4px 15px rgba(0,0,0,0.08);}',
      '.wgc-g-card:hover .wgc-g-circle{transform:none;}',
      '.wgc-g-foot{padding:1.25rem 4rem 1.25rem 1.15rem;min-height:0;}',
      '.wgc-g-skew{width:64px;}',
      '.wgc-g-footrow{gap:0.9rem;}',
      '.wgc-g-footmark{padding:0.4rem;}',
      '.wgc-g-footmark svg{width:1.5rem;height:1.5rem;}',
      '.wgc-g-foottext{padding-inline-start:1rem;}',
      '.wgc-g-foot-top{font-size:0.75rem;}',
      '.wgc-g-foot-bottom{font-size:1.05rem;}'
    ].join('');

    return [
      /* @font-face is injected into the host document head, not here, but the
         family names below reference it. */
      ':host{all:initial;display:block;font-family:"Montserrat",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}',
      '*,*::before,*::after{box-sizing:border-box;}',

      '.wgc-g-main{position:relative;overflow:hidden;max-width:880px;width:100%;margin-inline:auto;',
      'background:#fdfdfd;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);',
      'container-type:inline-size;',
      'display:flex;flex-direction:column;color:#111;}',
      '.wgc-g-main.wgc-g-embed{max-width:none;border-radius:0;box-shadow:none;}',

      /* top-left corner accent (two stacked triangles) */
      '.wgc-g-accent{position:absolute;top:0;inset-inline-start:0;width:10rem;height:10rem;pointer-events:none;z-index:0;}',
      '.wgc-g-accent i{position:absolute;top:0;inset-inline-start:0;width:100%;height:100%;display:block;}',
      '.wgc-g-accent .b{background:#000;clip-path:polygon(0 0,100% 0,0 100%);}',
      '.wgc-g-accent .r{background:' + RED + ';clip-path:polygon(0 0,85% 0,0 85%);}',

      /* header */
      '.wgc-g-head{position:relative;z-index:1;padding:2.25rem 2rem 1.5rem;display:flex;flex-direction:column;align-items:center;text-align:center;}',
      '.wgc-g-logo{height:6rem;width:auto;margin-block-end:1rem;}',
      '.wgc-g-brand{margin:0;font-size:1.5rem;font-weight:900;letter-spacing:-0.02em;text-transform:uppercase;line-height:1.1;color:#000;}',
      '.wgc-g-title{margin:0 0 1.25rem;font-size:3rem;font-weight:900;letter-spacing:-0.04em;text-transform:uppercase;line-height:0.8;color:' + RED + ';}',
      '.wgc-g-mark{background:' + RED + ';padding:0.5rem;margin-block-end:1rem;display:inline-flex;color:#fff;}',
      '.wgc-g-mark svg{width:1.5rem;height:1.5rem;}',
      '.wgc-g-tag{margin:0;font-size:1.125rem;font-weight:700;color:#1f2937;max-width:48rem;}',

      /* cards */
      '.wgc-g-list{padding:0 2rem 2.75rem;display:flex;flex-direction:column;gap:1.25rem;position:relative;z-index:1;}',
      '.wgc-g-card{position:relative;display:flex;background:#fff;border-radius:1rem;box-shadow:0 6px 20px rgba(0,0,0,0.07);',
      'transition:transform 0.2s ease,box-shadow 0.2s ease;}',
      '.wgc-g-side{position:relative;flex:0 0 auto;width:118px;margin-inline-start:2.75rem;background:#000;color:#fff;',
      'display:flex;align-items:center;justify-content:flex-end;padding-inline-end:18px;border-radius:1rem;}',
      '.wgc-g-num{font-size:2.5rem;font-weight:900;line-height:1;}',
      '.wgc-g-circle{position:absolute;top:50%;inset-inline-start:-38px;transform:translateY(-50%);z-index:2;',
      'width:76px;height:76px;border-radius:50%;border:3px solid ' + RED + ';background:#fff;',
      'box-shadow:0 6px 16px rgba(227,30,36,0.22);',
      'transition:transform 0.2s ease,box-shadow 0.2s ease;',
      'display:flex;align-items:center;justify-content:center;color:' + RED + ';}',
      '.wgc-g-circle svg{width:38px;height:38px;}',
      '.wgc-g-body{flex:1 1 auto;padding:1.4rem 2rem 1.4rem 1.5rem;min-width:0;}',
      '.wgc-g-cardtitle{margin:0 0 0.5rem;font-size:1.125rem;font-weight:800;text-transform:uppercase;color:#000;line-height:1.2;}',
      '.wgc-g-text{margin:0;font-size:0.9rem;line-height:1.45;color:#374151;}',
      /* inline eyebrow badge (sits above the title so it never overlaps it) */
      '.wgc-g-badge{display:inline-block;margin-block-end:0.6rem;background:' + RED + ';color:#fff;',
      'font-size:10px;font-weight:900;letter-spacing:0.04em;text-transform:uppercase;padding:0.3rem 0.6rem;border-radius:4px;}',

      /* hover: subtle lift + icon pop (minimalist); disabled under reduced motion */
      '.wgc-g-card:hover{transform:translateY(-4px);box-shadow:0 16px 34px rgba(0,0,0,0.13);}',
      '.wgc-g-card:hover .wgc-g-circle{transform:translateY(-50%) scale(1.08);box-shadow:0 10px 22px rgba(227,30,36,0.3);}',
      '@media(prefers-reduced-motion:reduce){.wgc-g-card,.wgc-g-circle{transition:none;}.wgc-g-card:hover{transform:none;}.wgc-g-card:hover .wgc-g-circle{transform:translateY(-50%);}}',

      /* scroll reveal: cards rise and their icons pop in as they enter view.
         Applied only when JS adds .wgc-g-animate (skipped under reduced motion or
         without IntersectionObserver), so the cards are always visible otherwise. */
      '.wgc-g-animate .wgc-g-card{transition:opacity 0.55s ease,transform 0.55s cubic-bezier(0.16,1,0.3,1),box-shadow 0.2s ease;}',
      '.wgc-g-animate .wgc-g-card:not(.wgc-g-in){opacity:0;transform:translateY(28px);}',
      '.wgc-g-animate .wgc-g-card .wgc-g-circle svg{transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.14s,opacity 0.4s ease 0.14s;}',
      '.wgc-g-animate .wgc-g-card:not(.wgc-g-in) .wgc-g-circle svg{opacity:0;transform:scale(0.4);}',

      /* footer */
      '.wgc-g-foot{position:relative;overflow:hidden;background:#000;color:#fff;padding:1.75rem 2rem;display:flex;align-items:center;min-height:6.5rem;}',
      '.wgc-g-skew{position:absolute;bottom:0;inset-inline-end:0;height:100%;width:150px;background:' + RED + ';',
      'clip-path:polygon(70% 0,100% 0,100% 100%,0% 100%);z-index:0;}',
      '.wgc-g-footrow{position:relative;z-index:1;display:flex;align-items:center;gap:1.5rem;}',
      '.wgc-g-footmark{border:2px solid ' + RED + ';padding:0.5rem;display:inline-flex;color:' + RED + ';}',
      '.wgc-g-footmark svg{width:1.9rem;height:1.9rem;}',
      '.wgc-g-foottext{border-inline-start:1px solid rgba(255,255,255,0.3);padding-inline-start:1.5rem;}',
      '.wgc-g-foottext p{margin:0;}',
      '.wgc-g-foot-top{font-size:1rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;line-height:1;margin-block-end:0.25rem;}',
      '.wgc-g-foot-bottom{font-size:1.3rem;font-weight:900;letter-spacing:-0.01em;text-transform:uppercase;line-height:1;color:' + RED + ';}',

      /* Responsiveness reflows off the widget's own width (container query) so a
         narrow embed on a wide host page adapts, AND off the viewport (media
         query) so phones reflow even without container-query support. */
      '@container (min-width:700px){' + wide + '}',
      '@media (min-width:768px){' + wide + '}',
      '@container (max-width:560px){' + narrow + '}',
      '@media (max-width:600px){' + narrow + '}'
    ].join('');
  }

  // ---- font injection (host document, once) -----------------------------
  function injectFonts(assetBase) {
    if (document.getElementById('wgc-g-fonts')) return;
    var f = assetBase + '/fonts/montserrat-';
    var weights = [400, 600, 700, 800, 900];
    var rules = weights.map(function (w) {
      return '@font-face{font-family:"Montserrat";font-style:normal;font-weight:' + w +
        ';font-display:swap;src:url("' + f + w + '.woff2") format("woff2");}';
    }).join('');
    var style = document.createElement('style');
    style.id = 'wgc-g-fonts';
    style.textContent = rules;
    document.head.appendChild(style);
  }

  // ---- markup -----------------------------------------------------------
  function cardHtml(g) {
    var badge = g.badge
      ? '<span class="wgc-g-badge">' + esc(g.badge) + '</span>'
      : '';
    return '<div class="wgc-g-card">' +
      '<div class="wgc-g-side">' +
        '<span class="wgc-g-circle">' + svg(g.icon) + '</span>' +
        '<span class="wgc-g-num" aria-hidden="true">' + esc(g.num) + '</span>' +
      '</div>' +
      '<div class="wgc-g-body">' + badge +
        '<h3 class="wgc-g-cardtitle">' + esc(g.title) + '</h3>' +
        '<p class="wgc-g-text">' + esc(g.body) + '</p>' +
      '</div>' +
    '</div>';
  }

  function posterHtml(cfg) {
    return '<section class="wgc-g-main' + (cfg.variant === 'embed' ? ' wgc-g-embed' : '') +
        '" role="region" aria-label="Westrom Group Guarantees">' +
      '<div class="wgc-g-accent" aria-hidden="true"><i class="b"></i><i class="r"></i></div>' +
      '<header class="wgc-g-head">' +
        '<img class="wgc-g-logo" src="' + esc(cfg.assetBase) + '/westrom-logo-stacked.png" ' +
          'alt="Westrom Group" width="600" height="300" loading="lazy" decoding="async">' +
        '<h2 class="wgc-g-brand">Westrom Group</h2>' +
        '<h1 class="wgc-g-title">Guarantees</h1>' +
        '<span class="wgc-g-mark" aria-hidden="true">' + svg('home') + '</span>' +
        '<p class="wgc-g-tag">' + esc(TAGLINE) + '</p>' +
      '</header>' +
      '<div class="wgc-g-list">' + GUARANTEES.map(cardHtml).join('') + '</div>' +
      '<footer class="wgc-g-foot">' +
        '<div class="wgc-g-skew" aria-hidden="true"></div>' +
        '<div class="wgc-g-footrow">' +
          '<span class="wgc-g-footmark" aria-hidden="true">' + svg('home') + '</span>' +
          '<div class="wgc-g-foottext">' +
            '<p class="wgc-g-foot-top">' + esc(FOOTER_TOP) + '</p>' +
            '<p class="wgc-g-foot-bottom">' + esc(FOOTER_BOTTOM) + '</p>' +
          '</div>' +
        '</div>' +
      '</footer>' +
    '</section>';
  }

  // ---- scroll reveal ----------------------------------------------------
  // Cards rise and their icons pop as they scroll into view. Gated behind
  // reduced-motion + IntersectionObserver support; when it can't run the cards
  // are simply shown (the hidden state only applies under the .wgc-g-animate
  // class this adds), so there is never an invisible-content failure mode.
  function setupReveal(root) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') return;
    var main = root.querySelector('.wgc-g-main');
    var cards = root.querySelectorAll('.wgc-g-card');
    if (!main || !cards.length) return;
    main.classList.add('wgc-g-animate');
    var io = new IntersectionObserver(function (entries) {
      var i = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        // Small stagger for cards that enter together (e.g. the first screen).
        e.target.style.transitionDelay = (i * 70) + 'ms';
        e.target.classList.add('wgc-g-in');
        io.unobserve(e.target);
        i++;
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(cards, function (c) { io.observe(c); });
  }

  // ---- mount ------------------------------------------------------------
  function mount(cfg) {
    var host = document.getElementById(cfg.mount);
    if (!host || host.shadowRoot) return;
    injectFonts(cfg.assetBase);
    var root = host.attachShadow({ mode: 'open' });
    var style = document.createElement('style');
    style.textContent = css(cfg.assetBase);
    var wrap = document.createElement('div');
    wrap.innerHTML = posterHtml(cfg);
    root.appendChild(style);
    root.appendChild(wrap.firstChild);
    setupReveal(root);
  }

  var cfg = readConfig(self);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mount(cfg); });
  } else {
    mount(cfg);
  }
})();
