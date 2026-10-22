'use client';

import { useEffect, useRef } from 'react';
import { useQualityProfile } from '@/hooks/useQualityProfile';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ASCII_DETAIL_GLYPHS } from '@/lib/ascii/asciiGlyphs';
import { AsciiSurface, loadAsciiSurfaceFont } from '@/lib/ascii/asciiSurface';
import { watchActivity } from '@/lib/typewriter/watchActivity';
import { paintHabitat } from './habitatPainter';

export function HabitatArtwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { dprCap } = useQualityProfile();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function initialize(target: HTMLCanvasElement) {
      const fontFamily = await loadAsciiSurfaceFont();
      if (cancelled) return;

      const surface = new AsciiSurface(target, {
        polarity: 'dark-on-light',
        ink: '#000000',
        gamma: 1.3,
        dprCap,
        glyphs: ASCII_DETAIL_GLYPHS,
      }, fontFamily);

      let frame = 0;
      let active = false;
      let clock = 0;
      let lastTime: number | undefined;
      let lastDrawTime = 0;

      const paint = () => {
        paintHabitat(surface.beginFrame(), target.clientWidth, target.clientHeight, clock);
        surface.endFrame();
      };
      const resizeAndPaint = () => {
        surface.resize();
        paint();
      };
      resizeAndPaint();

      const tick = (time: number) => {
        frame = 0;
        if (!active || reducedMotion) return;
        if (lastTime !== undefined) clock += time - lastTime;
        lastTime = time;
        if (time - lastDrawTime >= 1000 / 30) {
          paint();
          lastDrawTime = time;
        }
        frame = requestAnimationFrame(tick);
      };

      const sizeObserver = new ResizeObserver(resizeAndPaint);
      sizeObserver.observe(target);
      const stopWatching = watchActivity(target, visible => {
        active = visible;
        if (active && !reducedMotion && !frame) frame = requestAnimationFrame(tick);
        if (!active) {
          cancelAnimationFrame(frame);
          frame = 0;
          lastTime = undefined;
        }
      });
      cleanup = () => {
        stopWatching();
        cancelAnimationFrame(frame);
        sizeObserver.disconnect();
        surface.dispose();
      };
    }

    void initialize(canvas);
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [dprCap, reducedMotion]);

  return <canvas ref={canvasRef} aria-hidden="true" className="habitat-artwork" />;
}
