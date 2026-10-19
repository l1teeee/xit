export interface PointerState {
  x: number;
  y: number;
  nx: number;
  ny: number;
  speed: number;
  active: boolean;
}

const pointer: PointerState = { x: 0, y: 0, nx: 0.5, ny: 0.5, speed: 0, active: false };
let retainCount = 0;
let lastMove = 0;
let moveSpeed = 0;

function decayedSpeed(now: number): number {
  const speed = moveSpeed * Math.exp(-(now - lastMove) / 120);
  return speed < 0.001 ? 0 : speed;
}

function onPointerMove(event: PointerEvent): void {
  const now = performance.now();
  const distance = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y);
  const elapsed = Math.max(1, now - lastMove);
  const speed = pointer.active ? Math.min(1, distance / elapsed / 2) : 0;
  moveSpeed = decayedSpeed(now) * 0.65 + speed * 0.35;
  lastMove = now;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.nx = Math.max(0, Math.min(1, pointer.x / window.innerWidth));
  pointer.ny = Math.max(0, Math.min(1, pointer.y / window.innerHeight));
  pointer.active = true;
}

export function retainPointer(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (retainCount++ === 0) window.addEventListener('pointermove', onPointerMove, { passive: true });
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--retainCount === 0) window.removeEventListener('pointermove', onPointerMove);
  };
}

export function getPointer(): Readonly<PointerState> {
  pointer.speed = decayedSpeed(performance.now());
  return pointer;
}
