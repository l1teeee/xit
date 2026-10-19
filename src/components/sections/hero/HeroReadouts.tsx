'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { hero } from '@/data/site';
import { useHeroStage } from './HeroStage';

function formatRotation(yawDeg: number): string {
  return yawDeg.toFixed(1).padStart(5, '0');
}

// The point facing the viewer sits at latitude equal to the tilt and longitude equal to the yaw.
function formatCoordinates(tiltDeg: number, yawDeg: number): string {
  const longitudeDeg = yawDeg > 180 ? yawDeg - 360 : yawDeg;
  const latitude = `${tiltDeg >= 0 ? 'N' : 'S'} ${Math.abs(tiltDeg).toFixed(1).padStart(4, '0')}`;
  const longitude = `${longitudeDeg >= 0 ? 'E' : 'W'} ${Math.abs(longitudeDeg).toFixed(1).padStart(5, '0')}`;
  return `${latitude} / ${longitude}`;
}

function formatFrame(frame: number): string {
  return String(frame % 1_000_000).padStart(6, '0');
}

function setText(ref: RefObject<HTMLElement | null>, text: string): void {
  if (ref.current) ref.current.textContent = text;
}

function Readout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-dim">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function HeroReadouts() {
  const { variant, subscribeStats } = useHeroStage();
  const rasterRef = useRef<HTMLSpanElement>(null);
  const rotationRef = useRef<HTMLSpanElement>(null);
  const coordinatesRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<HTMLSpanElement>(null);
  const [rasterLabel, modeLabel, rotationLabel, coordinatesLabel, frameLabel] = hero.indicators;

  useEffect(() => {
    return subscribeStats(stats => {
      setText(rasterRef, `${stats.cellPx}PX`);
      setText(rotationRef, formatRotation(stats.yawDeg));
      setText(coordinatesRef, formatCoordinates(stats.tiltDeg, stats.yawDeg));
      setText(frameRef, formatFrame(stats.frame));
    });
  }, [subscribeStats]);

  return (
    <dl aria-hidden="true" className="label-mono flex flex-wrap gap-x-6 gap-y-1">
      <Readout label={rasterLabel}><span ref={rasterRef}>00PX</span></Readout>
      <Readout label={modeLabel}>{variant.toUpperCase()}</Readout>
      <Readout label={rotationLabel}><span ref={rotationRef}>000.0</span></Readout>
      <Readout label={coordinatesLabel}><span ref={coordinatesRef}>N 00.0 / E 000.0</span></Readout>
      <Readout label={frameLabel}><span ref={frameRef}>000000</span></Readout>
    </dl>
  );
}
