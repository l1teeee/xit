import type Lenis from 'lenis';

let lenis: Lenis | null = null;

export function registerLenis(instance: Lenis | null): void {
  lenis = instance;
}

export function scrollToSection(id: string): void {
  const element = document.getElementById(id.replace(/^#/, ''));
  if (!element) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (lenis) lenis.scrollTo(element, { immediate: reduced });
  else element.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
}
