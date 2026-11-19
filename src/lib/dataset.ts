import { demonstrationDataset, datasetBounds } from '../data/generate'
import type { Dataset, ImportMode } from '../types'

export function resolveDataset(imported: Dataset | null, mode: ImportMode | null): Dataset {
  const demo = demonstrationDataset()
  if (!imported || !mode) return demo
  if (mode === 'replace') return imported
  return {
    orders: [...demo.orders, ...imported.orders],
    campaigns: [...demo.campaigns, ...imported.campaigns],
    traffic: [...demo.traffic, ...imported.traffic],
    source: 'mixed',
  }
}

export function endDateOf(dataset: Dataset): string {
  return datasetBounds(dataset).end
}
