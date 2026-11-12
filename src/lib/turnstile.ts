// Cloudflare Turnstile (bot check) for document uploads.
//
// Enabled only when VITE_TURNSTILE_SITE_KEY is set at build time. Rendered with
// appearance "interaction-only": most visitors never see anything. When
// Cloudflare does want a click, the checkbox is shown in a centred dialog with
// a short explanation (a corner checkbox went unnoticed while the upload just
// looked stuck). The token is exchanged at /api/session for a 30-minute
// session, so this runs at most once per visit.

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

  // Invisible until Cloudflare asks for interaction. Kept rendered (opacity 0,
  // not display:none) because the widget must run inside a laid-out element.
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 opacity-0 pointer-events-none transition-opacity';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'wgc-verify-title');
  overlay.setAttribute('aria-hidden', 'true');

  const card = document.createElement('div');
  card.className = 'w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl';
  const title = document.createElement('h2');
  title.id = 'wgc-verify-title';
  title.className = 'font-heading text-lg font-bold text-ink';
  title.textContent = 'One quick check';
  const text = document.createElement('p');
  text.className = 'mt-2 mb-4 text-sm text-on-surface-variant';
  text.textContent = 'Please tick the box to confirm you are human. Your document will be read right after.';
  const host = document.createElement('div');
  host.className = 'flex justify-center';
  card.append(title, text, host);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const show = () => {
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    overlay.setAttribute('aria-hidden', 'false');
  };

  return new Promise<string>((resolve, reject) => {
    let id = '';
    const done = (fn: () => void) => {
      clearTimeout(timer);
      try { if (id) ts.remove(id); } catch { /* already gone */ }
      overlay.remove();
      fn();
    };
    const timer = setTimeout(() => done(() => reject(new Error('turnstile timeout'))), 120_000);
    id = ts.render(host, {
      sitekey: SITE_KEY,
      action,
      appearance: 'interaction-only',
      'before-interactive-callback': show,
      callback: (token: string) => done(() => resolve(token)),
      'error-callback': () => done(() => reject(new Error('turnstile error'))),
      'expired-callback': () => done(() => reject(new Error('turnstile expired'))),
    });
  });
}
