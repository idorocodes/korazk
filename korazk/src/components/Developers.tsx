import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CodeXml, Terminal, type LucideIcon } from 'lucide-react';
import { CopyButton, DotMatrix, LogoMark, Reveal, Tag, WRAP } from './primitives';
import { BRAND } from '../lib/proof';

type Lang = 'rust' | 'ts';
type Token = [text: string, cls: string];

const PKG = `@${BRAND.toLowerCase()}/sdk`;

const SAMPLES: Record<'circuit' | 'verify', { file: string; lang: Lang; icon: LucideIcon; code: string }> = {
  circuit: {
    file: 'circuit.rs',
    lang: 'rust',
    icon: Terminal,
    code: `#[circuit]
pub fn verify_tx(
    amount: Field,
    recipient_hash: Field,
    merkle_root: Field,
    path: [Field; 20],
) {
    // Private witness: full statement stays local
    let leaf = poseidon([amount, recipient_hash]);
    require_eq(merkle_root, compute_root(leaf, path));
    // Public output: only the proven claim
    expose(amount_gte_threshold);
}`,
  },
  verify: {
    file: 'verify.ts',
    lang: 'ts',
    icon: CodeXml,
    code: `import { ${BRAND} } from '${PKG}';

const result = await ${BRAND}.verify({
  proof: '0x8f4a…c291',          // 256-byte Groth16
  publicInputs: { claim: 'salary_gte_400k' },
});

if (result.valid) {
  // Accept the claim — no PII ever received
}`,
  },
};
type TabId = keyof typeof SAMPLES;
const TABS = Object.keys(SAMPLES) as TabId[];

const KEYWORDS: Record<Lang, Set<string>> = {
  rust: new Set(['pub', 'fn', 'let', 'mut', 'use', 'return']),
  ts: new Set(['import', 'from', 'const', 'await', 'if', 'return']),
};
const TOKEN = /(\/\/.*$)|(#\[[^\]]*\])|('[^']*'|"[^"]*")|(\b\d[\d_]*\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|(.)/g;

/** Just enough highlighting for two short samples. */
function tokenize(line: string, lang: Lang): Token[] {
  const out: Token[] = [];
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(line))) {
    const [text, comment, attr, str, num, ident, space] = m;
    if (comment) out.push([text, 'tok-comment']);
    else if (attr) out.push([text, 'tok-attr']);
    else if (str) out.push([text, 'tok-string']);
    else if (num) out.push([text, 'tok-number']);
    else if (ident) {
      const cls = KEYWORDS[lang].has(text)
        ? 'tok-keyword'
        : /^[A-Z]/.test(text)
          ? 'tok-type'
          : line[TOKEN.lastIndex] === '('
            ? 'tok-fn'
            : 'tok-plain';
      out.push([text, cls]);
    } else if (space) out.push([text, '']);
    else out.push([text, 'tok-punct']);
  }
  return out;
}

