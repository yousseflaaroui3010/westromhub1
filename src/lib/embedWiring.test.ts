// Guard on the static estimator embed in public/analysis.html.
//
// Why this exists: the branded estimator layout is opt-in via
// data-layout="feature". When it shipped, nothing on any page had opted in, so
// the restyle looked like it had failed and cost three round trips to diagnose.
// Nothing in this repo checked the wiring, which is the real reason it was
// invisible. This is that check.
//
// Why it lives in src/: vitest is scoped to `src/**/*.{test,spec}.{ts,tsx}` in
// vite.config.ts, deliberately (the api/ package has its own job). Widening
// that pattern would change CI for one test, so the test comes to src instead.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(__dirname, '../../public/analysis.html'), 'utf8');

// The script tag itself, not a prose mention inside an HTML comment.
const scriptTag = html.match(/<script[^>]*src="\/embed\.js"[^>]*>/)?.[0] ?? '';

describe('public/analysis.html estimator embed', () => {
  it('loads the widget bundle', () => {
    expect(scriptTag).not.toBe('');
  });

  it('opts into the branded feature layout', () => {
    expect(scriptTag).toContain('data-layout="feature"');
  });

  it('keeps a mount point for the widget', () => {
    expect(html).toContain('id="wgc-analysis"');
  });

  it('keeps the no-JS fallback path (FR-9)', () => {
    expect(html).toContain('<noscript>');
  });

  it('does not re-introduce a page-level width cap around the widget', () => {
    // The widget brings its own full-bleed band and caps its own panel at
    // 1000px. A max-width here squeezed it into 34rem and collapsed the
    // two-column layout on desktop.
    const section = html.match(/\.widget-section \.wrap \{[^}]*\}/)?.[0] ?? '';
    expect(section).not.toBe('');
    expect(section).toMatch(/max-width:\s*none/);
  });
});