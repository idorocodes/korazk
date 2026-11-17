import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Lock, RotateCcw } from 'lucide-react';
import { ProofGrid, useProofCells, type GridMode } from './ProofGrid';
import { CopyButton, CornerTicks, Reveal, SectionHead, WRAP } from './primitives';
import { cssVars, usePrefersReducedMotion } from '../lib/hooks';
import { TRANSACTIONS, proofBytes, toHex } from '../lib/proof';

export function SelectiveProver() {
  const reduced = usePrefersReducedMotion();
  const [selected, setSelected] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const select = (id: number | null) => {
    if (timer.current) window.clearTimeout(timer.current);
    setReady(false);
    if (id === null || id === selected) {
      setSelected(null);
      return;
    }
    setSelected(id);
    timer.current = window.setTimeout(() => setReady(true), reduced ? 120 : 1050);
  };

  const tx = TRANSACTIONS.find((t) => t.id === selected) ?? null;
  const bytes = useMemo(() => (tx ? proofBytes(`statement-${tx.id}-${tx.desc}`) : null), [tx]);
  const hex = useMemo(() => (bytes ? toHex(bytes) : ''), [bytes]);
  const mode: GridMode = !tx ? 'static' : ready ? 'done' : reduced ? 'static' : 'lock';
  const { cells, locked } = useProofCells(bytes, mode, { lockMs: 850 });

  return (
    <section id="selective-prover" className="relative border-t border-white/[0.07] py-24 sm:py-32">
      <div className={WRAP}>
        <SectionHead
          tag="Selective disclosure"
          tone="witness"
          title="Selective Bank Statement Prover"
          lede="Click any single transaction. Everything else stays private. The proof confirms only what you choose to reveal."
        />

        <Reveal className="mt-14 grid gap-5 lg:grid-cols-12 lg:items-start">
          {/* ── The statement, on your device ── */}
          <div className="panel clipped lg:col-span-7">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-[#ff7a1a]/15 text-[11px] font-bold tracking-wide text-[#ff9d55]">
                  GT
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-bone">
                    GTBank · <span className="font-mono">****4821</span>
                  </p>
                  <p className="text-[12px] text-dim">Statement · Nov 2026</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {tx && (
                  <button
                    type="button"
                    onClick={() => select(null)}
                    className="label flex items-center gap-1.5 rounded-md px-2 py-1.5 text-mute transition-colors hover:text-bone"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
                <span className="label text-dim">Demo</span>
              </div>
            </div>

            <ul>
              {TRANSACTIONS.map((t, i) => {
                const isSelected = selected === t.id;
                const isRedacted = selected !== null && !isSelected;
                const redact = isRedacted ? 'is-redacted' : '';
                return (
                  <li key={t.id} className="border-b border-white/[0.05] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => select(t.id)}
                      aria-pressed={isSelected}
                      aria-label={
                        isRedacted
                          ? 'Private witness — never shared. Activate to prove this transaction instead.'
                          : `${t.desc}, ${t.amount}, ${t.date}${isSelected ? ' — revealed' : ''}`
                      }
                      className={`tx-row ${isSelected ? 'is-selected' : ''}`}
                      style={cssVars({ '--rdx-delay': `${i * 55}ms` })}
                    >
                      <span className={`tx-mark ${isSelected ? 'is-on' : isRedacted ? 'is-off' : ''}`} />
                      <span className="block min-w-0 flex-1">
                        <span className="block">
                          <span
                            className={`rdx text-[13.5px] font-medium ${isSelected ? 'text-proof' : 'text-bone'} ${redact}`}
                          >
                            {t.desc}
                          </span>
                        </span>
                        <span className="mt-1 block">
                          <span className={`rdx text-[12px] text-dim ${redact}`}>{t.date}</span>
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={`rdx font-mono text-[13.5px] ${
                            isSelected ? 'text-proof' : t.type === 'credit' ? 'text-proof/75' : 'text-bone/85'
                          } ${redact}`}
                        >
                          {t.amount}
                        </span>
                        <span
                          className={`label text-[9.5px] ${
                            isSelected ? 'text-proof' : isRedacted ? 'text-witness' : 'text-dim'
                          }`}
                        >
                          {isSelected ? 'Revealed' : isRedacted ? 'Private' : t.type}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="border-t border-white/[0.07] px-5 py-3.5 text-[12.5px] text-dim">
              {tx
                ? 'The other four lines are private witnesses — never shared.'
                : 'Pick one line. The rest gets redacted before anything leaves the device.'}
            </p>
          </div>

          {/* ── What the verifier receives ── */}
          <div className="panel p-5 sm:p-6 lg:col-span-5" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <h3 className="label flex items-center gap-2 text-mute">
                <Lock className="h-3.5 w-3.5" /> Proof output
              </h3>
              <span className={`label ${ready ? 'text-proof' : tx ? 'text-witness' : 'text-dim'}`}>
                {ready ? 'Ready' : tx ? 'Building' : 'Waiting'}
              </span>
            </div>

            <div className="mt-6 flex items-center gap-5 sm:gap-6">
              <div className="relative w-[112px] shrink-0 sm:w-[132px]">
                <CornerTicks className={ready ? 'border-proof/60' : 'border-white/25'} />
                <ProofGrid cells={cells} locked={locked} mode={mode} hex={false} />
              </div>
              <div className="flex min-h-[96px] min-w-0 flex-col justify-center">
                {!tx && (
                  <p className="text-[14.5px] leading-relaxed text-mute">
                    Select a transaction to generate a selective proof.
                  </p>
                )}
                {tx && !ready && (
                  <p className="flex items-center gap-3 text-[14.5px] text-mute">
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-proof/25 border-t-proof" />
                    Building selective witness…
                  </p>
                )}
                {tx && ready && (
                  <>
                    <span className="badge self-start">
                      <Check className="h-3 w-3" strokeWidth={3} /> Selective proof ready
                    </span>
                    <p className="mt-3 text-[14.5px] leading-snug text-mute">
                      Proves only: <span className="font-medium text-proof">{tx.desc}</span>
                    </p>
                    <p className="mt-1.5 font-mono text-[12.5px] text-dim">
                      {tx.amount} · {tx.date}
                    </p>
                  </>
                )}
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-px clipped rounded-[12px] bg-white/[0.07] ring-1 ring-inset ring-white/[0.07]">
              <div className="bg-ink-900 px-4 py-3.5">
                <dt className="label text-[10px] text-dim">Revealed</dt>
                <dd className="mt-2 font-mono text-[20px] leading-none text-proof">
                  {tx ? 1 : 0}
                  <span className="ml-1.5 text-[12px] text-dim">{tx ? 'line' : 'lines'}</span>
                </dd>
              </div>
              <div className="bg-ink-900 px-4 py-3.5">
                <dt className="label text-[10px] text-dim">Private witness</dt>
                <dd className="mt-2 font-mono text-[20px] leading-none text-witness">
                  {tx ? TRANSACTIONS.length - 1 : TRANSACTIONS.length}
                  <span className="ml-1.5 text-[12px] text-dim">lines</span>
                </dd>
              </div>
            </dl>

            <div
              className={`mt-4 rounded-[12px] bg-ink-950/70 p-4 ring-1 ring-inset ring-white/[0.07] transition-opacity duration-500 ${
                ready ? 'opacity-100' : 'opacity-45'
              }`}
            >
              <div className="flex h-7 items-center justify-between gap-3">
                <p className="label text-[10px] text-dim">256-byte Groth16 proof</p>
                {ready && <CopyButton text={hex} label="Copy proof" iconOnly className="h-7 w-7 rounded-[7px]" />}
              </div>
              <code className="mt-2 block min-h-[58px] break-all font-mono text-[12px] leading-[1.6] text-proof/85">
                {ready ? `${hex.slice(0, 110)}…` : <span className="text-dim">0x{'·'.repeat(64)}</span>}
              </code>
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-dim">
              All other transactions remain private witnesses. They never leave the device and are not included in
              the proof.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
