import { lazy, type ComponentType } from 'react';

// Pages are separate files whose names change on every release. A tab opened
// before a deploy asks for the old names, which no longer exist, and the page
// crashed into the error screen. On such a failure, reload once to pick up the
// new release; a second failure in the same tab is a real error and is shown.

const KEY = 'wgc-reloaded-for-release';

export function isStaleReleaseError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /dynamically imported module|importing a module script failed|loading (?:css )?chunk|failed to fetch|error loading dynamically|ChunkLoadError/i.test(msg);
}

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Reload the page once per tab; returns false if that was already tried. */
export function reloadOnceForNewRelease(): boolean {
  const s = storage();
  try {
    if (s?.getItem(KEY)) return false;
    s?.setItem(KEY, String(Date.now()));
  } catch {
    /* storage blocked: reload anyway, the guard below stops a loop */
  }
  window.location.reload();
  return true;
}

export function lazyPage<T extends ComponentType<object>>(load: () => Promise<{ default: T }>) {
  return lazy(() =>
    load().then(
      (m) => {
        try { storage()?.removeItem(KEY); } catch { /* ignore */ }
        return m;
      },
      (err: unknown) => {
        if (isStaleReleaseError(err) && reloadOnceForNewRelease()) {
          return new Promise<{ default: T }>(() => {}); // the page is reloading
        }
        throw err;
      },
    ),
  );
}
