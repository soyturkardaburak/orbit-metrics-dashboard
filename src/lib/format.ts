import type { Currency } from '../types'

export const DISPLAY_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
}

export function sumMoney(values: number[]): number {
  let cents = 0
  for (const value of values) cents += Math.round(value * 100)
  return cents / 100
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatMoney(usd: number, currency: Currency, digits = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(usd * DISPLAY_RATES[currency])
}

export function formatMoneyAuto(usd: number, currency: Currency): string {
  return formatMoney(usd, currency, Math.abs(usd) >= 100 ? 0 : 2)
}

export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`
}

export function formatMultiple(value: number): string {
  return `${value.toFixed(2)}x`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export function moneyOrDash(value: number | null, currency: Currency): string {
  return value == null ? '—' : formatMoneyAuto(value, currency)
}

export function percentOrDash(value: number | null): string {
  return value == null ? '—' : formatPercent(value, 1)
}

export function multipleOrDash(value: number | null): string {
  return value == null ? '—' : formatMultiple(value)
}

export function delta(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null
  if (previous === 0) return current === 0 ? 0 : null
  return (current - previous) / Math.abs(previous)
}
