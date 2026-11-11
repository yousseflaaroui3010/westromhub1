(()=>{var F=`/* Compiled into the open shadow root (TD-1).

   FONT: @font-face does not apply inside a shadow root, so the widget cannot
   load Poppins itself. It asks for Poppins first and falls back to the system
   stack. On westromgroup.com (the pricing page this design targets) the theme
   already loads Poppins, so it resolves. On wgcassetguide.com it currently
   falls back -- PARKED: self-hosting Poppins woff2 + injecting @font-face into
   the host <head> is the same trick guarantees.js uses, and it belongs to the
   asset task, not this restyle. See BUILD-STATE.

   RED: the handoff specifies #e03b25. That is 4.36:1 on white, which FAILS
   WCAG AA for normal text and would fail it again as a background under white
   button text. #d63520 is 4.78:1 both ways and is visually indistinguishable.
   The handoff itself says to prefer a site token and note the discrepancy;
   this is that note. See DECISIONS 2026-08-07.

   RTL-ready: logical properties (margin-inline / inset-inline) instead of
   left/right. */

:host {
  all: initial;
  display: block;
  font-family: Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--wgc-ink);
  line-height: 1.45;

  /* Brand tokens (Westrom pricing page). One red, used for both text and
     fills, so nothing on this widget needs a second one. */
  --wgc-red: #d63520;
  /* Text-only red: #d63520 is 4.17:1 on the #f1efeb band, below WCAG AA
     for 11.5px text (axe, 2026-11-11). #b42b18 is 5.54:1 there and 6.36:1 on
     white. Decorative bars/lines keep the brighter --wgc-red. */
  --wgc-red-text: #b42b18;
  --wgc-ink: #111111;
  --wgc-white: #ffffff;
  --wgc-section: #f2f1ee;
  --wgc-field: #f7f6f4;
  --wgc-border: #d6d3cd;
  --wgc-body: #5c5c5c;
  /* Handoff said #8a8a8a / #9a9a9a for small print and "(optional)". Both fail
     AA on white; #767676 is 4.54:1 and is the handoff's own recommendation. */
  --wgc-muted: #767676;
  --wgc-error: #b3261e;
  --wgc-on-dark: rgba(255, 255, 255, 0.82);
  --wgc-on-dark-muted: rgba(255, 255, 255, 0.62);
  --wgc-shadow: 0 14px 36px rgba(0, 0, 0, 0.12);
}

/* ---------------------------------------------------------------- *
 * Feature layout (data-layout="feature"): section heading + a black *
 * guarantee-recap column beside the form. Chrome lives OUTSIDE the  *
 * state container so it survives the loading/error/success swaps.   *
 * ---------------------------------------------------------------- */

.wgc-feature {
  box-sizing: border-box;
  background: var(--wgc-section);
  padding: 46px 34px 52px;
}

.wgc-feature *,
.wgc-feature *::before,
.wgc-feature *::after {
  box-sizing: border-box;
  font-family: inherit;
}

.wgc-sechead {
  max-width: 640px;
  margin: 0 auto 34px;
  text-align: center;
}

.wgc-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--wgc-red-text);
}

/* Decorative rules either side of the eyebrow text. */
.wgc-eyebrow::before,
.wgc-eyebrow::after {
  content: "";
  width: 26px;
  height: 2px;
  background: var(--wgc-red);
}

.wgc-sectitle {
  margin: 14px 0 0;
  font-size: 38px;
  line-height: 1.1;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--wgc-ink);
}

.wgc-panel-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  /* The grey band goes full-bleed but the panel must not: this is an embed
     dropped into pages whose width we do not control, and an uncapped form
     column on a 1920px screen is unusable. 1000px is the handoff's own
     desktop canvas, so the proportions match the mockup at any host width. */
  max-width: 1000px;
  margin-inline: auto;
  background: var(--wgc-white);
  box-shadow: var(--wgc-shadow);
}

/* Guarantee recap: the bridge out of the Guarantees graphic above. */
.wgc-recap {
  position: relative;
  overflow: hidden;
  padding: 38px 32px;
  background: var(--wgc-ink);
  color: var(--wgc-white);
}

/* Diagonal corner cut, echoing the Guarantees artwork. Pure CSS, no asset. */
.wgc-recap::before {
  content: "";
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  width: 120px;
  height: 120px;
  background: linear-gradient(225deg, var(--wgc-red) 42%, transparent 42%);
}

.wgc-recap-title {
  position: relative;
  margin: 0;
  font-size: 23px;
  line-height: 1.2;
  font-weight: 800;
  text-transform: uppercase;
}

.wgc-recap-rule {
  width: 44px;
  height: 3px;
  margin-block: 18px 24px;
  background: var(--wgc-red);
}

.wgc-recap-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wgc-recap-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

/* Decorative row marker. Was a 34px numbered circle indexing into the
   Guarantees graphic; that content is gone, so the numerals went with it. */
.wgc-recap-mark {
  flex: 0 0 auto;
  width: 16px;
  height: 3px;
  margin-block-start: 9px; /* sits on the first line's optical centre */
  background: var(--wgc-red);
}

.wgc-recap-text {
  padding-block-start: 6px;
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--wgc-on-dark);
}

.wgc-recap-foot {
  margin: 28px 0 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--wgc-on-dark-muted);
}

/* Desktop: black column beside the form. Below this the recap collapses to a
   compact strip above the form, which is the same DOM order. */
@media (min-width: 1000px) {
  .wgc-panel-grid {
    grid-template-columns: 340px minmax(0, 1fr);
  }
}

@media (max-width: 999px) {
  .wgc-feature {
    padding: 30px 18px 34px;
  }

  .wgc-sechead {
    margin-block-end: 22px;
  }

  .wgc-eyebrow {
    font-size: 10px;
    gap: 8px;
  }

  .wgc-eyebrow::before,
  .wgc-eyebrow::after {
    width: 18px;
  }

  .wgc-sectitle {
    font-size: 27px;
  }

  .wgc-recap {
    padding: 20px 20px 18px;
  }

  .wgc-recap::before {
    width: 76px;
    height: 76px;
  }

  .wgc-recap-title {
    font-size: 15px;
    letter-spacing: 0.02em;
  }

  .wgc-recap-rule {
    width: 34px;
    margin-block: 12px 14px;
  }

  .wgc-recap-list {
    gap: 11px;
  }

  .wgc-recap-item {
    align-items: flex-start;
    gap: 11px;
  }

  .wgc-recap-mark {
    width: 12px;
    margin-block-start: 7px;
  }

  .wgc-recap-text {
    padding-block-start: 0;
    font-size: 12px;
    line-height: 1.35;
  }

  /* Dropped on narrow screens: the recap is a strip there, not a column. */
  .wgc-recap-foot {
    display: none;
  }
}

/* ---------------------------------------------------------------- *
 * The form card                                                     *
 * ---------------------------------------------------------------- */

.wgc-wrap {
  box-sizing: border-box;
  min-height: 520px; /* reserved height: no layout shift on load */
  max-width: 480px;
  padding: 20px;
  border: 1px solid var(--wgc-border);
  background: var(--wgc-white);
}

.wgc-wrap *,
.wgc-wrap *::before,
.wgc-wrap *::after {
  box-sizing: border-box;
  font-family: inherit;
}

/* Inside the feature panel the grid supplies the card chrome instead. */
.wgc-feature .wgc-wrap {
  max-width: none;
  border: 0;
  padding: 38px 36px 30px;
}

@media (max-width: 999px) {
  .wgc-feature .wgc-wrap {
    padding: 24px 20px 22px;
  }
}

.wgc-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 800;
  text-transform: uppercase;
  line-height: 1.2;
}

.wgc-sub {
  margin: 0 0 26px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--wgc-body);
}

.wgc-field {
  margin-block-end: 22px;
}

.wgc-row {
  display: flex;
  gap: 20px;
}

.wgc-row .wgc-field {
  flex: 1 1 0;
  min-width: 0;
}

/* Below the tablet break the two property fields stack (handoff \xA72). */
@media (max-width: 767px) {
  .wgc-row {
    flex-direction: column;
    gap: 0;
  }
}

.wgc-label {
  display: block;
  margin-block-end: 7px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--wgc-ink);
}

/* "(optional)" rides inside the uppercase label, so it opts back out. */
.wgc-optional {
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--wgc-muted);
}

.wgc-input {
  width: 100%;
  height: 50px;
  padding: 0 14px;
  font-size: 16px; /* >=16px stops iOS Safari zoom-on-focus */
  color: var(--wgc-ink);
  background: var(--wgc-field);
  border: 0;
  border-block-end: 2px solid var(--wgc-border);
  border-radius: 0;
}

.wgc-input:focus {
  background: var(--wgc-white);
  border-block-end-color: var(--wgc-red);
}

.wgc-input:focus,
.wgc-check input:focus,
.wgc-seg-opt:focus,
.wgc-btn:focus,
.wgc-link:focus,
.wgc-launcher:focus {
  /* offset 2px puts the ring on the parent surface, never on the element's
     own fill, so one red ring stays >=3:1 on every background we use. */
  outline: 3px solid var(--wgc-red);
  outline-offset: 2px;
}

.wgc-input[aria-invalid="true"] {
  border-block-end-color: var(--wgc-error);
}

.wgc-err {
  display: block;
  margin-block-start: 6px;
  font-size: 12.5px;
  color: var(--wgc-error);
  min-height: 1em;
}

/* Segmented single-select (bedrooms) */
.wgc-seg {
  display: flex;
  gap: 10px;
}

.wgc-seg-opt {
  flex: 1 1 0;
  min-height: 50px; /* touch target */
  padding: 10px 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--wgc-ink);
  background: var(--wgc-white);
  border: 1.5px solid var(--wgc-border);
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s, border-color 0.15s;
}

.wgc-seg-opt:hover {
  border-color: var(--wgc-red);
}

.wgc-seg-opt[aria-checked="true"] {
  color: var(--wgc-white);
  background: var(--wgc-red);
  border-color: var(--wgc-red);
}

@media (max-width: 767px) {
  .wgc-seg {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
}

.wgc-check {
  display: flex;
  gap: 11px;
  align-items: flex-start;
  margin-block: 22px 0;
}

.wgc-check input {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  margin-block-start: 2px;
  accent-color: var(--wgc-red);
}

.wgc-check label {
  font-size: 13px;
  line-height: 1.55;
  color: var(--wgc-body);
}

/* Email reveal: shown only after the consent box is checked. Explicit
   display rule so the \`hidden\` attribute is honored inside the shadow root. */
.wgc-reveal {
  margin-block-start: 18px;
}

.wgc-reveal[hidden] {
  display: none;
}

.wgc-btn {
  display: block;
  width: 100%;
  min-height: 56px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--wgc-white);
  background: var(--wgc-ink);
  border: 0;
  border-radius: 0;
  cursor: pointer;
  margin-block-start: 20px;
  transition: background-color 0.15s;
}

.wgc-btn:hover {
  background: var(--wgc-red);
}

.wgc-btn[disabled] {
  background: var(--wgc-ink);
  opacity: 0.6;
  cursor: default;
}

@media (prefers-reduced-motion: reduce) {
  .wgc-seg-opt,
  .wgc-btn {
    transition: none;
  }
}

.wgc-fineprint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--wgc-muted);
  text-align: center;
}

.wgc-privacy {
  display: block;
  margin-block-start: 14px;
  font-size: 12px;
  text-align: center;
}

.wgc-link {
  color: var(--wgc-muted);
}

.wgc-status {
  margin: 0 0 12px;
  font-size: 14px;
}

.wgc-status[data-kind="error"] {
  color: var(--wgc-error);
}

/* Success / result states */
.wgc-panel {
  min-height: 460px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}

.wgc-result {
  justify-content: flex-start;
  padding-block-start: 8px;
}

/* The estimate itself: kicker + range in a red-edged block (handoff \xA71). */
.wgc-range-block {
  padding: 18px 22px;
  background: var(--wgc-field);
  border-inline-start: 4px solid var(--wgc-red);
}

.wgc-range-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--wgc-muted);
}

.wgc-range {
  margin: 4px 0 0;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--wgc-ink);
}

.wgc-range-unit {
  font-size: 16px;
  font-weight: 600;
  color: var(--wgc-body);
}

/* UNVERIFIED COPY: exact wording is an open question for Jon (see the
   T-brand-restyle-estimator handover). Shipping a range with no disclaimer at
   all is the worse option, so this neutral line stands in until he answers. */
.wgc-disclaimer {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--wgc-muted);
}

.wgc-comps-heading {
  margin: 16px 0 4px;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--wgc-ink);
}

/* Out-of-area basis line ("Estimate based on N active rentals in {zip}")
   shown in place of comps when the number comes from RentCast market stats. */
.wgc-basis {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--wgc-body);
}

.wgc-comps {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  text-align: start;
}

.wgc-comp {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 0;
  border-block-end: 1px solid #ececec;
  font-size: 13px;
}

.wgc-comp-rent {
  font-weight: 700;
  white-space: nowrap;
}

.wgc-ebook-note {
  margin-block-start: 12px;
  color: #1a7a3c;
  font-weight: 600;
}

.wgc-thanks {
  margin-block-start: 8px;
}

/* Honeypot: visually removed but still in the DOM for naive bots.
   display:none is deliberately avoided (some bots skip hidden fields). */
.wgc-hp {
  position: absolute !important;
  inset-inline-start: -9999px !important;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

/* ---------------------------------------------------------------- *
 * Popup/modal launch mode (data-mode="popup")                       *
 *                                                                   *
 * Retokenized 2026-08-07 onto the same ink/red pair as the form.    *
 * The previous navy/red-#b61710 chrome was approved on its own, but *
 * the dialog BODY renders the restyled form, so leaving it put two  *
 * different reds and two different darks on screen at once -- the   *
 * exact "two worlds" complaint this task exists to fix. The amber   *
 * "free guide" ribbon survives as the single accent; it carries     *
 * information the new palette has no equivalent for.                *
 * ---------------------------------------------------------------- */
.wgc-launcher {
  display: inline-block;
  padding: 14px 22px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--wgc-white);
  background: var(--wgc-red);
  border: 0;
  border-radius: 0;
  cursor: pointer;
}

.wgc-launcher:hover {
  background: var(--wgc-ink);
}

.wgc-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.55);
  /* opacity+visibility (not display) so the open transition is real and
     the closed overlay is still un-hit-testable and out of the a11y tree. */
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.18s ease, visibility 0s linear 0.18s;
}

.wgc-overlay.wgc-open {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.18s ease, visibility 0s linear 0s;
}

@media (prefers-reduced-motion: reduce) {
  .wgc-overlay {
    transition: none;
  }
}

.wgc-modal {
  box-sizing: border-box;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--wgc-white);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}

.wgc-modal-header {
  position: sticky;
  inset-block-start: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: var(--wgc-ink);
}

.wgc-modal-ribbon {
  font-size: 12px;
  font-weight: 700;
  color: #1a1200;
  background: #e8b04b;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.wgc-modal-close {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  line-height: 1;
  color: var(--wgc-white);
  background: transparent;
  border: 0;
  cursor: pointer;
}

.wgc-modal-close:hover {
  background: rgba(255, 255, 255, 0.15);
}

.wgc-modal-close:focus {
  outline: 3px solid #e8b04b;
  outline-offset: 2px;
}

.wgc-modal-body {
  padding: 4px;
}

/* The reused wgc-wrap card loses its own border/background/sizing inside
   the modal -- the dialog panel supplies that chrome instead. */
.wgc-modal .wgc-wrap {
  border: 0;
  background: transparent;
  max-width: none;
  min-height: 0;
}
`;var ee=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,te=/^\d{5}$/,N=["2","3","4","5+"],C={name:{min:1,max:120},email:{max:254},sqft:{min:300,max:1e4},bedrooms:{options:N}};function re(e){let t=String(e==null?"":e).trim();return t.length>C.email.max||!ee.test(t)?null:t}function ne(e){let t=String(e==null?"":e).trim();return te.test(t)?t:null}function ae(e){let t=String(e==null?"":e).trim();if(t==="")return null;let r=Number(t);return!Number.isFinite(r)||!Number.isInteger(r)||r<C.sqft.min||r>C.sqft.max?null:r}function ie(e){let t=String(e==null?"":e).trim();return t===""?null:N.indexOf(t)!==-1?t:void 0}function B(e){let t={},r={};return r.zip=ne(e.zip),r.zip===null&&(t.zip="Enter a 5-digit ZIP code."),r.sqft=ae(e.sqft),r.sqft===null&&(t.sqft="Enter square footage between 300 and 10,000."),r.bedrooms=ie(e.bedrooms),r.bedrooms===void 0&&(t.bedrooms="Choose 2, 3, 4, or 5+."),r.ebook_opt_in=e.ebook_opt_in===!0,r.ebook_opt_in?(r.email=re(e.email),r.email===null&&(t.email="Enter a valid email address.")):r.email=null,Object.keys(t).length?{ok:!1,errors:t}:{ok:!0,data:r}}var oe="v3-explicit-2026-07-22",R="https://wgcassetguide.com/api/leads";function P(e,t){let r=new AbortController,a=setTimeout(function(){r.abort()},1e4),n=Object.assign({},t,{signal:r.signal});return fetch(e,n).finally(function(){clearTimeout(a)})}function H(e){let t=null,r=0;function a(){return P(e+"/token",{method:"GET"}).then(function(i){if(!i.ok)throw new Error("token fetch failed: "+i.status);return i.text()}).then(function(i){return t=i.trim(),r=Date.now(),t})}function n(){return t&&Date.now()-r<36e5?Promise.resolve(t):a().catch(function(){return t})}return{refresh:a,ensureFresh:n,get:function(){return t}}}function M(){if(typeof crypto.randomUUID=="function")return crypto.randomUUID();let e=crypto.getRandomValues(new Uint8Array(16));e[6]=e[6]&15|64,e[8]=e[8]&63|128;let t=Array.prototype.map.call(e,function(r){return(r+256).toString(16).slice(1)}).join("");return t.slice(0,8)+"-"+t.slice(8,12)+"-"+t.slice(12,16)+"-"+t.slice(16,20)+"-"+t.slice(20)}function U(e,t){var r=e.ebook_opt_in===!0&&!!e.email;return{submission_id:t.submissionId,name:"",email:r?e.email:"",phone:"",zip:e.zip,sqft:e.sqft,bedrooms:e.bedrooms==null?null:e.bedrooms,ebook_opt_in:r,consent:r?{explicit:!0,text_version:oe,ts:new Date().toISOString()}:null}}function j(e,t,r){let a=Object.assign({},t,{token:r.token||"",fax:r.honeypot||"",fill_ms:r.fillMs});return r.turnstile&&(a.turnstile=r.turnstile),P(e+"/lead",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)}).then(function(n){if(!n.ok)throw new Error("submit failed: "+n.status);return n.json().catch(function(){return{}})})}var L=null;function G(e,t){return L||(L=new Promise(function(r,a){if(window.turnstile)return r(window.turnstile);var n=document.createElement("script");n.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",n.async=!0,n.onload=function(){window.turnstile?r(window.turnstile):a(new Error("turnstile"))},n.onerror=function(){L=null,a(new Error("turnstile"))},document.head.appendChild(n)})),L.then(function(r){return new Promise(function(a,n){var i=document.createElement("div");t.insertAdjacentElement("afterend",i);var c,f=setTimeout(function(){b(n,new Error("turnstile timeout"))},3e4);function b(w,k){clearTimeout(f);try{r.remove(c)}catch(x){}i.remove(),w(k)}c=r.render(i,{sitekey:e,action:"lead",appearance:"interaction-only",callback:function(w){b(a,w)},"error-callback":function(){b(n,new Error("turnstile"))}})})})}var p={formTitle:"Free Rent Estimate",formSub:"Enter your property details for an instant estimated rent range. No email required.",bedroomsLabel:"Bedrooms",optionalSuffix:"(optional)",submitLabel:"Get My Estimate",calculating:"Calculating\u2026",submitting:"Getting your estimate\u2026",fixFields:"Please fix the highlighted fields.",estimateKicker:"Estimated monthly rent",estimateDisclaimer:"This is an estimate based on comparable properties in your area. It is not an offer or a formal appraisal.",ebookLabel:'Send me the free guide "How To Hire The Best Property Manager." I agree Westrom Group may email me about my property.',ebookSent:"Your free guide is on its way to your inbox.",receivedTitle:"Request received",receivedBody:"A Westrom specialist will review your property and follow up shortly.",noEstimateTitle:"Estimate not available yet",noEstimateBody:"We could not generate an instant estimate for that ZIP right now. For a full, human-prepared analysis, check the free-guide box and our team will help.",estimateTitle:"Your estimated rent range",compsHeading:"Recent nearby rentals",cta:"Get a free expert review",thanksTitle:"You are all set",thanksBody:"A Westrom specialist will review your property and follow up with a human-prepared analysis."};function o(e){return String(e==null?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function se(e){return e&&typeof e=="object"&&e.estimate?"estimate":"received"}function _(e){let t=Number(e);return Number.isFinite(t)?"$"+Math.round(t).toLocaleString("en-US"):""}function W(e){return e&&e.ebookOptIn?'<p class="wgc-sub wgc-ebook-note">'+o(p.ebookSent)+"</p>":""}function ce(e){let t=[];e.zip!=null&&e.zip!==""&&t.push("ZIP "+o(e.zip)),e.beds!=null&&e.beds!==""&&t.push(o(e.beds)+" bd"),e.sqft!=null&&e.sqft!==""&&t.push(Number(e.sqft).toLocaleString("en-US")+" sqft"),e.ago_days!=null&&e.ago_days!==""&&t.push(o(e.ago_days)+" days ago");let r=_(e.rent);return'<li class="wgc-comp"><span class="wgc-comp-meta">'+t.join(" &middot; ")+"</span>"+(r?'<span class="wgc-comp-rent">'+r+"/mo</span>":"")+"</li>"}function le(e){let t=!!(e&&e.ebookOptIn),r=t?p.receivedTitle:p.noEstimateTitle,a=t?p.receivedBody:p.noEstimateBody;return'<div class="wgc-panel" role="status" aria-live="assertive"><h2 class="wgc-title" id="wgc-dyn-title">'+o(r)+'</h2><p class="wgc-sub">'+o(a)+"</p>"+W(e)+"</div>"}function de(e,t){let r=Array.isArray(e.comps)?e.comps.slice(0,3):[];if(r.length)return'<p class="wgc-sub wgc-comps-heading">'+o(p.compsHeading)+'</p><ul class="wgc-comps">'+r.map(ce).join("")+"</ul>";let a=e.meta||{},n=Number(a.listings);if(Number.isFinite(n)&&n>0){let i=a.zip||t&&t.zip||"",c=n===1?"active rental":"active rentals",f=i?" in "+i:"";return'<p class="wgc-sub wgc-basis">'+o("Estimate based on "+n.toLocaleString("en-US")+" "+c+f)+"</p>"}return""}function pe(e,t){let r=_(e.low),a=_(e.high),n=r&&a?r+" &ndash; "+a:r||a||"",i=t&&t.ebookOptIn?'<button class="wgc-btn" type="button" id="wgc-cta">'+o(p.cta)+'</button><div class="wgc-thanks" id="wgc-thanks" hidden><h3 class="wgc-title">'+o(p.thanksTitle)+'</h3><p class="wgc-sub">'+o(p.thanksBody)+"</p></div>":"";return'<div class="wgc-panel wgc-result" role="status" aria-live="assertive"><h2 class="wgc-title" id="wgc-dyn-title">'+o(p.estimateTitle)+'</h2><div class="wgc-range-block"><p class="wgc-range-kicker">'+o(p.estimateKicker)+'</p><p class="wgc-range">'+n+'<span class="wgc-range-unit">/mo</span></p></div><p class="wgc-disclaimer">'+o(p.estimateDisclaimer)+"</p>"+de(e,t)+W(t)+i+"</div>"}function K(e,t){return se(e)==="estimate"?pe(e.estimate||{},t):le(t)}var q={defaultLaunchLabel:"Get My Free Rental Analysis",ribbon:"Free guide included",close:"Close"},ue="a[href], button, input, select, textarea, [tabindex]";function Y(e){var t=Array.prototype.slice.call(e.querySelectorAll(ue));return t.filter(function(r){return!(r.hasAttribute("disabled")||r.getAttribute("type")==="hidden"||r.getAttribute("tabindex")==="-1")})}function ge(e,t,r){if(!e.length)return-1;var a=e.indexOf(t);return r?a<=0?e.length-1:a-1:a===-1||a===e.length-1?0:a+1}function Z(e,t,r,a){var n=t.createElement("button");n.type="button",n.className="wgc-launcher",n.id="wgc-launcher",n.textContent=a||q.defaultLaunchLabel;var i=t.createElement("div");i.className="wgc-overlay",i.id="wgc-overlay";var c=t.createElement("div");c.className="wgc-modal",c.id="wgc-modal",c.setAttribute("role","dialog"),c.setAttribute("aria-modal","true"),c.setAttribute("aria-labelledby","wgc-dyn-title");var f=t.createElement("div");f.className="wgc-modal-header";var b=t.createElement("span");b.className="wgc-modal-ribbon",b.textContent=q.ribbon;var w=t.createElement("button");w.type="button",w.className="wgc-modal-close",w.id="wgc-modal-close",w.setAttribute("aria-label",q.close),w.textContent="\xD7";var k=t.createElement("div");k.className="wgc-modal-body",k.appendChild(r),f.appendChild(b),f.appendChild(w),c.appendChild(f),c.appendChild(k),i.appendChild(c);var x=!1,E=null,A="";function z(s){if(x){if(s.key==="Escape"||s.key==="Esc"){s.preventDefault(),u();return}if(s.key==="Tab"){s.preventDefault();var l=Y(c);if(!l.length)return;var h=ge(l,e.activeElement,s.shiftKey);l[h].focus()}}}function I(s){s.target===i&&u()}function S(){var s=Y(c);(s[0]||w).focus()}function g(){x||(x=!0,E=n,i.classList.add("wgc-open"),A=t.body.style.overflow,t.body.style.overflow="hidden",t.addEventListener("keydown",z),i.addEventListener("click",I),S())}function u(){x&&(x=!1,i.classList.remove("wgc-open"),t.body.style.overflow=A,t.removeEventListener("keydown",z),i.removeEventListener("click",I),E&&typeof E.focus=="function"&&E.focus())}function d(){x&&S()}return n.addEventListener("click",g),w.addEventListener("click",u),{launcher:n,overlay:i,dialog:c,open:g,close:u,refocusContent:d}}var T={eyebrow:"Now the numbers",title:"Start with what your property is worth",recapTitle:"Managing Fort Worth rentals since 1994",recap:["Family owned. Not a franchise, not a call centre.","Jon Westrom, the broker, is who you actually talk to.","Single-family homes across Fort Worth and DFW."],recapFoot:"The estimate is free and instant. What you do with it is up to you."};function fe(){return T.recap.map(function(e){return'<li class="wgc-recap-item"><span class="wgc-recap-mark" aria-hidden="true"></span><span class="wgc-recap-text">'+o(e)+"</span></li>"}).join("")}function $(e,t){var r=e.createElement("div");r.className="wgc-feature";var a=e.createElement("div");a.className="wgc-sechead",a.innerHTML='<span class="wgc-eyebrow">'+o(T.eyebrow)+'</span><h2 class="wgc-sectitle">'+o(T.title)+"</h2>";var n=e.createElement("div");n.className="wgc-panel-grid";var i=e.createElement("aside");return i.className="wgc-recap",i.innerHTML='<h3 class="wgc-recap-title">'+o(T.recapTitle)+'</h3><div class="wgc-recap-rule"></div><ul class="wgc-recap-list">'+fe()+'</ul><p class="wgc-recap-foot">'+o(T.recapFoot)+"</p>",n.appendChild(i),n.appendChild(t),r.appendChild(a),r.appendChild(n),r}var we="wgc-analysis",me=["2","3","4","5+"],O={zip:{name:"zip",label:"ZIP code",type:"text",required:!0,autocomplete:"postal-code",maxlength:5,inputmode:"numeric",placeholder:"e.g. 76052"},sqft:{name:"sqft",label:"Square footage",type:"text",required:!0,maxlength:6,inputmode:"numeric",placeholder:"approximate is fine"},email:{name:"email",label:"Email",type:"email",required:!1,autocomplete:"email",maxlength:254,placeholder:"you@email.com"}};function D(e){return'<div class="wgc-field"><label class="wgc-label" for="wgc-'+e.name+'">'+o(e.label)+'</label><input class="wgc-input" id="wgc-'+e.name+'" name="'+e.name+'" type="'+e.type+'" maxlength="'+e.maxlength+'"'+(e.inputmode?' inputmode="'+e.inputmode+'"':"")+(e.placeholder?' placeholder="'+o(e.placeholder)+'"':"")+(e.autocomplete?' autocomplete="'+e.autocomplete+'"':"")+(e.required?' required aria-required="true"':"")+' aria-describedby="wgc-err-'+e.name+'"><span class="wgc-err" id="wgc-err-'+e.name+'" aria-live="polite"></span></div>'}function he(){var e=me.map(function(t,r){return'<button type="button" class="wgc-seg-opt" role="radio" aria-checked="false" data-value="'+o(t)+'" tabindex="'+(r===0?"0":"-1")+'">'+o(t)+"</button>"}).join("");return'<div class="wgc-field"><span class="wgc-label" id="wgc-bedrooms-label">'+o(p.bedroomsLabel)+' <span class="wgc-optional">'+o(p.optionalSuffix)+'</span></span><div class="wgc-seg" role="radiogroup" aria-labelledby="wgc-bedrooms-label" aria-describedby="wgc-err-bedrooms">'+e+'</div><span class="wgc-err" id="wgc-err-bedrooms" aria-live="polite"></span></div>'}function be(e){var t='<div class="wgc-row">'+D(O.zip)+D(O.sqft)+"</div>"+he();return'<div class="wgc-wrap"><h2 class="wgc-title" id="wgc-dyn-title">'+o(p.formTitle)+'</h2><p class="wgc-sub">'+o(p.formSub)+'</p><p class="wgc-status" id="wgc-status" role="status" aria-live="polite"></p><form id="wgc-form" novalidate>'+t+'<div class="wgc-check"><input type="checkbox" id="wgc-ebook" name="ebook_opt_in" aria-controls="wgc-ebook-reveal" aria-expanded="false"><label for="wgc-ebook">'+o(p.ebookLabel)+'</label></div><div class="wgc-reveal" id="wgc-ebook-reveal" hidden>'+D(O.email)+'</div><div class="wgc-hp" aria-hidden="true"><label for="wgc-fax">Fax number</label><input id="wgc-fax" name="fax" type="text" tabindex="-1" autocomplete="off"></div><button class="wgc-btn" type="submit" id="wgc-submit">'+o(p.submitLabel)+'</button><a class="wgc-privacy wgc-link" href="'+o(e.privacyUrl)+'" target="_blank" rel="noopener">Privacy Policy</a></form></div>'}function xe(e){return'<div class="wgc-wrap"><div class="wgc-panel" role="alert" aria-live="assertive"><h2 class="wgc-title" id="wgc-dyn-title">Something went wrong</h2><p class="wgc-sub">Your request was not sent. Please try again, or use our <a class="wgc-link" href="'+o(e.fallbackUrl)+'">rental analysis page</a>.</p><button class="wgc-btn" id="wgc-retry" type="button">Try again</button></div></div>'}function ve(e){var t=e.getAttribute("data-endpoint")||R,r=(e.getAttribute("data-mode")||"inline").toLowerCase(),a=(e.getAttribute("data-layout")||"compact").toLowerCase();return{endpoint:t.replace(/\/+$/,""),source:e.getAttribute("data-source")||"Website - wgcassetguide",privacyUrl:e.getAttribute("data-privacy-url")||"https://wgcassetguide.com/privacy",fallbackUrl:e.getAttribute("data-fallback-url")||"https://wgcassetguide.com/analysis",turnstileSiteKey:e.getAttribute("data-turnstile-sitekey")||"",mode:r==="popup"?"popup":"inline",layout:a==="feature"?"feature":"compact",launchLabel:e.getAttribute("data-launch-label")||null}}function ye(e,t,r){var a={source:t.source,submission_id:r};e.dispatchEvent(new CustomEvent("wgc-lead-submitted",{bubbles:!0,composed:!0,detail:a})),window.dispatchEvent(new CustomEvent("wgc-lead-submitted",{detail:a})),Array.isArray(window.dataLayer)&&window.dataLayer.push({event:"wgc_lead_submitted",source:t.source,submission_id:r})}function J(e,t){var r=null;["zip","sqft","bedrooms","email"].forEach(function(a){var n=e.querySelector('[name="'+a+'"]'),i=e.getElementById("wgc-err-"+a),c=t[a]||"";i&&(i.textContent=c),n&&n.setAttribute("aria-invalid",c?"true":"false"),c&&!r&&(r=n||e.querySelector(".wgc-seg [data-value]"))}),r&&typeof r.focus=="function"&&r.focus()}function V(e){if(!e)return;var t=ve(e),r=document.getElementById(we);if(!r||r.shadowRoot)return;var a=Date.now(),n=r.attachShadow({mode:"open"}),i=document.createElement("style");i.textContent=F;var c=document.createElement("div");if(n.appendChild(i),t.mode==="popup"){var f=Z(n,document,c,t.launchLabel);n.appendChild(f.launcher),n.appendChild(f.overlay)}else t.layout==="feature"?n.appendChild($(document,c)):n.appendChild(c);var b=H(t.endpoint);b.refresh().catch(function(){});var w=null,k="",x=!1;function E(g){var u=g.querySelector(".wgc-seg");if(!u)return;var d=Array.prototype.slice.call(u.querySelectorAll("[data-value]"));function s(l){k=l.getAttribute("data-value"),d.forEach(function(h){var m=h===l;h.setAttribute("aria-checked",m?"true":"false"),h.setAttribute("tabindex",m?"0":"-1")})}d.forEach(function(l,h){l.addEventListener("click",function(){s(l),l.focus()}),l.addEventListener("keydown",function(m){var v=-1;if(m.key==="ArrowRight"||m.key==="ArrowDown")v=(h+1)%d.length;else if(m.key==="ArrowLeft"||m.key==="ArrowUp")v=(h-1+d.length)%d.length;else if(m.key==="Home")v=0;else if(m.key==="End")v=d.length-1;else if(m.key===" "||m.key==="Enter"){m.preventDefault(),s(l);return}v>=0&&(m.preventDefault(),s(d[v]),d[v].focus())})})}function A(g){function u(s){var l=g.querySelector('[name="'+s+'"]');return l?l.value:""}var d=g.querySelector("#wgc-ebook");return{zip:u("zip"),sqft:u("sqft"),bedrooms:k,email:u("email"),ebook_opt_in:!!(d&&d.checked)}}function z(g){var u=g.querySelector("#wgc-ebook"),d=g.querySelector("#wgc-ebook-reveal"),s=g.querySelector('[name="email"]');!u||!d||u.addEventListener("change",function(){var l=u.checked;if(l?d.removeAttribute("hidden"):d.setAttribute("hidden",""),u.setAttribute("aria-expanded",l?"true":"false"),!!s)if(s.setAttribute("aria-required",l?"true":"false"),l)s.focus();else{s.value="",s.setAttribute("aria-invalid","false");var h=g.querySelector("#wgc-err-email");h&&(h.textContent="")}})}function I(g,u){c.innerHTML='<div class="wgc-wrap">'+K(g,u)+"</div>";var d=n.getElementById("wgc-cta");d&&d.addEventListener("click",function(){var s=n.getElementById("wgc-thanks");s&&s.removeAttribute("hidden"),d.setAttribute("hidden",""),s&&s.focus()}),f&&f.refocusContent()}function S(){c.innerHTML=be(t);var g=n.getElementById("wgc-form"),u=n.getElementById("wgc-submit"),d=n.getElementById("wgc-status");E(g),z(g),g.addEventListener("focusin",function(){b.ensureFresh()}),g.addEventListener("submit",function(s){if(s.preventDefault(),!x){var l=B(A(g));if(!l.ok){J(n,l.errors),d.textContent=p.fixFields,d.setAttribute("data-kind","error");return}J(n,{});var h=l.data.ebook_opt_in===!0&&!!l.data.email;w||(w=M());var m=U(l.data,{submissionId:w}),v={token:b.get()||"",honeypot:n.getElementById("wgc-fax").value,fillMs:Date.now()-a};x=!0,u.disabled=!0,u.textContent=p.calculating,d.removeAttribute("data-kind"),d.textContent=p.submitting,b.ensureFresh().then(function(y){return v.token=y||"",t.turnstileSiteKey?G(t.turnstileSiteKey,r):""}).then(function(y){return y&&(v.turnstile=y),j(t.endpoint,m,v)}).then(function(y){b.refresh().catch(function(){}),I(y,{ebookOptIn:h,zip:l.data.zip}),h&&ye(r,t,w)}).catch(function(){x=!1,c.innerHTML=xe(t),f&&f.refocusContent();var y=n.getElementById("wgc-retry");y&&y.addEventListener("click",function(){x=!1,S(),f&&f.refocusContent()})})}})}S()}var X=document.currentScript;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",function(){V(X)}):V(X);})();
