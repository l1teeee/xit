'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP, ScrollTrigger } from '@/lib/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCoarsePointer } from '@/hooks/useCoarsePointer';
import { BirdFlight } from './BirdFlight';
import { buildStageTimeline } from './stageTimeline';
import { SCENE_IDS } from './stageTiming';
import './stage.css';

export function SceneStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const restoredHash = useRef(false);
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();

  useGSAP(() => {
    const stage = ref.current!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    stage.classList.add('is-staged');
    const controller = buildStageTimeline(stage, reduced, coarse);
    const timeline = controller.timeline;
    const pin = timeline.scrollTrigger!;
    let mounted = true;

    function scrollToHash(smooth: boolean) {
      const id = window.location.hash.slice(1);
      if (!SCENE_IDS.some(scene => scene === id)) return;
      const progress = id === 'index' ? 0 : timeline.labels[id] / timeline.duration();
      window.scrollTo({
        top: pin.start + (pin.end - pin.start) * progress,
        behavior: smooth && !reduced ? 'smooth' : 'instant',
      });
    }

    function followAnchor(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
      if (!SCENE_IDS.some(id => anchor.hash === `#${id}`)) return;
      event.preventDefault();
      if (window.location.hash !== anchor.hash) window.history.pushState(window.history.state, '', anchor.hash);
      scrollToHash(true);
    }

    function followHash() { scrollToHash(true); }
    stage.addEventListener('click', followAnchor);
    window.addEventListener('hashchange', followHash);
    const layoutObserver = new ResizeObserver(() => ScrollTrigger.refresh());
    layoutObserver.observe(stage.querySelector('.garden-header')!);
    void document.fonts.ready.then(() => {
      if (!mounted) return;
      ScrollTrigger.refresh();
      if (!restoredHash.current) {
        restoredHash.current = true;
        scrollToHash(false);
      }
    });

    return () => {
      mounted = false;
      stage.removeEventListener('click', followAnchor);
      window.removeEventListener('hashchange', followHash);
      layoutObserver.disconnect();
      controller.dispose();
      stage.classList.remove('is-staged');
    };
  }, { scope: ref, dependencies: [reducedMotion, coarsePointer], revertOnUpdate: true });

  return (
    <div ref={ref} className="scene-stage">
      {children}
      <BirdFlight />
    </div>
  );
}
