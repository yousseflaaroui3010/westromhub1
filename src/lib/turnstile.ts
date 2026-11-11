// Cloudflare Turnstile (bot check) for document uploads.
//
// Enabled only when VITE_TURNSTILE_SITE_KEY is set at build time. Rendered with
// appearance "interaction-only": most visitors never see anything; a suspicious
// browser gets a small checkbox in the corner. The token is exchanged at
// /api/session for a 30-minute session, so this runs at most once per visit.

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  remove(id: string): void;
}

declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
export const turnstileEnabled = typeof SITE_KEY === 'string' && SITE_KEY.length > 0;

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')));
    s.onerror = () => { scriptPromise = null; reject(new Error('turnstile load failed')); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export async function getTurnstileToken(action: string): Promise<string> {
  const ts = await loadScript();
  const host = document.createElement('div');
  host.setAttribute('aria-live', 'polite');
  host.className = 'fixed bottom-4 right-4 z-[200]';
  document.body.appendChild(host);

  return new Promise<string>((resolve, reject) => {
    let id = '';
    const done = (fn: () => void) => {
      clearTimeout(timer);
      try { if (id) ts.remove(id); } catch { /* already gone */ }
      host.remove();
      fn();
    };
    const timer = setTimeout(() => done(() => reject(new Error('turnstile timeout'))), 60_000);
    id = ts.render(host, {
      sitekey: SITE_KEY,
      action,
      appearance: 'interaction-only',
      callback: (token: string) => done(() => resolve(token)),
      'error-callback': () => done(() => reject(new Error('turnstile error'))),
      'expired-callback': () => done(() => reject(new Error('turnstile expired'))),
    });
  });
}
