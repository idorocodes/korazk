import { useEffect, useMemo, useState } from 'react';
import { EyeOff, ShieldCheck } from 'lucide-react';
import { ProofGrid, useProofCells, type GridMode } from './ProofGrid';
import { CornerTicks, Reveal, SectionHead, WRAP } from './primitives';
import { useInView, usePrefersReducedMotion } from '../lib/hooks';
import { TRANSACTIONS, proofBytes } from '../lib/proof';

const OLD_WAY = [
  'Uploading raw NIN slips to random verification sites',
  'Sending 6-month PDF bank statements to landlords and loan apps',
  'Exposing your main crypto wallet in every P2P trade',
  'Creating permanent data honeypots that can be breached',
];

const ZK_WAY = [
  'Mathematical certainty without data leaks',
  'Share a single cryptographic receipt over WhatsApp or QR',
  'Verify on-chain in ~77k compute units — nothing else leaves the device',
  'Zero BVN, NIN, or full statements ever touch a server',
];

/** One line of the mock paper statement; flagged lines are the ones nobody needed to see. */
function PaperRow({ k, v, flag = false }: { k: string; v: string; flag?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="w-[86px] shrink-0 opacity-60">{k}</dt>
      <dd className={`px-1 ${flag ? 'bg-exposed/30 font-semibold' : ''}`}>{v}</dd>
      {flag && (
        <span className="ml-auto rounded-[2px] bg-exposed px-1 py-px text-[7.5px] font-bold tracking-[0.1em]">
          EXPOSED
        </span>
      )}
    </div>
  );
}

export function Compare() {
  const reduced = usePrefersReducedMotion();
  const [chipRef, chipIn] = useInView<HTMLDivElement>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!chipIn) return;
    const t = window.setTimeout(() => setDone(true), reduced ? 0 : 1150);
    return () => window.clearTimeout(t);
  }, [chipIn, reduced]);

  const bytes = useMemo(() => proofBytes('compare-proof'), []);
  const mode: GridMode = done ? 'done' : chipIn && !reduced ? 'lock' : 'static';
  const { cells, locked } = useProofCells(bytes, mode, { lockMs: 1000 });

  return (
    <section className="relative py-24 sm:py-32">
      <div className={WRAP}>
        <SectionHead
          tag="The problem"
          tone="exposed"
          title="Oversharing is the old way"
          lede="Traditional verification forces you to hand over far more data than necessary. Zero-knowledge proofs change the equation."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {/* ── The old way: paper, everything on it ── */}
          <Reveal>
            <article className="panel flex h-full flex-col clipped">
              <div
                aria-hidden="true"
                className="relative h-[300px] clipped border-b border-white/[0.07] bg-[radial-gradient(120%_90%_at_50%_0%,rgba(255,107,87,0.1),transparent)]"
              >
                <div className="paper absolute right-4 top-5 w-[200px] rotate-[5deg] p-3 text-[9px] leading-[1.55]">
                  <p className="font-bold tracking-[0.1em]">NIN SLIP</p>
                  <div className="mt-2 flex gap-2.5">
                    <div className="h-[50px] w-[40px] shrink-0 bg-paper-ink/20" />
                    <div>
                      <p>
                        NIN <b>2984 316 7705</b>
                      </p>
                      <p>DOB 14 MAR 1996</p>
                      <p>SEX F</p>
                    </div>
                  </div>
                </div>

                <div className="paper absolute left-4 top-[52px] w-[min(86%,430px)] -rotate-2 p-4 text-[10px] leading-[1.65] sm:left-6">
                  <div className="flex items-baseline justify-between gap-3 border-b border-paper-ink/30 pb-2">
                    <span className="text-[12px] font-bold">GTBank</span>
                    <span className="truncate tracking-[0.06em]">STATEMENT · JUN–NOV 2026</span>
                  </div>
                  <dl className="mt-2 space-y-0.5">
                    <PaperRow k="ACCOUNT NAME" v="FOLASADE A. BELLO" flag />
                    <PaperRow k="ACCOUNT NO." v="0148 22 4821" />
                    <PaperRow k="BVN" v="2231 456 7890" flag />
                    <PaperRow k="CLOSING BAL." v="₦1,284,650.22" flag />
                  </dl>
                  <div className="mt-2 border-t border-paper-ink/30 pt-2">
                    {TRANSACTIONS.map((tx) => (
                      <div key={tx.id} className="flex justify-between gap-3">
                        <span className="truncate">
                          {tx.date.slice(0, 6).toUpperCase()} · {tx.desc}
                        </span>
                        <span className="shrink-0">{tx.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-ink-900 via-ink-900/85 to-transparent" />
                <div className="absolute inset-x-5 bottom-4 flex items-center gap-3 sm:inset-x-6">
                  <span className="label text-exposed">Data shared</span>
                  <span className="hatch hatch-exposed h-2 flex-1 rounded-[2px]" />
                  <span className="label text-exposed">Everything</span>
                </div>
              </div>

              <div className="flex-1 p-6 sm:p-8">
                <div className="flex items-center gap-3.5">
                  <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-exposed/10 text-exposed ring-1 ring-inset ring-exposed/25">
                    <EyeOff className="h-[18px] w-[18px]" />
                  </span>
                  <h3 className="display-sm text-[19px] text-bone">The Old Way</h3>
                </div>
                <ul className="mt-6 space-y-3.5">
                  {OLD_WAY.map((item) => (
                    <li key={item} className="flex gap-3.5 text-[14.5px] leading-relaxed text-mute">
                      <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-[1px] bg-exposed" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </Reveal>

          {/* ── The new way: 256 bytes ── */}
          <Reveal delay={120}>
            <article className="panel flex h-full flex-col clipped shadow-[inset_0_0_0_1px_rgba(87,242,174,0.26),0_50px_90px_-60px_rgba(0,0,0,0.95)]">
              <div
                aria-hidden="true"
                className="relative grid h-[300px] place-items-center clipped border-b border-white/[0.07] bg-[radial-gradient(90%_75%_at_50%_35%,rgba(87,242,174,0.12),transparent)]"
              >
                <p className="label absolute left-5 top-5 text-dim sm:left-6">proof.bin</p>
                <p className="label absolute right-5 top-5 text-dim sm:right-6">Actual contents</p>
                <div ref={chipRef} className="relative -mt-4 w-[152px]">
                  <CornerTicks className="border-proof/60" />
                  <ProofGrid cells={cells} locked={locked} mode={mode} hex={false} />
                </div>
                <div className="absolute inset-x-5 bottom-4 flex items-center gap-3 sm:inset-x-6">
                  <span className="label text-proof">Data shared</span>
                  <span className="h-2 w-2 rounded-[2px] bg-proof" />
                  <span className="h-px flex-1 border-t border-dashed border-white/15" />
                  <span className="label text-proof">256 bytes</span>
                </div>
              </div>

              <div className="flex-1 p-6 sm:p-8">
                <div className="flex items-center gap-3.5">
                  <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-proof/10 text-proof ring-1 ring-inset ring-proof/25">
                    <ShieldCheck className="h-[18px] w-[18px]" />
                  </span>
                  <h3 className="display-sm text-[19px] text-bone">With 256-Byte ZK Proofs</h3>
                </div>
                <ul className="mt-6 space-y-3.5">
                  {ZK_WAY.map((item) => (
                    <li key={item} className="flex gap-3.5 text-[14.5px] leading-relaxed text-mute">
                      <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-[1px] bg-proof" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
