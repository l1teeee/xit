import { SCENE_PALETTE } from '@/data/scenePalette';
import { garden } from '@/data/site';
import { MatrixTitle } from './hero/MatrixTitle';
import { GardenWater } from './garden/GardenWater';
import './garden/garden.css';

export function Garden() {
  return (
    <section id="garden" data-scene data-scene-ground="#000000" data-scene-frame={SCENE_PALETTE.garden.frame} aria-labelledby="garden-title" className="garden-section">
      <GardenWater />
      <div className="garden-header">
        <MatrixTitle id="garden-title" phrases={garden.phrases} headingLevel={2} soundHint={false} variant="section" />
      </div>
    </section>
  );
}
