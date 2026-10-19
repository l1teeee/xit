'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import type { RootState } from '@react-three/fiber';
import { FullscreenShader, type ShaderFrame } from '@/components/effects/FullscreenShader';
import type { RasterVariant } from '@/data/types';
import { useCoarsePointer } from '@/hooks/useCoarsePointer';
import { useQualityProfile } from '@/hooks/useQualityProfile';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';
import { getPointer, type PointerState } from '@/lib/pointer';
import { rasterSphereFragmentShader, rasterSphereVariantIndex } from '@/shaders/rasterSphere';

export interface RasterSphereStats {
  yawDeg: number;
  tiltDeg: number;
  frame: number;
  cellPx: number;
}

export interface RasterSphereProps {
  variant?: RasterVariant;
  className?: string;
  onStats?: (stats: RasterSphereStats) => void;
  fallback?: ReactNode;
}

const LAND_MASK_URL = '/textures/earth-land.png';
const GRID_COLUMNS = 56;
const MIN_CELL_CSS_PX = 6;
const MAX_CELL_CSS_PX = 12;
const DISK_RADIUS_RATIO = 0.46;
const FIXED_TILT = 0.41;
const SPIN_SPEED = 0.1;
const START_YAW = 0.2;
const STILL_YAW = 0.9;
const POINTER_YAW_RANGE = 0.7;
const POINTER_TILT_RANGE = 0.24;
const POINTER_FOLLOW_RATE = 4;
const LENS_FOLLOW_RATE = 6;
const LENS_REACH = 1.28;
const SWITCH_SECONDS = 0.7;
const INTRO_SECONDS = 1.4;
const INTRO_VARIANT: RasterVariant = 'dither';
const STATS_INTERVAL_MS = 100;

function easeOutExpo(progress: number): number {
  return progress >= 1 ? 1 : 1 - Math.pow(2, -10 * progress);
}

function damp(current: number, target: number, rate: number, seconds: number): number {
  return current + (target - current) * (1 - Math.exp(-seconds * rate));
}

function wrapDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function cellPitchCssPx(canvasWidth: number, canvasHeight: number): number {
  const diameter = 2 * DISK_RADIUS_RATIO * Math.min(canvasWidth, canvasHeight);
  return THREE.MathUtils.clamp(Math.round(diameter / GRID_COLUMNS), MIN_CELL_CSS_PX, MAX_CELL_CSS_PX);
}

function isPointerNearDisk(pointer: Readonly<PointerState>, canvas: HTMLCanvasElement, diskRadiusCssPx: number): boolean {
  const rect = canvas.getBoundingClientRect();
  const offsetX = pointer.x - (rect.left + rect.width / 2);
  const offsetY = pointer.y - (rect.top + rect.height / 2);
  return Math.hypot(offsetX, offsetY) < diskRadiusCssPx * LENS_REACH;
}

function createSphereUniforms(): Record<string, THREE.IUniform> {
  return {
    uLand: { value: null },
    uLandReady: { value: 0 },
    uCellPx: { value: MAX_CELL_CSS_PX },
    uYaw: { value: START_YAW },
    uTilt: { value: FIXED_TILT },
    uMix: { value: 1 },
    uVariantFrom: { value: 0 },
    uVariantTo: { value: 0 },
    uDetail: { value: 1 },
    uLens: { value: 0 },
  };
}

function configureLandMask(texture: THREE.Texture): void {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
}

function renderStillFrame(state: RootState | null): void {
  if (state && state.get().frameloop === 'never') state.advance(0, false);
}

class VariantTransition {
  private from: RasterVariant;
  private to: RasterVariant;
  private elapsed: number;
  private duration: number;

  constructor(target: RasterVariant, withIntro: boolean) {
    this.to = target;
    this.from = withIntro ? INTRO_VARIANT : target;
    this.duration = withIntro ? INTRO_SECONDS : SWITCH_SECONDS;
    this.elapsed = withIntro ? 0 : this.duration;
  }

  private get progress(): number {
    return easeOutExpo(this.elapsed / this.duration);
  }

  retarget(next: RasterVariant): void {
    if (next === this.to) return;
    if (this.progress >= 0.5) this.from = this.to;
    this.to = next;
    this.elapsed = 0;
    this.duration = SWITCH_SECONDS;
  }

  advance(seconds: number): void {
    this.elapsed = Math.min(this.elapsed + seconds, this.duration);
  }

  finish(): void {
    this.from = this.to;
    this.elapsed = this.duration;
  }

  writeUniforms(uniforms: Record<string, THREE.IUniform>): void {
    uniforms.uVariantFrom.value = rasterSphereVariantIndex[this.from];
    uniforms.uVariantTo.value = rasterSphereVariantIndex[this.to];
    uniforms.uMix.value = this.progress;
  }
}

class SphereSimulation {
  readonly transition: VariantTransition;
  private spinYaw = START_YAW;
  private pointerYaw = 0;
  private pointerTilt = 0;
  private lensStrength = 0;
  private framesDrawn = 0;
  private lastStatsAt = 0;

  constructor(variant: RasterVariant, withIntro: boolean) {
    this.transition = new VariantTransition(variant, withIntro);
  }

  get yaw(): number {
    return this.spinYaw + this.pointerYaw;
  }

  get tilt(): number {
    return FIXED_TILT + this.pointerTilt;
  }

  get lens(): number {
    return this.lensStrength;
  }

