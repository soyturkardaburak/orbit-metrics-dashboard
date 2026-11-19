import { useEffect, useMemo, useState } from 'react'
import { CampaignBars } from '../components/Charts'
import { Panel } from '../components/Dialog'
import { moneyOrDash, multipleOrDash, percentOrDash } from '../lib/format'
import { useOrbitModel } from '../hooks/useOrbitModel'
import { campaignsToCsv, downloadText } from '../lib/csv'
import { formatNumber, formatPercent } from '../lib/format'
import { campaignStats, grainBlocked } from '../lib/metrics'
import { useDashboard } from '../store/dashboard-store'

type SortKey = 'campaign' | 'spend' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'cpa' | 'revenue' | 'roas'

export function MarketingPage() {
  const model = useOrbitModel()
  const currency = useDashboard((state) => state.prefs.currency)
  const [sortKey, setSortKey] = useState<SortKey>('roas')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  useEffect(() => {
    document.title = 'Marketing — Orbit Metrics'
  }, [])

  const stats = useMemo(() => (model.facts && model.filters ? campaignStats(model.facts, model.filters) : []), [model.facts, model.filters])
  const sorted = useMemo(() => {
    const copy = [...stats]
    copy.sort((a, b) => {
      const left = a[sortKey]
      const right = b[sortKey]
      const result = typeof left === 'string' || typeof right === 'string' ? String(left ?? '').localeCompare(String(right ?? '')) : (left ?? -1) - (right ?? -1)
      return direction === 'asc' ? result : -result
    })
    return copy
  }, [direction, sortKey, stats])

  if (!model.filters || !model.current) return <p className="text-sm text-[var(--muted)]">Choose a valid date range to rank campaigns.</p>
  const blocked = grainBlocked(model.filters)
  const pageCount = Math.max(1, Math.ceil(sorted.length / 8))
  const visible = sorted.slice(page * 8, page * 8 + 8)

  function sortBy(key: SortKey) {
    if (sortKey === key) setDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setDirection(key === 'campaign' ? 'asc' : 'desc')
    }
    setPage(0)
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.22em] text-[var(--coral)] uppercase">Marketing</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Campaign performance</h1>
        </div>
        <button
          type="button"
          className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
          onClick={() => downloadText('orbit-campaigns.csv', campaignsToCsv(sorted))}
          disabled={sorted.length === 0}
        >
          Export campaigns
        </button>
      </header>
      {blocked ? (
        <p className="rounded-xl border border-[var(--amber)]/50 bg-[var(--panel)] px-4 py-3 text-sm" role="status">
          Category and region filters hide CPA and ROAS. Spend is not recorded at that level, so those ratios would be misleading.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Spend" value={moneyOrDash(model.current.spend, currency)} />
        <Metric label="Paid revenue" value={moneyOrDash(model.current.paidRevenue, currency)} />
        <Metric label="Marketing ROI" value={percentOrDash(model.current.roi)} />
      </div>
      <Panel title="Spend against revenue">
        <CampaignBars rows={sorted.slice(0, 8)} currency={currency} />
      </Panel>
      <Panel
        title="Ranking"
        action={<p className="text-xs text-[var(--muted)]">{sorted.length === 1 ? '1 campaign' : `${sorted.length.toLocaleString('en-US')} campaigns`}</p>}
      >
        {sorted.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No campaigns match these filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto" tabIndex={0} aria-label="Campaign table">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-xs tracking-wide text-[var(--muted)] uppercase">
                    <Header label="Campaign" active={sortKey === 'campaign'} onClick={() => sortBy('campaign')} />
                    <th scope="col" className="px-2 py-2 font-medium">Channel</th>
                    <Header label="Spend" active={sortKey === 'spend'} onClick={() => sortBy('spend')} />
                    <Header label="Impressions" active={sortKey === 'impressions'} onClick={() => sortBy('impressions')} />
                    <Header label="Clicks" active={sortKey === 'clicks'} onClick={() => sortBy('clicks')} />
                    <Header label="CTR" active={sortKey === 'ctr'} onClick={() => sortBy('ctr')} />
                    <Header label="CPC" active={sortKey === 'cpc'} onClick={() => sortBy('cpc')} />
                    <Header label="CPA" active={sortKey === 'cpa'} onClick={() => sortBy('cpa')} />
                    <Header label="Revenue" active={sortKey === 'revenue'} onClick={() => sortBy('revenue')} />
                    <Header label="ROAS" active={sortKey === 'roas'} onClick={() => sortBy('roas')} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((stat, index) => (
                    <tr key={`${stat.campaign}-${stat.channel}`} className="border-b border-[var(--line)]">
                      <th scope="row" className="px-2 py-3 text-left font-medium">
                        <span className="mr-2 font-mono text-[10px] text-[var(--amber)]">{page * 8 + index + 1}</span>
                        {stat.campaign}
                      </th>
                      <td className="px-2 py-3">{stat.channel}</td>
                      <td className="px-2 py-3">{moneyOrDash(stat.spend, currency)}</td>
                      <td className="px-2 py-3">{formatNumber(stat.impressions)}</td>
                      <td className="px-2 py-3">{formatNumber(stat.clicks)}</td>
                      <td className="px-2 py-3">{stat.ctr == null ? '—' : formatPercent(stat.ctr, 2)}</td>
                      <td className="px-2 py-3">{moneyOrDash(stat.cpc, currency)}</td>
                      <td className="px-2 py-3">{moneyOrDash(stat.cpa, currency)}</td>
                      <td className="px-2 py-3">{moneyOrDash(stat.revenue, currency)}</td>
                      <td className="px-2 py-3">{multipleOrDash(stat.roas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <button type="button" className="rounded-full border border-[var(--line)] px-3 py-1 disabled:opacity-40" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
                Previous
              </button>
              <p>
                Page {page + 1} of {pageCount}
              </p>
              <button type="button" className="rounded-full border border-[var(--line)] px-3 py-1 disabled:opacity-40" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>
                Next
              </button>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="font-mono text-[10px] tracking-[0.16em] text-[var(--muted)] uppercase">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
    </article>
  )
}

function Header({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th scope="col" aria-sort={active ? 'descending' : 'none'} className="px-2 py-2 font-medium">
      <button type="button" className={active ? 'text-[var(--cyan)]' : ''} onClick={onClick}>
        {label}
      </button>
    </th>
  )
}
