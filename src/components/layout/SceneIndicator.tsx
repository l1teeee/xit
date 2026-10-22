'use client';

import { useSyncExternalStore } from 'react';
import './sceneIndicator.css';

const SCENE_COUNT = 4;
const DARK_GROUND = '#000000';
const SCENE_MARKS = Array.from({ length: SCENE_COUNT }, (_, markIndex) => markIndex);

function listScenes(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'));
}

function subscribeToSceneChanges(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  for (const scene of listScenes()) {
    observer.observe(scene, { attributes: true, attributeFilter: ['data-scene-state'] });
  }
  return () => observer.disconnect();
}

// Before the stage is active no scene has a state, so the first scene counts as current.
function getCurrentSceneIndex(): number {
  const stagedIndex = listScenes().findIndex((scene) => scene.dataset.sceneState === 'current');
  return Math.max(stagedIndex, 0);
}

function isCurrentSceneDark(): boolean {
  const currentScene = listScenes()[getCurrentSceneIndex()];
  return currentScene?.dataset.sceneGround === DARK_GROUND;
}

function getServerSceneIndex(): number {
  return 0;
}

function getServerIsDark(): boolean {
  return false;
}

export function SceneIndicator() {
  const currentIndex = useSyncExternalStore(subscribeToSceneChanges, getCurrentSceneIndex, getServerSceneIndex);
  const onDarkGround = useSyncExternalStore(subscribeToSceneChanges, isCurrentSceneDark, getServerIsDark);

  return (
    <div className="scene-indicator" data-ground={onDarkGround ? 'dark' : 'light'} aria-hidden="true">
      {SCENE_MARKS.map((markIndex) => (
        <span key={markIndex} className="scene-indicator-mark" data-current={markIndex === currentIndex} />
      ))}
    </div>
  );
}
