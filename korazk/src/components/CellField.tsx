import { useEffect, useRef } from 'react';

interface Pulse {
  c: number;
  r: number;
  t0: number;
  life: number;
  amber: boolean;
}

const GAP = 28;
const SIZE = 2;
const REACH = 180;

/**
 * Ambient field of cells. Most stay dark; a few light up on their own,
 * and the ones near the cursor reveal themselves.
 */
export function CellField({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: 0, y: 0, on: false };
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let pulses: Pulse[] = [];
    let raf = 0;
    let last = 0;
    let visible = true;

    const cell = (c: number, r: number, size: number, style: string) => {
      const offset = (size - SIZE) / 2;
      ctx.fillStyle = style;
      ctx.fillRect(c * GAP + GAP / 2 - offset, r * GAP + GAP / 2 - offset, size, size);
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(239,236,228,0.09)';
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) ctx.fillRect(c * GAP + GAP / 2, r * GAP + GAP / 2, SIZE, SIZE);
      }

      if (pointer.on) {
        const c0 = Math.max(0, Math.floor((pointer.x - REACH) / GAP));
        const c1 = Math.min(cols - 1, Math.ceil((pointer.x + REACH) / GAP));
        const r0 = Math.max(0, Math.floor((pointer.y - REACH) / GAP));
        const r1 = Math.min(rows - 1, Math.ceil((pointer.y + REACH) / GAP));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const d = Math.hypot(c * GAP + GAP / 2 - pointer.x, r * GAP + GAP / 2 - pointer.y);
            if (d >= REACH) continue;
            const k = (1 - d / REACH) ** 2;
            cell(c, r, SIZE + 2.5 * k, `rgba(87,242,174,${(0.85 * k).toFixed(3)})`);
          }
        }
      }

      pulses = pulses.filter((p) => now - p.t0 < p.life);
      for (const p of pulses) {
        const k = Math.sin((Math.PI * (now - p.t0)) / p.life);
        const alpha = (0.85 * k).toFixed(3);
        cell(p.c, p.r, SIZE + 2 * k, p.amber ? `rgba(255,178,63,${alpha})` : `rgba(87,242,174,${alpha})`);
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP);
      rows = Math.ceil(h / GAP);
      draw(performance.now());
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || now - last < 40) return;
      last = now;
      if (pulses.length < 28 && Math.random() < 0.3) {
        pulses.push({
          c: (Math.random() * cols) | 0,
          r: (Math.random() * rows) | 0,
          t0: now,
          life: 1400 + Math.random() * 1800,
          amber: Math.random() < 0.3,
        });
      }
      draw(now);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.on = pointer.y > -REACH && pointer.y < rect.height + REACH;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);
    resize();

    if (!reduced) {
      window.addEventListener('pointermove', onMove, { passive: true });
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
