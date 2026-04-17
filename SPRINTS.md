# WESTROM OWNER ADVISORY HUB — SPRINT PLAN

**Project:** Lumina (Westrom Hub)
**Sprint Goal:** Lighthouse ≥90 (Performance, Accessibility, SEO, Best Practices) + Mobile-First Production Readiness
**Duration:** 2 weeks (10 working days) | 1 developer
**Branch:** `feature/E001-seo-a11y-performance`
**Total Stories:** 27 (21 core + 6 mobile-first)

---

## EPIC E001 — Favicon & Brand Identity in Browser

**Goal:** Professional browser presence (tabs, bookmarks, home screens, search results)
**Lighthouse Target:** Best Practices, SEO

### US-001: Generate favicon assets from logo.svg

**As a** site visitor, **I want** to see the Westrom logo as the browser tab icon **so that** I can identify the tab among many.

**Acceptance Criteria:**
- [ ] `public/favicon.svg` exists, cropped/simplified from `logo.svg`
- [ ] `public/favicon.ico` exists (32x32 + 16x16 multi-resolution)
- [ ] `public/apple-touch-icon.png` exists at 180x180 with `#002045` background
- [ ] `public/favicon-192.png` and `favicon-512.png` exist for web manifest
- [ ] All files render legibly at their target sizes

**Planning for Failure:**
- Asset generation tools (realfavicongenerator.net, sharp-cli) may produce wrong aspect ratios
- ICO file may not contain both 16x16 and 32x32 (Safari fallback requirement)
- Mitigation: Verify with `identify` CLI tool or visual manual check in browser

**Design & UI Components:**
- Use brand primary color `#002045` for apple-touch-icon background
- Ensure SVG has correct `viewBox` (no external references)
- File sizes: favicon.svg <2KB, .ico <5KB, PNGs <20KB each

**Files to Touch:** `public/` (new assets)
**Risk:** Low
**Effort:** 1 day

---

### US-002: Add favicon references and theme-color meta to index.html

**As a** site visitor, **I want** my browser to display the favicon and brand color **so that** the site feels polished.

**Acceptance Criteria:**
- [ ] `index.html` has `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`
- [ ] `index.html` has `<link rel="icon" href="/favicon.ico" sizes="32x32">`
- [ ] `index.html` has `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- [ ] `index.html` has `<meta name="theme-color" content="#002045">`
- [ ] `index.html` has `<link rel="manifest" href="/manifest.json">`
- [ ] Lighthouse Best Practices audit passes

**Planning for Failure:**
- Favicon path misconfiguration (relative vs absolute)
- Manifest not served with correct MIME type
- Mitigation: Test with Lighthouse audit, Chrome DevTools Application tab

**SEO:**
- theme-color affects browser UI (subtle SEO signal but improves perceived quality)
- Apple-touch-icon enables proper PWA presentation on iOS home screen

**Files to Touch:** `index.html`
**Risk:** Low
**Depends on:** US-001

---

### US-003: Create web app manifest (manifest.json)

**As a** mobile user, **I want** the site to be installable as a PWA-lite **so that** I can access it from my home screen.

**Acceptance Criteria:**
- [ ] `public/manifest.json` has `name`, `short_name`, `start_url`, `display`, `theme_color`, `background_color`, `icons`
- [ ] `name` = "Westrom Owner Advisory Hub"
- [ ] `short_name` = "Westrom Hub"
- [ ] `theme_color` = "#002045", `background_color` = "#fbf9f8"
- [ ] `display` = "standalone"
- [ ] Icons reference 192px and 512px files with correct purposes
- [ ] Manifest passes Lighthouse PWA check (no errors)

**Planning for Failure:**
- Missing icon sizes cause install prompt to fail silently
- Incorrect MIME types for icon files
- Mitigation: Use Chrome DevTools Application → Manifest tab to debug

**Design & UI Components:**
- Use existing logo colors and dimensions
- Ensure background color matches `--color-background` from design tokens

**SEO:**
- Manifest with valid icons improves crawlability signals for Google

**Files to Touch:** `public/manifest.json` (new)
**Risk:** Low
**Depends on:** US-001

---

## EPIC E002 — SEO Foundation

**Goal:** Discoverable, correctly indexed, rich social previews
**Lighthouse Target:** SEO

### US-004: Add canonical URL, robots meta, absolute OG/Twitter images

**As a** search engine crawler, **I want** canonical URLs and robots directives **so that** duplicate indexing is prevented.

**Acceptance Criteria:**
- [ ] `index.html` has `<link rel="canonical" href="https://westromhub.com/">`
- [ ] `index.html` has `<meta name="robots" content="index, follow">`
- [ ] `og:image` changed from `/logo.png` to `https://westromhub.com/logo.png` (1200×630px)
- [ ] `twitter:image` is absolute URL, 2:1 aspect ratio
- [ ] `og:url` meta added with `https://westromhub.com/`
- [ ] Lighthouse SEO audit passes

**Mobile Acceptance Criteria:**
- [ ] `og:image` renders correctly in iMessage, WhatsApp, Facebook in-app browser link previews

