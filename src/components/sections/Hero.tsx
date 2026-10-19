import { hero, site } from '@/data/site';
import { FadeUp } from './hero/FadeUp';
import { SiteBackground } from '@/components/layout/SiteBackground';
import { HeroHeadline } from './hero/HeroHeadline';
import { HeroReadouts } from './hero/HeroReadouts';
import { HeroSphere } from './hero/HeroSphere';
import { HeroStage } from './hero/HeroStage';
import { VariantPicker } from './hero/VariantPicker';

export function Hero() {
  return (
    <HeroStage>
      <section id="index" aria-labelledby="index-title" className="relative isolate h-svh supports-[height:100dvh]:h-dvh overflow-hidden px-gutter">
        <SiteBackground />
        <div className="flex h-full flex-col py-4 landscape:py-6">
          <FadeUp delay={0.2} className="relative z-10">
            <div className="label-mono flex items-baseline justify-between gap-4 border-b border-line pb-3">
              <span className="text-ink">{site.name}</span>
              <span className="flex gap-4 text-dim">
                <span>{site.year}</span>
                <span>{site.coordinates}</span>
              </span>
            </div>
          </FadeUp>

          <FadeUp delay={0.45} className="relative z-10 mt-4 max-w-[34ch] text-body landscape:mt-8">
            <p className="label-mono"><span className="text-dim">{hero.label}</span></p>
            <p className="mt-2 text-mute">{hero.subtitle}</p>
          </FadeUp>

          <div className="grid min-h-0 flex-1 place-items-center [container-type:size] landscape:absolute landscape:inset-y-0 landscape:right-[-5vw] landscape:w-[min(88dvh,64vw)]">
            <div className="relative aspect-square size-[min(100cqw,100cqh)]">
              <HeroSphere />
            </div>
          </div>

          <div className="relative mt-auto flex flex-col gap-4 pt-2">
            <HeroHeadline lines={hero.titleLines} />
            <div className="flex flex-col gap-3 landscape:flex-row landscape:items-end landscape:justify-between">
              <FadeUp delay={0.75}><HeroReadouts /></FadeUp>
              <FadeUp delay={0.85}><VariantPicker /></FadeUp>
            </div>
          </div>
        </div>
      </section>
    </HeroStage>
  );
}
