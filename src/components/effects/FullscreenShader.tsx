'use client';

import { Component, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber';
import * as THREE from 'three';
import { useInView } from '@/hooks/useInView';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useQualityProfile } from '@/hooks/useQualityProfile';
import { getPointer, retainPointer } from '@/lib/pointer';

export interface ShaderFrame {
  state: RootState;
  delta: number;
  time: number;
  uniforms: Record<string, THREE.IUniform>;
}

export interface FullscreenShaderProps {
  fragmentShader: string;
  uniforms?: Record<string, THREE.IUniform>;
  onFrame?: (frame: ShaderFrame) => void;
  dprCap?: number;
  canvasName: string;
  className?: string;
  fallback?: ReactNode;
}

function detectWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

const webGL2Supported = detectWebGL2();
const subscribeSupport = () => () => {};
const getSupport = () => webGL2Supported;
const getServerSupport = () => false;
const getVisibility = () => !document.hidden;
const getServerVisibility = () => false;
function subscribeVisibility(notify: () => void) {
  document.addEventListener('visibilitychange', notify);
  return () => document.removeEventListener('visibilitychange', notify);
}

class ShaderBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const positions = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

function ShaderTriangle({
  fragmentShader, uniforms, onFrame, reducedMotion, visible,
}: Pick<FullscreenShaderProps, 'fragmentShader' | 'uniforms' | 'onFrame'> & {
  reducedMotion: boolean;
  visible: boolean;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const timeRef = useRef(0);
  const builtins = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uDpr: { value: 1 },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uPointerVelocity: { value: new THREE.Vector2() },
    uProgress: { value: 0 },
    uReducedMotion: { value: 0 },
  }), []);
  const shaderUniforms = useMemo(() => ({ ...uniforms, ...builtins }), [uniforms, builtins]);
  const size = useThree(state => state.size);
  const dpr = useThree(state => state.viewport.dpr);
  const advance = useThree(state => state.advance);

  useEffect(() => retainPointer(), []);

  useFrame((state, delta) => {
    const material = materialRef.current;
    if (!material || !visible || document.hidden) return;
    const frameUniforms = material.uniforms as typeof builtins;
    const reduced = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dt = reduced ? 0 : Math.min(Math.max(delta, 0), 0.05);
    if (reduced) timeRef.current = 0;
    else timeRef.current += dt;
    frameUniforms.uTime.value = timeRef.current;
    frameUniforms.uReducedMotion.value = reduced ? 1 : 0;
    frameUniforms.uDpr.value = state.gl.getPixelRatio();
    state.gl.getDrawingBufferSize(frameUniforms.uResolution.value);
    const rect = state.gl.domElement.getBoundingClientRect();
    const pointer = getPointer();
    const x = pointer.active ? THREE.MathUtils.clamp((pointer.x - rect.left) / Math.max(rect.width, 1), 0, 1) : 0.5;
    const y = pointer.active ? 1 - THREE.MathUtils.clamp((pointer.y - rect.top) / Math.max(rect.height, 1), 0, 1) : 0.5;
    const follow = reduced ? 1 : 1 - Math.exp(-dt * 12);
    const dx = (x - frameUniforms.uPointer.value.x) * follow;
    const dy = (y - frameUniforms.uPointer.value.y) * follow;
    frameUniforms.uPointer.value.x += dx;
    frameUniforms.uPointer.value.y += dy;
    frameUniforms.uPointerVelocity.value.x += ((dt > 0 ? dx / dt : 0) - frameUniforms.uPointerVelocity.value.x) * follow;
    frameUniforms.uPointerVelocity.value.y += ((dt > 0 ? dy / dt : 0) - frameUniforms.uPointerVelocity.value.y) * follow;
    frameUniforms.uProgress.value = THREE.MathUtils.clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
    onFrame?.({ state, delta: dt, time: timeRef.current, uniforms: material.uniforms });
  });

  useLayoutEffect(() => {
    if (visible && reducedMotion && !document.hidden) advance(0, false);
  }, [advance, size.width, size.height, dpr, reducedMotion, visible]);

  // R3F owns these resources and disposes the renderer with forceContextLoss on unmount.
  return (
    <mesh frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={shaderUniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export function FullscreenShader({
  fragmentShader, uniforms, onFrame, dprCap, canvasName, className, fallback,
}: FullscreenShaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef);
  const tabVisible = useSyncExternalStore(subscribeVisibility, getVisibility, getServerVisibility);
  const supported = useSyncExternalStore(subscribeSupport, getSupport, getServerSupport);
  const reducedMotion = useReducedMotion();
  const quality = useQualityProfile();
  const visible = inView && tabVisible;
  const staticFallback = fallback ?? <div className="absolute inset-0 bg-bg" />;

  return (
    <div ref={containerRef} aria-hidden="true" data-canvas={canvasName} className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {supported ? (
        <ShaderBoundary fallback={staticFallback}>
          <Canvas
            orthographic
            camera={{ position: [0, 0, 1], near: 0.1, far: 2 }}
            dpr={[0, dprCap ?? quality.dprCap]}
            frameloop={visible && !reducedMotion ? 'always' : 'never'}
            gl={{ alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' }}
            events={() => ({ enabled: false, priority: 1 })}
            fallback={staticFallback}
            onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
          >
            <ShaderTriangle fragmentShader={fragmentShader} uniforms={uniforms} onFrame={onFrame} reducedMotion={reducedMotion} visible={visible} />
          </Canvas>
        </ShaderBoundary>
      ) : staticFallback}
    </div>
  );
}
