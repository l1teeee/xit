'use client';

import { useEffect, useRef, useState } from 'react';
import { GradientBars } from '@/components/ui/gradient-bars-background';
import { waitForSiteReady } from '@/lib/waitForSiteReady';
import './siteLoader.css';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const LOADING_ATTRIBUTE = 'data-site-loading';
const HOLD_AFTER_READY_MS = 2000;
const FADE_MS = 700;
const REDUCED_FADE_MS = 200;
const GIVE_UP_MS = 8000;

function beginFade(panel: HTMLElement, fadeMs: number): void {
  // Releasing the page now lets the hero come alive while the panel is still fading.
  document.documentElement.removeAttribute(LOADING_ATTRIBUTE);
  panel.style.setProperty('--site-loader-fade', `${fadeMs}ms`);
  panel.setAttribute('data-leaving', '');
}

function runLoader(panel: HTMLElement, onFinished: () => void): () => void {
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  const teardown: Array<() => void> = [];
  let disposed = false;
  let siteReady = false;

  const later = (delayMs: number, action: () => void): void => {
    const timer = window.setTimeout(action, delayMs);
    teardown.push(() => window.clearTimeout(timer));
  };

  const fadeOut = (): void => {
    const fadeMs = reducedMotion ? REDUCED_FADE_MS : FADE_MS;
    beginFade(panel, fadeMs);
    later(fadeMs, onFinished);
  };

  const markSiteReady = (): void => {
    if (siteReady) return;
    siteReady = true;
    later(HOLD_AFTER_READY_MS, fadeOut);
  };

  waitForSiteReady().then(() => {
    if (!disposed) markSiteReady();
  });
  // A visitor must never stay trapped behind the panel when readiness never resolves.
  later(GIVE_UP_MS, markSiteReady);

  return () => {
    disposed = true;
    teardown.forEach(release => release());
  };
}

export function SiteLoader() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    return runLoader(panel, () => setFinished(true));
  }, []);

  if (finished) return null;

  return (
    <div ref={panelRef} role="status" className="site-loader">
      <span className="sr-only">Loading</span>
      {/* The bars share the hero frame tint (--frame-color on :root, which the stage timeline only overrides on the stage element), so the intro hands off to the frame without a color jump. Gradients to transparent interpolate in premultiplied alpha, so there is no gray fringe. */}
      <GradientBars
        numBars={15}
        gradientFrom="var(--frame-color)"
        gradientTo="transparent"
        animationDuration={2}
      />
    </div>
  );
}
