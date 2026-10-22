'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { loadAsciiSurfaceFont } from '@/lib/ascii/asciiSurface';
import { watchActivity } from '@/lib/typewriter/watchActivity';
import { SeedHeadPainter } from './seedHeadPainter';

export function SeedHead() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let painter: SeedHeadPainter | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let stopWatching: (() => void) | undefined;

    void loadAsciiSurfaceFont().then((fontFamily) => {
      if (cancelled) return;

      const nextPainter = new SeedHeadPainter(canvas, fontFamily, !reducedMotion);
      painter = nextPainter;
      nextPainter.resize();
      resizeObserver = new ResizeObserver(() => nextPainter.resize());
      resizeObserver.observe(canvas);
      stopWatching = watchActivity(canvas, (active) => {
        if (active) nextPainter.resume();
        else nextPainter.pause();
      });
    });

    return () => {
      cancelled = true;
      stopWatching?.();
      resizeObserver?.disconnect();
      painter?.dispose();
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="seed-head"
      width={800}
      height={800}
      data-enter-rotation="0"
      data-enter-scale="1"
      data-hold-rotation="0"
      data-hold-scale="1"
      aria-hidden="true"
    />
  );
}
