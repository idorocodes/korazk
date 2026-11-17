import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, Check, Lock, MessageCircle, Zap } from 'lucide-react';
import { CellField } from './CellField';
import { ProofGrid, useProofCells, type GridMode } from './ProofGrid';
import { CopyButton, CornerTicks, LogoMark, QRCode, WRAP } from './primitives';
import { cssVars, useInView, usePrefersReducedMotion } from '../lib/hooks';
import {
  BRAND,
  HEX,
  IDLE_SCENARIO,
  PRESETS,
  VERIFY_CU,
  matchScenario,
  proofBytes,
  shortHex,
  toHex,
  type Preset,
  type Scenario,
} from '../lib/proof';

type Phase = 'idle' | 'matching' | 'witness' | 'proving' | 'verified';
type StepState = 'pending' | 'active' | 'done';

const ORDER: Record<Phase, number> = { idle: 0, matching: 1, witness: 2, proving: 3, verified: 4 };
const stepState = (phase: Phase, n: number): StepState =>
  ORDER[phase] === n ? 'active' : ORDER[phase] > n ? 'done' : 'pending';

interface Run {
  claim: string;
  scenario: Scenario;
  bytes: number[];
}

/** One headline word, staggered in on load. */
function W({ i, children }: { i: number; children: ReactNode }) {
  return (
    <span className="rise inline-block" style={cssVars({ '--i': i })}>
      {children}
    </span>
  );
}

