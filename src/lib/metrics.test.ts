import { describe, expect, it } from 'vitest'
import { createDemonstrationDataset, DATASET_END, DATASET_START } from '../data/generate'
import { inclusiveDays, previousRange, resolveRange } from './dates'
import { DISPLAY_RATES, formatMoney, sumMoney } from './format'
import { campaignStats, filterOrders, revenueOf, selectFacts, summarize } from './metrics'
import { PAID_CHANNELS, type Dataset, type Filters } from '../types'

const base: Filters = { range: { start: '2026-10-01', end: '2026-10-02' }, channels: [], categories: [], regions: [], campaigns: [] }

function fixture(): Dataset {
  return {
    source: 'imported',
    orders: [
      { id: 'A', date: '2026-10-01', channel: 'Direct', category: 'Home', product: 'Harbor Mug Set', units: 1, revenue: 100, newCustomer: false, region: 'North America', campaign: null },
      { id: 'B', date: '2026-10-01', channel: 'Paid search', category: 'Audio', product: 'Studio Buds', units: 1, revenue: 50, newCustomer: true, region: 'Europe', campaign: 'Winter hearth' },
      { id: 'C', date: '2026-10-02', channel: 'Paid search', category: 'Audio', product: 'Studio Buds', units: 1, revenue: 25, newCustomer: false, region: 'Europe', campaign: 'Winter hearth' },
    ],
    campaigns: [
      { date: '2026-10-01', campaign: 'Winter hearth', channel: 'Paid search', spend: 40, impressions: 1000, clicks: 50 },
      { date: '2026-10-02', campaign: 'Winter hearth', channel: 'Paid search', spend: 10, impressions: 500, clicks: 10 },
    ],
    traffic: [
      { date: '2026-10-01', channel: 'Direct', sessions: 40 },
      { date: '2026-10-01', channel: 'Paid search', sessions: 25 },
      { date: '2026-10-02', channel: 'Paid search', sessions: 20 },
    ],
  }
}

describe('dates and display rates', () => {
  it('resolves a 30-day window and the matching prior window', () => {
    const resolved = resolveRange('30d', '', '', '2026-10-31')
    expect(resolved.range).toEqual({ start: '2026-10-02', end: '2026-10-31' })
    expect(inclusiveDays(resolved.range!)).toBe(30)
    expect(previousRange(resolved.range!)).toEqual({ start: '2026-09-02', end: '2026-10-01' })
  })

  it('rejects an inverted custom range', () => {
    expect(resolveRange('custom', '2026-10-10', '2026-10-01', DATASET_END).error).toMatch(/start date/i)
  })

  it('converts stored dollars with the disclosed fixed rates', () => {
    expect(formatMoney(100, 'EUR')).toBe(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(100 * DISPLAY_RATES.EUR))
    expect(formatMoney(100, 'GBP', 2)).toContain('79.00')
  })
})

describe('metric formulas', () => {
  const data = fixture()

  it('derives overview metrics from orders, sessions, and spend', () => {
    const facts = selectFacts(data, base)
    const summary = summarize(facts, base)
    expect(summary.revenue).toBe(175)
    expect(summary.orders).toBe(3)
    expect(summary.aov).toBeCloseTo(175 / 3)
    expect(summary.sessions).toBe(85)
    expect(summary.conversion).toBeCloseTo(3 / 85)
    expect(summary.spend).toBe(50)
    expect(summary.cac).toBe(50)
    expect(summary.paidRevenue).toBe(75)
    expect(summary.roi).toBeCloseTo(0.5)
    expect(summary.revenue).toBe(revenueOf(facts.orders))
  })

  it('uses clicks as the conversion denominator when a campaign is selected', () => {
    const filters = { ...base, campaigns: ['Winter hearth'] }
    const summary = summarize(selectFacts(data, filters), filters)
    expect(summary.orders).toBe(2)
    expect(summary.conversionBasis).toBe('clicks')
    expect(summary.conversion).toBeCloseTo(2 / 60)
    const [stat] = campaignStats(selectFacts(data, filters), filters)
    expect(stat.ctr).toBeCloseTo(60 / 1500)
    expect(stat.cpc).toBeCloseTo(50 / 60)
    expect(stat.cpa).toBe(25)
    expect(stat.roas).toBeCloseTo(1.5)
  })

  it('hides ratios that spend and sessions cannot support', () => {
    const filters = { ...base, categories: ['Audio' as const] }
    const summary = summarize(selectFacts(data, filters), filters)
    expect(summary.revenue).toBe(75)
    expect(summary.conversion).toBeNull()
    expect(summary.cac).toBeNull()
    expect(summary.roi).toBeNull()
    expect(campaignStats(selectFacts(data, filters), filters)[0].roas).toBeNull()
  })

  it('keeps a channel filter aligned across orders and sessions', () => {
    const filters = { ...base, channels: ['Paid search' as const] }
    const summary = summarize(selectFacts(data, filters), filters)
    expect(summary.orders).toBe(2)
    expect(summary.sessions).toBe(45)
    expect(summary.conversion).toBeCloseTo(2 / 45)
  })

  it('returns no baseline when the prior period has zero revenue', () => {
    const filters = { ...base, range: { start: '2026-10-02', end: '2026-10-02' } }
    const current = summarize(selectFacts(data, filters), filters)
    const priorRange = previousRange(filters.range)
    const previous = summarize(selectFacts(data, { ...filters, range: priorRange }), { ...filters, range: priorRange })
    expect(current.revenue).toBe(25)
    expect(previous.revenue).toBe(150)
  })

  it('filters orders by a case-insensitive search', () => {
    expect(filterOrders(data.orders, 'studio')).toHaveLength(2)
    expect(filterOrders(data.orders, 'missing-order')).toHaveLength(0)
  })
})

describe('demonstration dataset', () => {
  const first = createDemonstrationDataset()
  const second = createDemonstrationDataset()

  it('is deterministic and covers twelve months', () => {
    expect(first.orders[0]).toEqual(second.orders[0])
    expect(sumMoney(first.orders.map((order) => order.revenue))).toBe(sumMoney(second.orders.map((order) => order.revenue)))
    expect(first.orders[0]?.date).toBe(DATASET_START)
    expect(first.orders.at(-1)?.date).toBe(DATASET_END)
    expect(first.orders.length).toBeGreaterThan(1000)
    expect(new Set(first.orders.map((order) => order.id)).size).toBe(first.orders.length)
  })

  it('keeps campaign clicks, attribution, and sessions internally consistent', () => {
    const names = new Set(first.campaigns.map((row) => row.campaign))
    for (const row of first.campaigns) {
      expect(row.clicks).toBeLessThanOrEqual(row.impressions)
      expect(row.spend).toBeGreaterThan(0)
    }
    for (const order of first.orders) {
      if (order.campaign) expect(names.has(order.campaign)).toBe(true)
      if (!PAID_CHANNELS.includes(order.channel as (typeof PAID_CHANNELS)[number])) expect(order.campaign).toBeNull()
    }
    expect(first.orders.some((order) => order.newCustomer)).toBe(true)
    expect(first.orders.some((order) => !order.newCustomer)).toBe(true)
    const filters: Filters = { range: { start: '2026-10-01', end: '2026-10-31' }, channels: [], categories: [], regions: [], campaigns: [] }
    const facts = selectFacts(first, filters)
    const summary = summarize(facts, filters)
    expect(summary.revenue).toBe(revenueOf(facts.orders))
    expect(summary.aov).toBeCloseTo(summary.revenue / summary.orders)
    expect(summary.conversion).toBeCloseTo(summary.orders / summary.sessions)
  })
})
