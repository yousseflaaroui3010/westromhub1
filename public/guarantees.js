/*
 * Westrom Group Guarantees widget (flyer edition).
 *
 * Self-contained, dependency-free. Renders into an open shadow root so it
 * survives any host page's CSS/CSP. Two consumers:
 *   1. wgcassetguide.com/guarantees   (our own page)
 *   2. westromgroup.com pricing page  (Goodjuju drops the one-line embed)
 *
 * Embed (host page):
 *   <div id="wgc-guarantees"></div>
 *   <script src="https://wgcassetguide.com/guarantees.js" async></script>
 *
 * Optional <script> attributes:
 *   data-asset-base="https://wgcassetguide.com"  where fonts + images load from
 *   data-mount="wgc-guarantees"                   target element id
 *
 * The design is a fixed 1024x1536 flyer. On wide screens the exact flyer is
 * rendered and scaled to fit the available width (pixel-perfect). On phones
 * (< 600px) it reflows into a readable stacked layout that reuses the same
 * icons, fonts, colours, and copy. Fonts (Archivo variable + Barlow Condensed)
 * and images are self-hosted; @font-face is injected into the HOST document
 * head because @font-face declared inside a shadow root is not honoured.
 *
 * Rebuilt from a Claude Design HTML/CSS handoff; the design-tool scaffolding
 * (x-dc / sc-if / support.js / data-props) has been removed.
 */