  advance(seconds: number, yawTarget: number, tiltTarget: number, lensTarget: number): void {
    this.spinYaw += SPIN_SPEED * seconds;
    this.pointerYaw = damp(this.pointerYaw, yawTarget, POINTER_FOLLOW_RATE, seconds);
    this.pointerTilt = damp(this.pointerTilt, tiltTarget, POINTER_FOLLOW_RATE, seconds);
    this.lensStrength = damp(this.lensStrength, lensTarget, LENS_FOLLOW_RATE, seconds);
    this.transition.advance(seconds);
  }

  holdStill(): void {
    this.spinYaw = STILL_YAW;
    this.pointerYaw = 0;
    this.pointerTilt = 0;
    this.lensStrength = 0;
    this.transition.finish();
  }

  countFrame(): number {
    this.framesDrawn += 1;
    return this.framesDrawn;
  }

  statsDue(nowMs: number): boolean {
    if (this.framesDrawn > 1 && nowMs - this.lastStatsAt < STATS_INTERVAL_MS) return false;
    this.lastStatsAt = nowMs;
    return true;
  }
}

function useLandMask() {
  const maskRef = useRef<THREE.Texture | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    new THREE.TextureLoader().load(
      LAND_MASK_URL,
      texture => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        configureLandMask(texture);
        maskRef.current = texture;
        setLoaded(true);
      },
      undefined,
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
      maskRef.current?.dispose();
      maskRef.current = null;
    };
  }, []);

  return { maskRef, loaded, failed };
}

export function RasterSphere({ variant = 'lines', className, onStats, fallback }: RasterSphereProps) {
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const quality = useQualityProfile();
  const { maskRef, loaded: maskLoaded, failed: maskFailed } = useLandMask();
  const [firstFrameDrawn, setFirstFrameDrawn] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const renderStateRef = useRef<RootState | null>(null);
  const uniforms = useMemo(() => createSphereUniforms(), []);
  const [simulation] = useState(() => new SphereSimulation(variant, !reducedMotion));
  const detail = quality.tier === 'low' ? 0 : 1;

  const handleFrame = useCallback((frame: ShaderFrame) => {
    const { uniforms: shaderUniforms, state } = frame;
    renderStateRef.current = state;

    const mask = maskRef.current;
    if (!mask) return;
    if (shaderUniforms.uLand.value !== mask) {
      shaderUniforms.uLand.value = mask;
      shaderUniforms.uLandReady.value = 1;
    }

    const canvasWidth = state.size.width;
    const canvasHeight = state.size.height;
    if (shaderUniforms.uReducedMotion.value === 1) {
      simulation.holdStill();
    } else {
      const pointer = getPointer();
      const tracking = !coarsePointer && pointer.active;
      const diskRadiusCssPx = DISK_RADIUS_RATIO * Math.min(canvasWidth, canvasHeight);
      simulation.advance(
        frame.delta,
        tracking ? (pointer.nx - 0.5) * POINTER_YAW_RANGE : 0,
        tracking ? (0.5 - pointer.ny) * POINTER_TILT_RANGE : 0,
        tracking && isPointerNearDisk(pointer, state.gl.domElement, diskRadiusCssPx) ? 1 : 0,
      );
    }

    const cellCssPx = cellPitchCssPx(canvasWidth, canvasHeight);
    shaderUniforms.uCellPx.value = Math.max(1, Math.round(cellCssPx * shaderUniforms.uDpr.value));
    shaderUniforms.uYaw.value = simulation.yaw;
    shaderUniforms.uTilt.value = simulation.tilt;
    shaderUniforms.uLens.value = simulation.lens;
    shaderUniforms.uDetail.value = detail;
    simulation.transition.writeUniforms(shaderUniforms);

    const frameNumber = simulation.countFrame();
    if (frameNumber === 1) setFirstFrameDrawn(true);
    if (onStats && simulation.statsDue(performance.now())) {
      onStats({
        yawDeg: wrapDegrees(THREE.MathUtils.radToDeg(simulation.yaw)),
        tiltDeg: THREE.MathUtils.radToDeg(simulation.tilt),
        frame: frameNumber,
        cellPx: cellCssPx,
      });
    }
  }, [coarsePointer, detail, maskRef, onStats, simulation]);

  // With the render loop stopped (reduced motion or offscreen) nothing repaints on its own.
  useEffect(() => {
    simulation.transition.retarget(variant);
    renderStillFrame(renderStateRef.current);
  }, [simulation, variant]);

  useEffect(() => {
    if (maskLoaded) renderStillFrame(renderStateRef.current);
  }, [maskLoaded]);

  useEffect(() => {
    const canvas = renderStateRef.current?.gl.domElement;
    if (!firstFrameDrawn || !canvas) return;
    const showPoster = () => setContextLost(true);
    canvas.addEventListener('webglcontextlost', showPoster);
    return () => canvas.removeEventListener('webglcontextlost', showPoster);
  }, [firstFrameDrawn]);

  return (
    <div className={cn('relative size-full', className)}>
      <div className={cn('absolute inset-0 transition-opacity duration-700', firstFrameDrawn && !contextLost && 'opacity-0')}>
        {fallback}
      </div>
      {!maskFailed && !contextLost && (
        <FullscreenShader
          canvasName="hero-sphere"
          fragmentShader={rasterSphereFragmentShader}
          uniforms={uniforms}
          onFrame={handleFrame}
          dprCap={quality.dprCap}
          fallback={fallback}
        />
      )}
    </div>
  );
}
