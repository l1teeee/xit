'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import type { HeroPhrase } from '@/data/types';
import { cn } from '@/lib/cn';
import { createKeySound } from '@/lib/typewriter/keySound';
import { phraseKeyKinds, TypewriterLoop, type FlickerTiming } from '@/lib/typewriter/typewriterLoop';
import { watchActivity } from '@/lib/typewriter/watchActivity';
import { CutDirector } from './matrixTitleCuts';
import { loadMatrixTitleFont } from './matrixTitleFont';
import { titleBlockEm, titleStyle } from './matrixTitleMetrics';
import { MatrixTitleView } from './matrixTitleView';
import './MatrixTitle.css';

type TitleStatus = 'pending' | 'ready' | 'fallback';

interface MatrixTitleProps {
  id: string;
  phrases: HeroPhrase[];
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
// A typed character shows hexadecimal digits for 120 to 180 ms before its letter. An erased one does so a little shorter,
// then goes. The digits change about every 70 ms.
const FLICKER: FlickerTiming = { typeMinMs: 120, typeMaxMs: 180, eraseMs: 90, stepMs: 70 };
const HEADING_CLASS = 'col-start-1 row-start-1 text-center font-mono text-[clamp(2rem,9vw,5rem)] font-bold leading-none text-ink';
const HIDDEN_HEADING_CLASS = 'sr-only noscript:not-sr-only';

// The heading carries the first phrase as plain text. The characters typed on screen are decorative.
export function MatrixTitle({ id, phrases }: MatrixTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<TitleStatus>('pending');

  useEffect(() => {
    const container = containerRef.current;
    const grid = gridRef.current;
    if (!container || !grid) return;

    let disposed = false;
    const animated = !window.matchMedia(REDUCED_MOTION_QUERY).matches;
    // The sound listens for its first gesture from the moment the title mounts, not once the font has loaded.
    const sound = animated ? createKeySound() : null;
    const teardown: Array<() => void> = [];

    loadMatrixTitleFont()
      .then(() => {
        if (disposed) return;

        const view = new MatrixTitleView(grid, phrases, animated);
        // Under reduced motion the title is a still frame: no loop, no sound and no glitch cuts.
        const cuts = animated ? new CutDirector(view, titleBlockEm(phrases[0].lines.length)) : null;
        const loop = new TypewriterLoop({
          keyKinds: phrases.map(phrase => phraseKeyKinds(phrase.lines)),
          animated,
          sound,
          flicker: FLICKER,
          onFrame: frame => view.render(frame),
          onMoment: () => cuts?.burst(),
        });
        teardown.push(() => loop.stop(), () => cuts?.pause(), () => view.dispose());

        loop.start();
        cuts?.start();
        setStatus('ready');

        teardown.push(
          watchActivity(container, active => {
            if (active) {
              loop.resume();
              cuts?.resume();
            } else {
              loop.pause();
              cuts?.pause();
            }
          }),
        );
      })
      .catch(() => {
        if (!disposed) setStatus('fallback');
      });

    return () => {
      disposed = true;
      teardown.forEach(release => release());
      sound?.dispose();
    };
  }, [phrases]);

  return (
    <div ref={containerRef} data-matrix-title={status} className="relative grid size-full place-items-center">
      <h1 id={id} className={cn(HEADING_CLASS, status !== 'fallback' && HIDDEN_HEADING_CLASS)}>
        {phrases[0].lines.map((line, index) => (
          <Fragment key={line}>
            {index > 0 && ' '}
            <span className="block">{line}</span>
          </Fragment>
        ))}
      </h1>
      <div ref={gridRef} aria-hidden="true" className="matrix-title" style={titleStyle(phrases)} />
    </div>
  );
}
