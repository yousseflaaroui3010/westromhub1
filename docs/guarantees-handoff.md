# Embed handoff — Guarantees poster widget
**For:** Goodjuju Marketing (westromgroup.com, WordPress/Elementor)
**From:** Youssef (builder, wgcassetguide.com) · v1.0 · 2026-07-24

Drop-in for the pricing page, below the price cards. You don't need access to
our internals, and there is nothing to style.

## Embed

Paste this where the guarantees should appear (Elementor: an HTML widget):

```html
<div id="wgc-guarantees">
  <!-- shown only if the script is blocked -->
  <a href="https://wgcassetguide.com/guarantees">See the Westrom Group guarantees</a>
</div>
<script src="https://wgcassetguide.com/guarantees.js" async></script>
```

That's it. The full "Guarantees" poster (all six guarantees, logo, footer)
renders inside the `wgc-guarantees` element.

## Notes

- **One embed per page** (the widget mounts on the `wgc-guarantees` id).
- It renders in a **Shadow DOM**: your theme's CSS cannot break it and its CSS
  cannot touch your page. No stylesheet work needed.
- **Self-contained.** No jQuery, no framework, no external CSS. The font
  (Montserrat), logo, and icons all load from wgcassetguide.com. Loads `async`;
  it will not slow the page.
- **Content Security Policy:** if westromgroup.com sends a CSP header, allow our
  origin so the script, font, and logo load:
  `script-src https://wgcassetguide.com; font-src https://wgcassetguide.com; img-src https://wgcassetguide.com;`
  (The font is served with `Access-Control-Allow-Origin: *`, so the cross-origin
  fetch is already handled on our side.)
- **Width:** the poster caps at 1024px and centers itself; on a narrow column it
  scales down. It sits on whatever background your section already has.

## Optional attributes (on the `<script>` tag)

- `data-variant="embed"` — removes the outer card shadow / max-width cap so the
  poster sits flush inside a full-width section. Default is `data-variant="full"`
  (the centered poster card shown above).
- `data-asset-base="https://wgcassetguide.com"` — only needed if you self-host
  the widget file somewhere else; it tells the widget where to load the font and
  logo from. Leave it off to use ours.

## If the script is blocked

The `<a>` link inside the `<div>` (see the embed) falls back to our own hosted
page: **https://wgcassetguide.com/guarantees**. You can also just link to that
page instead of embedding, if you prefer.