**Planning for Failure:**
- Image URLs point to non-existent paths (test with Open Graph debuggers)
- Relative URLs cause SEO penalty
- Mitigation: Use facebook.com/sharer/sharer.php to test social previews

**SEO:**
- Canonical prevents duplicate content penalties
- Absolute image URLs ensure social crawlers can fetch previews
- Robots meta signals indexing intent

**Files to Touch:** `index.html`
**Risk:** Low

---

### US-005: Per-route document.title and meta description updates

**As a** user sharing `/taxes` or `/insurance` link, **I want** meaningful page titles and descriptions **so that** the shared link context is clear.

**Acceptance Criteria:**
- [ ] `/` sets `document.title` to "Westrom Owner Advisory Hub | Property Tax & Insurance Tools"
- [ ] `/taxes` sets `document.title` to "Property Tax Hub | Westrom Owner Advisory Hub"
- [ ] `/insurance` sets `document.title` to "Insurance Hub | Westrom Owner Advisory Hub"
- [ ] Each route updates `<meta name="description">` dynamically
- [ ] Title changes visible in browser tab when navigating
- [ ] No external dependencies added (react-helmet-async not needed)

**Planning for Failure:**
- useEffect timing — title updates after render (visible flicker)
- Meta description not updated due to selector mismatch
- Mitigation: Verify via Lighthouse, check browser DevTools

**SEO:**
- Per-route titles improve CTR from search results
- Meta descriptions are critical for rich snippets

**Files to Touch:** `src/App.tsx`
**Risk:** Low

---

### US-006: Add JSON-LD Organization structured data

**As a** search engine, **I want** structured data **so that** Westrom appears with a Knowledge Panel.

**Acceptance Criteria:**
- [ ] `index.html` has `<script type="application/ld+json">` with Organization schema
- [ ] Includes: `@context`, `@type`, `name`, `url`, `logo`, `contactPoint`, `sameAs`
- [ ] Name = "Westrom Group", URL = "https://westromgroup.com"
- [ ] Logo URL is absolute, points to actual image
- [ ] Contact email = "info@westromgroup.com"
- [ ] sameAs includes Facebook, Twitter, Zillow from PublicFooter
- [ ] Passes Google Rich Results Test

**Planning for Failure:**
- Invalid JSON-LD syntax breaks parsing (use validator.schema.org)
- URLs must be exact and accessible
- Mitigation: Test with Google's Structured Data Testing Tool

**SEO:**
- Structured data enables Knowledge Panels, rich search results
- Increases credibility and CTR

**Files to Touch:** `index.html`
**Risk:** Low

---

### US-007: Add sitemap.xml and robots.txt

**As a** search engine crawler, **I want** sitemap and robots directives **so that** discovery and crawl budgets are optimized.

**Acceptance Criteria:**
- [ ] `public/sitemap.xml` exists with entries for `/`, `/taxes`, `/insurance`
- [ ] Each entry has `<lastmod>`, `<changefreq>`, `<priority>`
- [ ] `/` priority 1.0, `/taxes` and `/insurance` priority 0.8
- [ ] `changefreq` = "monthly"
- [ ] `lastmod` = current date YYYY-MM-DD
- [ ] `public/robots.txt` exists with `User-agent: *`, `Allow: /`, `Sitemap: https://westromhub.com/sitemap.xml`
- [ ] Both files accessible at correct URLs after deployment
- [ ] Lighthouse SEO passes "robots.txt is valid"

**Planning for Failure:**
- XML encoding issues in sitemap
- File not served (wrong MIME type or nginx config)
- Mitigation: Verify with `curl https://westromhub.com/robots.txt`

**SEO:**
- Sitemaps ensure all pages are discovered
- Robots.txt directs crawler efficiency

**Files to Touch:** `public/sitemap.xml`, `public/robots.txt` (new)
**Risk:** Low

---

## EPIC E003 — Accessibility (WCAG 2.1 AA)

**Goal:** Remove all programmatic barriers; WCAG 2.1 AA compliant; keyboard + screen reader navigable
**Lighthouse Target:** Accessibility (≥95)

### US-008: Add skip-navigation link

**As a** keyboard user, **I want** to bypass header navigation **so that** I reach main content faster.

**Acceptance Criteria:**
- [ ] First focusable element is a "Skip to main content" link
- [ ] Link is visually hidden by default, visible on `:focus`
- [ ] Link `href="#main-content"`, `<main id="main-content" tabIndex={-1}>`
- [ ] Tab on page load focuses skip link first
- [ ] Activating link moves focus to `<main>`
- [ ] High-contrast style on focus (2px solid ring)

**Mobile Acceptance Criteria:**
- [ ] Skip link remains accessible on mobile (not hidden by mobile menu)
- [ ] Mobile menu button `min-h-[44px] min-w-[44px]` (currently ~40px — **FAILS**)
- [ ] When mobile drawer is open, `body` scroll is locked

**Planning for Failure:**
- Skip link visually hidden but not reachable by keyboard (CSS `display: none` instead of left: -9999px)
- Focus not moving to main (missing `tabIndex={-1}`)
- Mitigation: Test with Tab key, verify with accessibility auditor

