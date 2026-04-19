import { useEffect, useRef } from 'react';

/**
 * Scrolls the returned ref into view when `trigger` transitions from falsy to truthy.
 * Used to reveal result panels that render below the form on mobile stacked layouts.
 * Desktop `lg:grid-cols-2` layouts still get the call but it's effectively a no-op
 * when the element is already in the viewport.
 */
export function useScrollToResult<T extends HTMLElement = HTMLElement>(trigger: unknown) {
  const ref = useRef<T>(null);
  const hadTrigger = useRef(false);

  useEffect(() => {
    const present = Boolean(trigger);
    if (present && !hadTrigger.current && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    hadTrigger.current = present;
  }, [trigger]);

  return ref;
}
