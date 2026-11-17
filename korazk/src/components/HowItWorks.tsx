import { Cpu, Database, Layers, type LucideIcon } from 'lucide-react';
import { Reveal, SectionHead, WRAP } from './primitives';

interface Step {
  n: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  tags: string[];
  where: string;
  note: string;
  tone: 'witness' | 'proof';
}

const STEPS: Step[] = [
  {
    n: '01',
    icon: Database,
    title: 'Plain-English Intent & Web2 Bridge',
    desc: 'Connects to Nigerian Open Banking (Mono/Okra) and Identity (Dojah/Prembly) via a stateless, zero-storage Rust attestor.',
    tags: ['Mono', 'Okra', 'Dojah', 'Prembly'],
    where: 'Stateless attestor',
    note: 'Zero storage',
    tone: 'witness',
  },
  {
    n: '02',
    icon: Cpu,
    title: 'Client-Side xark WASM Proving',
    desc: 'Circuits written in pure Rust (require_eq, Ed25519, Merkle inclusion) execute locally in the user’s browser.',
    tags: ['require_eq', 'Ed25519', 'Merkle inclusion'],
    where: 'Your browser',
    note: 'Inputs stay local',
    tone: 'witness',
  },
  {
    n: '03',
    icon: Layers,
    title: 'Instant Solana Verification',
    desc: 'Self-contained no_std Rust verifier checks the 256-byte proof via Solana’s native alt_bn128 syscalls in milliseconds.',
    tags: ['no_std', 'alt_bn128', 'Groth16'],
    where: 'Solana',
    note: 'Sees 256 bytes only',
    tone: 'proof',
  },
];

const TONE = {
  witness: { icon: 'bg-witness/10 text-witness ring-witness/25', dot: 'bg-witness', text: 'text-witness' },
  proof: { icon: 'bg-proof/10 text-proof ring-proof/25', dot: 'bg-proof', text: 'text-proof' },
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative border-t border-white/[0.07] py-24 sm:py-32">
      <div className={WRAP}>
        <SectionHead
          tag="Architecture"
          title="How it works under the hood"
          lede="Three clean layers. No servers hold your data."
        />

        <div className="relative mt-14">
          {/* Rail: a packet leaves as private data and arrives as a proof */}
          <div aria-hidden="true" className="relative mb-5 hidden lg:grid lg:grid-cols-3 lg:gap-8">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative flex h-6 items-center">
                <span className={`relative z-10 h-2.5 w-2.5 rounded-[2px] ${TONE[step.tone].dot}`} />
                <span
                  className={`absolute left-2.5 top-1/2 h-px ${
                    i < STEPS.length - 1 ? '-right-8 bg-white/15' : 'right-0 bg-linear-to-r from-white/15 to-transparent'
                  }`}
                />
              </div>
            ))}
            <span className="rail-packet" />
          </div>

          <ol className="grid gap-5 lg:grid-cols-3 lg:gap-8">
            {STEPS.flatMap((step, i) => {
              const Icon = step.icon;
              const tone = TONE[step.tone];
              const card = (
                <li key={step.n}>
                  <Reveal delay={i * 110} className="h-full">
                    <article className="panel relative flex h-full flex-col clipped p-6 sm:p-7">
                      <span
                        aria-hidden="true"
                        className="display absolute right-5 top-4 select-none text-[54px] text-white/[0.045]"
                      >
                        {step.n}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className={`grid h-10 w-10 place-items-center rounded-[10px] ring-1 ring-inset ${tone.icon}`}>
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="label text-dim">Layer {step.n}</span>
                      </div>
                      <h3 className="display-sm mt-5 text-balance text-[18px] text-bone">{step.title}</h3>
                      <p className="mt-3 text-[14.5px] leading-relaxed text-mute">{step.desc}</p>
                      <ul className="mt-5 flex flex-wrap gap-1.5">
                        {step.tags.map((tag) => (
                          <li
                            key={tag}
                            className="rounded-[5px] bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-bone/75 ring-1 ring-inset ring-white/[0.08]"
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto pt-6">
                        <div className="flex items-end justify-between gap-3 border-t border-white/[0.07] pt-4">
                          <span>
                            <span className="label block text-[9.5px] text-dim">Runs in</span>
                            <span className="mt-1.5 block text-[13.5px] font-medium text-bone">{step.where}</span>
                          </span>
                          <span className={`label text-right text-[9.5px] ${tone.text}`}>{step.note}</span>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                </li>
              );
              if (i !== STEPS.length - 1) return [card];
              return [
                <li key="boundary" aria-hidden="true" className="flex items-center gap-3 lg:hidden">
                  <span className="h-px flex-1 border-t border-dashed border-white/25" />
                  <span className="label text-[9.5px] text-dim">Device boundary · 256 bytes cross</span>
                  <span className="h-px flex-1 border-t border-dashed border-white/25" />
                </li>,
                card,
              ];
            })}
          </ol>

          {/* Only the proof crosses this line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 hidden lg:block"
            style={{ left: 'calc((100% - 4rem) * 2 / 3 + 3rem)' }}
          >
            <span className="absolute left-0 top-0 h-full border-l border-dashed border-white/25" />
            <span className="label absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-180 whitespace-nowrap bg-ink-950 py-2.5 text-[9.5px] text-dim [writing-mode:vertical-rl]">
              Device boundary
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
