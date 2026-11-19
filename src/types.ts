export const CHANNELS = [
  'Direct',
  'Organic search',
  'Paid search',
  'Paid social',
  'Email',
  'Affiliate',
] as const

export const CATEGORIES = ['Audio', 'Home', 'Apparel', 'Outdoor', 'Care'] as const

export const REGIONS = [
  'North America',
  'Europe',
  'United Kingdom',
  'Asia Pacific',
  'Latin America',
] as const

export const PAID_CHANNELS = ['Paid search', 'Paid social', 'Affiliate'] as const

export type Channel = (typeof CHANNELS)[number]
export type Category = (typeof CATEGORIES)[number]
export type Region = (typeof REGIONS)[number]
export type PaidChannel = (typeof PAID_CHANNELS)[number]
export type DataSource = 'demonstration' | 'imported' | 'mixed'
export type ImportMode = 'replace' | 'supplement'
export type Preset = '7d' | '30d' | '90d' | '12m' | 'custom'
export type Currency = 'USD' | 'EUR' | 'GBP'
export type ThemeName = 'dark' | 'light'

export interface OrderRecord {
  id: string
  date: string
  channel: Channel
  category: Category
  product: string
  units: number
  revenue: number
  newCustomer: boolean
  region: Region
  campaign: string | null
}

export interface CampaignRecord {
  date: string
  campaign: string
  channel: Channel
  spend: number
  impressions: number
  clicks: number
}

export interface TrafficRecord {
  date: string
  channel: Channel
  sessions: number
}

export interface Dataset {
  orders: OrderRecord[]
  campaigns: CampaignRecord[]
  traffic: TrafficRecord[]
  source: DataSource
}

export interface Range {
  start: string
  end: string
}

export interface Filters {
  range: Range
  channels: Channel[]
  categories: Category[]
  regions: Region[]
  campaigns: string[]
}

export interface Prefs {
  theme: ThemeName
  currency: Currency
  preset: Preset
  customStart: string
  customEnd: string
  channels: Channel[]
  categories: Category[]
  regions: Region[]
  campaigns: string[]
}