(function () {
  'use strict';

  var RED = '#e9040a';
  var DARK = '#0d0d0d';
  var INK = '#111111';
  var MOUNT_DEFAULT = 'wgc-guarantees';
  var W = 1024, H = 1536; // native flyer canvas size

  var self = document.currentScript;

  function readConfig(el) {
    var base = el && el.getAttribute('data-asset-base');
    if (!base && el && el.src) {
      try { base = new URL(el.src).origin; } catch (e) { base = ''; }
    }
    base = (base || '').replace(/\/+$/, '');
    return {
      assetBase: base,
      mount: (el && el.getAttribute('data-mount')) || MOUNT_DEFAULT
    };
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---- content ----------------------------------------------------------
  // Copy is verbatim from the approved flyer. Body text is stored both as the
  // exact per-line splits the flyer uses (for pixel-accurate width fitting) and
  // recombined into a paragraph for the reflowed mobile layout.
  var CARDS = [
    {
      num: '01', icon: 'wg-icon-1.png', h: 152, mb: 12,
      numPr: 24, numFs: 84.8, numTy: -9,
      iconL: 82, iconT: -3, iconW: 141, iconH: 150, divH: 125,
      bodyT: -2, bodyH: 156, bodyPad: '8.5px 24px 0',
      titleFs: 34.79, titleFit: 478, title: '12 Month Tenant Placement Guarantee',
      bodyMt: 8, bodyFs: 16.28, bodyLh: 22.6,
      lines: [
        ['If a resident we place breaks their lease within the first 12 months, we will', 515],
        ['find a qualified replacement resident at no additional leasing fee. You receive', 544],
        ['added protection from unexpected turnover and the cost of having to', 499],
        ['lease the property again.', 176]
      ]
    },
    {
      num: '02', icon: 'wg-icon-2.png', h: 153, mb: 15,
      numPr: 20, numFs: 84.8, numTy: -8,
      iconL: 80, iconT: -2, iconW: 143, iconH: 152, divH: 126,
      bodyT: -2, bodyH: 159, bodyPad: '15px 24px 0',
      titleFs: 32.86, titleFit: 356, title: 'Eviction Protection Guarantee',
      bodyMt: 7, bodyFs: 16.37, bodyLh: 22.3,
      lines: [
        ['If a Westrom screened resident must be evicted, we will guide you through', 530],
        ['the eviction process and cover eligible eviction related expenses up to $1,000.', 551],
        ['You are protected from handling the process alone and from many of the', 520],
        ['unexpected costs that can come with an eviction.', 355]
      ]
    },
    {
      num: '03', icon: 'wg-icon-3.png', h: 146, mb: 10, ribbon: true,
      numPr: 20, numFs: 84.8, numTy: -7,
      iconL: 80, iconT: -3, iconW: 140, iconH: 147, divH: 119,
      bodyT: -3, bodyH: 151, bodyPad: '12.5px 24px 0',
      titleFs: 33.95, titleFit: 399, title: '$3,000 Pet Assurance Guarantee',
      bodyMt: 9, bodyFs: 16.43, bodyLh: 21,
      lines: [
        ['You receive up to $3,000 in added protection for qualifying pet damage', 506],
        ["caused by an approved resident's pet. This gives you greater confidence", 509],
        ['when accepting pets while helping protect your property beyond', 460],
        ["the resident's security deposit.", 216]
      ]
    },
    {
      num: '04', icon: 'wg-icon-4.png', h: 142, mb: 15,
      numPr: 20, numFs: 83.4, numTy: -7,
      iconL: 83, iconT: -3, iconW: 138, iconH: 144, divH: 115,
      bodyT: -1, bodyH: 158, bodyPad: '11.5px 24px 0',
      titleFs: 31.02, titleFit: 238, title: 'Happiness Guarantee',
      bodyMt: 3, bodyFs: 16.55, bodyLh: 20.6,
      lines: [
        ['You should never feel trapped in a property management agreement that is', 540],
        ['not working for you. If you are unhappy with our service, you may terminate', 539],
        ['with a simple email and without unnecessary cancellation penalties or', 489],
        ['a long term obligation. Our goal is to earn your business through great', 496],
        ['service, not by forcing you to stay.', 244]
      ]
    },
    {
      num: '05', icon: 'wg-icon-5.png', h: 137, mb: 10,
      numPr: 20, numFs: 82.1, numTy: -6,
      iconL: 83, iconT: -3, iconW: 137, iconH: 141, divH: 110,
      bodyT: 7, bodyH: 132, bodyPad: '4.5px 24px 0',
      titleFs: 31.10, titleFit: 337, title: '90 Day Money Back Guarantee',
      bodyMt: 6, bodyFs: 16.52, bodyLh: 20,
      lines: [
        ['Your first 90 days with Westrom Group are protected. If you are not satisfied', 544],
        ['with our management services during that time, we will refund the monthly', 536],
        ['management fees you paid, giving you the opportunity to experience', 489],
        ['our service with less financial risk.', 240]
      ]
    },
    {
      num: '06', icon: 'wg-icon-6.png', h: 124, mb: 0,
      numPr: 20, numFs: 79.3, numTy: -6,
      iconL: 83, iconT: -4, iconW: 136, iconH: 128, divH: 97,
      bodyT: -1, bodyH: 126, bodyPad: '5.5px 24px 0',
      titleFs: 28.92, titleFit: 364, title: 'No Maintenance Markup Guarantee',
      bodyMt: 3, bodyFs: 16.05, bodyLh: 19.3,
      lines: [
        ['You will never pay extra on top of the actual maintenance cost. The amount', 525],
        ['you are charged is the true cost of the repair, so you can make informed', 510],
        ['decisions with confidence knowing we do not profit from maintenance', 501],
        ['performed at your property. What you pay is what it costs.', 417]
      ]
    }
  ];

  var SUBTITLE = 'Built on confidence. Backed by protection. Focused on your peace of mind.';
  var FOOT_TOP = 'WE PROTECT YOUR INVESTMENT.';
  var FOOT_BOTTOM = 'SO YOU CAN ENJOY THE RETURNS.';

  function paragraph(card) {
    return card.lines.map(function (l) { return l[0]; }).join(' ');
  }

  // ---- fonts (injected into host document head, once) -------------------
  function injectFonts(base) {
    if (document.getElementById('wgc-g-fonts')) return;
    var f = base + '/guarantees-assets/fonts/';
    var rules = [
      "@font-face{font-family:'WgArchivo';font-style:normal;font-weight:100 900;font-stretch:62% 125%;font-display:swap;src:url('" + f + "archivo-var.woff2') format('woff2');}",
      "@font-face{font-family:'WgArchivo';font-style:italic;font-weight:100 900;font-stretch:62% 125%;font-display:swap;src:url('" + f + "archivo-var-italic.woff2') format('woff2');}",
      "@font-face{font-family:'WgBarlow';font-style:normal;font-weight:600;font-display:swap;src:url('" + f + "barlow-condensed-600.woff2') format('woff2');}",
      "@font-face{font-family:'WgBarlow';font-style:normal;font-weight:800;font-display:swap;src:url('" + f + "barlow-condensed-800.woff2') format('woff2');}"
    ].join('');
    var style = document.createElement('style');
    style.id = 'wgc-g-fonts';
    style.textContent = rules;
    document.head.appendChild(style);
  }

  // Assigned below (declared here so mount can reference them).
  var canvasHtml, flowHtml, css, fit, mount;

  // ---- exact flyer (1024x1536 canvas) -----------------------------------
  function ribbonHtml() {
    return '<div style="position:absolute;left:856px;top:-1px;width:142px;height:55px;background:' + RED + ';border-radius:7px;clip-path:polygon(0% 0%,100% 0%,100% 100%,0% 100%,10.5% 50%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding-left:15px;box-sizing:border-box;">'
      + '<div style="font-weight:700;font-variation-settings:\'wdth\' 80,\'wght\' 700;font-size:15.74px;line-height:20px;color:#fff;" data-fit="68">OUR BEST</div>'
      + '<div style="font-weight:700;font-variation-settings:\'wdth\' 80,\'wght\' 700;font-size:15.74px;line-height:20px;color:#fff;" data-fit="115">DIFFERENTIATOR</div>'
      + '</div>';
  }

  function flyerCard(base, p) {
    var barlow = "font-family:WgBarlow,'Arial Narrow',sans-serif;";
    var linesHtml = p.lines.map(function (l) {
      return '<div data-fit="' + l[1] + '">' + esc(l[0]) + '</div>';
    }).join('');
    return '<div class="wgc-fly-card" style="position:relative;height:' + p.h + 'px;' + (p.mb ? 'margin-bottom:' + p.mb + 'px;' : '') + '">'
      + '<div style="position:absolute;left:146px;top:0;width:174px;height:' + p.h + 'px;background:' + DARK + ';border-radius:14px;"></div>'
      + '<div style="position:absolute;left:146px;top:0;width:174px;height:' + p.h + 'px;display:flex;align-items:center;justify-content:flex-end;padding-right:' + p.numPr + 'px;box-sizing:border-box;' + barlow + 'font-weight:800;font-size:' + p.numFs + 'px;line-height:1;color:#fff;"><span style="display:inline-block;transform:translateY(' + p.numTy + 'px) scaleX(0.75);transform-origin:100% 50%;">' + p.num + '</span></div>'
      + '<img class="wgc-fly-icon" src="' + base + '/guarantees-assets/' + p.icon + '" alt="" style="position:absolute;left:' + p.iconL + 'px;top:' + p.iconT + 'px;width:' + p.iconW + 'px;height:' + p.iconH + 'px;border-radius:50%;display:block;">'
      + '<div style="position:absolute;left:338px;top:14px;height:' + p.divH + 'px;width:2px;background:' + RED + ';"></div>'
      + '<div class="wgc-fly-body" style="position:absolute;left:340px;top:' + p.bodyT + 'px;width:628px;height:' + p.bodyH + 'px;background:#fff;border-radius:10px;box-sizing:border-box;padding:' + p.bodyPad + ';">'
      + '<div style="' + barlow + 'font-weight:600;font-size:' + p.titleFs + 'px;line-height:1.12;color:' + INK + ';" data-fit="' + p.titleFit + '">' + esc(p.title) + '</div>'
      + '<div style="margin-top:' + p.bodyMt + 'px;font-size:' + p.bodyFs + 'px;line-height:' + p.bodyLh + 'px;color:#1a1a1a;">' + linesHtml + '</div>'
      + '</div>'
      + (p.ribbon ? ribbonHtml() : '')
      + '</div>';
  }

  canvasHtml = function (base) {
    var a = base + '/guarantees-assets/';
    var arch = "font-family:WgArchivo,'Helvetica Neue',Arial,sans-serif;";
    var head = ''
      // faint building watermark
      + '<img src="' + a + 'wg-bg.png" alt="" style="position:absolute;left:0;top:0;width:1024px;height:1536px;display:block;">'
      // top-left corner accent
      + '<svg viewBox="0 0 260 270" width="260" height="270" style="position:absolute;left:0;top:0;display:block;" aria-hidden="true"><polygon points="0,0 176,0 0,257" fill="' + DARK + '"/><polygon points="106,110 141,110 106,134" fill="' + DARK + '"/><polygon points="184,0 231,0 153,110 106,110" fill="' + RED + '"/></svg>'
      // logo lockup
      + '<img src="' + a + 'wg-mark.png" alt="Westrom Group mark" style="position:absolute;left:462px;top:23px;width:134px;height:122px;display:block;">'
      + '<img src="' + a + 'wg-wordmark.png" alt="WESTROM GROUP" style="position:absolute;left:316.5px;top:159px;width:420px;height:29.94px;display:block;">'
      + '<div style="position:absolute;left:316px;top:212px;width:37px;height:3px;background:' + RED + ';"></div>'
      + '<img src="' + a + 'wg-tagline.png" alt="Real Estate and Property Management" style="position:absolute;left:365px;top:208px;width:338px;height:11.6px;display:block;">'
      + '<div style="position:absolute;left:705px;top:212px;width:37px;height:3px;background:' + RED + ';"></div>'
      // display headings
      + '<div style="position:absolute;left:0;right:0;top:238px;height:96px;padding-left:52px;display:flex;align-items:center;justify-content:center;"><span style="display:flex;align-items:baseline;gap:25px;' + arch + "font-weight:790;font-variation-settings:'wdth' 85,'wght' 790;font-size:93.6px;line-height:1;color:#111;text-shadow:1px 2px 2px rgba(0,0,0,0.12);\"><span data-fit=\"439\">WESTROM</span><span data-fit=\"297\">GROUP</span></span></div>"
      + '<div style="position:absolute;left:0;right:0;top:307px;height:140px;padding-left:48px;display:flex;align-items:center;justify-content:center;"><span style="' + arch + "font-weight:790;font-variation-settings:'wdth' 85,'wght' 790;font-size:123px;line-height:1;color:" + RED + ';text-shadow:2px 3px 2.5px rgba(0,0,0,0.15);" data-fit="772">GUARANTEES</span></div>'
      // divider with house glyph
      + '<div style="position:absolute;left:0;right:0;top:425px;height:32px;padding-left:26px;display:flex;align-items:center;justify-content:center;gap:18px;"><span style="display:block;width:259px;height:2px;background:' + RED + ';"></span><svg viewBox="0 0 30 28" width="33" height="31" style="display:block;" aria-hidden="true"><path d="M1 15 L15 1 L29 15 L24 15 L24 27 L6 27 L6 15 Z" fill="' + RED + '"/></svg><span style="display:block;width:258px;height:2px;background:' + RED + ';"></span></div>'
      // subtitle
      + '<div style="position:absolute;left:0;right:0;top:460px;height:28px;padding-left:48px;display:flex;align-items:center;justify-content:center;"><span style="font-size:22.11px;font-weight:400;line-height:1;color:#141414;" data-fit="721">' + esc(SUBTITLE) + '</span></div>';

    var cards = '<div style="position:absolute;left:0;top:512px;width:1024px;">'
      + CARDS.map(function (c) { return flyerCard(base, c); }).join('')
      + '</div>';

    var footer = '<div style="position:absolute;left:0;top:1438px;width:1024px;height:98px;overflow:hidden;">'
      + '<svg viewBox="0 0 1024 98" width="1024" height="98" style="position:absolute;inset:0;display:block;" aria-hidden="true"><polygon points="0,0 831,0 732,98 0,98" fill="' + DARK + '"/><polygon points="1024,-4 1024,2 815,50 812,44" fill="' + DARK + '"/><polygon points="1024,9 788,58 748,98 1024,98" fill="' + RED + '"/></svg>'
      + '<svg viewBox="0 0 90 72" width="82" height="68.9" style="position:absolute;left:91px;top:12px;display:block;" aria-hidden="true"><path d="M3 32 L43 3 L58 13 L58 3 L68 3 L68 20 L86 32" fill="none" stroke="' + RED + '" stroke-width="6" stroke-linecap="square" stroke-linejoin="miter"/><path d="M17 30 L17 67 L72 67 L72 30" fill="none" stroke="' + RED + '" stroke-width="6" stroke-linecap="square" stroke-linejoin="miter"/></svg>'
      + '<div style="position:absolute;left:209px;top:13px;width:1.5px;height:64px;background:rgba(255,255,255,0.45);"></div>'
      + '<div style="position:absolute;left:248px;top:19px;' + arch + "font-weight:600;font-variation-settings:'wdth' 100,'wght' 600;font-size:18.9px;line-height:1;letter-spacing:1.09px;color:#fff;\" data-fit=\"349\">" + esc(FOOT_TOP) + '</div>'
      + '<div style="position:absolute;left:247px;top:41.8px;' + arch + "font-style:italic;font-weight:650;font-variation-settings:'wdth' 88,'wght' 650;font-size:27.27px;line-height:1;color:" + RED + ';" data-fit="427">' + esc(FOOT_BOTTOM) + '</div>'
      + '<div style="position:absolute;left:262px;top:76px;width:300px;height:5px;background:' + RED + ';border-radius:50%;"></div>'
      + '</div>';

    return '<div class="wgc-canvas" style="position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden;background:#fdfdfd;' + arch + '-webkit-font-smoothing:antialiased;transform-origin:top left;">'
      + head + cards + footer + '</div>';
  };

  // ---- reflowed layout (phones) -----------------------------------------
  flowHtml = function (base) {
    var a = base + '/guarantees-assets/';
    var cards = CARDS.map(function (c) {
      var eyebrow = c.ribbon ? '<span class="wgc-feyebrow">Our Best Differentiator</span>' : '';
      return '<div class="wgc-fcard">'
        + '<div class="wgc-fbar"><img class="wgc-ficon" src="' + a + c.icon + '" alt=""><span class="wgc-fnum">' + esc(c.num) + '</span></div>'
        + '<div class="wgc-fbody">' + eyebrow + '<h3 class="wgc-ftitle">' + esc(c.title) + '</h3><p class="wgc-ftext">' + esc(paragraph(c)) + '</p></div>'
        + '</div>';
    }).join('');
    var house = '<svg viewBox="0 0 90 72" width="46" height="37" aria-hidden="true"><path d="M3 32 L43 3 L58 13 L58 3 L68 3 L68 20 L86 32" fill="none" stroke="' + RED + '" stroke-width="6" stroke-linecap="square" stroke-linejoin="miter"/><path d="M17 30 L17 67 L72 67 L72 30" fill="none" stroke="' + RED + '" stroke-width="6" stroke-linecap="square" stroke-linejoin="miter"/></svg>';
    var hhouse = '<svg viewBox="0 0 30 28" width="26" height="24" aria-hidden="true"><path d="M1 15 L15 1 L29 15 L24 15 L24 27 L6 27 L6 15 Z" fill="' + RED + '"/></svg>';
    return '<div class="wgc-flow" role="region" aria-label="Westrom Group Guarantees">'
      + '<div class="wgc-fhead">'
      + '<img class="wgc-fmark" src="' + a + 'wg-mark.png" alt="Westrom Group">'
      + '<img class="wgc-fword" src="' + a + 'wg-wordmark.png" alt="WESTROM GROUP">'
      + '<div class="wgc-fdiv"><span class="l"></span>' + hhouse + '<span class="l"></span></div>'
      + '<div class="wgc-fguar">Guarantees</div>'
      + '<p class="wgc-fsub">' + esc(SUBTITLE) + '</p>'
      + '</div>'
      + '<div class="wgc-fcards">' + cards + '</div>'
      + '<div class="wgc-ffoot">' + house + '<div><p class="t">' + esc(FOOT_TOP) + '</p><p class="b">' + esc(FOOT_BOTTOM) + '</p></div></div>'
      + '</div>';
  };

  // ---- styles -----------------------------------------------------------
  css = function () {
    return [
      ":host{all:initial;display:block;}",
      "*,*::before,*::after{box-sizing:border-box;}",
      ".wgc-root{container-type:inline-size;width:100%;font-family:WgArchivo,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111;}",

      /* wide: the exact flyer, scaled to fit */
      ".wgc-scale-wrap{position:relative;width:100%;max-width:1024px;margin-inline:auto;aspect-ratio:1024/1536;overflow:hidden;background:#fdfdfd;border-radius:12px;box-shadow:0 20px 45px -12px rgba(0,0,0,0.25);}",
      ".wgc-canvas{will-change:transform;}",

      /* hover: lift the whole card unit, deepen its shadow, pop the icon */
      ".wgc-fly-card{transition:transform 0.22s ease;}",
      ".wgc-fly-body{box-shadow:0 3px 10px rgba(0,0,0,0.07);transition:box-shadow 0.22s ease;}",
      ".wgc-fly-icon{transition:transform 0.22s ease;}",
      ".wgc-fly-card:hover{transform:translateY(-5px);}",
      ".wgc-fly-card:hover .wgc-fly-body{box-shadow:0 12px 26px rgba(0,0,0,0.16);}",
      ".wgc-fly-card:hover .wgc-fly-icon{transform:scale(1.08);}",

      /* narrow: reflow */
      ".wgc-flow{display:none;}",
      "@container (max-width:599px){.wgc-scale-wrap{display:none;}.wgc-flow{display:block;}}",

      ".wgc-fhead{text-align:center;padding:1.75rem 1.25rem 1.25rem;}",
      ".wgc-fmark{height:66px;width:auto;display:inline-block;}",
      ".wgc-fword{display:block;width:min(78%,290px);height:auto;margin:0.7rem auto 0;}",
      ".wgc-fdiv{display:flex;align-items:center;justify-content:center;gap:12px;margin:0.85rem 0 0.7rem;}",
      ".wgc-fdiv .l{display:block;width:64px;height:2px;background:" + RED + ";}",
      ".wgc-fguar{font-family:WgArchivo;font-weight:800;font-variation-settings:'wdth' 85,'wght' 820;font-size:2.9rem;line-height:0.9;letter-spacing:-0.01em;text-transform:uppercase;color:" + RED + ";}",
      ".wgc-fsub{margin:0.6rem auto 0;max-width:21rem;font-size:0.95rem;line-height:1.35;color:#141414;}",

      ".wgc-fcards{padding:0 1rem 1.4rem;display:flex;flex-direction:column;gap:0.9rem;}",
      ".wgc-fcard{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.08);transition:transform 0.2s ease,box-shadow 0.2s ease;}",
      ".wgc-fcard:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,0.13);}",
      "@media(prefers-reduced-motion:reduce){.wgc-fly-card,.wgc-fly-body,.wgc-fly-icon,.wgc-fcard{transition:none;}.wgc-fly-card:hover,.wgc-fcard:hover{transform:none;}.wgc-fly-card:hover .wgc-fly-icon{transform:none;}}",
      ".wgc-fbar{background:" + DARK + ";display:flex;align-items:center;justify-content:space-between;padding:0.45rem 1.05rem 0.45rem 0.7rem;}",
      ".wgc-ficon{width:54px;height:54px;border-radius:50%;display:block;flex:0 0 auto;}",
      ".wgc-fnum{font-family:WgBarlow,'Arial Narrow',sans-serif;font-weight:800;font-size:2.4rem;line-height:1;color:#fff;display:inline-block;transform:scaleX(0.8);transform-origin:100% 50%;}",
      ".wgc-fbody{padding:0.85rem 1.1rem 1.05rem;}",
      ".wgc-feyebrow{display:inline-block;margin-block-end:0.5rem;background:" + RED + ";color:#fff;font-weight:700;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;padding:0.3rem 0.55rem;border-radius:4px;}",
      ".wgc-ftitle{margin:0 0 0.4rem;font-family:WgBarlow,'Arial Narrow',sans-serif;font-weight:600;font-size:1.35rem;line-height:1.1;color:#111;}",
      ".wgc-ftext{margin:0;font-size:0.92rem;line-height:1.5;color:#1a1a1a;}",

      ".wgc-ffoot{background:" + DARK + ";color:#fff;display:flex;align-items:center;gap:1rem;padding:1.15rem 1.25rem;}",
      ".wgc-ffoot svg{flex:0 0 auto;}",
      ".wgc-ffoot .t{margin:0;font-weight:600;font-size:0.82rem;letter-spacing:0.06em;text-transform:uppercase;}",
      ".wgc-ffoot .b{margin:0.2rem 0 0;font-style:italic;font-weight:650;font-size:1.05rem;color:" + RED + ";text-transform:uppercase;}"
    ].join('');
  };

  // ---- pixel-accurate text fit (scale-aware) ----------------------------
  // Nudges letter-spacing so each [data-fit] run hits its target width in
  // canvas pixels. getBoundingClientRect returns transform-scaled widths, so we
  // divide by the current scale to work back in the 1024px design space.
  fit = function (root, scale) {
    var els = root.querySelectorAll('[data-fit]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var target = parseFloat(el.getAttribute('data-fit'));
      var n = (el.textContent || '').length;
      if (!target || n < 2) continue;
      var r = document.createRange();
      el.style.letterSpacing = '0px';
      r.selectNodeContents(el);
      var w0 = r.getBoundingClientRect().width / scale;
      if (!w0) continue;
      var ls = (target - w0) / n;
      el.style.letterSpacing = ls.toFixed(3) + 'px';
      r.selectNodeContents(el);
      ls += (target - r.getBoundingClientRect().width / scale) / n;
      el.style.letterSpacing = ls.toFixed(3) + 'px';
    }
  };

  // ---- mount ------------------------------------------------------------
  mount = function (cfg) {
    var host = document.getElementById(cfg.mount);
    if (!host || host.shadowRoot) return;
    injectFonts(cfg.assetBase);
    var root = host.attachShadow({ mode: 'open' });
    var style = document.createElement('style');
    style.textContent = css();
    var wrap = document.createElement('div');
    wrap.className = 'wgc-root';
    wrap.innerHTML = '<div class="wgc-scale-wrap">' + canvasHtml(cfg.assetBase) + '</div>' + flowHtml(cfg.assetBase);
    root.appendChild(style);
    root.appendChild(wrap);

    var scaleWrap = root.querySelector('.wgc-scale-wrap');
    var canvas = root.querySelector('.wgc-canvas');
    function applyScale() {
      var w = scaleWrap.clientWidth;
      if (!w) return; // hidden (reflow active)
      var scale = w / W;
      canvas.style.transform = 'scale(' + scale + ')';
      fit(root, scale);
    }
    applyScale();
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(applyScale).observe(scaleWrap);
    } else if (typeof window.addEventListener === 'function') {
      window.addEventListener('resize', applyScale);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(applyScale);
    [120, 400, 1200].forEach(function (t) { setTimeout(applyScale, t); });
  };

  var cfg = readConfig(self);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mount(cfg); });
  } else {
    mount(cfg);
  }
})();
