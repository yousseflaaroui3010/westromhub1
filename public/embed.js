(()=>{var _=`/* Compiled into the open shadow root (TD-1). System font stack only:
   @font-face does not apply inside shadow roots. RTL-ready: logical
   properties (margin-inline / inset-inline) instead of left/right. */

:host {
  all: initial;
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1a1a1a;
  line-height: 1.45;
}

.wgc-wrap {
  box-sizing: border-box;
  min-height: 520px; /* reserved height: no layout shift on load */
  max-width: 480px;
  padding: 20px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #ffffff;
}

.wgc-wrap *,
.wgc-wrap *::before,
.wgc-wrap *::after {
  box-sizing: border-box;
  font-family: inherit;
}

.wgc-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
}

.wgc-sub {
  margin: 0 0 16px;
  font-size: 14px;
  color: #444444;
}

.wgc-field {
  margin-block-end: 12px;
}

.wgc-row {
  display: flex;
  gap: 12px;
}

.wgc-row .wgc-field {
  flex: 1 1 0;
  min-width: 0;
}

.wgc-label {
  display: block;
  margin-block-end: 4px;
  font-size: 13px;
  font-weight: 600;
}

.wgc-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 16px; /* >=16px stops iOS Safari zoom-on-focus */
  border: 1px solid #8c8c8c;
  border-radius: 6px;
  background: #ffffff;
  color: #1a1a1a;
}

.wgc-input:focus,
.wgc-check input:focus,
.wgc-seg-opt:focus,
.wgc-btn:focus,
.wgc-link:focus {
  outline: 3px solid #1a56b0;
  outline-offset: 1px;
}

.wgc-input[aria-invalid="true"] {
  border-color: #b3261e;
}

.wgc-err {
  display: block;
  margin-block-start: 4px;
  font-size: 13px;
  color: #b3261e;
  min-height: 1em;
}

/* Segmented single-select (bedrooms) */
.wgc-seg {
  display: flex;
  gap: 8px;
}

.wgc-seg-opt {
  flex: 1 1 0;
  min-height: 44px; /* touch target */
  padding: 10px 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1a56b0;
  background: #ffffff;
  border: 1px solid #8c8c8c;
  border-radius: 6px;
  cursor: pointer;
}

.wgc-seg-opt[aria-checked="true"] {
  color: #ffffff;
  background: #1a56b0;
  border-color: #1a56b0;
}

.wgc-check {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-block: 14px;
}

.wgc-check input {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  margin-block-start: 2px;
}

.wgc-check label {
  font-size: 13px;
  color: #333333;
}

.wgc-btn {
  display: block;
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  background: #1a56b0;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.wgc-btn[disabled] {
  background: #7a95bd;
  cursor: default;
}

.wgc-fineprint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #555555;
  text-align: center;
}

.wgc-privacy {
  display: block;
  margin-block-start: 8px;
  font-size: 12px;
  text-align: center;
}

.wgc-link {
  color: #1a56b0;
}

.wgc-status {
  margin: 0 0 12px;
  font-size: 14px;
}

.wgc-status[data-kind="error"] {
  color: #b3261e;
}

/* Success / result states */
.wgc-panel {
  min-height: 460px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  gap: 12px;
}

.wgc-result {
  justify-content: flex-start;
  padding-block-start: 8px;
}

.wgc-range {
  margin: 4px 0;
  font-size: 30px;
  font-weight: 800;
  color: #1a56b0;
}

.wgc-range-unit {
  font-size: 16px;
  font-weight: 600;
  color: #444444;
}

.wgc-comps-heading {
  margin: 8px 0 4px;
  font-weight: 600;
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
`;var G=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,Y=/^\d{5}$/,I=["2","3","4","5+"],h={name:{min:1,max:120},email:{max:254},sqft:{min:300,max:1e4},bedrooms:{options:I}};function Z(e){let t=String(e==null?"":e).trim();return t.length<h.name.min||t.length>h.name.max?null:t}function $(e){let t=String(e==null?"":e).trim();return t.length>h.email.max||!G.test(t)?null:t}function K(e){let t=String(e==null?"":e).trim(),n=t.replace(/\D/g,"");return t.startsWith("+")&&!t.startsWith("+1")?null:t.startsWith("+")?n.length===11?"+"+n:null:n.length===10?"+1"+n:n.length===11&&n[0]==="1"?"+"+n:null}function V(e){let t=String(e==null?"":e).trim();return Y.test(t)?t:null}function J(e){let t=String(e==null?"":e).trim();if(t==="")return null;let n=Number(t);return!Number.isFinite(n)||!Number.isInteger(n)||n<h.sqft.min||n>h.sqft.max?null:n}function X(e){let t=String(e==null?"":e).trim();return t===""?null:I.indexOf(t)!==-1?t:void 0}function q(e){let t={},n={};return n.name=Z(e.name),n.name===null&&(t.name="Enter your name."),n.email=$(e.email),n.email===null&&(t.email="Enter a valid email address."),n.phone=K(e.phone),n.phone===null&&(t.phone="Enter a valid US phone number (10 digits)."),n.zip=V(e.zip),n.zip===null&&(t.zip="Enter a 5-digit ZIP code."),n.sqft=J(e.sqft),n.sqft===null&&(t.sqft="Enter square footage between 300 and 10,000."),n.bedrooms=X(e.bedrooms),n.bedrooms===void 0&&(t.bedrooms="Choose 2, 3, 4, or 5+."),Object.keys(t).length?{ok:!1,errors:t}:{ok:!0,data:n}}var Q="v2-2026-07-16",z="https://main-production-bf72.up.railway.app/webhook/d043c102d78e";function O(e,t){let n=new AbortController,i=setTimeout(function(){n.abort()},1e4),o=Object.assign({},t,{signal:n.signal});return fetch(e,o).finally(function(){clearTimeout(i)})}function L(e){let t=null,n=0;function i(){return O(e+"/token",{method:"GET"}).then(function(l){if(!l.ok)throw new Error("token fetch failed: "+l.status);return l.text()}).then(function(l){return t=l.trim(),n=Date.now(),t})}function o(){return t&&Date.now()-n<36e5?Promise.resolve(t):i().catch(function(){return t})}return{refresh:i,ensureFresh:o,get:function(){return t}}}function B(){if(typeof crypto.randomUUID=="function")return crypto.randomUUID();let e=crypto.getRandomValues(new Uint8Array(16));e[6]=e[6]&15|64,e[8]=e[8]&63|128;let t=Array.prototype.map.call(e,function(n){return(n+256).toString(16).slice(1)}).join("");return t.slice(0,8)+"-"+t.slice(8,12)+"-"+t.slice(12,16)+"-"+t.slice(16,20)+"-"+t.slice(20)}function H(e,t){return{submission_id:t.submissionId,name:e.name,email:e.email,phone:e.phone,zip:e.zip,sqft:e.sqft,bedrooms:e.bedrooms==null?null:e.bedrooms,ebook_opt_in:e.ebook_opt_in===!0,consent:{implied:!0,text_version:Q,ts:new Date().toISOString()}}}function P(e,t,n){let i=Object.assign({},t,{token:n.token||"",company:n.honeypot||"",fill_ms:n.fillMs});return O(e+"/lead",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)}).then(function(o){if(!o.ok)throw new Error("submit failed: "+o.status);return o.json().catch(function(){return{}})})}var p={finePrint:"By requesting your analysis, you agree Westrom Group may contact you about your property.",ebookLabel:"Also send me the free guide: How to Hire the Best Property Manager for You",ebookSent:"Your free guide is on its way to your inbox.",receivedTitle:"Request received",receivedBody:"Your analysis will be prepared by the Westrom team. We will be in touch shortly.",estimateTitle:"Your estimated rent range",compsHeading:"Recent nearby rentals",cta:"Get a free expert review",thanksTitle:"You are all set",thanksBody:"A Westrom specialist will review your property and follow up with a human-prepared analysis."};function r(e){return String(e==null?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function ee(e){return e&&typeof e=="object"&&e.estimate?"estimate":"received"}function S(e){let t=Number(e);return Number.isFinite(t)?"$"+Math.round(t).toLocaleString("en-US"):""}function R(e){return e&&e.ebookOptIn?'<p class="wgc-sub wgc-ebook-note">'+r(p.ebookSent)+"</p>":""}function te(e){let t=[];e.zip!=null&&e.zip!==""&&t.push("ZIP "+r(e.zip)),e.beds!=null&&e.beds!==""&&t.push(r(e.beds)+" bd"),e.sqft!=null&&e.sqft!==""&&t.push(Number(e.sqft).toLocaleString("en-US")+" sqft"),e.ago_days!=null&&e.ago_days!==""&&t.push(r(e.ago_days)+" days ago");let n=S(e.rent);return'<li class="wgc-comp"><span class="wgc-comp-meta">'+t.join(" &middot; ")+"</span>"+(n?'<span class="wgc-comp-rent">'+n+"/mo</span>":"")+"</li>"}function ne(e){return'<div class="wgc-panel" role="status" aria-live="assertive"><h2 class="wgc-title">'+r(p.receivedTitle)+'</h2><p class="wgc-sub">'+r(p.receivedBody)+"</p>"+R(e)+"</div>"}function oe(e,t){let n=S(e.low),i=S(e.high),o=n&&i?n+" &ndash; "+i:n||i||"",l=Array.isArray(e.comps)?e.comps.slice(0,3):[],g=l.length?'<p class="wgc-sub wgc-comps-heading">'+r(p.compsHeading)+'</p><ul class="wgc-comps">'+l.map(te).join("")+"</ul>":"";return'<div class="wgc-panel wgc-result" role="status" aria-live="assertive"><h2 class="wgc-title">'+r(p.estimateTitle)+'</h2><p class="wgc-range">'+o+'<span class="wgc-range-unit">/mo</span></p>'+g+R(t)+'<button class="wgc-btn" type="button" id="wgc-cta">'+r(p.cta)+'</button><div class="wgc-thanks" id="wgc-thanks" hidden><h3 class="wgc-title">'+r(p.thanksTitle)+'</h3><p class="wgc-sub">'+r(p.thanksBody)+"</p></div></div>"}function D(e,t){return ee(e)==="estimate"?oe(e.estimate||{},t):ne(t)}var re="wgc-analysis",ie=["2","3","4","5+"],y=[{name:"name",label:"Name",type:"text",required:!0,autocomplete:"name",maxlength:120,half:!1},{name:"email",label:"Email",type:"email",required:!0,autocomplete:"email",maxlength:254,half:!1},{name:"phone",label:"Phone",type:"tel",required:!0,autocomplete:"tel",maxlength:20,half:!1},{name:"zip",label:"ZIP code",type:"text",required:!0,autocomplete:"postal-code",maxlength:5,half:!0,inputmode:"numeric"},{name:"sqft",label:"Square footage",type:"text",required:!0,maxlength:6,half:!0,inputmode:"numeric",placeholder:"approximate is fine"}];function x(e){return'<div class="wgc-field"><label class="wgc-label" for="wgc-'+e.name+'">'+r(e.label)+'</label><input class="wgc-input" id="wgc-'+e.name+'" name="'+e.name+'" type="'+e.type+'" maxlength="'+e.maxlength+'"'+(e.inputmode?' inputmode="'+e.inputmode+'"':"")+(e.placeholder?' placeholder="'+r(e.placeholder)+'"':"")+(e.autocomplete?' autocomplete="'+e.autocomplete+'"':"")+(e.required?' required aria-required="true"':"")+' aria-describedby="wgc-err-'+e.name+'"><span class="wgc-err" id="wgc-err-'+e.name+'" aria-live="polite"></span></div>'}function ae(){var e=ie.map(function(t,n){return'<button type="button" class="wgc-seg-opt" role="radio" aria-checked="false" data-value="'+r(t)+'" tabindex="'+(n===0?"0":"-1")+'">'+r(t)+"</button>"}).join("");return'<div class="wgc-field"><span class="wgc-label" id="wgc-bedrooms-label">Bedrooms (optional)</span><div class="wgc-seg" role="radiogroup" aria-labelledby="wgc-bedrooms-label" aria-describedby="wgc-err-bedrooms">'+e+'</div><span class="wgc-err" id="wgc-err-bedrooms" aria-live="polite"></span></div>'}function se(e){var t=x(y[0])+x(y[1])+x(y[2])+'<div class="wgc-row">'+x(y[3])+x(y[4])+"</div>"+ae();return'<div class="wgc-wrap"><h2 class="wgc-title">Free Rental Analysis</h2><p class="wgc-sub">Tell us about your property and the Westrom team will prepare your analysis.</p><p class="wgc-status" id="wgc-status" role="status" aria-live="polite"></p><form id="wgc-form" novalidate>'+t+'<div class="wgc-check"><input type="checkbox" id="wgc-ebook" name="ebook_opt_in"><label for="wgc-ebook">'+r(p.ebookLabel)+'</label></div><div class="wgc-hp" aria-hidden="true"><label for="wgc-company">Company</label><input id="wgc-company" name="company" type="text" tabindex="-1" autocomplete="off"></div><button class="wgc-btn" type="submit" id="wgc-submit">Get My Free Analysis</button><p class="wgc-fineprint">'+r(p.finePrint)+'</p><a class="wgc-privacy wgc-link" href="'+r(e.privacyUrl)+'" target="_blank" rel="noopener">Privacy Policy</a></form></div>'}function le(e){return'<div class="wgc-wrap"><div class="wgc-panel" role="alert" aria-live="assertive"><h2 class="wgc-title">Something went wrong</h2><p class="wgc-sub">Your request was not sent. Please try again, or use our <a class="wgc-link" href="'+r(e.fallbackUrl)+'">rental analysis page</a>.</p><button class="wgc-btn" id="wgc-retry" type="button">Try again</button></div></div>'}function ce(e){var t=e.getAttribute("data-endpoint")||z;return{endpoint:t.replace(/\/+$/,""),source:e.getAttribute("data-source")||"Website - wgcassetguide",privacyUrl:e.getAttribute("data-privacy-url")||"https://wgcassetguide.com/privacy",fallbackUrl:e.getAttribute("data-fallback-url")||"https://wgcassetguide.com/analysis"}}function ue(e,t,n){var i={source:t.source,submission_id:n};e.dispatchEvent(new CustomEvent("wgc-lead-submitted",{bubbles:!0,composed:!0,detail:i})),window.dispatchEvent(new CustomEvent("wgc-lead-submitted",{detail:i})),Array.isArray(window.dataLayer)&&window.dataLayer.push({event:"wgc_lead_submitted",source:t.source,submission_id:n})}function M(e,t){var n=null;["name","email","phone","zip","sqft","bedrooms"].forEach(function(i){var o=e.querySelector('[name="'+i+'"]'),l=e.getElementById("wgc-err-"+i),g=t[i]||"";l&&(l.textContent=g),o&&o.setAttribute("aria-invalid",g?"true":"false"),g&&!n&&(n=o||e.querySelector(".wgc-seg [data-value]"))}),n&&typeof n.focus=="function"&&n.focus()}function U(e){if(!e)return;var t=ce(e),n=document.getElementById(re);if(!n||n.shadowRoot)return;var i=Date.now(),o=n.attachShadow({mode:"open"}),l=document.createElement("style");l.textContent=_;var g=document.createElement("div");o.appendChild(l),o.appendChild(g);var v=L(t.endpoint);v.refresh().catch(function(){});var k=null,A="",E=!1;function F(f){var d=f.querySelector(".wgc-seg");if(!d)return;var a=Array.prototype.slice.call(d.querySelectorAll("[data-value]"));function c(u){A=u.getAttribute("data-value"),a.forEach(function(b){var s=b===u;b.setAttribute("aria-checked",s?"true":"false"),b.setAttribute("tabindex",s?"0":"-1")})}a.forEach(function(u,b){u.addEventListener("click",function(){c(u),u.focus()}),u.addEventListener("keydown",function(s){var m=-1;if(s.key==="ArrowRight"||s.key==="ArrowDown")m=(b+1)%a.length;else if(s.key==="ArrowLeft"||s.key==="ArrowUp")m=(b-1+a.length)%a.length;else if(s.key==="Home")m=0;else if(s.key==="End")m=a.length-1;else if(s.key===" "||s.key==="Enter"){s.preventDefault(),c(u);return}m>=0&&(s.preventDefault(),c(a[m]),a[m].focus())})})}function N(f){function d(a){var c=f.querySelector('[name="'+a+'"]');return c?c.value:""}return{name:d("name"),email:d("email"),phone:d("phone"),zip:d("zip"),sqft:d("sqft"),bedrooms:A}}function j(f,d){g.innerHTML='<div class="wgc-wrap">'+D(f,{ebookOptIn:d})+"</div>";var a=o.getElementById("wgc-cta");a&&a.addEventListener("click",function(){var c=o.getElementById("wgc-thanks");c&&c.removeAttribute("hidden"),a.setAttribute("hidden",""),c&&c.focus()})}function T(){g.innerHTML=se(t);var f=o.getElementById("wgc-form"),d=o.getElementById("wgc-submit"),a=o.getElementById("wgc-status");F(f),f.addEventListener("focusin",function(){v.ensureFresh()}),f.addEventListener("submit",function(c){if(c.preventDefault(),!E){var u=q(N(f));if(!u.ok){M(o,u.errors),a.textContent="Please fix the highlighted fields.",a.setAttribute("data-kind","error");return}M(o,{});var b=o.getElementById("wgc-ebook").checked;u.data.ebook_opt_in=b,k||(k=B());var s=H(u.data,{submissionId:k}),m={token:v.get()||"",honeypot:o.getElementById("wgc-company").value,fillMs:Date.now()-i};E=!0,d.disabled=!0,a.removeAttribute("data-kind"),a.textContent="Sending your request\u2026",v.ensureFresh().then(function(w){return m.token=w||"",P(t.endpoint,s,m)}).then(function(w){j(w,b),ue(n,t,k)}).catch(function(){E=!1,g.innerHTML=le(t);var w=o.getElementById("wgc-retry");w&&w.addEventListener("click",function(){E=!1,T()})})}})}T()}var C=document.currentScript;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",function(){U(C)}):U(C);})();