**Accessibility:**
- WCAG 2.4.1 Bypass Blocks (Level A)
- Critical for keyboard and screen reader users

**Files to Touch:** `src/App.tsx`, `src/index.css`
**Risk:** Low

---

### US-009: Fix aria-expanded on mobile menu toggle

**As a** screen reader user, **I want** menu state announced **so that** I know if the menu is open or closed.

**Acceptance Criteria:**
- [ ] Mobile menu button has `aria-expanded={isMobileMenuOpen}`
- [ ] `aria-label` is dynamic: "Open menu" when closed, "Close menu" when open
- [ ] Screen reader announces expanded/collapsed state on focus

**Mobile Acceptance Criteria:**
- [ ] Mobile drawer focus trap prevents Tab escaping to background content
- [ ] Escape key closes drawer and returns focus to toggle button

**Planning for Failure:**
- `aria-expanded` always true (not toggled with state)
- Label not updating dynamically
- Mitigation: Test with screen reader (NVDA, JAWS, or VoiceOver)

**Accessibility:**
- WCAG 4.1.2 Name, Role, Value (Level A)

**Files to Touch:** `src/components/PublicHeader.tsx` (lines 62–65)
**Risk:** Low
**Depends on:** US-008

---

### US-010: Add aria-label and landmark roles

**As a** screen reader user, **I want** clear button labels and page landmarks **so that** I understand navigation structure.

**Acceptance Criteria:**
- [ ] Logo button has `aria-label="Go to homepage"`
- [ ] Desktop nav has `aria-label="Main navigation"`
- [ ] Mobile nav has `aria-label="Mobile navigation"`
- [ ] `<main>` has `role="main"` (explicit for older AT)
- [ ] `<footer>` has `aria-label="Site footer"`
- [ ] Lighthouse accessibility shows no landmark/label warnings

**Planning for Failure:**
- Labels missing on some interactive elements
- Landmark roles not properly nested
- Mitigation: Run Lighthouse accessibility audit, test with screen reader

**Accessibility:**
- WCAG 1.3.1 Info and Relationships (Level A)
- WCAG 2.4.1 Bypass Blocks (Level A)

**Files to Touch:** `src/components/PublicHeader.tsx`, `src/components/PublicFooter.tsx`, `src/App.tsx`
**Risk:** Low

---

### US-011: Add aria-describedby to HomeView pathway cards

**As a** screen reader user, **I want** card descriptions to be associated with buttons **so that** I understand each option fully.

**Acceptance Criteria:**
- [ ] "Property Taxes" button has `aria-label="Enter Property Tax Hub"` and `aria-describedby="tax-card-desc"`
- [ ] Description paragraph has `id="tax-card-desc"`
- [ ] "Insurance" button has `aria-label="Enter Insurance Hub"` and `aria-describedby="insurance-card-desc"`
- [ ] Screen reader announces button + full description when focused

**Planning for Failure:**
- IDs mismatched between aria-describedby and id attribute
- Descriptions not associated properly
- Mitigation: Test with VoiceOver or NVDA, verify in Lighthouse

**Accessibility:**
- WCAG 1.3.1 Info and Relationships (Level A)

**Files to Touch:** `src/components/HomeView.tsx` (lines 41–75)
**Risk:** Low

---

### US-012: Mobile drawer focus trap and keyboard management

**As a** keyboard user navigating mobile menu, **I want** focus to remain within the drawer **so that** I don't accidentally interact with hidden content.

**Acceptance Criteria:**
- [ ] When drawer opens, focus moves to first interactive element inside drawer
- [ ] Tab cycles only within drawer (focus trap)
- [ ] Shift+Tab cycles backward within drawer
- [ ] Escape key closes drawer and returns focus to toggle button
- [ ] No focus escapes to content behind open drawer
- [ ] Tested on Chrome, Firefox, Safari (desktop and mobile)

**Mobile Acceptance Criteria:**
- [ ] No focus trap issues when drawer has only "Email Us" link (when `currentView === 'home'`)

**Planning for Failure:**
- Focus trap implementation causes keyboard lag (expensive selector queries on every keystroke)
- Escape handler conflicts with other event listeners
- Mitigation: Use a lightweight focus-trap library (focus-trap npm) or test carefully for edge cases

**Accessibility:**
- WCAG 2.1.2 Keyboard (Level A)

**Files to Touch:** `src/components/PublicHeader.tsx`
**Risk:** Medium (careful keyboard event handling needed)
**Depends on:** US-009

---

### US-013: Focus-visible ring styles and noscript fallback

**As a** keyboard user, **I want** to see clear focus indicators **so that** I know where I am on the page.

**Acceptance Criteria:**
- [ ] All interactive elements show `:focus-visible` ring on keyboard navigation
- [ ] Ring is 2px solid `#002045` with 2px offset
- [ ] `outline-none` Tailwind classes removed or overridden (7+ form inputs in TaxAnalysis)
- [ ] `<noscript>` block in `<body>` displays: "This site requires JavaScript to run. Please enable JavaScript."
- [ ] Noscript styling is centered, large, readable
- [ ] Lighthouse accessibility shows no focus issues

