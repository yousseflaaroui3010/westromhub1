import { useEffect, useRef } from 'react';

export function useScrollIntoViewOnFocus<T extends HTMLElement = HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        // 300ms lets the virtual keyboard fully open before we scroll
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const handleViewportResize = () => {
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT')
      ) {
        active.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const container = containerRef.current;
    if (container) container.addEventListener('focusin', handleFocus);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', handleViewportResize);

    return () => {
      if (container) container.removeEventListener('focusin', handleFocus);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  return containerRef;
}
