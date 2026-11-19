import { beforeEach, describe, expect, it } from 'vitest'
import { CSV_TEMPLATE, parseOrbitCsv } from '../lib/csv'
import { defaultPrefs, STORAGE_KEY } from './defaults'
import { useDashboard } from './dashboard-store'

describe('dashboard persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    useDashboard.setState({ prefs: { ...defaultPrefs }, imported: null, importMode: null, notice: null })
  })

  it('stores the currency choice on this device', () => {
    useDashboard.getState().setCurrency('EUR')
    expect(useDashboard.getState().prefs.currency).toBe('EUR')
    expect(localStorage.getItem(STORAGE_KEY)).toContain('EUR')
  })

  it('replaces demonstration data and can restore it', () => {
    const parsed = parseOrbitCsv(CSV_TEMPLATE)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    useDashboard.getState().applyImport(parsed.dataset, 'replace')
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { state: { importMode: string; imported: { orders: unknown[] } } }
    expect(saved.state.importMode).toBe('replace')
    expect(saved.state.imported.orders).toHaveLength(2)
    expect(useDashboard.getState().notice).toMatch(/this device/i)
    useDashboard.getState().resetDemo()
    const restored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { state: { imported: null } }
    expect(restored.state.imported).toBeNull()
    expect(useDashboard.getState().prefs.currency).toBe('USD')
  })
})
