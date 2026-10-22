'use client';

import { useEffect, useState } from 'react';

function smoothstep(start: number, end: number, value: number): number {
  const progress = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return progress * progress * (3 - 2 * progress);
}

export function useScrollFade(startVh: number, endVh: number): number {
  const [fade, setFade] = useState(0);

  useEffect(() => {
    let frameRequest = 0;
    let previousFade: number | undefined;

    function updateFade() {
      frameRequest = 0;
      const nextFade = smoothstep(startVh, endVh, window.scrollY / window.innerHeight);
      if (nextFade === previousFade) return;
      previousFade = nextFade;
      setFade(nextFade);
    }

    function scheduleUpdate() {
      if (!frameRequest) frameRequest = requestAnimationFrame(updateFade);
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      cancelAnimationFrame(frameRequest);
    };
  }, [startVh, endVh]);

  return fade;
}
