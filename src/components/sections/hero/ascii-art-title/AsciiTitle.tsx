'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import type { HeroPhrase } from '@/data/types';
import { cn } from '@/lib/cn';
import { createKeySound } from '@/lib/typewriter/keySound';
import { watchActivity } from '@/lib/typewriter/watchActivity';
import { loadAsciiTitleFonts } from './asciiTitleFonts';
import { createTitleRaster } from './asciiTitleRaster';
import { TitleTypewriter } from './asciiTitleTypewriter';
import './AsciiTitle.css';

type TitleStatus = 'pending' | 'ready' | 'fallback';

interface AsciiTitleProps {
  id: string;
  phrases: HeroPhrase[];
}

const RESIZE_DEBOUNCE_MS = 150;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const HEADING_CLASS = 'text-center font-mono text-[clamp(2rem,9vw,7rem)] font-bold leading-none text-ink';
const HIDDEN_HEADING_CLASS = 'sr-only noscript:not-sr-only';

// Calls onResize once the container size has stopped changing for the debounce interval.
function watchResize(container: HTMLElement, onResize: () => void): () => void {
  let lastWidth = container.clientWidth;
  let lastHeight = container.clientHeight;
  let timer: number | undefined;

  const observer = new ResizeObserver(() => {
    if (container.clientWidth === lastWidth && container.clientHeight === lastHeight) return;
    lastWidth = container.clientWidth;
    lastHeight = container.clientHeight;
    window.clearTimeout(timer);
    timer = window.setTimeout(onResize, RESIZE_DEBOUNCE_MS);
  });
  observer.observe(container);

  return () => {
    window.clearTimeout(timer);
    observer.disconnect();
  };
}

// The heading carries the first phrase as plain text. The phrases typed on screen are decorative.
export function AsciiTitle({ id, phrases }: AsciiTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [status, setStatus] = useState<TitleStatus>('pending');

  useEffect(() => {
    const container = containerRef.current;
    const pre = preRef.current;
    if (!container || !pre) return;

    let disposed = false;
    const teardown: Array<() => void> = [];

    loadAsciiTitleFonts()
      .then(fonts => {
        if (disposed) return;

        const animated = !window.matchMedia(REDUCED_MOTION_QUERY).matches;
        const buildRaster = () => createTitleRaster(phrases, fonts, {
          area: { width: container.clientWidth, height: container.clientHeight },
          pixelRatio: window.devicePixelRatio,
          reserveCursorSpace: animated,
        });
        const sound = animated ? createKeySound() : null;
        const typewriter = new TitleTypewriter(pre, buildRaster(), { animated, sound });
        teardown.push(() => typewriter.stop(), () => sound?.dispose());

        typewriter.start();
        setStatus('ready');

        teardown.push(watchActivity(container, active => (active ? typewriter.resume() : typewriter.pause())));
        teardown.push(watchResize(container, () => typewriter.replaceRaster(buildRaster())));
      })
      .catch(() => {
        if (!disposed) setStatus('fallback');
      });

    return () => {
      disposed = true;
      teardown.forEach(release => release());
    };
  }, [phrases]);

  return (
    <div ref={containerRef} data-ascii-title={status} className="relative flex size-full items-center justify-center">
      <h1 id={id} className={cn(HEADING_CLASS, status !== 'fallback' && HIDDEN_HEADING_CLASS)}>
        {phrases[0].lines.map((line, index) => (
          <Fragment key={line}>
            {index > 0 && ' '}
            <span className="block">{line}</span>
          </Fragment>
        ))}
      </h1>
      <pre
        ref={preRef}
        aria-hidden="true"
        className="pointer-events-none m-0 shrink-0 select-none whitespace-pre font-mono font-extrabold text-ink [font-variant-ligatures:none]"
      />
    </div>
  );
}
