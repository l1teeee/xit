import { cycle } from '@/data/site';
import { MatrixTitle } from './hero/MatrixTitle';
import { HabitatMotion } from './nature/HabitatMotion';
import { SeedHead } from './nature/SeedHead';

export function Cycle() {
  return (
    <section id="cycle" data-scene data-scene-ground="#ffffff" className="nature-cycle" aria-labelledby="cycle-title">
      <HabitatMotion>
        <SeedHead />
        <div className="cycle-bird" data-bird-anchor data-bird-facing="right" aria-hidden="true" />
      </HabitatMotion>
      <div className="cycle-copy">
        <p className="cycle-overline">From a bit. To a bloom.</p>
        <MatrixTitle id="cycle-title" phrases={cycle.phrases} headingLevel={2} soundHint={false} variant="section" />
        <a className="cycle-return" href="#index">Begin again <span aria-hidden="true">+</span></a>
      </div>
    </section>
  );
}
