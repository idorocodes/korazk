import { ArrowRight, ExternalLink } from 'lucide-react';
import { CellField } from './CellField';
import { LogoMark, Reveal, WRAP, Wordmark } from './primitives';
import { BRAND, LINKS, VERIFY_CU } from '../lib/proof';

export function FinalCta({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="relative isolate clipped border-t border-white/[0.07] py-28 sm:py-40">
      <CellField className="cellfield-radial absolute inset-0 -z-10 h-full w-full" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[620px] w-[min(980px,120%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(87,242,174,0.1),transparent)]"
      />

      <Reveal className="mx-auto max-w-[1040px] px-5 text-center sm:px-8">
        <h2 className="display text-[length:clamp(1.5rem,7.5vw,4.3rem)] text-bone">
          <span className="block">
            Stop sending <span className="strike">PDFs and ID cards.</span>
          </span>
          <span className="glow-proof block text-proof">Start sending math.</span>
        </h2>
        <p className="mx-auto mt-7 max-w-[52ch] text-pretty text-[16.5px] leading-[1.65] text-mute">
          Generate a 256-byte proof in your browser. Verify it on Solana in under 80k compute units. Your data never
          leaves the device.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" onClick={onDemo} className="btn btn-primary h-12 w-full px-7 text-[14.5px] sm:w-auto">
            Launch App
            <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <a href={LINKS.docs} className="btn btn-ghost h-12 w-full px-7 text-[14.5px] sm:w-auto">
            Read Docs / GitHub
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </Reveal>
    </section>
  );
}

const FOOTER_LINKS = [
  { label: 'Selective Prover', href: '#selective-prover' },
  { label: 'Use Cases', href: '#use-cases' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Developers', href: '#developers' },
  { label: 'NDPA Privacy', href: '#ndpa-privacy' },
  { label: 'Docs', href: LINKS.docs },
  { label: 'GitHub', href: LINKS.github },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07] bg-ink-900/50">
      <div className={`${WRAP} grid gap-10 py-14 md:grid-cols-12`}>
        <div className="md:col-span-5">
          <a href="#top" aria-label={`${BRAND} — back to top`} className="logo inline-flex items-center gap-2.5 rounded-lg">
            <LogoMark size={26} />
            <Wordmark />
          </a>
          <p className="mt-4 max-w-[34ch] text-[14.5px] leading-relaxed text-mute">
            Prove anything about your finances or ID. Reveal nothing.
          </p>
        </div>

        <nav aria-label="Footer" className="md:col-span-4">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-3 text-[14px]">
            {FOOTER_LINKS.map((link) => (
              <li key={link.label}>
                <a href={link.href} className="rounded text-mute transition-colors hover:text-bone">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3 md:col-span-3 md:text-right">
          <p className="label inline-flex items-center gap-2 text-proof">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-proof" />
            Live on Solana
          </p>
          <p className="label text-dim">Built for Nigeria &amp; Africa</p>
        </div>
      </div>

      <div className="border-t border-white/[0.06] text-center">
        <div className={`${WRAP} flex flex-col justify-between gap-2 py-5 text-[12.5px] text-dim sm:flex-row sm:items-center`}>
          <p>
            © {new Date().getFullYear()} {BRAND}. Privacy by design.
          </p>
          <p className="font-mono">256 bytes · {VERIFY_CU} CU · 0 PII</p>
        </div>
      </div>
    </footer>
  );
}