export function Hero({ demoSignal }: { demoSignal: number }) {
  const reduced = usePrefersReducedMotion();
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [run, setRun] = useState<Run | null>(null);
  const timers = useRef<number[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  const busy = phase === 'matching' || phase === 'witness' || phase === 'proving';

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const start = useCallback(
    (raw: string) => {
      const claim = raw.trim();
      if (!claim) return;
      clearTimers();
      setRun({ claim, scenario: matchScenario(claim), bytes: proofBytes(claim) });
      setPhase('matching');
      const at = reduced ? [150, 300, 450] : [850, 1800, 3050];
      timers.current = [
        window.setTimeout(() => setPhase('witness'), at[0]),
        window.setTimeout(() => setPhase('proving'), at[1]),
        window.setTimeout(() => setPhase('verified'), at[2]),
      ];
      // On small screens the prover sits below the console — bring it into view.
      if (window.matchMedia('(max-width: 1023px)').matches) {
        panelRef.current?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
      }
    },
    [clearTimers, reduced],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!busy) start(prompt);
  };

  const onChange = (value: string) => {
    setPrompt(value);
    if (phase !== 'idle') {
      clearTimers();
      setPhase('idle');
    }
  };

  const onPreset = (preset: Preset) => {
    setPrompt(preset.prompt);
    start(preset.prompt);
  };

  // "Try Live Demo" / "Launch App" elsewhere on the page land here and run a proof.
  useEffect(() => {
    if (!demoSignal) return;
    const far = window.scrollY > 240;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    const t = window.setTimeout(
      () => {
        const text = prompt.trim() || PRESETS[0].prompt;
        setPrompt(text);
        start(text);
      },
      far && !reduced ? 750 : 120,
    );
    return () => window.clearTimeout(t);
    // Only the signal should re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoSignal]);

  // Once the receipt prints, nudge it into view if it landed below the fold.
  useEffect(() => {
    if (phase !== 'verified') return;
    const t = window.setTimeout(() => {
      const el = receiptRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 320 && rect.bottom > window.innerHeight) {
        el.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
      }
    }, 280);
    return () => window.clearTimeout(t);
  }, [phase, reduced]);

  const scenario = phase === 'idle' || !run ? IDLE_SCENARIO : run.scenario;
  const status =
    phase === 'verified'
      ? `Proof generated and verified on Solana using ${VERIFY_CU} compute units. Receipt ready.`
      : busy
        ? 'Generating proof…'
        : '';

  return (
    <section id="demo" className="relative isolate clipped pb-16 pt-28 sm:pb-20 lg:pt-[7.25rem]">
      {/* Ambient: a field of cells, most of them dark */}
      <CellField className="cellfield absolute inset-0 -z-10 h-full w-full" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-14%] top-[2%] -z-10 h-[820px] w-[820px] rounded-full bg-[radial-gradient(closest-side,rgba(87,242,174,0.12),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-20%] top-[-24%] -z-10 h-[680px] w-[680px] rounded-full bg-[radial-gradient(closest-side,rgba(255,178,63,0.06),transparent)]"
      />

      <div className={`${WRAP} grid gap-x-10 gap-y-12 lg:grid-cols-12`}>
        {/* ── Claim ── */}
        <div className="lg:col-span-7 lg:pt-4">
          <p
            className="rise inline-flex items-center gap-2.5 rounded-lg bg-white/[0.035] py-1.5 pl-2.5 pr-3 text-[12.5px] text-mute ring-1 ring-inset ring-white/10"
            style={cssVars({ '--i': 0 })}
          >
            <span className="inline-flex items-center gap-2 font-medium text-proof">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-proof/70" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-proof" />
              </span>
              Live on Solana 
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-white/15" />
            Built with Xark
          </p>

          <h1 className="display mt-7 text-[length:clamp(1.75rem,9.6vw,3.9rem)] text-bone lg:text-[length:clamp(3rem,4.55vw,4.2rem)]">
            <span className="sm:block">
              <W i={1}>Prove</W> <W i={2}>anything</W>
            </span>{' '}
            <span className="sm:block">
              <W i={3}>about</W> <W i={4}>your</W>
            </span>{' '}
            <span className="sm:block">
              <W i={5}>
                <span className="mark" style={cssVars({ '--mark-delay': '1.15s' })}>
                  finances
                </span>
              </W>{' '}
              <W i={6}>or</W>{' '}
              <W i={7}>
                <span className="mark" style={cssVars({ '--mark-delay': '1.4s' })}>
                  ID
                </span>
                .
              </W>
            </span>{' '}
            <span className="glow-proof block text-proof">
              <W i={9}>Reveal</W> <W i={10}>nothing.</W>
            </span>
          </h1>

          <p
            className="rise mt-6 max-w-[58ch] text-pretty text-[16.5px] leading-[1.65] text-mute sm:text-[17.5px]"
            style={cssVars({ '--i': 12 })}
          >
            Type what you want to prove in plain English. Generate a{' '}
            <strong className="font-medium text-bone"> zero-knowledge proof</strong> locally and verify it on
            Solana — without ever exposing your NIN, BVN, or full bank statement.
          </p>

          <form onSubmit={onSubmit} className="rise mt-9 max-w-[660px]" style={cssVars({ '--i': 14 })}>
            <label htmlFor="claim" className="label text-dim">
              What do you want to prove?
            </label>
            <div className="console mt-3 flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3">
                <span aria-hidden="true" className="font-mono text-[16px] text-proof">
                  ›
                </span>
                <input
                  id="claim"
                  type="text"
                  value={prompt}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="e.g. Prove my monthly salary is over ₦400k"
                  autoComplete="off"
                  spellCheck={false}
                  className="console-input h-11 w-full min-w-0 bg-transparent font-mono text-[16px] text-bone placeholder:text-dim sm:text-[14px]"
                />
              </div>
              <button
                type="submit"
                disabled={!prompt.trim() || busy}
                aria-busy={busy}
                className="btn btn-primary h-11 shrink-0 px-5 sm:min-w-[176px]"
              >
                {busy ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-950/25 border-t-ink-950" />
                    Proving…
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" strokeWidth={2.4} />
                    Generate proof
                  </>
                )}
              </button>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="label mr-1 text-dim">Try</span>
              {PRESETS.map((preset) => (
                <button
                  key={preset.prompt}
                  type="button"
                  onClick={() => onPreset(preset)}
                  aria-pressed={prompt === preset.prompt}
                  title={preset.prompt}
                  className={`chip ${prompt === preset.prompt ? 'is-on' : ''}`}
                >
                  {preset.chip}
                </button>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] text-dim">Simulated demo — nothing you type leaves this page.</p>
          </form>
        </div>

        {/* ── Prover ── */}
        <div ref={panelRef} className="scroll-mt-24 lg:col-span-5">
          <DevicePanel phase={phase} scenario={scenario} bytes={run?.bytes ?? null} reduced={reduced} />
        </div>

        {/* ── Receipt ── */}
        {phase === 'verified' && run && (
          <div ref={receiptRef} className="scroll-mb-6 lg:col-span-12">
            <Receipt run={run} />
          </div>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}

/* ───────── Prover panel: witness above the boundary, proof below ───────── */

function Scramble({ text }: { text: string }) {
  const head = text.startsWith('circuit_') ? 'circuit_' : '';
  const tail = text.slice(head.length);
  const [out, setOut] = useState(tail);

  useEffect(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const id = window.setInterval(() => {
      setOut(tail.replace(/[a-z]/g, () => chars[(Math.random() * chars.length) | 0]));
    }, 60);
    return () => window.clearInterval(id);
  }, [tail]);

  return (
    <>
      {head}
      {out}
    </>
  );
}

function ZoneHead({
  n,
  title,
  state,
  tone,
  aside,
  asideClass,
}: {
  n: string;
  title: ReactNode;
  state: StepState;
  tone: string;
  aside: ReactNode;
  asideClass: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="stepmark" data-state={state} style={cssVars({ '--tone': tone })}>
          {state === 'done' ? <Check className="h-3 w-3" strokeWidth={3.2} /> : n}
        </span>
        <span className="label truncate text-[10px] tracking-[0.12em] text-bone/90">{title}</span>
      </div>
      <span className={`label flex shrink-0 items-center gap-1.5 text-[10px] tracking-[0.12em] ${asideClass}`}>
        {aside}
      </span>
    </div>
  );
}

function DevicePanel({
  phase,
  scenario,
  bytes,
  reduced,
}: {
  phase: Phase;
  scenario: Scenario;
  bytes: number[] | null;
  reduced: boolean;
}) {
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, margin: '0px' });
  const verified = phase === 'verified';
  const mode: GridMode = verified ? 'done' : reduced ? 'static' : phase === 'proving' ? 'lock' : 'idle';
  const { cells, locked } = useProofCells(bytes, mode, { lockMs: 1050, paused: !inView });

  const s1 = stepState(phase, 1);
  const s2 = stepState(phase, 2);
  const s3 = stepState(phase, 3);

  return (
    <div ref={ref} className="rise relative" style={cssVars({ '--i': 7 })}>
      <CornerTicks />
      <div className={`panel relative clipped ${verified ? 'panel-verified' : ''}`}>
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 sm:px-5">
          <span className="label flex items-center gap-2 text-[10px] text-mute">
            <LogoMark size={14} /> Prover
          </span>
          <span className="label text-[10px] text-dim">Demo · simulated</span>
        </div>

        {/* 01 — intent matched to a circuit */}
        <div className="border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
          <ZoneHead
            n="01"
            state={s1}
            tone="var(--color-bone)"
            title={
              <>
                Intent <ArrowRight className="-mt-px inline h-3 w-3" /> circuit
              </>
            }
            aside="xark · Rust"
            asideClass="text-dim"
          />
          <p className="mt-2.5 h-[18px] truncate pl-[30px] font-mono text-[12.5px] leading-[18px]">
            {s1 === 'pending' && (
              <span className="text-dim">
                waiting for a claim
                <span className="caret" />
              </span>
            )}
            {s1 === 'active' && (
              <span className="text-mute">
                <Scramble text={scenario.circuit} />
              </span>
            )}
            {s1 === 'done' && (
              <>
                <span className="text-bone">{scenario.circuit}</span>
                <span className="text-dim"> · matched</span>
              </>
            )}
          </p>
        </div>

        {/* 02 — private witness, never leaves */}
        <div className="bg-[linear-gradient(180deg,rgba(255,178,63,0.055),transparent_85%)] px-4 pb-3 pt-3.5 sm:px-5">
          <ZoneHead
            n="02"
            state={s2}
            tone="var(--color-witness)"
            title="Private witness"
            aside={
              <>
                <Lock className="h-3 w-3" /> Stays on device
              </>
            }
            asideClass="text-witness"
          />
          <ul className="mt-3 space-y-[7px] pl-[30px]">
            {scenario.witness.map((row, i) => (
              <li
                key={`${scenario.id}-${row.key}`}
                className="witness-row flex items-center gap-3"
                style={cssVars({ '--i': i })}
              >
                <span className="w-[54%] shrink-0 truncate font-mono text-[12px] leading-[16px] text-mute">
                  {row.key}
                </span>
                <span aria-hidden="true" className="h-[10px] min-w-0 flex-1">
                  <span
                    className={`bar hatch ${s2 === 'active' ? 'is-active' : s2 === 'done' ? 'is-done' : ''}`}
                    style={{ width: `${row.width}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 h-[16px] truncate pl-[30px] font-mono text-[11.5px] leading-[16px] text-dim">
            {s2 === 'active' && <span className="text-witness">Solving witness in local WASM…</span>}
            {s2 === 'done' && 'Local WASM witness solved'}
            {s2 === 'pending' && 'Private inputs stay on device'}
          </p>
        </div>

        {/* the line only the proof crosses */}
        <div aria-hidden="true" className="relative flex items-center gap-3 px-4 py-2 sm:px-5">
          <span className="h-px flex-1 border-t border-dashed border-white/25" />
          <span className="label text-[9.5px] text-dim">Device boundary</span>
          <span className="h-px flex-1 border-t border-dashed border-white/25" />
          {phase === 'proving' &&
            [12, 27, 41, 58, 73, 88].map((left, i) => (
              <span key={left} className="packet" style={{ left: `${left}%`, animationDelay: `${i * 115}ms` }} />
            ))}
        </div>

        {/* 03 — the public proof */}
        <div className="bg-[linear-gradient(0deg,rgba(87,242,174,0.055),transparent_80%)] px-4 pb-4 pt-2.5 sm:px-5 sm:pb-[18px]">
          <ZoneHead
            n="03"
            state={s3}
            tone="var(--color-proof)"
            title="Public proof"
            aside={
              <>
                <ArrowUpRight className="h-3 w-3" /> Leaves device
              </>
            }
            asideClass="text-proof"
          />
          <div className="mt-2.5 flex h-[20px] items-center gap-2 pl-[30px] font-mono text-[12px]">
            <span className="shrink-0 text-dim">claim</span>
            <span className={`min-w-0 truncate ${scenario.claim ? 'text-bone' : 'text-dim'}`}>
              {scenario.claim || '—'}
            </span>
            {verified && (
              <span className="ml-auto shrink-0 rounded-[4px] bg-proof/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-proof">
                true
              </span>
            )}
          </div>

          <ProofGrid cells={cells} locked={locked} mode={mode} aspect={1.68} className="mt-3" />

          <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[11.5px] leading-[16px]">
            <span className={`min-w-0 truncate ${verified ? 'text-proof' : 'text-dim'}`}>
              {verified && bytes
                ? `${shortHex(bytes)} · Verified on Solana`
                : phase === 'proving'
                  ? 'Writing Groth16 proof…'
                  : '256-byte Groth16 proof'}
            </span>
            <span className="shrink-0 tabular-nums text-dim">
              {verified ? `${VERIFY_CU} CU` : `${phase === 'proving' ? locked : 0} / 256 B`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Receipt: the only thing you share ───────── */

function Receipt({ run }: { run: Run }) {
  const hex = useMemo(() => toHex(run.bytes), [run.bytes]);
  const short = shortHex(run.bytes);
  const b = run.bytes;
  const qrText = `${BRAND} demo | VERIFIED | 0x${HEX[b[0]]}${HEX[b[1]]}..${HEX[b[254]]}${HEX[b[255]]} | 256 bytes`;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(
    `${BRAND} demo receipt: "${run.claim}" — VERIFIED on Solana. Proof ${short} (256 bytes). No private data shared.`,
  )}`;

  return (
    <article aria-label="Verification receipt" className="ticket ticket-print">
      <div className="grid gap-px bg-white/[0.07] lg:grid-cols-[1.25fr_1fr_1.2fr]">
        <div className="bg-ink-900 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="badge">
              <Check className="h-3 w-3" strokeWidth={3} /> Verified on Solana
            </span>
            <span className="font-mono text-[12px] text-dim">{VERIFY_CU} CU · demo</span>
          </div>
          <h2 className="display-sm mt-4 text-[18px] text-bone">Shareable verification receipt</h2>
          <p className="mt-2 font-mono text-[13px] leading-[1.6] text-mute">“{run.claim}”</p>
        </div>

        <div className="bg-ink-900 p-5 sm:p-6">
          <p className="label text-witness">Not in this receipt</p>
          <ul className="mt-4 space-y-3">
            {run.scenario.hidden.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-4">
                <span className="text-[13.5px] text-mute">{item.key}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span aria-hidden="true" className="hatch h-2.5 w-12 rounded-[2px]" />
                  <span className="font-mono text-[11px] tracking-[0.06em] text-witness">[{item.tag}]</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-ink-900 p-5 sm:p-6">
          <p className="label text-dim">Proof · 256 bytes · Groth16</p>
          <code className="mt-4 block break-all font-mono text-[12px] leading-[1.6] text-proof/85">
            {hex.slice(0, 86)}…
          </code>
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyButton text={hex} label="Copy proof" className="h-9 px-3 text-[12.5px]" />
            <a href={shareUrl} target="_blank" rel="noreferrer" className="btn btn-ghost h-9 px-3 text-[12.5px]">
              <MessageCircle className="h-3.5 w-3.5" /> Share on WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="ticket-stub flex items-center justify-center gap-4 bg-ink-900 p-5 lg:flex-col lg:gap-3">
        <div className="rounded-lg bg-bone p-2 text-ink-950">
          <QRCode text={qrText} label="QR code containing this demo receipt" className="h-[92px] w-[92px]" />
        </div>
        <p className="label text-center text-[10px] leading-[1.5] text-dim">
          Scan to
          <br />
          check
        </p>
      </div>
    </article>
  );
}
