import { memo, useEffect, useState } from 'react';
import { cssVars } from '../lib/hooks';
import { HEX } from '../lib/proof';

/**
 * static — cells sit still        idle — a few bytes mutate (awaiting a witness)
 * lock   — bytes are written in   done — the full proof is shown
 */
export type GridMode = 'static' | 'idle' | 'lock' | 'done';

const randomByte = () => (Math.random() * 256) | 0;

/** Drives the 256 cells of a proof grid. All motion lives here so only the grid re-renders. */
export function useProofCells(
  target: number[] | null,
  mode: GridMode,
  { lockMs = 1100, paused = false }: { lockMs?: number; paused?: boolean } = {},
) {
  const [cells, setCells] = useState<number[]>(() => Array.from({ length: 256 }, randomByte));
  const [locked, setLocked] = useState(0);

  useEffect(() => {
    if (mode === 'done') {
      if (target) {
        setCells(target);
        setLocked(256);
      }
      return;
    }
    setLocked(0);
    if (mode === 'static' || paused) return;

    const startedAt = performance.now();
    const every = mode === 'idle' ? 280 : 55;
    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < every) return;
      last = now;

      if (mode === 'idle') {
        setCells((prev) => {
          const next = prev.slice();
          for (let i = 0; i < 6; i++) next[randomByte()] = randomByte();
          return next;
        });
        return;
      }

      const written = target ? Math.min(256, Math.floor(((now - startedAt) / lockMs) * 256)) : 0;
      setLocked(written);
      setCells((prev) =>
        prev.map((value, i) => (target && i < written ? target[i] : Math.random() < 0.55 ? randomByte() : value)),
      );
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mode, target, lockMs, paused]);

  return { cells, locked };
}

const Cell = memo(function Cell({ value, on, hex }: { value: number; on: boolean; hex: boolean }) {
  return (
    <span className={on ? 'pg-cell on' : 'pg-cell'} style={cssVars({ '--a': (value / 255).toFixed(2) })}>
      {hex ? HEX[value] : null}
    </span>
  );
});

/** The signature object: one proof, all 256 bytes, sixteen by sixteen. */
export const ProofGrid = memo(function ProofGrid({
  cells,
  locked,
  mode,
  hex = true,
  aspect = 1,
  className = '',
}: {
  cells: number[];
  locked: number;
  mode: GridMode;
  hex?: boolean;
  aspect?: number;
  className?: string;
}) {
  return (
    <div
      className={`pg-wrap ${hex ? '' : 'pg-solid'} ${mode === 'done' ? 'is-verified' : ''} ${className}`}
      data-mode={mode}
      aria-hidden="true"
      style={cssVars({ '--pg-aspect': aspect })}
    >
      <div className="pg">
        {cells.map((value, i) => (
          <Cell key={i} value={value} on={i < locked} hex={hex} />
        ))}
      </div>
    </div>
  );
});
