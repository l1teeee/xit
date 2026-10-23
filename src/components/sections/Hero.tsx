import { SCENE_PALETTE } from '@/data/scenePalette';
import { hero } from '@/data/site';
import { MatrixTitle } from './hero/MatrixTitle';

export function Hero() {
  return (
    <section id="index" data-scene data-scene-ground="#ffffff" data-scene-frame={SCENE_PALETTE.index.frame} aria-labelledby="index-title" className="relative isolate h-svh supports-[height:100dvh]:h-dvh overflow-hidden">
      <MatrixTitle id="index-title" phrases={hero.phrases} />
    </section>
  );
}
