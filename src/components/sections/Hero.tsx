import { hero } from '@/data/site';
import { BackgroundPicker } from '@/components/layout/BackgroundPicker';
import { MatrixTitle } from './hero/MatrixTitle';

export function Hero() {
  return (
    <section id="index" data-scene data-scene-ground="#ffffff" aria-labelledby="index-title" className="relative isolate h-svh supports-[height:100dvh]:h-dvh overflow-hidden">
      <BackgroundPicker />
      <MatrixTitle id="index-title" phrases={hero.phrases} />
    </section>
  );
}
