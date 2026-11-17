import { useEffect, useMemo, useState, type ReactNode } from 'react';
import qrcode from 'qrcode-generator';
import { Check, Copy } from 'lucide-react';
import { BRAND } from '../lib/proof';
import { TOAST_EVENT, copyText, cssVars, toast, useInView } from '../lib/hooks';

/** Shared page gutter. */
export const WRAP = 'mx-auto w-full max-w-auto px-5 sm:px-8';

type Tone = 'proof' | 'witness' | 'exposed';

/* ───────── Logo: nine cells, one revealed ───────── */

export function LogoMark({
  size = 26,
  onLight = false,
  className = '',
}: {
  size?: number;
  onLight?: boolean;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      {Array.from({ length: 9 }, (_, i) => {
        const lit = i === 4;
        return (
          <rect
            key={i}
            x={3 + (i % 3) * 9}
            y={3 + Math.floor(i / 3) * 9}
            width={8}
            height={8}
            rx={1.6}
            className={lit ? 'logo-cell is-lit' : 'logo-cell'}
            style={cssVars({ '--i': i })}
            fill={onLight ? '#05060b' : lit ? '#57f2ae' : '#efece4'}
            fillOpacity={lit ? 1 : 0.27}
          />
        );
      })}
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  const split = BRAND.match(/^(.*?)(ZK)$/);
  return (
    <span className={`display text-[16.5px] text-bone ${className}`}>
      {split ? (
        <>
          {split[1]}
          <span className="text-proof">{split[2]}</span>
        </>
      ) : (
        BRAND
      )}
    </span>
  );
}

/* ───────── Small layout pieces ───────── */

export function Tag({ children, tone = 'proof' }: { children: ReactNode; tone?: Tone }) {
  const dot = tone === 'witness' ? 'bg-witness' : tone === 'exposed' ? 'bg-exposed' : 'bg-proof';
  return (
    <p className="label flex items-center gap-2.5 text-mute">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-[1px] ${dot}`} />
      {children}
    </p>
  );
}

export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? 'is-in' : ''} ${className}`}
      style={delay ? cssVars({ '--reveal-delay': `${delay}ms` }) : undefined}
    >
      {children}
    </div>
  );
}

export function SectionHead({
  tag,
  tone,
  title,
  lede,
}: {
  tag: string;
  tone?: Tone;
  title: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <Reveal className="grid gap-x-10 gap-y-5 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        <Tag tone={tone}>{tag}</Tag>
        <h2 className="display mt-5 text-balance text-[length:clamp(1.9rem,3.9vw,3.1rem)] text-bone">{title}</h2>
      </div>
      {lede && (
        <p className="max-w-[46ch] text-pretty text-[16px] leading-[1.65] text-mute lg:col-span-4 lg:col-start-9 lg:pb-1.5">
          {lede}
        </p>
      )}
    </Reveal>
  );
}

/** Instrument-style corner brackets around a positioned parent. */
export function CornerTicks({ className = 'border-white/30' }: { className?: string }) {
  const base = `pointer-events-none absolute h-2.5 w-2.5 ${className}`;
  return (
    <>
      <span aria-hidden="true" className={`${base} -left-1.5 -top-1.5 border-l border-t`} />
      <span aria-hidden="true" className={`${base} -right-1.5 -top-1.5 border-r border-t`} />
      <span aria-hidden="true" className={`${base} -bottom-1.5 -left-1.5 border-b border-l`} />
      <span aria-hidden="true" className={`${base} -bottom-1.5 -right-1.5 border-b border-r`} />
    </>
  );
}

export function CopyButton({
  text,
  label = 'Copy',
  iconOnly = false,
  className = '',
}: {
  text: string;
  label?: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const onClick = async () => {
    if (await copyText(text)) setCopied(true);
    else toast('Could not copy automatically. Select the text and copy it manually.');
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={iconOnly ? label : undefined}
      className={`btn btn-ghost ${className}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-proof" strokeWidth={2.6} /> : <Copy className="h-3.5 w-3.5" />}
      {!iconOnly && <span>{copied ? 'Copied' : label}</span>}
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </button>
  );
}

/* ───────── Dot-matrix numerals (5×7 cells) ───────── */

const GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['01110', '10001', '00001', '00110', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ',': ['00', '00', '00', '00', '00', '01', '10'],
};
const UNIT = 10;
const DOT = 8;

export function DotMatrix({ text, label, className = '' }: { text: string; label?: string; className?: string }) {
  const [ref, inView] = useInView<SVGSVGElement>();

  const { dots, cols } = useMemo(() => {
    const list: { x: number; y: number; on: boolean }[] = [];
    let col = 0;
    for (const ch of text) {
      const glyph = GLYPHS[ch];
      if (!glyph) {
        col += 3;
        continue;
      }
      const width = glyph[0].length;
      glyph.forEach((row, y) => {
        for (let x = 0; x < width; x++) list.push({ x: col + x, y, on: row[x] === '1' });
      });
      col += width + 1;
    }
    return { dots: list, cols: Math.max(col - 1, 1) };
  }, [text]);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${cols * UNIT - (UNIT - DOT)} ${7 * UNIT - (UNIT - DOT)}`}
      role="img"
      aria-label={label ?? text}
      className={`dm w-auto ${inView ? 'is-in' : ''} ${className}`}
    >
      {dots.map((d, i) => (
        <rect
          key={i}
          x={d.x * UNIT}
          y={d.y * UNIT}
          width={DOT}
          height={DOT}
          rx={1.6}
          className={d.on ? 'dm-on' : 'dm-off'}
          style={d.on ? { animationDelay: `${(d.x * 43 + d.y * 71) % 520}ms` } : undefined}
        />
      ))}
    </svg>
  );
}

/* ───────── Real, scannable QR ───────── */

export function QRCode({ text, label = 'QR code', className = '' }: { text: string; label?: string; className?: string }) {
  const { size, d } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let path = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
    }
    return { size: n, d: path };
  }, [text]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges" className={className}>
      <path d={d} fill="currentColor" />
    </svg>
  );
}

/* ───────── Toasts ───────── */

export function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string }[]>([]);

  useEffect(() => {
    let counter = 0;
    const timers: number[] = [];
    const onToast = (e: Event) => {
      const item = { id: ++counter, message: (e as CustomEvent<string>).detail };
      setItems((prev) => [...prev.slice(-2), item]);
      timers.push(window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== item.id)), 4400));
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-[70] flex flex-col items-center gap-2 px-4"
    >
      {items.map((item) => (
        <div key={item.id} className="toast">
          {item.message}
        </div>
      ))}
    </div>
  );
}
