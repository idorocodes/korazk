import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Menu, Wallet, X } from 'lucide-react';
import { LogoMark, Wordmark } from './primitives';

import { BRAND } from '../lib/proof';

const SECTIONS = [
  { id: 'selective-prover', label: 'Selective Prover' },
  { id: 'use-cases', label: 'Use Cases' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'developers', label: 'Developers' },
  { id: 'ndpa-privacy', label: 'NDPA Privacy' },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

/** Highlights the nav link for whichever section sits in the middle of the viewport. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActive([...ids].reverse().find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);

  return active;
}





export function Nav({ onDemo }: { onDemo: () => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(SECTION_IDS);


  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const demo = () => {
    setOpen(false);
    onDemo();
  };

 

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
      {/* Inset so the logo and CTA line up with the page gutter below */}
      <nav
        aria-label="Primary"
        className={`nav-shell mx-auto flex h-14 max-w-[1208px] items-center justify-between gap-4 rounded-2xl pl-2 pr-1 sm:px-4 ${
          scrolled || open ? 'is-solid' : ''
        }`}
      >
        <a href="#top" aria-label={`${BRAND} — back to top`} className="logo flex items-center gap-2.5 rounded-lg">
          <LogoMark size={26} />
          <Wordmark />
        </a>

        <ul className="hidden items-center gap-0.5 lg:flex">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={active === s.id ? 'true' : undefined}
                className={`nav-link ${active === s.id ? 'is-active' : ''}`}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
         
          <button type="button" onClick={demo} className="btn btn-primary h-9 px-4 text-[13px]">
            Try Live Demo
          </button>
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-xl text-mute transition-colors hover:text-bone sm:-mr-2.5 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="mx-auto mt-2 max-w-[1208px] rounded-2xl bg-ink-900/95 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.09),0_30px_60px_-30px_#000] backdrop-blur-xl lg:hidden"
        >
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center justify-between rounded-xl px-3 text-[15px] font-medium text-bone/90 transition-colors hover:bg-white/[0.05]"
                >
                  {s.label}
                  <ArrowRight className="h-4 w-4 text-dim" />
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.08] pt-3">
           
            <button type="button" onClick={demo} className="btn btn-primary h-11 text-[13.5px]">
              Try Live Demo
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
