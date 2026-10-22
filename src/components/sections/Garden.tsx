'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { garden } from '@/data/site';
import { loadAsciiSurfaceFont } from '@/lib/ascii/asciiSurface';
import { MatrixTitle } from './hero/MatrixTitle';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { watchActivity } from '@/lib/typewriter/watchActivity';
import { GardenPainter } from './garden/GardenPainter';
import './garden/garden.css';

type PointerStart = { x: number; y: number; id: number };

export function Garden() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painterRef = useRef<GardenPainter | null>(null);
  const pointerStart = useRef<PointerStart | null>(null);
  const seedCount = useRef(0);
  const [planted, setPlanted] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    const teardown: Array<() => void> = [];

    loadAsciiSurfaceFont().then(fontFamily => {
      if (disposed) return;
      const painter = new GardenPainter(canvas, fontFamily, !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      painterRef.current = painter;
      const observer = new ResizeObserver(() => painter.resize());
      observer.observe(canvas);
      const stopWatching = watchActivity(canvas, active => painter.setActive(active));
      teardown.push(stopWatching, () => observer.disconnect(), () => painter.dispose());
    });

    return () => {
      disposed = true;
      teardown.forEach(release => release());
      painterRef.current = null;
    };
  }, []);

  useEffect(() => {
    painterRef.current?.setAnimated(!reducedMotion);
  }, [reducedMotion]);

  function plant(x: number, y: number): void {
    const painter = painterRef.current;
    if (!painter) return;
    painter.plant(x, y);
    setPlanted(count => count + 1);
  }

  function plantAtNextSpot(): void {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const positions = [0.51, 0.28, 0.73, 0.4, 0.61];
    const x = canvas.clientWidth * positions[seedCount.current % positions.length];
    const y = canvas.clientHeight * (0.27 + (seedCount.current % 3) * 0.1);
    seedCount.current += 1;
    plant(x, y);
  }

  function startPointer(event: PointerEvent<HTMLCanvasElement>): void {
    if (event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }

  function endPointer(event: PointerEvent<HTMLCanvasElement>): void {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
    const rect = event.currentTarget.getBoundingClientRect();
    plant(event.clientX - rect.left, event.clientY - rect.top);
  }

  return (
    <section id="garden" data-scene data-scene-ground="#000000" aria-labelledby="garden-title" className="garden-section">
      <div className="garden-header">
        <MatrixTitle id="garden-title" phrases={garden.phrases} headingLevel={2} soundHint={false} variant="section" />
      </div>

      <div className="garden-field">
        <div className="garden-bird" data-bird-anchor data-bird-facing="left" aria-hidden="true" />
        <canvas
          ref={canvasRef}
          className="garden-canvas"
          aria-label="Interactive garden field. Touch or click to plant a flower."
          tabIndex={0}
          onKeyDown={event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            plantAtNextSpot();
          }}
          onPointerDown={startPointer}
          onPointerUp={endPointer}
          onPointerCancel={() => { pointerStart.current = null; }}
        />
      </div>
      <p className={`garden-hint${planted > 0 ? ' is-gone' : ''}`} aria-hidden="true">touch to plant</p>
      <span className="garden-sr-only" aria-live="polite">{planted ? `${planted} ${planted === 1 ? 'seed' : 'seeds'} planted.` : ''}</span>
    </section>
  );
}
