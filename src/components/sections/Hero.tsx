import { hero } from '@/data/site';
import { SiteBackground } from '@/components/layout/SiteBackground';
import { MatrixTitle } from './hero/MatrixTitle';

export function Hero() {
  return (
    <section id="index" aria-labelledby="index-title" className="relative isolate h-svh supports-[height:100dvh]:h-dvh overflow-hidden">
      <SiteBackground />
      <MatrixTitle id="index-title" phrases={hero.phrases} />
    </section>
  );
}
