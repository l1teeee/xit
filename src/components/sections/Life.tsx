import { SCENE_PALETTE } from '@/data/scenePalette';
import { life } from '@/data/site';
import { MatrixTitle } from './hero/MatrixTitle';
import { LifeBloom } from './life/LifeBloom';
import { getBloomLayoutStyle } from './life/bloomLayout';
import './nature/nature.css';
import './life/bloom.css';

export function Life() {
  return (
    <section
      id="life"
      data-scene
      data-scene-ground="#ffffff"
      data-scene-frame={SCENE_PALETTE.life.frame}
      aria-labelledby="life-title"
      className="nature-habitat"
      style={getBloomLayoutStyle()}
    >
      <LifeBloom />
      <div className="bloom-copy">
        <MatrixTitle id="life-title" phrases={life.phrases} headingLevel={2} soundHint={false} variant="section" />
      </div>
    </section>
  );
}
