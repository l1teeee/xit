'use client';

import { useEffect, useRef } from 'react';
import { useQualityProfile } from '@/hooks/useQualityProfile';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ASCII_DETAIL_GLYPHS } from '@/lib/ascii/asciiGlyphs';
import { AsciiSurface, loadAsciiSurfaceFont } from '@/lib/ascii/asciiSurface';
import { watchActivity } from '@/lib/typewriter/watchActivity';
import { paintLifeBackdrop } from './lifeBackdropPainter';
import './lifeBackdrop.css';

// The clouds crawl, so a low frame rate is enough and keeps the scene cheap.
const FRAME_INTERVAL_MS = 1000 / 12;

export function LifeBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { dprCap } = useQualityProfile();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let release: (() => void) | undefined;

    async function start(target: HTMLCanvasElement) {
      const fontFamily = await loadAsciiSurfaceFont();
      if (cancelled) return;

      const surface = new AsciiSurface(target, {
        polarity: 'dark-on-light',
        ink: '#000000',
        dprCap,
        glyphs: ASCII_DETAIL_GLYPHS,
      }, fontFamily);

      let frame = 0;
      let active = false;
      let clockMs = 0;
      let lastTime: number | undefined;
      let lastDrawTime = 0;

      const paint = () => {
        paintLifeBackdrop(surface.beginFrame(), target.clientWidth, target.clientHeight, clockMs);
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
        if (lastTime !== undefined) clockMs += time - lastTime;
        lastTime = time;
        if (time - lastDrawTime >= FRAME_INTERVAL_MS) {
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
      release = () => {
        stopWatching();
        cancelAnimationFrame(frame);
        sizeObserver.disconnect();
        surface.dispose();
      };
    }

    void start(canvas);
    return () => {
      cancelled = true;
      release?.();
    };
  }, [dprCap, reducedMotion]);

  return <canvas ref={canvasRef} aria-hidden="true" className="life-backdrop" />;
}
