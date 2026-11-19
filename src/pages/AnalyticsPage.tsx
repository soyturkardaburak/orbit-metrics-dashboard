import { useEffect } from 'react'
import { AcquisitionChart, ChannelStack, Distribution, HorizontalBars, OrdersChart } from '../components/Charts'
import { Panel } from '../components/Dialog'
import { useOrbitModel } from '../hooks/useOrbitModel'
import { acquisitionMonths, byCategory, byChannel, byRegion, dailyPoints, stackedRevenue } from '../lib/metrics'
import { useDashboard } from '../store/dashboard-store'

export function AnalyticsPage() {
  const model = useOrbitModel()
  const currency = useDashboard((state) => state.prefs.currency)
  useEffect(() => {
    document.title = 'Analytics — Orbit Metrics'
  }, [])
  if (!model.filters || !model.facts) return <p className="text-sm text-[var(--muted)]">Choose a valid date range to calculate analytics.</p>

  return (
    <div className="space-y-4">
      <header>
        <p className="font-mono text-xs tracking-[0.22em] text-[var(--cyan)] uppercase">Analytics</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Where the revenue comes from</h1>
      </header>
      <Panel title="Revenue by channel">
        <ChannelStack rows={stackedRevenue(model.facts)} currency={currency} />
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Orders and conversion">
          <OrdersChart points={dailyPoints(model.facts, model.filters)} />
        </Panel>
        <Panel title="Customer acquisition">
          <AcquisitionChart points={acquisitionMonths(model.facts.orders)} />
        </Panel>
        <Panel title="Category comparison">
          <HorizontalBars slices={byCategory(model.facts.orders)} currency={currency} label="Revenue by category" />
        </Panel>
        <Panel title="Geographic performance">
          <HorizontalBars slices={byRegion(model.facts.orders)} currency={currency} label="Revenue by region" />
        </Panel>
        <Panel title="Channel performance">
          <HorizontalBars slices={byChannel(model.facts)} currency={currency} label="Revenue by channel" />
        </Panel>
        <Panel title="Revenue distribution">
          <Distribution slices={byCategory(model.facts.orders)} />
        </Panel>
      </div>
    </div>
  )
}
