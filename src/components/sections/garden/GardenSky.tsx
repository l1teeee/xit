'use client';

import { useEffect, useRef } from 'react';
import { loadAsciiSurfaceFont } from '@/lib/ascii/asciiSurface';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { watchActivity } from '@/lib/typewriter/watchActivity';
import { soilTopFor } from './GardenPainter';
import { GardenSkyPainter, type SkyLayout } from './gardenSkyPainter';

type LayoutElements = { header: HTMLElement; title: HTMLElement; field: HTMLElement };

function requireElement(root: Element, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`GardenSky needs ${selector} inside the garden section`);
  return element;
}

function findLayoutElements(section: Element): LayoutElements {
  const header = requireElement(section, '.garden-header');
  return {
    header,
    title: requireElement(header, '.matrix-title'),
    field: requireElement(section, '.garden-field'),
  };
}

// Layout offsets, not bounding boxes: the stage may transform the scene while it is measured.
function measureLayout({ header, title, field }: LayoutElements): SkyLayout {
  return {
    fieldTop: field.offsetTop,
    soilTop: field.offsetTop + soilTopFor(field.offsetHeight),
    titleRight: parseFloat(getComputedStyle(header).paddingLeft) + title.offsetWidth,
    titleBottom: header.offsetHeight,
  };
}

export function GardenSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painterRef = useRef<GardenSkyPainter | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = canvas?.closest('.garden-section');
    if (!canvas || !section) return;
    const elements = findLayoutElements(section);
    let disposed = false;
    const teardown: Array<() => void> = [];

    loadAsciiSurfaceFont().then(fontFamily => {
      if (disposed) return;
      const animated = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const painter = new GardenSkyPainter(canvas, fontFamily, animated, () => measureLayout(elements));
      painterRef.current = painter;
      const observer = new ResizeObserver(() => painter.resize());
      observer.observe(canvas);
      observer.observe(elements.header);
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

  return <canvas ref={canvasRef} className="garden-sky" aria-hidden="true" />;
}
