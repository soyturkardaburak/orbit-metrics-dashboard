import { eachDay, formatMonth, formatShort } from './dates'
import { roundMoney, sumMoney } from './format'
import {
  CHANNELS,
  PAID_CHANNELS,
  type CampaignRecord,
  type Channel,
  type Filters,
  type OrderRecord,
  type Range,
} from '../types'

export type ConversionBasis = 'sessions' | 'clicks' | 'unavailable'

export interface WindowFacts {
  range: Range
  orders: OrderRecord[]
  campaignRows: CampaignRecord[]
  trafficRows: { date: string; channel: Channel; sessions: number }[]
}

export interface Summary {
  revenue: number
  orders: number
  aov: number | null
  conversion: number | null
  conversionBasis: ConversionBasis
  conversionHint: string
  cac: number | null
  cacHint: string
  roi: number | null
  roiHint: string
  spend: number
  sessions: number
  clicks: number
  impressions: number
  newCustomers: number
  paidRevenue: number
}

export interface DayPoint {
  date: string
  label: string
  revenue: number
  orders: number
  sessions: number
  clicks: number
  conversion: number | null
}

export interface Slice {
  name: string
  revenue: number
  orders: number
  sessions: number
}

export interface MonthPoint {
  month: string
  label: string
  newCustomers: number
  returning: number
}

export interface CampaignStat {
  campaign: string
  channel: Channel
  spend: number
  impressions: number
  clicks: number
  orders: number
  revenue: number
  ctr: number | null
  cpc: number | null
  cpa: number | null
  roas: number | null
}

const PAID = new Set<string>(PAID_CHANNELS)

export function grainBlocked(filters: Filters): boolean {
  return filters.categories.length > 0 || filters.regions.length > 0
}

export function conversionBasis(filters: Filters): ConversionBasis {
  if (grainBlocked(filters)) return 'unavailable'
  if (filters.campaigns.length > 0) return 'clicks'
  return 'sessions'
}

export function selectFacts(dataset: { orders: OrderRecord[]; campaigns: CampaignRecord[]; traffic: WindowFacts['trafficRows'] }, filters: Filters): WindowFacts {
  const channelOk = (channel: Channel) => filters.channels.length === 0 || filters.channels.includes(channel)
  const orders = dataset.orders.filter((order) => {
    if (order.date < filters.range.start || order.date > filters.range.end) return false
    if (!channelOk(order.channel)) return false
    if (filters.categories.length && !filters.categories.includes(order.category)) return false
    if (filters.regions.length && !filters.regions.includes(order.region)) return false
    if (filters.campaigns.length && (!order.campaign || !filters.campaigns.includes(order.campaign))) return false
    return true
  })
  const campaignRows = dataset.campaigns.filter((row) => {
    if (row.date < filters.range.start || row.date > filters.range.end) return false
    if (!channelOk(row.channel)) return false
    if (filters.campaigns.length && !filters.campaigns.includes(row.campaign)) return false
    return true
  })
  const trafficRows = dataset.traffic.filter((row) => {
    if (row.date < filters.range.start || row.date > filters.range.end) return false
    return channelOk(row.channel)
  })
  return { range: filters.range, orders, campaignRows, trafficRows }
}

export function summarize(facts: WindowFacts, filters: Filters): Summary {
  let revenueCents = 0
  let paidCents = 0
  let newCustomers = 0
  let newPaid = 0
  for (const order of facts.orders) {
    const cents = Math.round(order.revenue * 100)
    revenueCents += cents
    if (order.newCustomer) newCustomers += 1
    if (PAID.has(order.channel)) {
      paidCents += cents
      if (order.newCustomer) newPaid += 1
    }
  }
  let spendCents = 0
  let impressions = 0
  let clicks = 0
  let sessions = 0
  for (const row of facts.campaignRows) {
    spendCents += Math.round(row.spend * 100)
    impressions += row.impressions
    clicks += row.clicks
  }
  for (const row of facts.trafficRows) sessions += row.sessions

  const revenue = revenueCents / 100
  const spend = spendCents / 100
  const paidRevenue = paidCents / 100
  const orders = facts.orders.length
  const basis = conversionBasis(filters)
  const blocked = grainBlocked(filters)

  let conversion: number | null = null
  let conversionHint: string
  if (basis === 'unavailable') {
    conversionHint = 'Sessions are stored by channel and day, so conversion is hidden while a category or region filter is on.'
  } else if (basis === 'clicks') {
    conversion = clicks > 0 ? orders / clicks : null
    conversionHint = clicks > 0 ? 'Orders divided by campaign clicks in this period.' : 'No campaign clicks in this period.'
  } else {
    conversion = sessions > 0 ? orders / sessions : null
    conversionHint = sessions > 0 ? 'Orders divided by sessions.' : 'No sessions in this period.'
  }

  let cac: number | null = null
  let cacHint: string
  if (blocked) {
    cacHint = 'Ad spend is not recorded by category or region.'
  } else if (spend <= 0) {
    cacHint = 'No advertising spend in this period.'
  } else if (newPaid <= 0) {
    cacHint = 'No new customers from paid channels in this period.'
  } else {
    cac = spend / newPaid
    cacHint = 'Paid spend divided by new customers from paid search, paid social, and affiliate.'
  }

  let roi: number | null = null
  let roiHint: string
  if (blocked) {
    roiHint = 'Marketing ROI needs unsplit spend, so it is hidden for category and region filters.'
  } else if (spend <= 0) {
    roiHint = 'No advertising spend in this period.'
  } else {
    roi = (paidRevenue - spend) / spend
    roiHint = '(Paid-channel revenue − spend) ÷ spend.'
  }

  return {
    revenue,
    orders,
    aov: orders > 0 ? revenue / orders : null,
    conversion,
    conversionBasis: basis,
    conversionHint,
    cac,
    cacHint,
    roi,
    roiHint,
    spend,
    sessions,
    clicks,
    impressions,
    newCustomers,
    paidRevenue,
  }
}

