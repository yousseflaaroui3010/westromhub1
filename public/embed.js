(()=>{var O=`/* Compiled into the open shadow root (TD-1). System font stack only:\r
   @font-face does not apply inside shadow roots. RTL-ready: logical\r
   properties (margin-inline / inset-inline) instead of left/right. */\r
\r
:host {\r
  all: initial;\r
  display: block;\r
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\r
  color: #1a1a1a;\r
  line-height: 1.45;\r
}\r
\r
.wgc-wrap {\r
  box-sizing: border-box;\r
  min-height: 520px; /* reserved height: no layout shift on load */\r
  max-width: 480px;\r
  padding: 20px;\r
  border: 1px solid #d9d9d9;\r
  border-radius: 8px;\r
  background: #ffffff;\r
}\r
\r
.wgc-wrap *,\r
.wgc-wrap *::before,\r
.wgc-wrap *::after {\r
  box-sizing: border-box;\r
  font-family: inherit;\r
}\r
\r
.wgc-title {\r
  margin: 0 0 4px;\r
  font-size: 20px;\r
  font-weight: 700;\r
}\r
\r
.wgc-sub {\r
  margin: 0 0 16px;\r
  font-size: 14px;\r
  color: #444444;\r
}\r
\r
.wgc-field {\r
  margin-block-end: 12px;\r
}\r
\r
.wgc-row {\r
  display: flex;\r
  gap: 12px;\r
}\r
\r
.wgc-row .wgc-field {\r
  flex: 1 1 0;\r
  min-width: 0;\r
}\r
\r
.wgc-label {\r
  display: block;\r
  margin-block-end: 4px;\r
  font-size: 13px;\r
  font-weight: 600;\r
}\r
\r
.wgc-input {\r
  width: 100%;\r
  padding: 10px 12px;\r
  font-size: 16px; /* >=16px stops iOS Safari zoom-on-focus */\r
  border: 1px solid #8c8c8c;\r
  border-radius: 6px;\r
  background: #ffffff;\r
  color: #1a1a1a;\r
}\r
\r
.wgc-input:focus,\r
.wgc-check input:focus,\r
.wgc-seg-opt:focus,\r
.wgc-btn:focus,\r
.wgc-link:focus,\r
.wgc-launcher:focus {\r
  outline: 3px solid #1a56b0;\r
  outline-offset: 1px;\r
}\r
\r
.wgc-input[aria-invalid="true"] {\r
  border-color: #b3261e;\r
}\r
\r
.wgc-err {\r
  display: block;\r
  margin-block-start: 4px;\r
  font-size: 13px;\r
  color: #b3261e;\r
  min-height: 1em;\r
}\r
\r
/* Segmented single-select (bedrooms) */\r
.wgc-seg {\r
  display: flex;\r
  gap: 8px;\r
}\r
\r
.wgc-seg-opt {\r
  flex: 1 1 0;\r
  min-height: 44px; /* touch target */\r
  padding: 10px 8px;\r
  font-size: 16px;\r
  font-weight: 600;\r
  color: #1a56b0;\r
  background: #ffffff;\r
  border: 1px solid #8c8c8c;\r
  border-radius: 6px;\r
  cursor: pointer;\r
}\r
\r
.wgc-seg-opt[aria-checked="true"] {\r
  color: #ffffff;\r
  background: #1a56b0;\r
  border-color: #1a56b0;\r
}\r
\r
.wgc-check {\r
  display: flex;\r
  gap: 8px;\r
  align-items: flex-start;\r
  margin-block: 14px;\r
}\r
\r
.wgc-check input {\r
  flex: 0 0 auto;\r
  width: 18px;\r
  height: 18px;\r
  margin-block-start: 2px;\r
}\r
\r
.wgc-check label {\r
  font-size: 13px;\r
  color: #333333;\r
}\r
\r
/* Email reveal: shown only after the consent box is checked. Explicit\r
   display rule so the \`hidden\` attribute is honored inside the shadow root. */\r
.wgc-reveal {\r
  margin-block-start: 4px;\r
}\r
\r
.wgc-reveal[hidden] {\r
  display: none;\r
}\r
\r
.wgc-btn {\r
  display: block;\r
  width: 100%;\r
  padding: 12px 16px;\r
  font-size: 16px;\r
  font-weight: 700;\r
  color: #ffffff;\r
  background: #1a56b0;\r
  border: 0;\r
  border-radius: 6px;\r
  cursor: pointer;\r
}\r
\r
.wgc-btn[disabled] {\r
  background: #7a95bd;\r
  cursor: default;\r
}\r
\r
.wgc-fineprint {\r
  margin: 10px 0 0;\r
  font-size: 12px;\r
  color: #555555;\r
  text-align: center;\r
}\r
\r
.wgc-privacy {\r
  display: block;\r
  margin-block-start: 8px;\r
  font-size: 12px;\r
  text-align: center;\r
}\r
\r
.wgc-link {\r
  color: #1a56b0;\r
}\r
\r
.wgc-status {\r
  margin: 0 0 12px;\r
  font-size: 14px;\r
}\r
\r
.wgc-status[data-kind="error"] {\r
  color: #b3261e;\r
}\r
\r
/* Success / result states */\r
.wgc-panel {\r
  min-height: 460px;\r
  display: flex;\r
  flex-direction: column;\r
  justify-content: center;\r
  text-align: center;\r
  gap: 12px;\r
}\r
\r
.wgc-result {\r
  justify-content: flex-start;\r
  padding-block-start: 8px;\r
}\r
\r
.wgc-range {\r
  margin: 4px 0;\r
  font-size: 30px;\r
  font-weight: 800;\r
  color: #1a56b0;\r
}\r
\r
.wgc-range-unit {\r
  font-size: 16px;\r
  font-weight: 600;\r
  color: #444444;\r
}\r
\r
.wgc-comps-heading {\r
  margin: 8px 0 4px;\r
  font-weight: 600;\r
}\r
\r
/* Out-of-area basis line ("Estimate based on N active rentals in {zip}")\r
   shown in place of comps when the number comes from RentCast market stats. */\r
.wgc-basis {\r
  margin: 4px 0 8px;\r
  font-size: 13px;\r
  color: #555555;\r
}\r
\r
.wgc-comps {\r
  list-style: none;\r
  margin: 0 0 8px;\r
  padding: 0;\r
  text-align: start;\r
}\r
\r
.wgc-comp {\r
  display: flex;\r
  justify-content: space-between;\r
  gap: 8px;\r
  padding: 8px 0;\r
  border-block-end: 1px solid #ececec;\r
  font-size: 13px;\r
}\r
\r
.wgc-comp-rent {\r
  font-weight: 700;\r
  white-space: nowrap;\r
}\r
\r
.wgc-ebook-note {\r
  color: #1a7a3c;\r
  font-weight: 600;\r
}\r
\r
.wgc-thanks {\r
  margin-block-start: 8px;\r
}\r
\r
/* Honeypot: visually removed but still in the DOM for naive bots.\r
   display:none is deliberately avoided (some bots skip hidden fields). */\r
.wgc-hp {\r
  position: absolute !important;\r
  inset-inline-start: -9999px !important;\r
  width: 1px;\r
  height: 1px;\r
  overflow: hidden;\r
}\r
\r
/* Popup/modal launch mode (data-mode="popup"). Approved brand chrome,\r
   isolated to this shadow root: navy header (#002045), red CTA matching\r
   .wgc-btn (#b61710), amber "free guide" ribbon (#e8b04b), off-white modal\r
   body (#fbf9f8). The overlay is position:fixed so it covers the viewport\r
   even though #wgc-analysis (the shadow host) is a small inline element --\r
   Shadow DOM does not create a new containing block by itself. */\r
.wgc-launcher {\r
  display: inline-block;\r
  padding: 12px 20px;\r
  font-size: 16px;\r
  font-weight: 700;\r
  color: #ffffff;\r
  background: #b61710;\r
  border: 0;\r
  border-radius: 6px;\r
  cursor: pointer;\r
}\r
\r
.wgc-launcher:hover {\r
  background: #96120c;\r
}\r
\r
.wgc-overlay {\r
  position: fixed;\r
  inset: 0;\r
  z-index: 2147483000;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  padding: 16px;\r
  overflow-y: auto;\r
  background: rgba(0, 0, 0, 0.55);\r
  /* opacity+visibility (not display) so the open transition is real and\r
     the closed overlay is still un-hit-testable and out of the a11y tree. */\r
  opacity: 0;\r
  visibility: hidden;\r
  transition: opacity 0.18s ease, visibility 0s linear 0.18s;\r
}\r
\r
.wgc-overlay.wgc-open {\r
  opacity: 1;\r
  visibility: visible;\r
  transition: opacity 0.18s ease, visibility 0s linear 0s;\r
}\r
\r
@media (prefers-reduced-motion: reduce) {\r
  .wgc-overlay {\r
    transition: none;\r
  }\r
}\r
\r
.wgc-modal {\r
  box-sizing: border-box;\r
  width: 100%;\r
  max-width: 480px;\r
  max-height: 90vh;\r
  overflow-y: auto;\r
  background: #fbf9f8;\r
  border-radius: 10px;\r
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);\r
}\r
\r
.wgc-modal-header {\r
  position: sticky;\r
  inset-block-start: 0;\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  gap: 12px;\r
  padding: 14px 16px;\r
  background: #002045;\r
  border-start-start-radius: 10px;\r
  border-start-end-radius: 10px;\r
}\r
\r
.wgc-modal-ribbon {\r
  font-size: 12px;\r
  font-weight: 700;\r
  color: #1a1200;\r
  background: #e8b04b;\r
  padding: 4px 10px;\r
  border-radius: 999px;\r
  white-space: nowrap;\r
}\r
\r
.wgc-modal-close {\r
  flex: 0 0 auto;\r
  width: 44px;\r
  height: 44px;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  font-size: 22px;\r
  line-height: 1;\r
  color: #ffffff;\r
  background: transparent;\r
  border: 0;\r
  border-radius: 6px;\r
  cursor: pointer;\r
}\r
\r
.wgc-modal-close:hover {\r
  background: rgba(255, 255, 255, 0.15);\r
}\r
\r
.wgc-modal-close:focus {\r
  outline: 3px solid #e8b04b;\r
  outline-offset: 2px;\r
}\r
\r
.wgc-modal-body {\r
  padding: 4px;\r
}\r
\r
/* The reused wgc-wrap card loses its own border/background/sizing inside\r
   the modal -- the dialog panel supplies that chrome instead. */\r
.wgc-modal .wgc-wrap {\r
  border: 0;\r
  background: transparent;\r
  max-width: none;\r
  min-height: 0;\r
}\r
`;var V=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,J=/^\d{5}$/,N=["2","3","4","5+"],z={name:{min:1,max:120},email:{max:254},sqft:{min:300,max:1e4},bedrooms:{options:N}};function X(e){let t=String(e==null?"":e).trim();return t.length>z.email.max||!V.test(t)?null:t}function Q(e){let t=String(e==null?"":e).trim();return J.test(t)?t:null}function ee(e){let t=String(e==null?"":e).trim();if(t==="")return null;let n=Number(t);return!Number.isFinite(n)||!Number.isInteger(n)||n<z.sqft.min||n>z.sqft.max?null:n}function te(e){let t=String(e==null?"":e).trim();return t===""?null:N.indexOf(t)!==-1?t:void 0}function B(e){let t={},n={};return n.zip=Q(e.zip),n.zip===null&&(t.zip="Enter a 5-digit ZIP code."),n.sqft=ee(e.sqft),n.sqft===null&&(t.sqft="Enter square footage between 300 and 10,000."),n.bedrooms=te(e.bedrooms),n.bedrooms===void 0&&(t.bedrooms="Choose 2, 3, 4, or 5+."),n.ebook_opt_in=e.ebook_opt_in===!0,n.ebook_opt_in?(n.email=X(e.email),n.email===null&&(t.email="Enter a valid email address.")):n.email=null,Object.keys(t).length?{ok:!1,errors:t}:{ok:!0,data:n}}var ne="v3-explicit-2026-07-22",R="https://main-production-bf72.up.railway.app/webhook/d043c102d78e";function D(e,t){let n=new AbortController,r=setTimeout(function(){n.abort()},1e4),i=Object.assign({},t,{signal:n.signal});return fetch(e,i).finally(function(){clearTimeout(r)})}function F(e){let t=null,n=0;function r(){return D(e+"/token",{method:"GET"}).then(function(s){if(!s.ok)throw new Error("token fetch failed: "+s.status);return s.text()}).then(function(s){return t=s.trim(),n=Date.now(),t})}function i(){return t&&Date.now()-n<36e5?Promise.resolve(t):r().catch(function(){return t})}return{refresh:r,ensureFresh:i,get:function(){return t}}}function H(){if(typeof crypto.randomUUID=="function")return crypto.randomUUID();let e=crypto.getRandomValues(new Uint8Array(16));e[6]=e[6]&15|64,e[8]=e[8]&63|128;let t=Array.prototype.map.call(e,function(n){return(n+256).toString(16).slice(1)}).join("");return t.slice(0,8)+"-"+t.slice(8,12)+"-"+t.slice(12,16)+"-"+t.slice(16,20)+"-"+t.slice(20)}function M(e,t){var n=e.ebook_opt_in===!0&&!!e.email;return{submission_id:t.submissionId,name:"",email:n?e.email:"",phone:"",zip:e.zip,sqft:e.sqft,bedrooms:e.bedrooms==null?null:e.bedrooms,ebook_opt_in:n,consent:n?{explicit:!0,text_version:ne,ts:new Date().toISOString()}:null}}function P(e,t,n){let r=Object.assign({},t,{token:n.token||"",fax:n.honeypot||"",fill_ms:n.fillMs});return D(e+"/lead",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)}).then(function(i){if(!i.ok)throw new Error("submit failed: "+i.status);return i.json().catch(function(){return{}})})}var w={ebookLabel:'Send me the free guide "How To Hire The Best Property Manager." I agree Westrom Group may email me about my property.',ebookSent:"Your free guide is on its way to your inbox.",receivedTitle:"Request received",receivedBody:"A Westrom specialist will review your property and follow up shortly.",noEstimateTitle:"Estimate not available yet",noEstimateBody:"We could not generate an instant estimate for that ZIP right now. For a full, human-prepared analysis, check the free-guide box and our team will help.",estimateTitle:"Your estimated rent range",compsHeading:"Recent nearby rentals",cta:"Get a free expert review",thanksTitle:"You are all set",thanksBody:"A Westrom specialist will review your property and follow up with a human-prepared analysis."};function p(e){return String(e==null?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function ie(e){return e&&typeof e=="object"&&e.estimate?"estimate":"received"}function I(e){let t=Number(e);return Number.isFinite(t)?"$"+Math.round(t).toLocaleString("en-US"):""}function U(e){return e&&e.ebookOptIn?'<p class="wgc-sub wgc-ebook-note">'+p(w.ebookSent)+"</p>":""}function re(e){let t=[];e.zip!=null&&e.zip!==""&&t.push("ZIP "+p(e.zip)),e.beds!=null&&e.beds!==""&&t.push(p(e.beds)+" bd"),e.sqft!=null&&e.sqft!==""&&t.push(Number(e.sqft).toLocaleString("en-US")+" sqft"),e.ago_days!=null&&e.ago_days!==""&&t.push(p(e.ago_days)+" days ago");let n=I(e.rent);return'<li class="wgc-comp"><span class="wgc-comp-meta">'+t.join(" &middot; ")+"</span>"+(n?'<span class="wgc-comp-rent">'+n+"/mo</span>":"")+"</li>"}function oe(e){let t=!!(e&&e.ebookOptIn),n=t?w.receivedTitle:w.noEstimateTitle,r=t?w.receivedBody:w.noEstimateBody;return'<div class="wgc-panel" role="status" aria-live="assertive"><h2 class="wgc-title" id="wgc-dyn-title">'+p(n)+'</h2><p class="wgc-sub">'+p(r)+"</p>"+U(e)+"</div>"}function ae(e,t){let n=Array.isArray(e.comps)?e.comps.slice(0,3):[];if(n.length)return'<p class="wgc-sub wgc-comps-heading">'+p(w.compsHeading)+'</p><ul class="wgc-comps">'+n.map(re).join("")+"</ul>";let r=e.meta||{},i=Number(r.listings);if(Number.isFinite(i)&&i>0){let s=r.zip||t&&t.zip||"",c=i===1?"active rental":"active rentals",f=s?" in "+s:"";return'<p class="wgc-sub wgc-basis">'+p("Estimate based on "+i.toLocaleString("en-US")+" "+c+f)+"</p>"}return""}function se(e,t){let n=I(e.low),r=I(e.high),i=n&&r?n+" &ndash; "+r:n||r||"",s=t&&t.ebookOptIn?'<button class="wgc-btn" type="button" id="wgc-cta">'+p(w.cta)+'</button><div class="wgc-thanks" id="wgc-thanks" hidden><h3 class="wgc-title">'+p(w.thanksTitle)+'</h3><p class="wgc-sub">'+p(w.thanksBody)+"</p></div>":"";return'<div class="wgc-panel wgc-result" role="status" aria-live="assertive"><h2 class="wgc-title" id="wgc-dyn-title">'+p(w.estimateTitle)+'</h2><p class="wgc-range">'+i+'<span class="wgc-range-unit">/mo</span></p>'+ae(e,t)+U(t)+s+"</div>"}function j(e,t){return ie(e)==="estimate"?se(e.estimate||{},t):oe(t)}var L={defaultLaunchLabel:"Get My Free Rental Analysis",ribbon:"Free guide included",close:"Close"},le="a[href], button, input, select, textarea, [tabindex]";function G(e){var t=Array.prototype.slice.call(e.querySelectorAll(le));return t.filter(function(n){return!(n.hasAttribute("disabled")||n.getAttribute("type")==="hidden"||n.getAttribute("tabindex")==="-1")})}function ce(e,t,n){if(!e.length)return-1;var r=e.indexOf(t);return n?r<=0?e.length-1:r-1:r===-1||r===e.length-1?0:r+1}function W(e,t,n,r){var i=t.createElement("button");i.type="button",i.className="wgc-launcher",i.id="wgc-launcher",i.textContent=r||L.defaultLaunchLabel;var s=t.createElement("div");s.className="wgc-overlay",s.id="wgc-overlay";var c=t.createElement("div");c.className="wgc-modal",c.id="wgc-modal",c.setAttribute("role","dialog"),c.setAttribute("aria-modal","true"),c.setAttribute("aria-labelledby","wgc-dyn-title");var f=t.createElement("div");f.className="wgc-modal-header";var y=t.createElement("span");y.className="wgc-modal-ribbon",y.textContent=L.ribbon;var b=t.createElement("button");b.type="button",b.className="wgc-modal-close",b.id="wgc-modal-close",b.setAttribute("aria-label",L.close),b.textContent="\xD7";var x=t.createElement("div");x.className="wgc-modal-body",x.appendChild(n),f.appendChild(y),f.appendChild(b),c.appendChild(f),c.appendChild(x),s.appendChild(c);var h=!1,k=null,A="";function T(o){if(h){if(o.key==="Escape"||o.key==="Esc"){o.preventDefault(),u();return}if(o.key==="Tab"){o.preventDefault();var a=G(c);if(!a.length)return;var m=ce(a,e.activeElement,o.shiftKey);a[m].focus()}}}function _(o){o.target===s&&u()}function S(){var o=G(c);(o[0]||b).focus()}function d(){h||(h=!0,k=i,s.classList.add("wgc-open"),A=t.body.style.overflow,t.body.style.overflow="hidden",t.addEventListener("keydown",T),s.addEventListener("click",_),S())}function u(){h&&(h=!1,s.classList.remove("wgc-open"),t.body.style.overflow=A,t.removeEventListener("keydown",T),s.removeEventListener("click",_),k&&typeof k.focus=="function"&&k.focus())}function l(){h&&S()}return i.addEventListener("click",d),b.addEventListener("click",u),{launcher:i,overlay:s,dialog:c,open:d,close:u,refocusContent:l}}var de="wgc-analysis",ue=["2","3","4","5+"],q={zip:{name:"zip",label:"ZIP code",type:"text",required:!0,autocomplete:"postal-code",maxlength:5,inputmode:"numeric",placeholder:"e.g. 76052"},sqft:{name:"sqft",label:"Square footage",type:"text",required:!0,maxlength:6,inputmode:"numeric",placeholder:"approximate is fine"},email:{name:"email",label:"Email",type:"email",required:!1,autocomplete:"email",maxlength:254,placeholder:"you@email.com"}};function C(e){return'<div class="wgc-field"><label class="wgc-label" for="wgc-'+e.name+'">'+p(e.label)+'</label><input class="wgc-input" id="wgc-'+e.name+'" name="'+e.name+'" type="'+e.type+'" maxlength="'+e.maxlength+'"'+(e.inputmode?' inputmode="'+e.inputmode+'"':"")+(e.placeholder?' placeholder="'+p(e.placeholder)+'"':"")+(e.autocomplete?' autocomplete="'+e.autocomplete+'"':"")+(e.required?' required aria-required="true"':"")+' aria-describedby="wgc-err-'+e.name+'"><span class="wgc-err" id="wgc-err-'+e.name+'" aria-live="polite"></span></div>'}function pe(){var e=ue.map(function(t,n){return'<button type="button" class="wgc-seg-opt" role="radio" aria-checked="false" data-value="'+p(t)+'" tabindex="'+(n===0?"0":"-1")+'">'+p(t)+"</button>"}).join("");return'<div class="wgc-field"><span class="wgc-label" id="wgc-bedrooms-label">Bedrooms (optional)</span><div class="wgc-seg" role="radiogroup" aria-labelledby="wgc-bedrooms-label" aria-describedby="wgc-err-bedrooms">'+e+'</div><span class="wgc-err" id="wgc-err-bedrooms" aria-live="polite"></span></div>'}function fe(e){var t='<div class="wgc-row">'+C(q.zip)+C(q.sqft)+"</div>"+pe();return'<div class="wgc-wrap"><h2 class="wgc-title" id="wgc-dyn-title">Free Rent Estimate</h2><p class="wgc-sub">Enter your property details for an instant estimated rent range. No email required.</p><p class="wgc-status" id="wgc-status" role="status" aria-live="polite"></p><form id="wgc-form" novalidate>'+t+'<div class="wgc-check"><input type="checkbox" id="wgc-ebook" name="ebook_opt_in" aria-controls="wgc-ebook-reveal" aria-expanded="false"><label for="wgc-ebook">'+p(w.ebookLabel)+'</label></div><div class="wgc-reveal" id="wgc-ebook-reveal" hidden>'+C(q.email)+'</div><div class="wgc-hp" aria-hidden="true"><label for="wgc-fax">Fax number</label><input id="wgc-fax" name="fax" type="text" tabindex="-1" autocomplete="off"></div><button class="wgc-btn" type="submit" id="wgc-submit">Get My Estimate</button><a class="wgc-privacy wgc-link" href="'+p(e.privacyUrl)+'" target="_blank" rel="noopener">Privacy Policy</a></form></div>'}function ge(e){return'<div class="wgc-wrap"><div class="wgc-panel" role="alert" aria-live="assertive"><h2 class="wgc-title" id="wgc-dyn-title">Something went wrong</h2><p class="wgc-sub">Your request was not sent. Please try again, or use our <a class="wgc-link" href="'+p(e.fallbackUrl)+'">rental analysis page</a>.</p><button class="wgc-btn" id="wgc-retry" type="button">Try again</button></div></div>'}function me(e){var t=e.getAttribute("data-endpoint")||R,n=(e.getAttribute("data-mode")||"inline").toLowerCase();return{endpoint:t.replace(/\/+$/,""),source:e.getAttribute("data-source")||"Website - wgcassetguide",privacyUrl:e.getAttribute("data-privacy-url")||"https://wgcassetguide.com/privacy",fallbackUrl:e.getAttribute("data-fallback-url")||"https://wgcassetguide.com/analysis",mode:n==="popup"?"popup":"inline",launchLabel:e.getAttribute("data-launch-label")||null}}function be(e,t,n){var r={source:t.source,submission_id:n};e.dispatchEvent(new CustomEvent("wgc-lead-submitted",{bubbles:!0,composed:!0,detail:r})),window.dispatchEvent(new CustomEvent("wgc-lead-submitted",{detail:r})),Array.isArray(window.dataLayer)&&window.dataLayer.push({event:"wgc_lead_submitted",source:t.source,submission_id:n})}function Z(e,t){var n=null;["zip","sqft","bedrooms","email"].forEach(function(r){var i=e.querySelector('[name="'+r+'"]'),s=e.getElementById("wgc-err-"+r),c=t[r]||"";s&&(s.textContent=c),i&&i.setAttribute("aria-invalid",c?"true":"false"),c&&!n&&(n=i||e.querySelector(".wgc-seg [data-value]"))}),n&&typeof n.focus=="function"&&n.focus()}function K(e){if(!e)return;var t=me(e),n=document.getElementById(de);if(!n||n.shadowRoot)return;var r=Date.now(),i=n.attachShadow({mode:"open"}),s=document.createElement("style");s.textContent=O;var c=document.createElement("div");if(i.appendChild(s),t.mode==="popup"){var f=W(i,document,c,t.launchLabel);i.appendChild(f.launcher),i.appendChild(f.overlay)}else i.appendChild(c);var y=F(t.endpoint);y.refresh().catch(function(){});var b=null,x="",h=!1;function k(d){var u=d.querySelector(".wgc-seg");if(!u)return;var l=Array.prototype.slice.call(u.querySelectorAll("[data-value]"));function o(a){x=a.getAttribute("data-value"),l.forEach(function(m){var g=m===a;m.setAttribute("aria-checked",g?"true":"false"),m.setAttribute("tabindex",g?"0":"-1")})}l.forEach(function(a,m){a.addEventListener("click",function(){o(a),a.focus()}),a.addEventListener("keydown",function(g){var v=-1;if(g.key==="ArrowRight"||g.key==="ArrowDown")v=(m+1)%l.length;else if(g.key==="ArrowLeft"||g.key==="ArrowUp")v=(m-1+l.length)%l.length;else if(g.key==="Home")v=0;else if(g.key==="End")v=l.length-1;else if(g.key===" "||g.key==="Enter"){g.preventDefault(),o(a);return}v>=0&&(g.preventDefault(),o(l[v]),l[v].focus())})})}function A(d){function u(o){var a=d.querySelector('[name="'+o+'"]');return a?a.value:""}var l=d.querySelector("#wgc-ebook");return{zip:u("zip"),sqft:u("sqft"),bedrooms:x,email:u("email"),ebook_opt_in:!!(l&&l.checked)}}function T(d){var u=d.querySelector("#wgc-ebook"),l=d.querySelector("#wgc-ebook-reveal"),o=d.querySelector('[name="email"]');!u||!l||u.addEventListener("change",function(){var a=u.checked;if(a?l.removeAttribute("hidden"):l.setAttribute("hidden",""),u.setAttribute("aria-expanded",a?"true":"false"),!!o)if(o.setAttribute("aria-required",a?"true":"false"),a)o.focus();else{o.value="",o.setAttribute("aria-invalid","false");var m=d.querySelector("#wgc-err-email");m&&(m.textContent="")}})}function _(d,u){c.innerHTML='<div class="wgc-wrap">'+j(d,u)+"</div>";var l=i.getElementById("wgc-cta");l&&l.addEventListener("click",function(){var o=i.getElementById("wgc-thanks");o&&o.removeAttribute("hidden"),l.setAttribute("hidden",""),o&&o.focus()}),f&&f.refocusContent()}function S(){c.innerHTML=fe(t);var d=i.getElementById("wgc-form"),u=i.getElementById("wgc-submit"),l=i.getElementById("wgc-status");k(d),T(d),d.addEventListener("focusin",function(){y.ensureFresh()}),d.addEventListener("submit",function(o){if(o.preventDefault(),!h){var a=B(A(d));if(!a.ok){Z(i,a.errors),l.textContent="Please fix the highlighted fields.",l.setAttribute("data-kind","error");return}Z(i,{});var m=a.data.ebook_opt_in===!0&&!!a.data.email;b||(b=H());var g=M(a.data,{submissionId:b}),v={token:y.get()||"",honeypot:i.getElementById("wgc-fax").value,fillMs:Date.now()-r};h=!0,u.disabled=!0,l.removeAttribute("data-kind"),l.textContent="Getting your estimate\u2026",y.ensureFresh().then(function(E){return v.token=E||"",P(t.endpoint,g,v)}).then(function(E){_(E,{ebookOptIn:m,zip:a.data.zip}),m&&be(n,t,b)}).catch(function(){h=!1,c.innerHTML=ge(t),f&&f.refocusContent();var E=i.getElementById("wgc-retry");E&&E.addEventListener("click",function(){h=!1,S(),f&&f.refocusContent()})})}})}S()}var Y=document.currentScript;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",function(){K(Y)}):K(Y);})();
