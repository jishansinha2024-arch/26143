import { FEED } from '../../data/landing/entry';

const LEVEL_DOT = {
  probable: 'bg-flare',
  possible: 'bg-signal',
  indeterminate: 'bg-tide'
};

function FeedRow({ item }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-r border-ink/[0.07] px-6 py-3">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${LEVEL_DOT[item.level]}`} />
      <span className="font-mono text-[11px] tracking-[0.12em] text-muted/80">{item.time}</span>
      <span className="font-mono text-[11px] font-medium tracking-[0.08em] text-ink">{item.code}</span>
      <span className="text-[12px] text-muted">{item.body}</span>
    </div>);

}

export function SignalFeed() {
  const doubled = [...FEED, ...FEED];

  return (
    <section
      aria-label="Live detection feed"
      className="relative overflow-hidden border-t border-ink/10 bg-mist/70 backdrop-blur-sm">
      
      <div className="flex w-max feed-track">
        {doubled.map((item, index) =>
        <FeedRow key={`${item.code}-${index}`} item={item} />
        )}
      </div>
    </section>);

}