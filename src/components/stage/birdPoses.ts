export type BirdPose = {
  x: number;
  y: number;
  scale: number;
  facing: number;
  opacity: number;
};

export function measureBirdPoses(card: HTMLElement, scenes: HTMLElement[], bird: HTMLElement): BirdPose[] {
  const bounds = card.getBoundingClientRect();
  const life = scenes[1].querySelector<HTMLElement>('[data-bird-anchor]')!;
  const width = life.getBoundingClientRect().width;
  bird.style.width = `${width}px`;
  bird.style.height = `${width * 34 / 51}px`;

  return scenes.map((scene, index) => {
    if (index === 0) {
      return { x: bounds.width * 1.15, y: bounds.height * 0.4, scale: 0.3, facing: 1, opacity: 0 };
    }
    const anchor = scene.querySelector<HTMLElement>('[data-bird-anchor]')!;
    const box = anchor.getBoundingClientRect();
    return {
      x: box.left - bounds.left + box.width / 2,
      y: box.top - bounds.top + box.height / 2,
      scale: box.width / width,
      facing: anchor.dataset.birdFacing === 'right' ? -1 : 1,
      opacity: 1,
    };
  });
}
