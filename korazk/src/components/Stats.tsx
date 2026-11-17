import { DotMatrix, Reveal, WRAP } from './primitives';
import { VERIFY_CU } from '../lib/proof';

const STATS = [
  {
    value: '256',
    tone: 'text-proof',
    label: 'Bytes per proof',
    note: 'The entire proof. Smaller than a tweet.',
  },
  {
    value: VERIFY_CU,
    tone: 'text-bone',
    label: 'Compute units to verify',
    note: 'On Solana, through native alt_bn128 syscalls.',
  },
  {
    value: '0',
    tone: 'text-witness',
    label: 'Bytes of PII shared',
    note: 'Your NIN, BVN and statements never leave the device.',
  },
];

export function Stats() {
  return (
    <section aria-label="The proof in numbers" className="border-y border-white/[0.07] bg-ink-900/60">
      <div className={`${WRAP} grid md:grid-cols-3`}>
        {STATS.map((stat, i) => (
          <Reveal
            key={stat.label}
            delay={i * 90}
            className={`py-9 md:py-11 ${i > 0 ? 'border-t border-white/[0.07] md:border-l md:border-t-0 md:pl-8 lg:pl-10' : ''} ${
              i < STATS.length - 1 ? 'md:pr-6' : ''
            }`}
          >
            <DotMatrix text={stat.value} className={`h-10 lg:h-14 xl:h-16 ${stat.tone}`} />
            <p className="label mt-5 text-bone/90">{stat.label}</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-mute">{stat.note}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
