import { gsap, ScrollTrigger } from '@/lib/gsap';
import { SCENE_IDS, stageTiming } from './stageTiming';
import { frostClipPath } from './frostClipPath';

export function buildStageTimeline(stage: HTMLElement, reduced: boolean, coarse: boolean) {
  const card = stage.querySelector<HTMLElement>('.scene-card')!;
  const frost = stage.querySelector<HTMLElement>('.scene-frost')!;
  const scenes = Array.from(card.querySelectorAll<HTMLElement>(':scope > [data-scene]'));
  const sceneSetters = scenes.map(scene => ({
    opacity: gsap.quickSetter(scene, 'opacity'),
    y: gsap.quickSetter(scene, 'y', 'px'),
  }));
  const setGround = gsap.quickSetter(card, 'backgroundColor');
  const originalGround = card.style.backgroundColor;
  const groundGrays = scenes.map(scene => (scene.dataset.sceneGround === '#000000' ? 0 : 255));
  const grounds = groundGrays.map((gray, index) => `rgba(${gray}, ${gray}, ${gray}, ${index === 0 ? 0 : 1})`);
  const groundTransitions = grounds.slice(0, -1).map((ground, index) => (
    gsap.utils.interpolate(ground, grounds[index + 1])
  ));
  const setFrame = gsap.quickSetter(stage, '--frame-color');
  const frames = scenes.map(scene => {
    if (!scene.dataset.sceneFrame) {
      throw new Error(`Scene "${scene.id}" is missing data-scene-frame`);
    }
    return scene.dataset.sceneFrame;
  });
  const frameTransitions = frames.slice(0, -1).map((frame, index) => (
    gsap.utils.interpolate(frame, frames[index + 1])
  ));
  const ease = gsap.parseEase('sine.inOut');
  const clamp = gsap.utils.clamp(0, 1);
  const timing = stageTiming(coarse);
  const playhead = { time: 0 };
  let current = -1;
  let transition = -1;

  function clearSceneStyles() {
    scenes.forEach((scene, index) => {
      sceneSetters[index].y(0);
      scene.style.removeProperty('opacity');
      scene.style.removeProperty('transform');
    });
  }

  function showScene(index: number) {
    if (current === index) return;
    current = index;
    for (let scene = 0; scene < scenes.length; scene += 1) {
      scenes[scene].dataset.sceneState = scene === index ? 'current' : 'hidden';
    }
  }

  function render() {
    const time = playhead.time;
    const scene = Math.min(scenes.length - 1, Math.floor(time / (timing.hold + timing.transition)));
    const local = time - scene * (timing.hold + timing.transition);
    const inTransition = scene < scenes.length - 1 && local > timing.hold;
    const progress = inTransition ? Math.min(1, (local - timing.hold) / timing.transition) : 0;
    showScene(scene + (progress >= 0.5 ? 1 : 0));

    if (inTransition && !reduced) {
      if (transition !== scene) {
        clearSceneStyles();
        transition = scene;
      }
      const departure = ease(clamp(progress / 0.45));
      const arrival = ease(clamp((progress - 0.55) / 0.45));
      const colorShift = ease(clamp((progress - 0.25) / 0.5));
      sceneSetters[scene].opacity(1 - departure);
      sceneSetters[scene].y(-10 * departure);
      sceneSetters[scene + 1].opacity(arrival);
      sceneSetters[scene + 1].y(10 * (1 - arrival));
      setGround(groundTransitions[scene](colorShift));
      setFrame(frameTransitions[scene](colorShift));
    } else {
      if (transition !== -1) clearSceneStyles();
      transition = -1;
      setGround(grounds[current]);
      setFrame(frames[current]);
    }

  }

  function refresh() {
    clearSceneStyles();
    transition = -1;
    updateFrostClip();
    render();
  }

  function updateFrostClip() {
    frost.style.clipPath = frostClipPath(
      stage.clientWidth,
      stage.clientHeight,
      {
        left: card.offsetLeft,
        top: card.offsetTop,
        right: card.offsetLeft + card.offsetWidth,
        bottom: card.offsetTop + card.offsetHeight,
      },
      parseFloat(getComputedStyle(card).borderTopLeftRadius),
    );
  }

  const cardResizeObserver = new ResizeObserver(updateFrostClip);
  cardResizeObserver.observe(card);

  ScrollTrigger.config({ ignoreMobileResize: true });
  const timeline = gsap.timeline({
    onUpdate: render,
    scrollTrigger: {
      trigger: stage,
      start: 'top top',
      end: () => `+=${stage.clientHeight * timing.total}`,
      pin: true,
      scrub: 1.2,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefresh: refresh,
      snap: { snapTo: 'labelsDirectional', duration: { min: 0.6, max: 1.4 }, delay: 0.12, ease: 'sine.inOut' },
    },
  });
  timeline.fromTo(playhead, { time: 0 }, { time: timing.total, duration: timing.total, ease: 'none' });
  SCENE_IDS.forEach((id, index) => timeline.addLabel(id, index * (timing.hold + timing.transition) + timing.hold / 2));
  refresh();
  return {
    timeline,
    dispose() {
      cardResizeObserver.disconnect();
      clearSceneStyles();
      card.style.backgroundColor = originalGround;
      stage.style.removeProperty('--frame-color');
      frost.style.removeProperty('clip-path');
      for (const scene of scenes) delete scene.dataset.sceneState;
    },
  };
}
