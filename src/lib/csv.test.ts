import { describe, expect, it } from 'vitest'
import { CSV_TEMPLATE, ordersToCsv, parseOrbitCsv } from './csv'
import type { OrderRecord } from '../types'

const sample: OrderRecord = {
  id: 'SAMPLE-9',
  date: '2026-10-03',
  channel: 'Direct',
  category: 'Home',
  product: 'Mug, large',
  units: 2,
  revenue: 42,
  newCustomer: false,
  region: 'North America',
  campaign: null,
}

describe('CSV import and export', () => {
  it('parses the published template', () => {
    const result = parseOrbitCsv(CSV_TEMPLATE)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.dataset.orders).toHaveLength(2)
    expect(result.dataset.campaigns[0]?.clicks).toBe(240)
    expect(result.dataset.traffic[0]?.sessions).toBe(420)
  })

  it('round-trips a filtered order, including commas in the product name', () => {
    const parsed = parseOrbitCsv(ordersToCsv([sample]))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.dataset.orders[0]).toMatchObject({ id: 'SAMPLE-9', product: 'Mug, large', revenue: 42, units: 2 })
  })

  it('reports row-level schema errors and does not return a partial dataset', () => {
    const csv = [
      'record_type,date,order_id,channel,category,product,units,revenue_usd,new_customer,region,campaign,spend_usd,impressions,clicks,sessions',
      'order,2026-02-31,BAD,Direct,Home,Mug,1,10,true,North America,,,,,',
      'campaign,2026-10-01,,Paid search,,,,,,,Launch,10,100,140,',
      'order,2026-10-01,DUP,Direct,Home,Mug,1,10,true,North America,,,,,',
      'order,2026-10-01,DUP,Direct,Home,Mug,1,10,true,North America,,,,,',
      'traffic,2026-10-01,,Newsletter,,,,,,,,,,,4',
    ].join('\n')
    const result = parseOrbitCsv(csv)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((error) => error.message.includes('date'))).toBe(true)
    expect(result.errors.some((error) => error.message.includes('clicks cannot exceed'))).toBe(true)
    expect(result.errors.some((error) => error.message.includes('already exists'))).toBe(true)
    expect(result.errors.some((error) => error.message.includes('channel'))).toBe(true)
  })

  it('rejects an order id that already exists when supplementing', () => {
    const result = parseOrbitCsv(ordersToCsv([sample]), new Set(['SAMPLE-9']))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.message).toMatch(/SAMPLE-9/)
  })

  it('rejects a header that does not match the schema', () => {
    const result = parseOrbitCsv('date,revenue\n2026-10-01,10')
    expect(result.ok).toBe(false)
  })
})
