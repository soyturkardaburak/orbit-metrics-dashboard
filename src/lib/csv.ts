import Papa from 'papaparse'
import { roundMoney } from './format'
import {
  CATEGORIES,
  CHANNELS,
  PAID_CHANNELS,
  REGIONS,
  type CampaignRecord,
  type Category,
  type Channel,
  type Dataset,
  type OrderRecord,
  type Region,
  type TrafficRecord,
} from '../types'

export const CSV_HEADERS = [
  'record_type',
  'date',
  'order_id',
  'channel',
  'category',
  'product',
  'units',
  'revenue_usd',
  'new_customer',
  'region',
  'campaign',
  'spend_usd',
  'impressions',
  'clicks',
  'sessions',
] as const

export const CSV_TEMPLATE = [
  CSV_HEADERS.join(','),
  'order,2026-10-01,SAMPLE-1001,Direct,Home,Harbor Mug Set,1,42.00,true,North America,,,,,',
  'order,2026-10-01,SAMPLE-1002,Paid search,Audio,Studio Buds,1,79.00,true,Europe,Winter hearth,,,,',
  'campaign,2026-10-01,,Paid search,,,,,,,Winter hearth,120.50,8000,240,',
  'traffic,2026-10-01,,Direct,,,,,,,,,,,420',
].join('\n')

export interface CsvError {
  row: number
  message: string
}

export type CsvResult = { ok: true; dataset: Dataset } | { ok: false; errors: CsvError[] }

const CHANNEL_SET = new Set<string>(CHANNELS)
const CATEGORY_SET = new Set<string>(CATEGORIES)
const REGION_SET = new Set<string>(REGIONS)
const PAID_SET = new Set<string>(PAID_CHANNELS)