export function dailyPoints(facts: WindowFacts, filters: Filters): DayPoint[] {
  const basis = conversionBasis(filters)
  const days = eachDay(facts.range.start, facts.range.end)
  const map = new Map<string, DayPoint>()
  for (const day of days) {
    map.set(day, { date: day, label: formatShort(day), revenue: 0, orders: 0, sessions: 0, clicks: 0, conversion: null })
  }
  for (const order of facts.orders) {
    const point = map.get(order.date)
    if (!point) continue
    point.orders += 1
    point.revenue = roundMoney(point.revenue + order.revenue)
  }
  for (const row of facts.trafficRows) {
    const point = map.get(row.date)
    if (point) point.sessions += row.sessions
  }
  for (const row of facts.campaignRows) {
    const point = map.get(row.date)
    if (point) point.clicks += row.clicks
  }
  for (const point of map.values()) {
    if (basis === 'sessions' && point.sessions > 0) point.conversion = point.orders / point.sessions
    if (basis === 'clicks' && point.clicks > 0) point.conversion = point.orders / point.clicks
  }
  return [...map.values()]
}

export function stackedRevenue(facts: WindowFacts): Record<string, string | number>[] {
  const days = eachDay(facts.range.start, facts.range.end)
  const rows = days.map((day) => {
    const row: Record<string, string | number> = { date: day, label: formatShort(day) }
    for (const channel of CHANNELS) row[channel] = 0
    return row
  })
  const byDate = new Map(rows.map((row) => [String(row.date), row]))
  for (const order of facts.orders) {
    const row = byDate.get(order.date)
    if (!row) continue
    row[order.channel] = roundMoney(Number(row[order.channel]) + order.revenue)
  }
  return rows
}

function sliceBy(orders: OrderRecord[], key: (order: OrderRecord) => string): Slice[] {
  const map = new Map<string, Slice>()
  for (const order of orders) {
    const name = key(order)
    const current = map.get(name) ?? { name, revenue: 0, orders: 0, sessions: 0 }
    current.orders += 1
    current.revenue = roundMoney(current.revenue + order.revenue)
    map.set(name, current)
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name))
}

export function byChannel(facts: WindowFacts): Slice[] {
  const slices = sliceBy(facts.orders, (order) => order.channel)
  const sessions = new Map<string, number>()
  for (const row of facts.trafficRows) sessions.set(row.channel, (sessions.get(row.channel) ?? 0) + row.sessions)
  for (const slice of slices) slice.sessions = sessions.get(slice.name) ?? 0
  return slices
}

export function byCategory(orders: OrderRecord[]): Slice[] {
  return sliceBy(orders, (order) => order.category)
}

export function byRegion(orders: OrderRecord[]): Slice[] {
  return sliceBy(orders, (order) => order.region)
}

export function byProduct(orders: OrderRecord[], limit = 5): Slice[] {
  return sliceBy(orders, (order) => order.product).slice(0, limit)
}

export function acquisitionMonths(orders: OrderRecord[]): MonthPoint[] {
  const map = new Map<string, MonthPoint>()
  for (const order of orders) {
    const month = order.date.slice(0, 7)
    const current = map.get(month) ?? { month, label: formatMonth(month), newCustomers: 0, returning: 0 }
    if (order.newCustomer) current.newCustomers += 1
    else current.returning += 1
    map.set(month, current)
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month))
}

export function campaignStats(facts: WindowFacts, filters: Filters): CampaignStat[] {
  const comparable = !grainBlocked(filters)
  const map = new Map<string, CampaignStat>()
  const ensure = (campaign: string, channel: Channel) => {
    const key = `${campaign}||${channel}`
    const current = map.get(key)
    if (current) return current
    const created: CampaignStat = {
      campaign,
      channel,
      spend: 0,
      impressions: 0,
      clicks: 0,
      orders: 0,
      revenue: 0,
      ctr: null,
      cpc: null,
      cpa: null,
      roas: null,
    }
    map.set(key, created)
    return created
  }
  for (const row of facts.campaignRows) {
    const stat = ensure(row.campaign, row.channel)
    stat.spend = roundMoney(stat.spend + row.spend)
    stat.impressions += row.impressions
    stat.clicks += row.clicks
  }
  for (const order of facts.orders) {
    if (!order.campaign) continue
    const stat = ensure(order.campaign, order.channel)
    stat.orders += 1
    stat.revenue = roundMoney(stat.revenue + order.revenue)
  }
  for (const stat of map.values()) {
    stat.ctr = stat.impressions > 0 ? stat.clicks / stat.impressions : null
    stat.cpc = stat.clicks > 0 ? stat.spend / stat.clicks : null
    stat.cpa = comparable && stat.orders > 0 ? stat.spend / stat.orders : null
    stat.roas = comparable && stat.spend > 0 ? stat.revenue / stat.spend : null
  }
  return [...map.values()].sort((a, b) => (b.roas ?? -1) - (a.roas ?? -1) || b.spend - a.spend || a.campaign.localeCompare(b.campaign))
}

export function filterOrders(orders: OrderRecord[], search: string): OrderRecord[] {
  const query = search.trim().toLowerCase()
  if (!query) return orders
  return orders.filter((order) =>
    [order.id, order.product, order.channel, order.category, order.region, order.campaign ?? ''].some((value) =>
      value.toLowerCase().includes(query),
    ),
  )
}

export function revenueOf(orders: OrderRecord[]): number {
  return sumMoney(orders.map((order) => order.revenue))
}
