import { useEffect, useState } from 'react'
import { Dialog, Panel } from '../components/Dialog'
import { useOrbitModel } from '../hooks/useOrbitModel'
import { DISPLAY_RATES } from '../lib/format'
import { useDashboard } from '../store/dashboard-store'
import type { Currency, ThemeName } from '../types'

export function SettingsPage() {
  const model = useOrbitModel()
  const prefs = useDashboard((state) => state.prefs)
  const setTheme = useDashboard((state) => state.setTheme)
  const setCurrency = useDashboard((state) => state.setCurrency)
  const resetDemo = useDashboard((state) => state.resetDemo)
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    document.title = 'Settings — Orbit Metrics'
  }, [])

  return (
    <div className="space-y-4">
      <header>
        <p className="font-mono text-xs tracking-[0.22em] text-[var(--cyan)] uppercase">Settings</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">This device</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Theme, currency, and imported rows are saved in local storage. They are not sent to a server.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Appearance">
          <Choice name="theme" value={prefs.theme} options={[['dark', 'Midnight'], ['light', 'Daylight']]} onChange={(value) => setTheme(value as ThemeName)} />
        </Panel>
        <Panel title="Currency">
          <Choice name="currency" value={prefs.currency} options={[['USD', 'US dollar'], ['EUR', 'Euro'], ['GBP', 'Pound']]} onChange={(value) => setCurrency(value as Currency)} />
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">Amounts are stored in US dollars. Display rates are fixed: 1 USD = {DISPLAY_RATES.EUR} EUR = {DISPLAY_RATES.GBP} GBP. They are not live exchange rates.</p>
        </Panel>
        <Panel title="Demonstration data">
          <p className="text-sm leading-6">
            Source: {model.dataset.source}. {model.dataset.orders.length.toLocaleString('en-US')} orders, {model.dataset.campaigns.length.toLocaleString('en-US')} campaign rows, {model.dataset.traffic.length.toLocaleString('en-US')} traffic rows.
          </p>
          <button type="button" className="mt-4 rounded-full border border-[var(--coral)] px-4 py-2 text-sm text-[var(--coral)]" onClick={() => setConfirm(true)}>
            Reset demonstration data
          </button>
        </Panel>
        <Panel title="Metric definitions">
          <ul className="space-y-2 text-sm leading-6 text-[var(--muted)]">
            <li>Revenue is the sum of order revenue. Average order value is revenue divided by orders.</li>
            <li>Conversion is orders divided by sessions, unless a campaign filter is on. Then it is orders divided by campaign clicks.</li>
            <li>Acquisition cost is paid spend divided by new customers from paid search, paid social, and affiliate.</li>
            <li>Marketing ROI is paid-channel revenue minus spend, divided by spend.</li>
            <li>CTR is clicks divided by impressions. CPC is spend divided by clicks. CPA is spend divided by attributed orders. ROAS is attributed revenue divided by spend.</li>
            <li>Category and region filters hide conversion, acquisition cost, ROI, CPA, and ROAS because sessions and spend are not stored at that grain.</li>
          </ul>
        </Panel>
      </div>
      {confirm ? (
        <Dialog title="Restore the built-in dataset?" onClose={() => setConfirm(false)}>
          <p>This clears imported rows and resets filters on this device. Theme and currency stay as they are.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--text)]" onClick={() => setConfirm(false)}>
              Cancel
            </button>
            <button type="button" className="rounded-full bg-[var(--coral)] px-4 py-2 text-sm font-semibold text-[#07101d]" onClick={() => { resetDemo(); setConfirm(false) }}>
              Restore data
            </button>
          </div>
        </Dialog>
      ) : null}
    </div>
  )
}

function Choice({ name, value, options, onChange }: { name: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{name}</legend>
      {options.map(([option, label]) => (
        <label key={option} className="flex items-center gap-2 text-sm">
          <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} />
          {label}
        </label>
      ))}
    </fieldset>
  )
}
