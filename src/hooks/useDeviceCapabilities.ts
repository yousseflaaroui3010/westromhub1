export function getDeviceCapabilities() {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  // iPadOS 13+ reports Macintosh UA — combine maxTouchPoints > 1 with Mac UA check
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  return { isTouch, isIOS };
}
