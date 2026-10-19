// Reports whether the target is on screen in a visible tab, so animation can pause when nobody sees it.
export function watchActivity(target: Element, onChange: (active: boolean) => void): () => void {
  let onScreen = true;

  const report = (): void => onChange(onScreen && !document.hidden);

  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    report();
  });
  observer.observe(target);
  document.addEventListener('visibilitychange', report);

  return () => {
    observer.disconnect();
    document.removeEventListener('visibilitychange', report);
  };
}
