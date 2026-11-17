import type { ReactNode } from 'react';
import { Building2, Gift, Smartphone, Unlink, Users, WifiOff, type LucideIcon } from 'lucide-react';
import { QRCode, Reveal, SectionHead, WRAP } from './primitives';
import { spotlight } from '../lib/hooks';

/* Small diagrams built from the same parts as the rest of the page:
   amber hatch = stays private, mint = proven. */

function RentVisual() {
  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center gap-3">
        <span className="label w-[58px] shrink-0 text-[9.5px] text-dim">Salary</span>
        <span className="hatch h-2.5 flex-1 rounded-[2px]" />
      </div>
      <div className="flex items-center gap-3">
        <span className="label w-[58px] shrink-0 text-[9.5px] text-dim">3× rent</span>
        <span className="h-2.5 w-[42%] rounded-[2px] bg-white/25" />
      </div>
    </div>
  );
}

function EscrowVisual() {
  return (
    <div className="flex w-full items-center gap-2.5">
      <span className="min-w-0 flex-1 rounded-[7px] p-2.5 ring-1 ring-inset ring-witness/30">
        <span className="label block text-[9.5px] text-dim">Main</span>
        <span className="hatch mt-2 block h-2 rounded-[2px]" />
      </span>
      <Unlink className="h-3.5 w-3.5 shrink-0 text-dim" />
      <span className="min-w-0 flex-1 rounded-[7px] p-2.5 ring-1 ring-inset ring-proof/35">
        <span className="label block text-[9.5px] text-dim">Burner</span>
        <span className="mt-1.5 block truncate font-mono text-[10.5px] leading-none text-proof">9fQp…x2Ak</span>
      </span>
    </div>
  );
}

function SybilVisual() {
  return (
    <div className="grid w-full grid-cols-8 gap-1.5">
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          className={
            i === 5 ? 'aspect-square rounded-[2px] bg-proof' : 'sybil-x aspect-square rounded-[2px] bg-white/[0.07]'
          }
        />
      ))}
    </div>
  );
}

function VoucherVisual() {
  return (
    <div className="flex w-full items-center gap-4">
      <QRCode text="KoraZK offline voucher · demo" label="" className="h-[64px] w-[64px] shrink-0 text-bone" />
      <div>
        <p className="label flex items-center gap-1.5 text-[9.5px] text-dim">
          <WifiOff className="h-3 w-3" /> Offline
        </p>
        <p className="label mt-2 text-[9.5px] text-proof">256 bytes</p>
      </div>
    </div>
  );
}

const CASES: { icon: LucideIcon; title: string; desc: string; claim: string; visual: ReactNode }[] = [
  {
    icon: Building2,
    title: 'Renting & Loans',
    desc: 'Prove your salary is at least 3× your rent via Mono/Okra, without handing over your full bank history.',
    claim: 'salary >= 3 * rent',
    visual: <RentVisual />,
  },
  {
    icon: Users,
    title: 'Shielded P2P Escrow',
    desc: 'Prove Naira transfer confirmation and release escrowed USDC to a fresh burner wallet.',
    claim: 'naira_transfer == confirmed',
    visual: <EscrowVisual />,
  },
  {
    icon: Gift,
    title: 'Sybil-Resistant Airdrops',
    desc: 'Prove a unique, valid NIN via Dojah/Prembly plus a nullifier. Bots can’t farm rewards.',
    claim: 'claims_per_nin == 1',
    visual: <SybilVisual />,
  },
  {
    icon: Smartphone,
    title: 'Offline QR Vouchers',
    desc: 'A 256-byte proof is smaller than a tweet. Scan offline at POS and settle later.',
    claim: 'proof.len() == 256',
    visual: <VoucherVisual />,
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="relative border-t border-white/[0.07] py-24 sm:py-32">
      <div className={WRAP}>
        <SectionHead
          tag="Use cases"
          title="Real-world use cases"
          lede="Built for everyday Nigerians, fintechs, and Solana developers."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CASES.map(({ icon: Icon, title, desc, claim, visual }, i) => (
            <Reveal key={title} delay={i * 80}>
              <article onPointerMove={spotlight} className="spot panel flex h-full flex-col clipped">
                <div aria-hidden="true" className="flex h-[116px] items-center border-b border-white/[0.07] px-5">
                  {visual}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="display-sm flex items-center gap-2.5 text-[16.5px] text-bone">
                    <Icon className="h-4 w-4 shrink-0 text-proof" />
                    {title}
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-mute">{desc}</p>
                  <p className="mt-auto pt-5">
                    <code className="inline-block rounded-[6px] bg-white/[0.04] px-2 py-1.5 font-mono text-[11.5px] text-bone/80 ring-1 ring-inset ring-white/[0.08]">
                      {claim}
                    </code>
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