/** What the drop-in button feels like inside someone else's product. */
function VerifyButtonPreview() {
  const [state, setState] = useState<'idle' | 'checking' | 'valid'>('idle');
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const onClick = () => {
    if (state === 'checking') return;
    setState('checking');
    timer.current = window.setTimeout(() => setState('valid'), 900);
  };

  return (
    <div className="rounded-[14px] border border-dashed border-white/15 p-4 sm:p-5">
      <p className="label text-[10px] text-dim">Button preview · your app</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button type="button" onClick={onClick} className="btn btn-light h-11 px-4">
          <LogoMark size={16} onLight /> Verify with ZK
        </button>
        <p aria-live="polite" className="font-mono text-[12.5px]">
          {state === 'idle' && <span className="text-dim">Click to preview</span>}
          {state === 'checking' && (
            <span className="flex items-center gap-2 text-mute">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-proof/25 border-t-proof" />
              verifying proof…
            </span>
          )}
          {state === 'valid' && (
            <span className="text-proof">
              result.valid = true <span className="text-dim">· PII received: none</span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export function Developers() {
  const [tab, setTab] = useState<TabId>('circuit');
  const sample = SAMPLES[tab];
  const lines = useMemo(() => sample.code.split('\n').map((line) => tokenize(line, sample.lang)), [sample]);

  return (
    <section id="developers" className="relative border-t border-white/[0.07] py-24 sm:py-32">
      <div className={WRAP}>
        <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <Tag>Developers</Tag>
            <h2 className="display mt-5 text-balance text-[length:clamp(1.9rem,3.9vw,3.1rem)] text-bone">
              Developer &amp; Business SDK
            </h2>
            <p className="mt-5 max-w-[44ch] text-pretty text-[16px] leading-[1.65] text-mute">
              Drop a “Verify with ZK” button into any fintech, landlord portal, or Solana dApp.
            </p>
            <div className="mt-8">
              <VerifyButtonPreview />
            </div>
            <ul className="mt-6 flex flex-wrap gap-2">
              {['Fintech apps', 'Landlord portals', 'Solana dApps'].map((target) => (
                <li
                  key={target}
                  className="flex items-center gap-2 rounded-[7px] bg-white/[0.03] px-2.5 py-1.5 text-[13px] text-mute ring-1 ring-inset ring-white/[0.08]"
                >
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-[1px] bg-proof" />
                  {target}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120} className="min-w-0 lg:col-span-7">
            <div className="panel clipped">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pr-3">
                <div role="tablist" aria-label="SDK examples" className="flex">
                  {TABS.map((id) => {
                    const Icon = SAMPLES[id].icon;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        id={`tab-${id}`}
                        aria-selected={tab === id}
                        aria-controls="code-panel"
                        onClick={() => setTab(id)}
                        className={`code-tab ${tab === id ? 'is-active' : ''}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {SAMPLES[id].file}
                      </button>
                    );
                  })}
                </div>
                <CopyButton text={sample.code} label="Copy" className="h-8 px-2.5 text-[12px]" />
              </div>

              <div role="tabpanel" id="code-panel" aria-labelledby={`tab-${tab}`}>
                <pre tabIndex={0} className="overflow-x-auto p-5 text-[13px] leading-[1.8] sm:p-6">
                  <code className="grid min-w-max font-mono">
                    {lines.map((tokens, i) => (
                      <span key={i} className="grid grid-cols-[2ch_minmax(0,1fr)] gap-5">
                        <span aria-hidden="true" className="select-none text-right text-dim/60">
                          {i + 1}
                        </span>
                        <span className="whitespace-pre">
                          {tokens.length
                            ? tokens.map(([text, cls], j) => (
                                <span key={j} className={cls || undefined}>
                                  {text}
                                </span>
                              ))
                            : ' '}
                        </span>
                      </span>
                    ))}
                  </code>
                </pre>
              </div>
            </div>
          </Reveal>
        </div>

        {/* ── NDPA ── */}
        <Reveal className="mt-8">
          <div
            id="ndpa-privacy"
            className="scroll-mt-24 grid gap-x-10 gap-y-8 rounded-[18px] bg-[linear-gradient(120deg,rgba(87,242,174,0.085),rgba(87,242,174,0.02)_55%)] p-6 shadow-[inset_0_0_0_1px_rgba(87,242,174,0.2)] sm:p-9 lg:grid-cols-12 lg:items-center"
          >
            <div className="flex items-end gap-4 lg:col-span-3">
              <DotMatrix text="0" label="Zero" className="h-[76px] text-proof" />
              <p className="label pb-1 leading-[1.6] text-mute">
                Bytes of PII
                <br />
                stored
              </p>
            </div>
            <div className="lg:col-span-6">
              <Tag>NDPA privacy</Tag>
              <h3 className="display-sm mt-4 text-[22px] text-bone sm:text-[24px]">NDPA Compliance by Design</h3>
              <p className="mt-3 max-w-[58ch] text-[15px] leading-[1.65] text-mute">
                Nigeria Data Protection Act ready. Zero PII stored. Zero honeypot liability. Proofs are generated
                client-side; verifiers receive only the cryptographic attestation, never the underlying data.
              </p>
            </div>
            <ul className="space-y-3 lg:col-span-3">
              {['Zero PII stored', 'Zero honeypot liability', 'Client-side proving'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[14px] font-medium text-bone">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[5px] bg-proof text-ink-950">
                    <Check className="h-3 w-3" strokeWidth={3.2} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
