import { mulberry32, pickOne } from '../lib/prng'
import { eachDay } from '../lib/dates'
import { roundMoney } from '../lib/format'
import {
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

export const DATASET_START = '2025-11-01'
export const DATASET_END = '2026-10-31'

const PRODUCTS: { name: string; category: Category; price: number }[] = [
  { name: 'Harbor Mug Set', category: 'Home', price: 42 },
  { name: 'Cedar Throw', category: 'Home', price: 88 },
  { name: 'Field Kettle', category: 'Home', price: 64 },
  { name: 'Trail Shell', category: 'Apparel', price: 148 },
  { name: 'Meridian Tee', category: 'Apparel', price: 36 },
  { name: 'Night Parka', category: 'Apparel', price: 220 },
  { name: 'Ridge Bottle', category: 'Outdoor', price: 34 },
  { name: 'Summit Lantern', category: 'Outdoor', price: 58 },
  { name: 'Low Tide Speaker', category: 'Audio', price: 129 },
  { name: 'Studio Buds', category: 'Audio', price: 79 },
  { name: 'Calm Balm', category: 'Care', price: 24 },
  { name: 'Daily Mineral', category: 'Care', price: 32 },
]

const CHANNEL_WEIGHTS = [0.22, 0.18, 0.24, 0.16, 0.12, 0.08]
const REGION_WEIGHTS = [0.46, 0.22, 0.12, 0.13, 0.07]
const NEW_RATE: Record<Channel, number> = {
  Direct: 0.28,
  'Organic search': 0.4,
  'Paid search': 0.62,
  'Paid social': 0.7,
  Email: 0.12,
  Affiliate: 0.55,
}
const BASE_CONVERSION: Record<Channel, number> = {
  Direct: 0.032,
  'Organic search': 0.024,
  'Paid search': 0.028,
  'Paid social': 0.016,
  Email: 0.045,
  Affiliate: 0.03,
}

const CAMPAIGNS: { name: string; channel: Channel; start: string; end: string; daily: number }[] = [
  { name: 'Winter hearth', channel: 'Paid search', start: '2025-11-01', end: '2026-01-15', daily: 420 },
  { name: 'Gift guide', channel: 'Paid social', start: '2025-11-10', end: '2025-12-24', daily: 380 },
  { name: 'New year reset', channel: 'Paid search', start: '2026-01-02', end: '2026-02-28', daily: 260 },
  { name: 'Trail season', channel: 'Paid social', start: '2026-03-01', end: '2026-05-31', daily: 300 },
  { name: 'Affiliate spring', channel: 'Affiliate', start: '2026-03-15', end: '2026-06-15', daily: 140 },
  { name: 'Summer carry', channel: 'Paid search', start: '2026-06-01', end: '2026-08-15', daily: 340 },
  { name: 'Backyard audio', channel: 'Paid social', start: '2026-06-15', end: '2026-08-31', daily: 290 },
  { name: 'Autumn layers', channel: 'Paid search', start: '2026-09-01', end: '2026-10-31', daily: 360 },
  { name: 'Always-on brand', channel: 'Paid social', start: '2025-11-01', end: '2026-10-31', daily: 180 },
]

function season(day: string): number {
  const month = Number(day.slice(5, 7))
  if (month === 11 || month === 12) return 1.45
  if (month === 1) return 0.72
  if (month === 2) return 0.82
  if (month >= 6 && month <= 8) return 1.18
  return 1
}

export function createDemonstrationDataset(): Dataset {
  const rand = mulberry32(0x4f524249)
  const days = eachDay(DATASET_START, DATASET_END)
  const campaignRows: CampaignRecord[] = []

  for (const day of days) {
    for (const campaign of CAMPAIGNS) {
      if (day < campaign.start || day > campaign.end) continue
      const spend = roundMoney(Math.max(12, campaign.daily * season(day) * (0.7 + rand() * 0.6)))
      const cpm = 8 + rand() * 10
      const impressions = Math.max(1, Math.round((spend / cpm) * 1000))
      const ctr = campaign.channel === 'Paid search' ? 0.028 : campaign.channel === 'Affiliate' ? 0.018 : 0.012
      const clicks = Math.min(impressions, Math.max(0, Math.round(impressions * ctr * (0.8 + rand() * 0.4))))
      campaignRows.push({ date: day, campaign: campaign.name, channel: campaign.channel, spend, impressions, clicks })
    }
  }

  const byDayChannel = new Map<string, CampaignRecord[]>()
  for (const row of campaignRows) {
    const key = `${row.date}|${row.channel}`
    const list = byDayChannel.get(key)
    if (list) list.push(row)
    else byDayChannel.set(key, [row])
  }

  const orders: OrderRecord[] = []
  const traffic: TrafficRecord[] = []
  const customers: string[] = []
  let orderSeq = 1
  let customerSeq = 1
  const paid = new Set<string>(PAID_CHANNELS)

  for (const day of days) {
    const count = Math.max(8, Math.round((22 + rand() * 26) * season(day)))
    const byChannel = Object.fromEntries(CHANNELS.map((channel) => [channel, 0])) as Record<Channel, number>
    for (let index = 0; index < count; index += 1) {
      const channel = pickOne(CHANNELS, CHANNEL_WEIGHTS, rand)
      const product = PRODUCTS[Math.floor(rand() * PRODUCTS.length)]
      const units = rand() < 0.18 ? 2 : 1
      const revenue = roundMoney(product.price * units * (0.92 + rand() * 0.16))
      const region = pickOne<Region>(REGIONS, REGION_WEIGHTS, rand)
      let customerNew = false
      if (customers.length === 0 || rand() < NEW_RATE[channel]) {
        customers.push(`C${String(customerSeq).padStart(5, '0')}`)
        customerSeq += 1
        customerNew = true
      } else {
        const returning = customers[Math.floor(rand() * customers.length)]
        if (!returning) customerNew = true
      }
      const active = paid.has(channel) ? (byDayChannel.get(`${day}|${channel}`) ?? []) : []
      const campaign = active.length ? pickOne(active, active.map((row) => row.spend), rand).campaign : null
      orders.push({
        id: `NL-${day.replaceAll('-', '')}-${String(orderSeq).padStart(6, '0')}`,
        date: day,
        channel,
        category: product.category,
        product: product.name,
        units,
        revenue,
        newCustomer: customerNew,
        region,
        campaign,
      })
      orderSeq += 1
      byChannel[channel] += 1
    }
    for (const channel of CHANNELS) {
      const orderCount = byChannel[channel]
      const sessions = Math.max(orderCount, Math.round((orderCount / BASE_CONVERSION[channel]) * (0.85 + rand() * 0.3)))
      traffic.push({ date: day, channel, sessions })
    }
  }

  return { orders, campaigns: campaignRows, traffic, source: 'demonstration' }
}

let cached: Dataset | null = null

export function demonstrationDataset(): Dataset {
  cached ??= createDemonstrationDataset()
  return cached
}

export function datasetBounds(dataset: Dataset): { start: string; end: string } {
  let start = '9999-99-99'
  let end = '0000-00-00'
  const dates = [
    ...dataset.orders.map((row) => row.date),
    ...dataset.campaigns.map((row) => row.date),
    ...dataset.traffic.map((row) => row.date),
  ]
  for (const date of dates) {
    if (date < start) start = date
    if (date > end) end = date
  }
  if (!dates.length) return { start: DATASET_START, end: DATASET_END }
  return { start, end }
}
