import { useMemo } from 'react'
import { endDateOf, resolveDataset } from '../lib/dataset'
import { previousRange, resolveRange } from '../lib/dates'
import { selectFacts, summarize, type Summary, type WindowFacts } from '../lib/metrics'
import { useDashboard } from '../store/dashboard-store'
import type { Dataset, Filters } from '../types'

export interface OrbitModel {
  dataset: Dataset
  error: string | null
  filters: Filters | null
  current: Summary | null
  previous: Summary | null
  facts: WindowFacts | null
  priorFacts: WindowFacts | null
}

export function useOrbitModel(): OrbitModel {
  const prefs = useDashboard((state) => state.prefs)
  const imported = useDashboard((state) => state.imported)
  const importMode = useDashboard((state) => state.importMode)

  return useMemo(() => {
    const dataset = resolveDataset(imported, importMode)
    const resolved = resolveRange(prefs.preset, prefs.customStart, prefs.customEnd, endDateOf(dataset))
    if (!resolved.range) {
      return { dataset, error: resolved.error, filters: null, current: null, previous: null, facts: null, priorFacts: null }
    }
    const filters: Filters = {
      range: resolved.range,
      channels: prefs.channels,
      categories: prefs.categories,
      regions: prefs.regions,
      campaigns: prefs.campaigns,
    }
    const prior = previousRange(filters.range)
    const facts = selectFacts(dataset, filters)
    const priorFacts = selectFacts(dataset, { ...filters, range: prior })
    return {
      dataset,
      error: null,
      filters,
      current: summarize(facts, filters),
      previous: summarize(priorFacts, { ...filters, range: prior }),
      facts,
      priorFacts,
    }
  }, [imported, importMode, prefs])
}

export function useCampaignNames(dataset: Dataset): string[] {
  return useMemo(() => [...new Set(dataset.campaigns.map((row) => row.campaign))].sort((a, b) => a.localeCompare(b)), [dataset])
}