**Mobile Acceptance Criteria:**
- [ ] Hero `blur-[120px]` elements do not animate (test with `prefers-reduced-motion: reduce`)
- [ ] All `animate-pulse`, `animate-spin`, `animate-ping` stop under `prefers-reduced-motion`

**Planning for Failure:**
- `outline-none` still suppresses focus ring (specificity issue)
- Noscript block broken by invalid HTML
- Reduced-motion not respected (animations continue)
- Mitigation: Use !important or verify specificity, validate HTML, test with DevTools accessibility inspector

**Accessibility:**
- WCAG 2.4.7 Focus Visible (Level AA)
- WCAG 2.5.4 Motion from Interactions (Level A)

**Design & UI Components:**
- Focus ring uses brand primary color
- Consistent outline across all elements
- Respects user motion preferences

**Files to Touch:** `src/index.css`, `index.html`
**Risk:** Medium (focus-visible may conflict with existing outline-none classes)

---

## EPIC E004 — Resilience & Error States

**Goal:** Graceful error handling, no blank screens, user-friendly recovery paths
**Lighthouse Target:** Best Practices

### US-014: Add 404 Not Found route

**As a** user navigating to undefined URL, **I want** a clear error message and path home **so that** I can recover without confusion.

**Acceptance Criteria:**
- [ ] Undefined routes render `NotFoundView` component
- [ ] 404 page displays clear heading, explanation, "Go Home" button
- [ ] 404 page uses existing header and footer (consistent layout)
- [ ] `document.title` set to "Page Not Found | Westrom Owner Advisory Hub"
- [ ] Uses catch-all route: `<Route path="*" element={<NotFoundView />} />`
- [ ] Button navigates to `/`

**Planning for Failure:**
- Catch-all route defined before specific routes (wrong priority)
- 404 page adds unnecessary complexity, breaks layout consistency
- Mitigation: Place catch-all as last route in Routes, test with invalid path

**Design & UI Components:**
- Use Home icon from lucide-react
- Centered card with consistent spacing
- Call-to-action button with brand primary color

**Files to Touch:** `src/components/NotFoundView.tsx` (new), `src/App.tsx`
**Risk:** Low

---

### US-015: ErrorBoundary reset on route change

**As a** user who encounters an error, **I want** to recover by navigating to another route **so that** the error state clears when the view changes.

**Acceptance Criteria:**
- [ ] ErrorBoundary fallback includes "Try again" button (exists) and "Go Home" link
- [ ] "Go Home" navigates to `/`
- [ ] ErrorBoundary resets when route changes via `resetKey` prop (pass `location.pathname` from App)
- [ ] Error state does not persist when navigating away and back
- [ ] Console logs error with component stack (existing, verify it works)
- [ ] Fallback UI matches 404 styling for consistency

**Mobile Acceptance Criteria:**
- [ ] "Try again" button is `min-h-[44px]` (currently ~36px — **FAILS**)

**Planning for Failure:**
- ErrorBoundary does not reset on route change (stale error remains visible)
- `resetKey` prop not passed correctly from App
- Mitigation: Verify componentDidUpdate logic, test by triggering error and navigating

**Accessibility:**
- Error messages have sufficient contrast
- Buttons are keyboard accessible

**Files to Touch:** `src/components/ErrorBoundary.tsx`, `src/App.tsx`
**Risk:** Low

---

### US-016: Network failure states and retry logic

**As a** user with connectivity issues, **I want** clear error messages and a retry button **so that** I can try again without re-uploading.

**Acceptance Criteria:**
- [ ] When `extractDataFromDocument` returns null (network failure), show: "Unable to reach the analysis service. Check your internet connection and try again."
- [ ] Retry button re-invokes the failed operation without requiring re-upload
- [ ] Store last upload (`{ base64, mimeType }`) to enable retry
- [ ] Same pattern for `extractInsuranceData` in InsuranceAnalysis
- [ ] Recommendation failures (generateTaxRecommendation throws) show "Could not generate recommendation" with "Retry Analysis" button
- [ ] Store last form data used for analysis to enable retry

**Mobile Acceptance Criteria:**
- [ ] All error messages fit within 375px viewport (no horizontal overflow)
- [ ] `animate-spin` loader respects `prefers-reduced-motion: reduce`

**Planning for Failure:**
- Stale closure in retry handler (lastUpload is null or old)
- Retry button causes duplicate requests (not debounced)
- State inconsistency: retry succeeds but UI doesn't update
- Mitigation: Use `useRef` for last upload, debounce retry button, test with network throttling

**Accessibility:**
- Error messages announced to screen readers
- Retry button is keyboard accessible

**Files to Touch:** `src/components/TaxAnalysis.tsx`, `src/components/InsuranceAnalysis.tsx`
**Risk:** Medium (careful state management needed)

---

## EPIC E005 — Performance (Core Web Vitals)

