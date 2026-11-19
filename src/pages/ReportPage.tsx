import { useEffect } from 'react'
import { Panel } from '../components/Dialog'
import { formatMoneyAuto, formatNumber, formatPercent, moneyOrDash, percentOrDash } from '../lib/format'
import { useOrbitModel } from '../hooks/useOrbitModel'
import { formatDay, previousRange } from '../lib/dates'
import { byCategory, byChannel, byRegion, campaignStats } from '../lib/metrics'
import { useDashboard } from '../store/dashboard-store'

export function ReportPage() {
  const model = useOrbitModel()
  const currency = useDashboard((state) => state.prefs.currency)
  useEffect(() => {
    document.title = 'Report — Orbit Metrics'
  }, [])
  if (!model.current || !model.filters || !model.facts) return <p className="text-sm text-[var(--muted)]">Choose a valid date range to build the report.</p>
  const prior = previousRange(model.filters.range)
  const channels = byChannel(model.facts)
  const categories = byCategory(model.facts.orders)
  const regions = byRegion(model.facts.orders)
  const campaigns = campaignStats(model.facts, model.filters).slice(0, 8)

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 print-panel">
        <div>
          <p className="font-mono text-xs tracking-[0.22em] text-[var(--cyan)] uppercase">Printable report</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Northline Supply</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Fictional demonstration data. {formatDay(model.filters.range.start)} – {formatDay(model.filters.range.end)}, compared with {formatDay(prior.start)} – {formatDay(prior.end)}.</p>
        </div>
        <button type="button" className="no-print rounded-full bg-[var(--cyan)] px-4 py-2 text-sm font-semibold text-[#07101d]" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Revenue', formatMoneyAuto(model.current.revenue, currency)],
          ['Orders', formatNumber(model.current.orders)],
          ['Average order', moneyOrDash(model.current.aov, currency)],
          ['Conversion', percentOrDash(model.current.conversion)],
          ['Acquisition cost', moneyOrDash(model.current.cac, currency)],
          ['Marketing ROI', percentOrDash(model.current.roi)],
        ].map(([label, value]) => (
          <article key={label} className="print-panel rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-[var(--muted)]">{label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </div>
      <ReportTable title="Channels" columns={['Channel', 'Revenue', 'Orders', 'Sessions']} rows={channels.map((row) => [row.name, formatMoneyAuto(row.revenue, currency), formatNumber(row.orders), formatNumber(row.sessions)])} />
      <ReportTable title="Categories" columns={['Category', 'Revenue', 'Orders']} rows={categories.map((row) => [row.name, formatMoneyAuto(row.revenue, currency), formatNumber(row.orders)])} />
      <ReportTable title="Regions" columns={['Region', 'Revenue', 'Orders']} rows={regions.map((row) => [row.name, formatMoneyAuto(row.revenue, currency), formatNumber(row.orders)])} />
      <ReportTable title="Campaigns" columns={['Campaign', 'Spend', 'Revenue', 'ROAS']} rows={campaigns.map((row) => [row.campaign, formatMoneyAuto(row.spend, currency), formatMoneyAuto(row.revenue, currency), row.roas == null ? '—' : `${row.roas.toFixed(2)}x`])} />
      <Panel title="How the figures are calculated">
        <ul className="space-y-2 text-sm leading-6 text-[var(--muted)]">
          <li>Conversion: {model.current.conversionHint} Current value {model.current.conversion == null ? 'is hidden' : `is ${formatPercent(model.current.conversion, 2)}`}.</li>
          <li>Acquisition cost: {model.current.cacHint}</li>
          <li>Marketing ROI: {model.current.roiHint}</li>
          <li>Displayed currency uses a fixed demonstration rate and does not call an exchange service.</li>
        </ul>
      </Panel>
    </div>
  )
}

function ReportTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return (
    <Panel title={title} className="print-panel">
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Nothing in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                {columns.map((column) => (
                  <th key={column} scope="col" className="px-2 py-2 font-medium">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.join('|')} className="border-b border-[var(--line)]">
                  {row.map((cell, index) => (
                    <td key={index} className="px-2 py-2">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