function cell(value: string | number | boolean | null): string {
  if (value == null || value === '') return ''
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

function blankRow(type: string, date: string, values: Record<string, string | number | boolean | null>): string {
  const row: Record<string, string | number | boolean | null> = {
    record_type: type,
    date,
    order_id: '',
    channel: '',
    category: '',
    product: '',
    units: '',
    revenue_usd: '',
    new_customer: '',
    region: '',
    campaign: '',
    spend_usd: '',
    impressions: '',
    clicks: '',
    sessions: '',
    ...values,
  }
  return CSV_HEADERS.map((header) => cell(row[header] ?? '')).join(',')
}

export function ordersToCsv(orders: OrderRecord[]): string {
  const lines = orders.map((order) =>
    blankRow('order', order.date, {
      order_id: order.id,
      channel: order.channel,
      category: order.category,
      product: order.product,
      units: order.units,
      revenue_usd: order.revenue.toFixed(2),
      new_customer: order.newCustomer ? 'true' : 'false',
      region: order.region,
      campaign: order.campaign,
    }),
  )
  return [CSV_HEADERS.join(','), ...lines].join('\n')
}

export function campaignsToCsv(stats: { campaign: string; channel: string; spend: number; impressions: number; clicks: number; orders: number; revenue: number; ctr: number | null; cpc: number | null; cpa: number | null; roas: number | null }[]): string {
  const headers = ['campaign', 'channel', 'spend_usd', 'impressions', 'clicks', 'orders', 'revenue_usd', 'ctr', 'cpc_usd', 'cpa_usd', 'roas']
  const lines = stats.map((stat) =>
    [
      stat.campaign,
      stat.channel,
      stat.spend.toFixed(2),
      stat.impressions,
      stat.clicks,
      stat.orders,
      stat.revenue.toFixed(2),
      stat.ctr == null ? '' : stat.ctr.toFixed(4),
      stat.cpc == null ? '' : stat.cpc.toFixed(2),
      stat.cpa == null ? '' : stat.cpa.toFixed(2),
      stat.roas == null ? '' : stat.roas.toFixed(4),
    ]
      .map((value) => cell(value))
      .join(','),
  )
  return [headers.join(','), ...lines].join('\n')
}

function parseBool(value: string): boolean | null {
  const text = value.trim().toLowerCase()
  if (text === 'true' || text === 'yes' || text === '1') return true
  if (text === 'false' || text === 'no' || text === '0') return false
  return null
}

function parseNumber(value: string): number | null {
  const text = value.trim()
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

function unused(row: Record<string, string>, fields: string[]): string | null {
  for (const field of fields) {
    if ((row[field] ?? '').trim()) return field
  }
  return null
}

export function parseOrbitCsv(text: string, existingOrderIds?: ReadonlySet<string>): CsvResult {
  const source = text.replace(/^\uFEFF/, '')
  if (!source.trim()) return { ok: false, errors: [{ row: 0, message: 'The file is empty.' }] }
  if (source.length > 2_000_000) return { ok: false, errors: [{ row: 0, message: 'Files must be 2 MB or smaller.' }] }

  const parsed = Papa.parse<Record<string, string>>(source, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().replace(/^\uFEFF/, ''),
    transform: (value) => (typeof value === 'string' ? value.trim() : value),
  })
  const fields = parsed.meta.fields ?? []
  if (fields.length !== CSV_HEADERS.length || fields.some((field, index) => field !== CSV_HEADERS[index])) {
    return { ok: false, errors: [{ row: 1, message: `Use this header row: ${CSV_HEADERS.join(',')}` }] }
  }
  if (parsed.data.length > 20_000) {
    return { ok: false, errors: [{ row: 0, message: 'The file has more than 20,000 data rows.' }] }
  }
  if (parsed.data.length === 0) return { ok: false, errors: [{ row: 0, message: 'The file has no data rows.' }] }

  const errors: CsvError[] = []
  for (const error of parsed.errors) {
    if (error.code === 'TooFewFields' || error.code === 'TooManyFields' || error.code === 'MissingQuotes' || error.code === 'InvalidQuotes') {
      errors.push({ row: (error.row ?? 0) + 1, message: error.message })
    }
  }

  const orders: OrderRecord[] = []
  const campaigns: CampaignRecord[] = []
  const traffic: TrafficRecord[] = []
  const seen = new Set<string>()

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2
    const type = row.record_type
    const date = row.date ?? ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
      errors.push({ row: rowNumber, message: 'date must be a real YYYY-MM-DD date.' })
      return
    }
    const utc = new Date(`${date}T00:00:00Z`)
    if (utc.toISOString().slice(0, 10) !== date) {
      errors.push({ row: rowNumber, message: 'date must be a real YYYY-MM-DD date.' })
      return
    }

    if (type === 'order') {
      const extra = unused(row, ['spend_usd', 'impressions', 'clicks', 'sessions'])
      if (extra) errors.push({ row: rowNumber, message: `${extra} is only valid on campaign or traffic rows.` })
      const id = row.order_id ?? ''
      if (!id) errors.push({ row: rowNumber, message: 'order_id is required.' })
      if (id && (seen.has(id) || existingOrderIds?.has(id))) errors.push({ row: rowNumber, message: `order_id ${id} already exists.` })
      if (id) seen.add(id)
      if (!CHANNEL_SET.has(row.channel ?? '')) errors.push({ row: rowNumber, message: 'channel is not a known channel.' })
      if (!CATEGORY_SET.has(row.category ?? '')) errors.push({ row: rowNumber, message: 'category is not a known category.' })
      if (!REGION_SET.has(row.region ?? '')) errors.push({ row: rowNumber, message: 'region is not a known region.' })
      if (!(row.product ?? '')) errors.push({ row: rowNumber, message: 'product is required.' })
      const units = parseNumber(row.units ?? '')
      if (units == null || !Number.isInteger(units) || units < 1) errors.push({ row: rowNumber, message: 'units must be a whole number of at least 1.' })
      const revenue = parseNumber(row.revenue_usd ?? '')
      if (revenue == null || revenue < 0) errors.push({ row: rowNumber, message: 'revenue_usd must be a non-negative number.' })
      const acquired = parseBool(row.new_customer ?? '')
      if (acquired == null) errors.push({ row: rowNumber, message: 'new_customer must be true or false.' })
      const channel = row.channel as Channel
      const campaign = (row.campaign ?? '') || null
      if (campaign && !PAID_SET.has(channel)) errors.push({ row: rowNumber, message: 'campaign is only valid for paid channels.' })
      if (errors.some((error) => error.row === rowNumber)) return
      orders.push({
        id,
        date,
        channel,
        category: row.category as Category,
        product: row.product,
        units: units as number,
        revenue: roundMoney(revenue as number),
        newCustomer: acquired as boolean,
        region: row.region as Region,
        campaign,
      })
      return
    }

    if (type === 'campaign') {
      const extra = unused(row, ['order_id', 'category', 'product', 'units', 'revenue_usd', 'new_customer', 'region', 'sessions'])
      if (extra) errors.push({ row: rowNumber, message: `${extra} is not valid on a campaign row.` })
      if (!PAID_SET.has(row.channel ?? '')) errors.push({ row: rowNumber, message: 'campaign channel must be Paid search, Paid social, or Affiliate.' })
      if (!(row.campaign ?? '')) errors.push({ row: rowNumber, message: 'campaign is required.' })
      const spend = parseNumber(row.spend_usd ?? '')
      const impressions = parseNumber(row.impressions ?? '')
      const clicks = parseNumber(row.clicks ?? '')
      if (spend == null || spend < 0) errors.push({ row: rowNumber, message: 'spend_usd must be a non-negative number.' })
      if (impressions == null || !Number.isInteger(impressions) || impressions < 0) errors.push({ row: rowNumber, message: 'impressions must be a whole number of at least 0.' })
      if (clicks == null || !Number.isInteger(clicks) || clicks < 0) errors.push({ row: rowNumber, message: 'clicks must be a whole number of at least 0.' })
      if (impressions != null && clicks != null && clicks > impressions) errors.push({ row: rowNumber, message: 'clicks cannot exceed impressions.' })
      if (errors.some((error) => error.row === rowNumber)) return
      campaigns.push({
        date,
        campaign: row.campaign,
        channel: row.channel as Channel,
        spend: roundMoney(spend as number),
        impressions: impressions as number,
        clicks: clicks as number,
      })
      return
    }

    if (type === 'traffic') {
      const extra = unused(row, ['order_id', 'category', 'product', 'units', 'revenue_usd', 'new_customer', 'region', 'campaign', 'spend_usd', 'impressions', 'clicks'])
      if (extra) errors.push({ row: rowNumber, message: `${extra} is not valid on a traffic row.` })
      if (!CHANNEL_SET.has(row.channel ?? '')) errors.push({ row: rowNumber, message: 'channel is not a known channel.' })
      const sessions = parseNumber(row.sessions ?? '')
      if (sessions == null || !Number.isInteger(sessions) || sessions < 0) errors.push({ row: rowNumber, message: 'sessions must be a whole number of at least 0.' })
      if (errors.some((error) => error.row === rowNumber)) return
      traffic.push({ date, channel: row.channel as Channel, sessions: sessions as number })
      return
    }

    errors.push({ row: rowNumber, message: 'record_type must be order, campaign, or traffic.' })
  })

  if (errors.length) {
    const shown = errors.slice(0, 40)
    if (errors.length > 40) shown.push({ row: 0, message: `${errors.length - 40} more errors were omitted.` })
    return { ok: false, errors: shown }
  }
  return { ok: true, dataset: { orders, campaigns, traffic, source: 'imported' } }
}

export function downloadText(filename: string, contents: string, type = 'text/csv'): void {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
