export function useDeviceCapabilities() {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  // maxTouchPoints > 1 covers iPads reporting as desktop (navigator.platform deprecated)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
  return { isTouch, isIOS };
}
