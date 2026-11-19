import type { Prefs } from '../types'

export const STORAGE_KEY = 'orbit-metrics-preferences'

export const defaultPrefs: Prefs = {
  theme: 'dark',
  currency: 'USD',
  preset: '30d',
  customStart: '2026-10-02',
  customEnd: '2026-10-31',
  channels: [],
  categories: [],
  regions: [],
  campaigns: [],
}
