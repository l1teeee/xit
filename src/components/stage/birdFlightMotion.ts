import { gsap } from '@/lib/gsap';
import type { BirdPose } from './birdPoses';

const travelEase = gsap.parseEase('power2.inOut');
const arcEase = gsap.parseEase('sine.inOut');
const clamp = gsap.utils.clamp(0, 1);

export function createBirdFlightMotion(bird: HTMLElement, hover: HTMLElement) {
  gsap.set(bird, { xPercent: -50, yPercent: -50, transformOrigin: '50% 50%' });
  const setX = gsap.quickSetter(bird, 'x', 'px');
  const setY = gsap.quickSetter(bird, 'y', 'px');
  // quickSetter ignores the 'scale' shorthand (GSAP 3.15), so each axis is set on its own.
  const setScaleX = gsap.quickSetter(bird, 'scaleX');
  const setScaleY = gsap.quickSetter(bird, 'scaleY');
  const setOpacity = gsap.quickSetter(bird, 'opacity');
  const setFacing = gsap.quickSetter(hover, 'scaleX');
  let facing = 1;
  let previousDirection = 1;
  let turnStart = -1;
  let turnFacing = 1;

  function place(x: number, y: number, scale: number, opacity: number, nextFacing: number) {
    setX(x);
    setY(y);
    setScaleX(scale);
    setScaleY(scale);
    setOpacity(opacity);
    setFacing(nextFacing);
    facing = nextFacing;
    const state = opacity > 0 ? 'current' : 'hidden';
    if (bird.dataset.sceneState !== state) bird.dataset.sceneState = state;
  }

  return {
    hold(pose: BirdPose) {
      turnStart = -1;
      place(pose.x, pose.y, pose.scale, pose.opacity, pose.facing);
    },
    travel(from: BirdPose, to: BirdPose, progress: number, height: number, direction: number) {
      const flight = clamp((progress - 0.15) / 0.7);
      const eased = travelEase(flight);
      const arc = flight < 0.5 ? arcEase(flight * 2) : arcEase((1 - flight) * 2);
      const departure = direction > 0 ? from : to;
      const arrival = direction > 0 ? to : from;
      const directedProgress = direction > 0 ? progress : 1 - progress;
      const travelFacing = arrival.x < departure.x ? 1 : -1;
      let nextFacing = departure.facing + (travelFacing - departure.facing) * clamp((directedProgress - 0.15) / 0.2);
      nextFacing += (arrival.facing - travelFacing) * clamp((directedProgress - 0.75) / 0.2);

      if (direction !== previousDirection) {
        turnStart = progress;
        turnFacing = facing;
      }
      previousDirection = direction;
      if (turnStart >= 0) {
        const turn = clamp(Math.abs(progress - turnStart) / 0.2);
        nextFacing = turnFacing + (nextFacing - turnFacing) * turn;
        if (turn === 1) turnStart = -1;
      }

      place(
        from.x + (to.x - from.x) * eased,
        from.y + (to.y - from.y) * eased - height * 0.04 * arc,
        (from.scale + (to.scale - from.scale) * eased) * (1 + 0.12 * arc),
        from.opacity + (to.opacity - from.opacity) * eased,
        nextFacing,
      );
    },
  };
}
