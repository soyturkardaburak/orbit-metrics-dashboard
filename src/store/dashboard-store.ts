import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category, Channel, Currency, Dataset, ImportMode, Prefs, Preset, Region, ThemeName } from '../types'
import { defaultPrefs, STORAGE_KEY } from './defaults'

interface DashboardState {
  prefs: Prefs
  imported: Dataset | null
  importMode: ImportMode | null
  notice: string | null
  setTheme: (theme: ThemeName) => void
  setCurrency: (currency: Currency) => void
  setPreset: (preset: Preset) => void
  setCustomRange: (customStart: string, customEnd: string) => void
  toggleChannel: (channel: Channel) => void
  toggleCategory: (category: Category) => void
  toggleRegion: (region: Region) => void
  toggleCampaign: (campaign: string) => void
  clearFilters: () => void
  applyImport: (dataset: Dataset, mode: ImportMode) => void
  resetDemo: () => void
  clearNotice: () => void
}

function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export const useDashboard = create<DashboardState>()(
  persist(
    (set) => ({
      prefs: defaultPrefs,
      imported: null,
      importMode: null,
      notice: null,
      setTheme: (theme) => set((state) => ({ prefs: { ...state.prefs, theme } })),
      setCurrency: (currency) => set((state) => ({ prefs: { ...state.prefs, currency } })),
      setPreset: (preset) => set((state) => ({ prefs: { ...state.prefs, preset } })),
      setCustomRange: (customStart, customEnd) =>
        set((state) => ({ prefs: { ...state.prefs, preset: 'custom', customStart, customEnd } })),
      toggleChannel: (channel) => set((state) => ({ prefs: { ...state.prefs, channels: toggle(state.prefs.channels, channel) } })),
      toggleCategory: (category) =>
        set((state) => ({ prefs: { ...state.prefs, categories: toggle(state.prefs.categories, category) } })),
      toggleRegion: (region) => set((state) => ({ prefs: { ...state.prefs, regions: toggle(state.prefs.regions, region) } })),
      toggleCampaign: (campaign) =>
        set((state) => ({ prefs: { ...state.prefs, campaigns: toggle(state.prefs.campaigns, campaign) } })),
      clearFilters: () =>
        set((state) => ({
          prefs: { ...state.prefs, channels: [], categories: [], regions: [], campaigns: [], preset: '30d' },
        })),
      applyImport: (dataset, mode) =>
        set({
          imported: dataset,
          importMode: mode,
          notice:
            mode === 'replace'
              ? 'Demonstration data was replaced on this device. Nothing was uploaded to a server.'
              : 'Imported rows were added on this device. Nothing was uploaded to a server.',
        }),
      resetDemo: () =>
        set((state) => ({
          imported: null,
          importMode: null,
          notice: 'Built-in demonstration data is restored on this device.',
          prefs: { ...defaultPrefs, theme: state.prefs.theme, currency: state.prefs.currency },
        })),
      clearNotice: () => set({ notice: null }),
    }),
    {
      name: STORAGE_KEY,
      skipHydration: true,
      partialize: (state) => ({ prefs: state.prefs, imported: state.imported, importMode: state.importMode }),
    },
  ),
)
