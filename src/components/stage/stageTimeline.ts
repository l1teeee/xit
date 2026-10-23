import { gsap, ScrollTrigger } from '@/lib/gsap';
import { watchActivity } from '@/lib/typewriter/watchActivity';
import { createBirdFlightMotion } from './birdFlightMotion';
import { measureBirdPoses } from './birdPoses';
import { SCENE_IDS, stageTiming } from './stageTiming';

export function buildStageTimeline(stage: HTMLElement, reduced: boolean, coarse: boolean) {
  const card = stage.querySelector<HTMLElement>('.scene-card')!;
  const scenes = Array.from(card.querySelectorAll<HTMLElement>(':scope > [data-scene]'));
  const bird = stage.querySelector<HTMLElement>('.bird-flight')!;
  const depth = stage.querySelector<HTMLElement>('.bird-depth')!;
  const hover = stage.querySelector<HTMLElement>('.bird-hover')!;
  const birdCanvas = bird.querySelector('canvas')!;
  const seed = stage.querySelector<HTMLCanvasElement>('.seed-head')!;
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
  const ease = gsap.parseEase('sine.inOut');
  const clamp = gsap.utils.clamp(0, 1);
  const flight = createBirdFlightMotion(bird, hover);
  const timing = stageTiming(coarse);
  const playhead = { time: 0 };
  let poses = measureBirdPoses(card, scenes, bird);
  let current = -1;
  let transition = -1;
  let lastTime = 0;
  let direction = 1;
  let active = true;
  let holding = true;

  gsap.set(seed, { attr: {
    'data-enter-rotation': 0, 'data-enter-scale': 1,
    'data-hold-rotation': 0, 'data-hold-scale': 1,
  } });
  const entrance = reduced ? null : gsap.fromTo(seed, {
    attr: { 'data-enter-rotation': -30, 'data-enter-scale': 0.8 },
  }, {
    attr: { 'data-enter-rotation': 0, 'data-enter-scale': 1 },
    duration: 1.6, ease: 'expo.out', paused: true, immediateRender: false,
  });
  const bob = reduced ? null : gsap.fromTo(hover, { y: 0 }, {
    y: () => -card.clientHeight * 0.006,
    duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true,
  });
  const depthScale = reduced ? null : gsap.fromTo(depth, { scale: 0.88 }, {
    scale: 1.12,
    duration: 5.5, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true,
  });
  const depthSway = reduced ? null : gsap.fromTo(depth, { x: () => -card.clientWidth * 0.015 }, {
    x: () => card.clientWidth * 0.015,
    duration: 7.3, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true,
  });

  function updateActivity() {
    if (active && holding && current > 0) {
      bob?.resume();
      depthScale?.resume();
      depthSway?.resume();
    } else {
      bob?.pause();
      depthScale?.pause();
      depthSway?.pause();
    }
    if (active && current === 3) entrance?.resume();
    else entrance?.pause();
  }

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
    birdCanvas.dataset.ground = scenes[index].dataset.sceneGround === '#000000' ? 'dark' : 'light';
    if (index === 3) entrance?.restart();
    updateActivity();
  }

  function render() {
    const time = playhead.time;
    if (time !== lastTime) direction = time > lastTime ? 1 : -1;
    lastTime = time;
    const scene = Math.min(scenes.length - 1, Math.floor(time / (timing.hold + timing.transition)));
    const local = time - scene * (timing.hold + timing.transition);
    const inTransition = scene < scenes.length - 1 && local > timing.hold;
    const progress = inTransition ? Math.min(1, (local - timing.hold) / timing.transition) : 0;
    const wasHolding = holding;
    holding = !inTransition;
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
      flight.travel(poses[scene], poses[scene + 1], progress, card.clientHeight, direction);
    } else {
      if (transition !== -1) clearSceneStyles();
      transition = -1;
      setGround(grounds[current]);
      flight.hold(poses[current]);
    }

    if (!reduced) {
      const hold = scene === 3 ? Math.min(1, local / timing.hold) : 0;
      seed.dataset.holdRotation = String(hold * 40);
      seed.dataset.holdScale = String(1 + hold * 0.06);
    }
    if (wasHolding !== holding) {
      bob?.pause(0);
      updateActivity();
    }
  }

  function refresh() {
    clearSceneStyles();
    poses = measureBirdPoses(card, scenes, bird);
    transition = -1;
    bob?.invalidate();
    if (depthSway) {
      const time = depthSway.totalTime();
      depthSway.invalidate().totalTime(time);
    }
    render();
  }

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
  const stopWatching = watchActivity(stage, visible => {
    active = visible;
    updateActivity();
  });

  return {
    timeline,
    dispose() {
      stopWatching();
      depthScale?.revert();
      depthSway?.revert();
      clearSceneStyles();
      card.style.backgroundColor = originalGround;
      for (const scene of scenes) delete scene.dataset.sceneState;
      bird.removeAttribute('style');
      depth.removeAttribute('style');
      hover.removeAttribute('style');
      bird.dataset.sceneState = 'hidden';
      delete birdCanvas.dataset.ground;
    },
  };
}
