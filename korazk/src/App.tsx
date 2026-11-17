import { useCallback, useState } from 'react';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Stats } from './components/Stats';
import { Compare } from './components/Compare';
import { SelectiveProver } from './components/SelectiveProver';
import { UseCases } from './components/UseCases';
import { HowItWorks } from './components/HowItWorks';
import { Developers } from './components/Developers';
import { FinalCta, Footer } from './components/Closing';
import { Toaster } from './components/primitives';

/**
 * KoraZK — privacy-preserving zero-knowledge proof platform.
 * Brand name lives in src/lib/proof.ts (BRAND).
 */
export default function App() {
  // Bumped by "Try Live Demo" / "Launch App"; the hero scrolls up and runs a proof.
  const [demoSignal, setDemoSignal] = useState(0);
  const runDemo = useCallback(() => setDemoSignal((n) => n + 1), []);

  return (
    <div id="top" className="grain relative min-h-screen clipped-x bg-ink-950 text-bone">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav onDemo={runDemo} />
      <main id="main">
        <Hero demoSignal={demoSignal} />
        <Stats />
        <Compare />
        <SelectiveProver />
        <UseCases />
        <HowItWorks />
        <Developers />
        <FinalCta onDemo={runDemo} />
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
