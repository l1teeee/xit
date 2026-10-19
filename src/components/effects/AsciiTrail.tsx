'use client';

import { useEffect, useRef } from 'react';
import { loadAsciiTrailFont, runAsciiTrail } from './asciiTrailRunner';

interface AsciiTrailProps {
  // Highest device pixel ratio the canvas may use, from the quality profile.
  dprCap: number;
}

// A canvas layer where the pointer leaves a short trail of dull ASCII characters that fade out.
export function AsciiTrail({ dprCap }: AsciiTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let release: (() => void) | null = null;

    loadAsciiTrailFont().then(fontFamily => {
      if (!disposed) release = runAsciiTrail(canvas, fontFamily, dprCap);
    });

    return () => {
      disposed = true;
      release?.();
    };
  }, [dprCap]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-canvas="ascii-trail"
      className="pointer-events-none absolute inset-0 size-full"
    />
  );
}