**Goal:** Lighthouse Performance ≥90, LCP <2.5s, CLS <0.1, FID <200ms
**Lighthouse Target:** Performance

### US-017: Verify font-display swap

**As a** user on slow connection, **I want** text to render immediately with fallback font **so that** I see content without waiting (FOIT prevention).

**Acceptance Criteria:**
- [ ] All `@font-face` rules from `@fontsource/inter` and `@fontsource/manrope` use `font-display: swap`
- [ ] Text visible within 100ms on Slow 3G throttling
- [ ] Lighthouse does not flag "Ensure text remains visible during webfont load"
- [ ] Verify by inspecting `node_modules/@fontsource/` CSS files

**Planning for Failure:**
- `@fontsource` v5 default may have changed (verify in package)
- Override rule in index.css not sufficient
- Mitigation: Check @fontsource changelog, test with network throttling

**Performance:**
- Prevents FOIT (Flash of Invisible Text)
- Improves perceived performance

**Files to Touch:** `src/index.css` (verification/override if needed)
**Risk:** Low

---

### US-018: Preload critical font files (stretch goal)

**As a** user, **I want** fonts to preload so that font-swap happens faster **so that** the font substitution is barely noticeable.

**Acceptance Criteria:**
- [ ] `index.html` has preload for Inter 400 and Manrope 700 `.woff2` files
- [ ] Preload `href` paths resolve correctly after Vite build (hashed filenames)
- [ ] Lighthouse shows fonts preloaded in network waterfall
- [ ] No "unused preload" warnings in DevTools

**Planning for Failure:**
- Vite hashes filenames at build time; static hrefs break in production
- Requires Vite plugin (`vite-plugin-preload`) or custom transform
- Over-preloading degrades performance
- Mitigation: Use build-time manifest injection or accept this as tech debt (font-display: swap sufficient)

**Performance:**
- Reduces perceived latency of font substitution

**Files to Touch:** `vite.config.ts` (optional), `index.html`
**Risk:** Medium (build-time complexity; acceptable to defer)

---

### US-019: Explicit width and height on all img elements

**As a** user, **I want** images to reserve layout space before loading **so that** the page doesn't shift (CLS = 0).

**Acceptance Criteria:**
- [ ] `PublicHeader.tsx` logo: add `width` and `height` attributes (determine from `westrom-logo.webp` actual pixels)
- [ ] `PublicFooter.tsx` logo: add `width`, `height`, and `loading="lazy"`
- [ ] `VideoEmbed.tsx` thumbnail: add `width={1280}` `height={720}`, `loading="lazy"`
- [ ] Lighthouse CLS shows no image-related layout shifts
- [ ] All images render correctly at their constrained sizes

**Mobile Acceptance Criteria:**
- [ ] Header logo: add `fetchpriority="high"` (above the fold)
- [ ] Footer logo: add `loading="lazy"` (below the fold)

**Planning for Failure:**
- HTML attributes conflict with CSS sizing (Tailwind `h-16 w-auto` overrides HTML width)
- Image file doesn't exist or path is wrong
- Mitigation: Verify pixel dimensions before adding attributes, test rendering

**Performance:**
- Prevents Cumulative Layout Shift (CLS)
- Improves perceived load time (reserved space before image load)

**Files to Touch:** `src/components/PublicHeader.tsx`, `src/components/PublicFooter.tsx`, `src/components/VideoEmbed.tsx`
**Risk:** Low

---

### US-020: Lazy load TaxView and InsuranceView with Suspense

**As a** user loading the homepage, **I want** only essential code downloaded **so that** the page is interactive immediately.

**Acceptance Criteria:**
- [ ] `TaxView` and `InsuranceView` lazy-loaded via `React.lazy()` + `Suspense`
- [ ] Loading skeleton shown while components load
- [ ] HomeView remains in initial bundle (landing page must be instant)
- [ ] Vite build creates separate chunks for TaxView and InsuranceView
- [ ] Initial JS bundle size decreases measurably (check with `npm run build`)

**Technical Note:**
- TaxView and InsuranceView are **named exports** — use `.then(m => ({ default: m.TaxView }))` pattern

**Planning for Failure:**
- Components are named exports (lazy() requires default export)
- Flash of loading state on fast connections (jarring)
- Code split doesn't work (Vite may inline large components)
- Mitigation: Add default export wrappers or use named export pattern, minimize skeleton visibility, verify chunks in `dist/assets/`

**Performance:**
- Reduces initial bundle JS
- Defers loading of pdfjs-dist (heavy PDF library) until user navigates to /taxes

**Files to Touch:** `src/App.tsx`
**Risk:** Medium (named export handling required)

---

### US-021: Resource hints audit and bundle size check

**As a** developer, **I want** a documented audit of bundle sizes and resource hints **so that** I can make informed optimization decisions.

**Acceptance Criteria:**
- [ ] Run `npm run build` and record: total JS, largest chunk, CSS size
- [ ] Record pdfjs-dist chunk size separately
- [ ] Document findings in comment at top of `vite.config.ts` or separate audit file
- [ ] If any chunk exceeds 200KB gzipped, flag for follow-up
- [ ] Verify Loom preconnects (lines 21–24 in index.html) are still needed (only on /taxes)
- [ ] Optional: Add `manualChunks` to split vendor code (react, react-dom, react-router-dom)

