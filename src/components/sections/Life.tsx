import { life } from '@/data/site';
import { MatrixTitle } from './hero/MatrixTitle';
import { HabitatArtwork } from './life/HabitatArtwork';
import { LifeBackdrop } from './life/LifeBackdrop';
import { HabitatMotion } from './nature/HabitatMotion';
import './nature/nature.css';

export function Life() {
  return (
    <section
      id="life"
      data-scene
      data-scene-ground="#ffffff"
      aria-labelledby="life-title"
      className="nature-habitat"
    >
      <LifeBackdrop />
      <HabitatMotion>
        <HabitatArtwork />
      </HabitatMotion>
      <div className="habitat-specimen">
        <div className="habitat-bird" data-bird-anchor data-bird-facing="left" aria-hidden="true" />
        <p className="habitat-specimen-note">Wild, by design.</p>
      </div>
      <div className="habitat-statement">
        <MatrixTitle id="life-title" phrases={life.phrases} headingLevel={2} soundHint={false} variant="section" />
      </div>
    </section>
  );
}
