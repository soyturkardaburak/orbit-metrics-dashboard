import { useEffect } from 'react'
import { RevenueChart } from '../components/Charts'
import { KpiCard } from '../components/KpiCard'
import { formatMoneyAuto, moneyOrDash, percentOrDash } from '../lib/format'
import { Panel } from '../components/Dialog'
import { useOrbitModel } from '../hooks/useOrbitModel'
import { byProduct, dailyPoints } from '../lib/metrics'
import { useDashboard } from '../store/dashboard-store'

export function OverviewPage() {
  const model = useOrbitModel()
  const currency = useDashboard((state) => state.prefs.currency)
  useEffect(() => {
    document.title = 'Overview — Orbit Metrics'
  }, [])

  if (!model.current || !model.previous || !model.filters || !model.facts) {
    return <p className="text-sm text-[var(--muted)]">Choose a valid date range to calculate the overview.</p>
  }

  const points = dailyPoints(model.facts, model.filters)
  const products = byProduct(model.facts.orders, 5)
  const { current, previous } = model

  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.22em] text-[var(--cyan)] uppercase">Executive overview</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">Northline Supply</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Fictional demonstration data for a specialty retailer. Revenue, orders, conversion, acquisition cost, and marketing ROI are calculated from the same orders, sessions, and ad spend.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Revenue" value={formatMoneyAuto(current.revenue, currency)} current={current.revenue} previous={previous.revenue} hint="Sum of order revenue in the filter." spark={points.map((point) => point.revenue)} />
        <KpiCard label="Orders" value={current.orders.toLocaleString('en-US')} current={current.orders} previous={previous.orders} hint="Count of sales rows in the filter." spark={points.map((point) => point.orders)} />
        <KpiCard label="Average order" value={moneyOrDash(current.aov, currency)} current={current.aov} previous={previous.aov} hint="Revenue divided by orders." />
        <KpiCard label="Conversion" value={percentOrDash(current.conversion)} current={current.conversion} previous={previous.conversion} hint={current.conversionHint} spark={points.map((point) => point.conversion ?? 0)} />
        <KpiCard label="Acquisition cost" value={moneyOrDash(current.cac, currency)} current={current.cac} previous={previous.cac} hint={current.cacHint} />
        <KpiCard label="Marketing ROI" value={percentOrDash(current.roi)} current={current.roi} previous={previous.roi} hint={current.roiHint} />
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <Panel title="Revenue" className="xl:col-span-3">
          <RevenueChart points={points} currency={currency} />
        </Panel>
        <Panel title="Top products" className="xl:col-span-2">
          {products.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No products in this period.</p>
          ) : (
            <ol className="space-y-3">
              {products.map((product, index) => (
                <li key={product.name} className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-0">
                  <div>
                    <p className="font-mono text-[10px] text-[var(--amber)]">0{index + 1}</p>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-[var(--muted)]">{product.orders.toLocaleString('en-US')} orders</p>
                  </div>
                  <p className="font-display text-lg">{formatMoneyAuto(product.revenue, currency)}</p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  )
}