**Planning for Failure:**
- Build output changes between runs (cache issues)
- pdfjs-dist not code-split (still in main bundle)
- Loom preconnects cause unnecessary DNS lookups on other routes
- Mitigation: Clean `dist/`, run build multiple times, verify chunk names in manifest

**Performance:**
- Identifies bottlenecks for future optimization
- Vendor chunk split improves caching (stable hash across builds)

**Files to Touch:** `vite.config.ts` (optional manualChunks), documentation
**Risk:** Low

---

## EPIC E006 — Mobile-First UX (NEW)

**Goal:** Ensure majority-mobile audience has seamless, accessible, performant experience
**Lighthouse Target:** All categories (mobile mode)

### US-022: Mobile PDF upload UX optimization

**As a** mobile user uploading my tax notice, **I want** clear guidance on selecting a PDF **so that** I successfully upload on the first try.

**Acceptance Criteria:**
- [ ] Upload zone text changes to "Tap to upload your PDF or image" on touch devices (detect via `navigator.maxTouchPoints > 0`)
- [ ] `accept` attribute changed to `.pdf,.jpg,.jpeg,.png,.webp,image/*` (explicit extensions help iOS Files app)
- [ ] Helper text appears on iOS: "On iPhone, tap 'Browse' to find PDFs in your Files app"
- [ ] File input value clears after each upload (enable re-upload of same file)
- [ ] Upload zone has `min-h-[120px]` for adequate tap target

**Planning for Failure:**
- iOS Safari still opens Camera Roll instead of Files app (Extensions may not be enough)
- User doesn't read helper text (placement/visibility issue)
- Duplicate upload blocked (value not cleared)
- Mitigation: Test on actual iOS devices, use realfavicongenerator approach as reference, clear value in both success and error paths

**Design & UI Components:**
- Conditional text: desktop "Drag and drop" vs mobile "Tap to upload"
- Helper text in `text-sm text-gray-500` below button
- Adequate padding for touch

**Accessibility:**
- Helper text must be associated with upload zone (aria-describedby)
- Button has min 44x44 tap target

**Mobile-Specific Risk:** HIGH — PDF upload on iOS is #1 abandon point
**Files to Touch:** `src/hooks/useDocumentUpload.ts`, `src/components/TaxAnalysis.tsx`, `src/components/InsuranceAnalysis.tsx`
**Risk:** High (core flow, platform-specific behavior)

---

### US-023: Mobile keyboard and viewport management

**As a** mobile user filling TaxAnalysis form, **I want** focused inputs to remain visible above the keyboard **so that** I see what I'm typing.

**Acceptance Criteria:**
- [ ] Focused form input scrolls into view above keyboard via `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- [ ] Sticky header does not overlap focused field — add `scroll-padding-top: 5rem` to `<html>`
- [ ] On iOS Safari, `visualViewport` resize event re-scrolls input into view
- [ ] Test on: iPhone SE (375px), iPhone 15 (393px), Galaxy S21 (360px)

**Mobile Acceptance Criteria:**
- [ ] Virtual keyboard does not push content off-screen
- [ ] User can see label + input together (not separated by keyboard)

**Planning for Failure:**
- iOS does not re-scroll on keyboard open (sticky header + keyboard = covered input)
- `visualViewport` API support varies (older browsers)
- Multiple inputs in sequence cause flashing scroll
- Mitigation: Create shared `useScrollIntoViewOnFocus()` hook, test on real devices, add `interactive-widget=resizes-content` to viewport meta

**Accessibility:**
- All form fields remain reachable without manual scroll
- Screen reader reads focused field without obstruction

**Files to Touch:** `src/index.css`, `src/components/TaxAnalysis.tsx`, `src/components/InsuranceAnalysis.tsx`
**Risk:** Medium (careful input handling, iOS-specific behavior)

---

### US-024: Touch target compliance audit and fix

**As a** mobile user, **I want** all buttons and links to be at least 44x44px **so that** I can accurately tap without mis-taps.

**Acceptance Criteria:**
- [ ] PublicHeader mobile button: increase from `p-2` (~40px) to `min-h-[44px] min-w-[44px]`
- [ ] PublicFooter affiliation badges: add `min-h-[44px]` (currently ~32px)
- [ ] ResourceCard "Visit Website" link: add `min-h-[44px]` wrapper
- [ ] ErrorBoundary "Try again" button: add `min-h-[44px]` (currently ~36px)
- [ ] TaxAnalysis "Browse Files" button: add `min-h-[44px]` (currently ~38px)
- [ ] InsuranceAnalysis "Browse Files" button: add `min-h-[44px]`
- [ ] No horizontal overflow on 375px viewport
- [ ] Lighthouse accessibility shows no sub-44px tap targets

**Planning for Failure:**
- Padding increases cause layout wrapping on small viewports
- Existing `outline-none` on inputs prevents :focus-visible
- Mobile test coverage incomplete
- Mitigation: Test on real devices, use Chrome DevTools device emulation, verify with Lighthouse

**Accessibility:**
- WCAG 2.5.5 Target Size (Level AAA)
- Apple HIG and Android Material Design compliance

**Files to Touch:** `PublicHeader.tsx`, `PublicFooter.tsx`, `ResourceCard.tsx`, `ErrorBoundary.tsx`, `TaxAnalysis.tsx`, `InsuranceAnalysis.tsx`
**Risk:** Low (CSS only, but 6 files)

---

### US-025: Reduced motion compliance for animations

**As a** user with vestibular disorder, **I want** animations to respect `prefers-reduced-motion: reduce` **so that** the app doesn't trigger vertigo.

**Acceptance Criteria:**
- [ ] `animate-pulse` adds `motion-reduce:animate-none` (RecommendationSkeleton)
- [ ] `animate-spin` adds `motion-reduce:animate-none` (Loader)
- [ ] `animate-ping` adds `motion-reduce:animate-none` (notification dot in HomeView line 28)
- [ ] Page transitions `animate-in fade-in slide-in-*` add `motion-reduce:animate-none`
- [ ] Card hover `translate-y-2` adds `motion-reduce:hover:translate-y-0`
- [ ] Global CSS safety net: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; } }`
- [ ] Hero `blur-[120px]` elements do not parallax or animate
- [ ] Test with DevTools: set `prefers-reduced-motion: reduce`

