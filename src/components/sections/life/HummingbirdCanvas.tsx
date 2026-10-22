'use client';

import { useEffect, useRef } from 'react';
import { useQualityProfile } from '@/hooks/useQualityProfile';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { loadAsciiSurfaceFont } from '@/lib/ascii/asciiSurface';
import { watchActivity } from '@/lib/typewriter/watchActivity';
import { FRAME_COLS, FRAME_ROWS } from './hummingbirdFrames';
import { HummingbirdRunner } from './hummingbirdRunner';

export function HummingbirdCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const { dprCap } = useQualityProfile();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function initialize(target: HTMLCanvasElement) {
      const fontFamily = await loadAsciiSurfaceFont();
      await document.fonts.load(`700 14px ${fontFamily}`);
      if (cancelled) return;

      const runner = new HummingbirdRunner(target, { dprCap, animated: !reducedMotion, fontFamily });
      runner.start();

      const sizeObserver = new ResizeObserver(() => runner.resize());
      sizeObserver.observe(target);
      const groundObserver = new MutationObserver(() => runner.repaint());
      groundObserver.observe(target, { attributes: true, attributeFilter: ['data-ground'] });
      const stopWatching = watchActivity(target, active => (active ? runner.resume() : runner.pause()));
      cleanup = () => {
        stopWatching();
        sizeObserver.disconnect();
        groundObserver.disconnect();
        runner.stop();
      };
    }

    void initialize(canvas);

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [dprCap, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-ground="light"
      className="block w-full"
      style={{ aspectRatio: `${FRAME_COLS} / ${FRAME_ROWS}` }}
    />
  );
}
