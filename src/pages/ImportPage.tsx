import { useEffect, useMemo, useState } from 'react'
import { Dialog, Panel } from '../components/Dialog'
import { useOrbitModel } from '../hooks/useOrbitModel'
import { CSV_HEADERS, CSV_TEMPLATE, downloadText, parseOrbitCsv } from '../lib/csv'
import { useDashboard } from '../store/dashboard-store'
import { CATEGORIES, CHANNELS, REGIONS } from '../types'
import type { ImportMode } from '../types'

export function ImportPage() {
  const model = useOrbitModel()
  const applyImport = useDashboard((state) => state.applyImport)
  const [mode, setMode] = useState<ImportMode>('replace')
  const [text, setText] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const existing = useMemo(() => new Set(mode === 'supplement' ? model.dataset.orders.map((order) => order.id) : []), [mode, model.dataset])
  const parsed = useMemo(() => (text == null ? null : parseOrbitCsv(text, mode === 'supplement' ? existing : undefined)), [existing, mode, text])

  useEffect(() => {
    document.title = 'Import — Orbit Metrics'
  }, [])

  function take(file: File | undefined) {
    if (!file) return
    if (file.size > 2_000_000) {
      setText(null)
      setFileError('Files must be 2 MB or smaller.')
      return
    }
    setFileError('')
    setFileName(file.name)
    const reader = new FileReader()
    reader.onerror = () => setFileError('That file could not be read.')
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  function apply() {
    if (!parsed?.ok) return
    applyImport(parsed.dataset, mode)
    setConfirm(false)
    setText(null)
    setFileName('')
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="font-mono text-xs tracking-[0.22em] text-[var(--cyan)] uppercase">CSV import</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Bring your own rows</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          The file stays in this browser. Orbit Metrics does not upload it. A valid file replaces the Northline Supply demonstration data, or adds to it. Charts and KPIs recalculate from the result.
        </p>
      </header>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Upload">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">What should happen to the current data?</legend>
            <label className="flex gap-2 text-sm">
              <input type="radio" name="import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
              Replace demonstration data with this file
            </label>
            <label className="flex gap-2 text-sm">
              <input type="radio" name="import-mode" checked={mode === 'supplement'} onChange={() => setMode('supplement')} />
              Add these rows to the current data
            </label>
          </fieldset>
          {mode === 'supplement' ? <p className="mt-3 text-xs leading-5 text-[var(--muted)]">Adding campaign or traffic rows for dates that already exist increases those totals. Duplicate order IDs are rejected.</p> : null}
          <label className="mt-4 block rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel-2)] px-4 py-8 text-center text-sm" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); take(event.dataTransfer.files[0]) }}>
            Drop a CSV here, or choose a file
            <input className="mt-3 block w-full text-sm" type="file" accept=".csv,text/csv" onChange={(event) => { take(event.target.files?.[0]); event.target.value = '' }} />
          </label>
          <button type="button" className="mt-4 text-sm font-medium text-[var(--cyan)]" onClick={() => downloadText('orbit-metrics-template.csv', CSV_TEMPLATE)}>
            Download a valid template
          </button>
          {fileName ? <p className="mt-3 text-sm">Reading {fileName}</p> : null}
          {fileError ? <p role="alert" className="mt-3 text-sm text-[var(--coral)]">{fileError}</p> : null}
          {parsed?.ok ? (
            <div className="mt-4" role="status">
              <p className="text-sm">Ready: {parsed.dataset.orders.length.toLocaleString('en-US')} orders, {parsed.dataset.campaigns.length.toLocaleString('en-US')} campaign rows, {parsed.dataset.traffic.length.toLocaleString('en-US')} traffic rows.</p>
              <button type="button" className="mt-3 rounded-full bg-[var(--cyan)] px-4 py-2 text-sm font-semibold text-[#07101d]" onClick={() => (mode === 'replace' ? setConfirm(true) : apply())}>
                {mode === 'replace' ? 'Replace demonstration data' : 'Add rows'}
              </button>
            </div>
          ) : null}
          {parsed && !parsed.ok ? (
            <div className="mt-4" role="alert">
              <p className="text-sm font-medium text-[var(--coral)]">The file was not applied. Fix these rows and try again.</p>
              <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-sm">
                {parsed.errors.map((error, index) => (
                  <li key={`${error.row}-${index}`}>Row {error.row || '—'}: {error.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>
        <Panel title="Schema v1">
          <p className="text-sm leading-6 text-[var(--muted)]">One header, three record types. Leave cells blank when a column does not apply. Do not add extra columns.</p>
          <p className="mt-3 overflow-x-auto font-mono text-[11px] leading-5">{CSV_HEADERS.join(', ')}</p>
          <ul className="mt-4 space-y-2 text-sm leading-6">
            <li><strong className="font-medium">order</strong> needs order_id, channel, category, product, units, revenue_usd, new_customer, and region. campaign is optional and only for paid channels.</li>
            <li><strong className="font-medium">campaign</strong> needs a paid channel, campaign name, spend_usd, impressions, and clicks. Clicks cannot exceed impressions.</li>
            <li><strong className="font-medium">traffic</strong> needs channel and sessions.</li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Channels: {CHANNELS.join(', ')}. Categories: {CATEGORIES.join(', ')}. Regions: {REGIONS.join(', ')}. new_customer accepts true or false. Use one true row per acquired customer.</p>
        </Panel>
      </div>
      {confirm && parsed?.ok ? (
        <Dialog title="Replace the demonstration data?" onClose={() => setConfirm(false)}>
          <p>This removes the built-in Northline Supply dataset on this device and keeps only the file. You can restore it from Settings. No payment, account, or server is involved.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--text)]" onClick={() => setConfirm(false)}>
              Cancel
            </button>
            <button type="button" className="rounded-full bg-[var(--coral)] px-4 py-2 text-sm font-semibold text-[#07101d]" onClick={apply}>
              Replace data
            </button>
          </div>
        </Dialog>
      ) : null}
    </div>
  )
}
