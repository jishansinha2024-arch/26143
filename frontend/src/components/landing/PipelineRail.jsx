import { motion } from 'framer-motion';
import { PIPELINE } from '../../data/landing/entry';

export function PipelineRail() {
  return (
    <ol className="relative mt-12 max-w-lg border-l border-ink/10 pl-6">
      {PIPELINE.map((stage, index) =>
      <motion.li
        key={stage.title}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, delay: 0.5 + index * 0.05, ease: [0.23, 1, 0.32, 1] }}
        className="relative pb-6 last:pb-0">
        
          <span
          aria-hidden="true"
          className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-tide ring-4 ring-paper" />
        
          <div className="flex items-baseline gap-3">
            <h3 className="font-display text-lg font-semibold tracking-tight text-ink">{stage.title}</h3>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-tide">{stage.tag}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted">{stage.detail}</p>
        </motion.li>
      )}
    </ol>);

}