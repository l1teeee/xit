import { SCENE_PALETTE } from '@/data/scenePalette';
import { MatrixTitle } from './hero/MatrixTitle';
import { cycle } from '@/data/site';
import { CycleVoid } from './cycle/CycleVoid';
import './cycle/cycle.css';

export function Cycle() {
  return (
    <section id="cycle" data-scene data-scene-ground="#ffffff" data-scene-frame={SCENE_PALETTE.cycle.frame} className="cycle-section" aria-labelledby="cycle-title">
      <CycleVoid />
      <div className="cycle-copy">
        <MatrixTitle id="cycle-title" phrases={cycle.phrases} headingLevel={2} soundHint={false} variant="section" />
      </div>
    </section>
  );
}
