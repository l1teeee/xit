import { HummingbirdCanvas } from '@/components/sections/life/HummingbirdCanvas';

export function BirdFlight() {
  return (
    <div className="bird-flight" data-scene-state="hidden" aria-hidden="true">
      <div className="bird-depth">
        <div className="bird-hover"><HummingbirdCanvas /></div>
      </div>
    </div>
  );
}
