import type { Preset, Range } from '../types'

export function parseISODate(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return { y, m, d }
}

export function addDays(iso: string, days: number): string {
  const parts = parseISODate(iso)
  if (!parts) throw new Error(`Invalid date: ${iso}`)
  const date = new Date(Date.UTC(parts.y, parts.m - 1, parts.d + days))
  return date.toISOString().slice(0, 10)
}

export function eachDay(start: string, end: string): string[] {
  const days: string[] = []
  if (!parseISODate(start) || !parseISODate(end) || start > end) return days
  let cursor = start
  while (cursor <= end) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return days
}

export function inclusiveDays(range: Range): number {
  const start = Date.parse(`${range.start}T00:00:00Z`)
  const end = Date.parse(`${range.end}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000) + 1
}

export function previousRange(range: Range): Range {
  const days = inclusiveDays(range)
  const end = addDays(range.start, -1)
  return { start: addDays(end, -(days - 1)), end }
}

export function resolveRange(
  preset: Preset,
  customStart: string,
  customEnd: string,
  endDate: string,
): { range: Range | null; error: string | null } {
  if (preset !== 'custom') {
    const back = preset === '7d' ? 6 : preset === '30d' ? 29 : preset === '90d' ? 89 : 364
    return { range: { start: addDays(endDate, -back), end: endDate }, error: null }
  }
  if (!parseISODate(customStart) || !parseISODate(customEnd)) {
    return { range: null, error: 'Enter a valid start and end date.' }
  }
  if (customStart > customEnd) {
    return { range: null, error: 'The start date must be on or before the end date.' }
  }
  return { range: { start: customStart, end: customEnd }, error: null }
}

export function formatDay(iso: string): string {
  const parts = parseISODate(iso)
  if (!parts) return iso
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatShort(iso: string): string {
  const parts = parseISODate(iso)
  if (!parts) return iso
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

export function formatMonth(ym: string): string {
  const [year, month] = ym.split('-')
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