**Planning for Failure:**
- Tailwind `motion-reduce:` variant not recognized (requires Tailwind v4, already used in project)
- Global safety net may be too aggressive (hides all animations)
- Loading indicators become invisible (skeleton and spinner must stay visible, just static)
- Mitigation: Verify Tailwind v4 is installed, test that skeletons remain readable without animation, use Chrome DevTools to emulate preference

**Accessibility:**
- WCAG 2.3.3 Animation from Interactions (Level AAA)
- WCAG 2.5.4 Motion from Interactions (Level A)

**Design & UI Components:**
- Loading indicators remain visible but static
- No parallax or scroll-triggered animations
- Transitions still work (color changes, fades) but no motion

**Files to Touch:** `src/index.css`, `HomeView.tsx`, `TaxAnalysis.tsx`, `InsuranceAnalysis.tsx`, `TaxView.tsx`, `InsuranceView.tsx`
**Risk:** Low (CSS only)

---

### US-026: Mobile responsive layout audit (375px viewport)

**As a** mobile user on iPhone SE (375px), **I want** all content to fit without horizontal scrolling **so that** I don't need to zoom or pan.

**Acceptance Criteria:**
- [ ] TaxAnalysis form: `grid-cols-1 sm:grid-cols-2` renders single-column at 375px
- [ ] Form card padding `p-8 md:p-8` leaves >300px for content (375px - 64px = 311px available — acceptable but tight)
- [ ] InsuranceView broker cards: emails don't overflow (43 chars = potential overflow; add `break-all` or `overflow-wrap: anywhere`)
- [ ] PublicFooter badges: `flex flex-wrap` wraps correctly; no badge clipped
- [ ] TaxAnalysis results panel: `grid-cols-2` stats (YoY, Gap) don't overflow with 3-digit % values
- [ ] **CONFIRMED BUG:** Submit button + disclaimer (line 437–454) in `flex gap-4` side-by-side — must be stacked vertically on mobile
- [ ] No horizontal scroll bar on any route at 375px
- [ ] Run DevTools responsive mode: iPhone SE (375×667), Galaxy S21 (360×740)

**Planning for Failure:**
- Text overflow in broker email addresses
- Submit button + disclaimer layout remains side-by-side (breaks on 375px)
- Form padding too large for small viewports
- Mitigation: Use `p-5 md:p-8` for form cards, `flex-col` on submit section at 375px, test on real devices

**Design & UI Components:**
- Responsive padding: mobile-first smaller padding, expand on larger screens
- Stack heavy layouts vertically on mobile
- Preserve visual hierarchy with proper spacing

**Mobile-Specific Risk:** MEDIUM — confirmed layout bug in TaxAnalysis submit button
**Files to Touch:** `src/components/TaxAnalysis.tsx`, `src/components/InsuranceView.tsx`, `src/components/InsuranceAnalysis.tsx`, `src/components/PublicFooter.tsx`
**Risk:** Medium (confirmed bug, multiple layout issues)

---

### US-027: Mobile Lighthouse baseline and final scores

**As a** product owner, **I want** documented mobile performance metrics **so that** we confirm readiness for majority-mobile audience.

**Acceptance Criteria:**
- [ ] Run Lighthouse in mobile mode BEFORE sprint starts (Moto G Power, 4x CPU, simulated slow 4G)
- [ ] Record baseline scores: Performance, Accessibility, SEO, Best Practices (3 runs per route, use median)
- [ ] Record again AFTER sprint completion
- [ ] Target mobile scores: Performance ≥90, Accessibility ≥95, SEO ≥95, Best Practices ≥95
- [ ] Document LCP, FID/INP, CLS, TBT in baseline and final
- [ ] Compare scores by route: `/`, `/taxes`, `/insurance`
- [ ] Save reports to `docs/lighthouse-mobile-baseline.md` and `docs/lighthouse-mobile-final.md`

