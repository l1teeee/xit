export function watchActivity(target: Element, onChange: (active: boolean) => void): () => void {
  const scene = target.closest('[data-scene], [data-scene-state]');
  const bounds = target.getBoundingClientRect();
  let onScreen = bounds.bottom > 0 && bounds.right > 0
    && bounds.top < window.innerHeight && bounds.left < window.innerWidth;
  let previousActive: boolean | undefined;

  const report = (): void => {
    const sceneState = scene?.getAttribute('data-scene-state');
    const sceneVisible = !sceneState || sceneState === 'current';
    const siteLoaded = !document.documentElement.hasAttribute('data-site-loading');
    const active = onScreen && !document.hidden && sceneVisible && siteLoaded;
    if (active === previousActive) return;
    previousActive = active;
    onChange(active);
  };

  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    report();
  });
  observer.observe(target);
  const sceneObserver = new MutationObserver(report);
  if (scene) {
    sceneObserver.observe(scene, { attributes: true, attributeFilter: ['data-scene-state'] });
  }
  const loadingObserver = new MutationObserver(report);
  loadingObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-site-loading'] });
  document.addEventListener('visibilitychange', report);
  report();

  return () => {
    observer.disconnect();
    sceneObserver.disconnect();
    loadingObserver.disconnect();
    document.removeEventListener('visibilitychange', report);
  };
}
