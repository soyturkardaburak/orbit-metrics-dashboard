import { delta, formatPercent } from '../lib/format'

export function KpiCard({
  label,
  value,
  current,
  previous,
  hint,
  spark,
}: {
  label: string
  value: string
  current: number | null
  previous: number | null
  hint: string
  spark?: number[]
}) {
  const change = delta(current, previous)
  const tone = change == null || change === 0 ? 'text-[var(--muted)]' : change > 0 ? 'text-[var(--cyan)]' : 'text-[var(--coral)]'
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="font-mono text-[10px] tracking-[0.16em] text-[var(--muted)] uppercase">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-1 text-xs font-medium ${tone}`}>{change == null ? 'No baseline' : `${change > 0 ? '+' : ''}${formatPercent(change)} vs prior`}</p>
      {spark && spark.length > 1 ? <Spark values={spark} /> : null}
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{hint}</p>
    </article>
  )
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const width = 120
  const height = 28
  const path = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - ((value - min) / (max - min || 1)) * (height - 2) - 1
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-7 w-full text-[var(--cyan)]" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
