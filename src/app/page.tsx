import { SkipLink } from '@/components/layout/SkipLink';
import { Navigation } from '@/components/sections/Navigation';
import { Hero } from '@/components/sections/Hero';
import { Manifesto } from '@/components/sections/Manifesto';
import { Projects } from '@/components/sections/Projects';
import { Experimental } from '@/components/sections/Experimental';
import { Capabilities } from '@/components/sections/Capabilities';
import { Contact } from '@/components/sections/Contact';
import { Footer } from '@/components/sections/Footer';

export default function Home() {
  return (
    <>
      <SkipLink />
      <Navigation />
      <main id="main">
        <Hero />
        <Manifesto />
        <Projects />
        <Experimental />
        <Capabilities />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
