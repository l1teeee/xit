import { BackgroundStyleProvider } from '@/components/layout/BackgroundStyle';
import { SceneIndicator } from '@/components/layout/SceneIndicator';
import { SiteBackground } from '@/components/layout/SiteBackground';
import { Hero } from '@/components/sections/Hero';
import { Life } from '@/components/sections/Life';
import { Garden } from '@/components/sections/Garden';
import { Cycle } from '@/components/sections/Cycle';
import { SceneStage } from '@/components/stage/SceneStage';

export default function Home() {
  return (
    <BackgroundStyleProvider>
      <SiteBackground />
      <main id="main">
        <SceneStage>
          <Hero />
          <Life />
          <Garden />
          <Cycle />
        </SceneStage>
      </main>
      <SceneIndicator />
    </BackgroundStyleProvider>
  );
}
