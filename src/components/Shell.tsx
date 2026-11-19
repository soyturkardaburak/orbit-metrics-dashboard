import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { formatDay, previousRange } from '../lib/dates'
import { useCampaignNames, useOrbitModel } from '../hooks/useOrbitModel'
import { useDashboard } from '../store/dashboard-store'
import { CATEGORIES, CHANNELS, REGIONS, type Category, type Channel, type Region } from '../types'
import { Mark } from './Mark'

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/analytics', label: 'Analytics' },
  { to: '/marketing', label: 'Marketing' },
  { to: '/explorer', label: 'Explorer' },
  { to: '/import', label: 'Import' },
  { to: '/report', label: 'Report' },
  { to: '/settings', label: 'Settings' },
]

const PRESETS = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '12m', label: '12 months' },
  { id: 'custom', label: 'Custom' },
] as const

function sourceLabel(source: string): string {
  if (source === 'imported') return 'Imported file'
  if (source === 'mixed') return 'Demonstration plus imported rows'
  return 'Fictional demonstration'
}

export function Shell() {
  const location = useLocation()
  const path = location.pathname
  const [open, setOpen] = useState(false)
  const [menuPath, setMenuPath] = useState(path)
  if (path !== menuPath) {
    setMenuPath(path)
    if (open) setOpen(false)
  }

  const theme = useDashboard((state) => state.prefs.theme)
  const prefs = useDashboard((state) => state.prefs)
  const notice = useDashboard((state) => state.notice)
  const clearNotice = useDashboard((state) => state.clearNotice)
  const setPreset = useDashboard((state) => state.setPreset)
  const setCustomRange = useDashboard((state) => state.setCustomRange)
  const toggleChannel = useDashboard((state) => state.toggleChannel)
  const toggleCategory = useDashboard((state) => state.toggleCategory)
  const toggleRegion = useDashboard((state) => state.toggleRegion)
  const toggleCampaign = useDashboard((state) => state.toggleCampaign)
  const clearFilters = useDashboard((state) => state.clearFilters)
  const model = useOrbitModel()
  const campaigns = useCampaignNames(model.dataset)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const color = theme === 'light' ? '#e7eef6' : '#070d1a'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  }, [theme])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const filtersActive = prefs.channels.length + prefs.categories.length + prefs.regions.length + prefs.campaigns.length > 0 || prefs.preset !== '30d'
  const prior = model.filters ? previousRange(model.filters.range) : null

  const nav = (
    <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-[var(--panel-2)] text-[var(--text)] shadow-[inset_3px_0_0_var(--cyan)]' : 'text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]'}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="no-print sticky top-0 hidden h-screen flex-col border-r border-[var(--line)] bg-[var(--bg)] px-4 py-5 lg:flex">
          <Brand />
          <div className="mt-8">{nav}</div>
          <p className="mt-auto pt-6 font-mono text-[10px] tracking-[0.16em] text-[var(--muted)] uppercase">Local demo · no account</p>
        </aside>
        <div className="min-w-0">
          <header className="no-print sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg)]">
            <div className="flex items-center gap-3 px-4 py-3 md:px-6">
              <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm lg:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(true)}>
                Menu
              </button>
              <div className="lg:hidden">
                <Brand compact />
              </div>
              <p className="ml-auto hidden font-mono text-[11px] tracking-[0.14em] text-[var(--amber)] uppercase sm:block">{sourceLabel(model.dataset.source)}</p>
            </div>
            <div className="flex flex-wrap items-end gap-3 border-t border-[var(--line)] px-4 py-3 md:px-6">
              <div role="radiogroup" aria-label="Date range" className="flex flex-wrap gap-1">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={prefs.preset === preset.id}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${prefs.preset === preset.id ? 'bg-[var(--cyan)] text-[#07101d]' : 'border border-[var(--line)] text-[var(--muted)]'}`}
                    onClick={() => setPreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {prefs.preset === 'custom' ? (
                <div className="flex flex-wrap gap-2">
                  <label className="text-xs text-[var(--muted)]">
                    Start
                    <input className="ml-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[var(--text)]" type="date" value={prefs.customStart} onChange={(event) => setCustomRange(event.target.value, prefs.customEnd)} />
                  </label>
                  <label className="text-xs text-[var(--muted)]">
                    End
                    <input className="ml-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[var(--text)]" type="date" value={prefs.customEnd} onChange={(event) => setCustomRange(prefs.customStart, event.target.value)} />
                  </label>
                </div>
              ) : null}
              <FilterMenu label="Channel" selected={prefs.channels.length} empty="All channels">
                {CHANNELS.map((channel) => (
                  <Check key={channel} label={channel} checked={prefs.channels.includes(channel)} onChange={() => toggleChannel(channel as Channel)} />
                ))}
              </FilterMenu>
              <FilterMenu label="Category" selected={prefs.categories.length} empty="All categories">
                {CATEGORIES.map((category) => (
                  <Check key={category} label={category} checked={prefs.categories.includes(category)} onChange={() => toggleCategory(category as Category)} />
                ))}
              </FilterMenu>
              <FilterMenu label="Region" selected={prefs.regions.length} empty="All regions">
                {REGIONS.map((region) => (
                  <Check key={region} label={region} checked={prefs.regions.includes(region)} onChange={() => toggleRegion(region as Region)} />
                ))}
              </FilterMenu>
              <FilterMenu label="Campaign" selected={prefs.campaigns.length} empty="All campaigns">
                {campaigns.map((campaign) => (
                  <Check key={campaign} label={campaign} checked={prefs.campaigns.includes(campaign)} onChange={() => toggleCampaign(campaign)} />
                ))}
              </FilterMenu>
              {filtersActive ? (
                <button type="button" className="text-xs font-medium text-[var(--cyan)]" onClick={clearFilters}>
                  Reset filters
                </button>
              ) : null}
            </div>
            {model.error ? (
              <p role="alert" className="px-4 pb-3 text-sm text-[var(--coral)] md:px-6">
                {model.error}
              </p>
            ) : prior && model.filters ? (
              <p className="px-4 pb-3 font-mono text-[11px] text-[var(--muted)] md:px-6">
                {formatDay(model.filters.range.start)} – {formatDay(model.filters.range.end)} compared with {formatDay(prior.start)} – {formatDay(prior.end)}
              </p>
            ) : null}
          </header>
          <main id="main" className="px-4 py-6 md:px-6 md:py-8">
            <Suspense fallback={<p className="font-mono text-xs tracking-[0.18em] text-[var(--cyan)] uppercase">Calculating the orbit…</p>}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      {open ? (
        <div className="no-print fixed inset-0 z-40 bg-[#040812]/70 lg:hidden" onMouseDown={() => setOpen(false)}>
          <div id="mobile-nav" className="flex h-full w-72 flex-col bg-[var(--bg)] px-4 py-5" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <Brand />
              <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1 text-sm" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            {nav}
          </div>
        </div>
      ) : null}
      {notice ? (
        <div role="status" className="no-print fixed right-4 bottom-4 z-50 max-w-sm rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
          <p className="text-sm">{notice}</p>
          <button type="button" className="mt-3 text-xs font-medium text-[var(--cyan)]" onClick={clearNotice}>
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-[var(--text)]">
      <Mark className="h-8 w-8 text-[var(--cyan)]" />
      <div>
        <p className="font-display text-lg leading-none font-semibold tracking-tight">ORBIT</p>
        {!compact ? <p className="mt-1 font-mono text-[10px] tracking-[0.22em] text-[var(--muted)] uppercase">Metrics</p> : null}
      </div>
    </div>
  )
}

function FilterMenu({ label, selected, empty, children }: { label: string; selected: number; empty: string; children: ReactNode }) {
  return (
    <details className="relative">
      <summary className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--text)]">
        {label}: {selected === 0 ? empty : `${selected} selected`}
      </summary>
      <div className="absolute z-20 mt-2 max-h-64 w-56 overflow-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-2 shadow-[var(--shadow)]">{children}</div>
    </details>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--panel-2)]">
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  )
}