**Key Metrics:**
- LCP (Largest Contentful Paint) < 2.5s mobile
- FID / INP (Interaction to Next Paint) < 200ms
- CLS (Cumulative Layout Shift) < 0.1
- TBT (Total Blocking Time) < 300ms

**Planning for Failure:**
- Baseline taken on desktop mode (misleading — mobile scores much lower)
- High variance between runs (cache, CPU throttling inconsistency)
- Core Web Vitals unchanged despite fixes (symptoms vs root causes)
- Mitigation: Disable browser cache during testing, run multiple times, check which stories actually moved the metrics

**Performance:**
- Mobile baseline informs which EPICs had the biggest impact
- Guides future optimization priorities

**Risk Identification:**
- pdfjs-dist chunk too large (>200KB gzipped)
- Loom iframe preconnect inefficient
- Custom fonts (Manrope + Inter) blocking render

**Files to Touch:** `docs/lighthouse-mobile-baseline.md`, `docs/lighthouse-mobile-final.md` (documentation only)
**Risk:** Low (measurement)
**Priority:** Run FIRST (day 1) to establish baseline

---

## Cross-Story Dependencies

```
E001:
  US-001 → US-002 (needs assets)
         → US-003 (needs assets)

E002:
  US-004, US-005, US-006, US-007 (independent)

E003:
  US-008, US-009, US-010, US-011, US-013 (independent)
  US-009 → US-012 (both modify mobile menu)

E004:
  US-014, US-015, US-016 (independent)

E005:
  US-017 → US-018 (verify fonts before preloading)
  US-019, US-020, US-021 (independent)

E006 (Mobile-First):
  US-027 (baseline) → all other stories (run first)
  US-022, US-023, US-024, US-025, US-026 (can run in parallel after baseline)
```

---

## Recommended 2-Week Schedule

| Days | EPIC | Stories | Notes |
|------|------|---------|-------|
| 1 (AM) | E006 | US-027 | Baseline Lighthouse mobile scores |
| 1 (PM) – 2 | E001 | US-001, 002, 003 | Favicon + manifest + index.html refs |
| 3 – 4 | E002 | US-004, 005, 006, 007 | SEO foundation (titles, schemas, sitemaps) |
| 5 – 7 | E003 + E006 | US-008–013, 024, 025 | Accessibility + touch targets + reduced motion |
| 7.5 | E006 | US-023 | Mobile keyboard management |
| 8 | E006 | US-022, 026 | PDF UX + layout fixes |
| 8.5 – 9 | E004 | US-014, 015, 016 | 404 + error boundaries + retry logic |
| 9.5 – 10 | E005 | US-017, 019, 020, 021 | Fonts, images, code split, bundle audit |
| 10 (EOD) | E006 | US-027 | Final mobile Lighthouse scores |

---

## Quality Checklist (Each Story)

- [ ] Acceptance criteria fully met
- [ ] Planning for Failure scenarios tested
- [ ] Mobile (375px) tested if relevant
- [ ] Accessibility: Lighthouse ≥90 (or ≥95 on a11y)
- [ ] Performance: no regressions, bundle size checked
- [ ] Code: linted, types clean, no console errors
- [ ] Tests: happy path + edge cases (if applicable)
- [ ] git commit: `<type>(<scope>): <desc>` format
- [ ] PR review: AC met? Edge cases? Logs updated?

---

## High-Risk Stories (Review Extra Carefully)

- **US-022** — iOS PDF upload behavior is unpredictable; test on real devices
- **US-023** — iOS Safari visualViewport behavior differs from Android; device testing critical
- **US-026** — Confirmed layout bug in TaxAnalysis submit row; test on 375px minimum
- **US-012** — Focus trap complexity; keyboard testing essential
- **US-016** — State management for retry logic; edge cases (user re-uploads, network flaps)
- **US-020** — Named exports → default export pattern; Vite code-split verification required

---

## Notes for Implementation

**Branch:** `feature/E001-seo-a11y-performance`

**After Each Story:**
1. Run `npm run lint` (TypeScript + ESLint)
2. Run `npm run test` (if unit tests exist)
3. Test in browser (dev server + production build preview)
4. Commit with story ID in message: `feat(E001): US-001 generate favicon assets`

**Before Each EPIC:**
1. Read all AC + Planning for Failure sections
2. Check dependencies with other EPICs
3. Identify which stories can run in parallel

**Sprint Close:**
1. All stories merged to `feature/E001-seo-a11y-performance`
2. Create PR against `main` with full changelog
3. Final Lighthouse audit (mobile + desktop)
4. Update `docs/contextlog.md` with DONE/BLOCKED sections

---

**Last Updated:** 2026-04-17
**Sprint Owner:** [Your Name]
**PM:** [Your Name]
**Tech Lead:** Claude Code (Sonnet 4.6)
