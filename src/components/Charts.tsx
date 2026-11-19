import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHANNELS, type Channel, type Currency } from '../types'
import { formatMoneyAuto, formatNumber } from '../lib/format'
import type { DayPoint, MonthPoint, Slice } from '../lib/metrics'

const SERIES = ['#0891b2', '#d97706', '#e11d48', '#4f46e5', '#0f766e', '#2563eb']

const CHANNEL_COLOR: Record<Channel, string> = {
  Direct: '#0891b2',
  'Organic search': '#2563eb',
  'Paid search': '#d97706',
  'Paid social': '#e11d48',
  Email: '#4f46e5',
  Affiliate: '#0f766e',
}

function motionOff(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Tip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ name?: string; value?: number | string; color?: string }>
  label?: string
  format?: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs shadow-[var(--shadow)]">
      <p className="mb-1 font-mono text-[var(--muted)]">{label}</p>
      {payload.map((item) => (
        <p key={String(item.name)} style={{ color: item.color }}>
          {item.name}: {typeof item.value === 'number' ? (format ? format(item.value) : formatNumber(item.value)) : item.value}
        </p>
      ))}
    </div>
  )
}

function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3">
      <summary className="text-xs font-medium text-[var(--cyan)]">View data</summary>
      <div className="mt-2 max-h-48 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="px-2 py-1 font-medium text-[var(--muted)]">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-[var(--line)]">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-2 py-1">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function EmptyChart() {
  return <p className="py-16 text-center text-sm text-[var(--muted)]">No activity in this period.</p>
}

export function RevenueChart({ points, currency }: { points: DayPoint[]; currency: Currency }) {
  if (!points.some((point) => point.revenue > 0)) return <EmptyChart />
  const animate = !motionOff()
  return (
    <figure>
      <figcaption className="sr-only">Revenue by day</figcaption>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} interval={Math.ceil(points.length / 6)} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={56} tickFormatter={(value: number) => formatMoneyAuto(value, currency)} />
            <Tooltip content={<Tip format={(value) => formatMoneyAuto(value, currency)} />} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--cyan)" fill="var(--cyan)" fillOpacity={0.18} isAnimationActive={animate} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <DataTable columns={['Date', 'Revenue']} rows={points.filter((point) => point.revenue > 0).map((point) => [point.label, formatMoneyAuto(point.revenue, currency)])} />
    </figure>
  )
}

export function OrdersChart({ points }: { points: DayPoint[] }) {
  if (!points.some((point) => point.orders > 0)) return <EmptyChart />
  const animate = !motionOff()
  const data = points.map((point) => ({ ...point, conversionPct: point.conversion == null ? null : Number((point.conversion * 100).toFixed(2)) }))
  return (
    <figure>
      <figcaption className="sr-only">Orders and conversion by day</figcaption>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} interval={Math.ceil(points.length / 6)} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={42} unit="%" />
            <Tooltip content={<Tip />} />
            <Legend />
            <Bar yAxisId="left" dataKey="orders" name="Orders" fill="var(--amber)" radius={[3, 3, 0, 0]} isAnimationActive={animate} />
            <Line yAxisId="right" dataKey="conversionPct" name="Conversion %" stroke="var(--cyan)" dot={false} strokeWidth={2} isAnimationActive={animate} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

export function ChannelStack({ rows, currency }: { rows: Record<string, string | number>[]; currency: Currency }) {
  if (!rows.length) return <EmptyChart />
  const animate = !motionOff()
  return (
    <figure>
      <figcaption className="sr-only">Revenue by channel and day</figcaption>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} interval={Math.ceil(rows.length / 6)} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={56} tickFormatter={(value: number) => formatMoneyAuto(value, currency)} />
            <Tooltip content={<Tip format={(value) => formatMoneyAuto(value, currency)} />} />
            <Legend />
            {CHANNELS.map((channel) => (
              <Area key={channel} type="monotone" dataKey={channel} stackId="revenue" stroke={CHANNEL_COLOR[channel]} fill={CHANNEL_COLOR[channel]} fillOpacity={0.75} isAnimationActive={animate} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

export function HorizontalBars({ slices, currency, label }: { slices: Slice[]; currency: Currency; label: string }) {
  if (!slices.length) return <EmptyChart />
  return (
    <figure>
      <figcaption className="sr-only">{label}</figcaption>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={slices} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => formatMoneyAuto(value, currency)} />
            <YAxis type="category" dataKey="name" width={118} tick={{ fill: 'var(--text)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip format={(value) => formatMoneyAuto(value, currency)} />} />
            <Bar dataKey="revenue" name="Revenue" fill="var(--cyan)" radius={[0, 4, 4, 0]} isAnimationActive={!motionOff()} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable columns={['Name', 'Revenue', 'Orders']} rows={slices.map((slice) => [slice.name, formatMoneyAuto(slice.revenue, currency), slice.orders])} />
    </figure>
  )
}

export function Distribution({ slices }: { slices: Slice[] }) {
  if (!slices.length) return <EmptyChart />
  return (
    <figure>
      <figcaption className="sr-only">Revenue distribution</figcaption>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="revenue" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} isAnimationActive={!motionOff()}>
              {slices.map((slice, index) => (
                <Cell key={slice.name} fill={SERIES[index % SERIES.length]} />
              ))}
            </Pie>
            <Tooltip content={<Tip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

export function AcquisitionChart({ points }: { points: MonthPoint[] }) {
  if (!points.length) return <EmptyChart />
  return (
    <figure>
      <figcaption className="sr-only">New and returning orders by month</figcaption>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<Tip />} />
            <Legend />
            <Bar dataKey="newCustomers" name="New customers" stackId="customers" fill="var(--cyan)" isAnimationActive={!motionOff()} />
            <Bar dataKey="returning" name="Returning orders" stackId="customers" fill="var(--amber)" radius={[3, 3, 0, 0]} isAnimationActive={!motionOff()} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable columns={['Month', 'New', 'Returning']} rows={points.map((point) => [point.label, point.newCustomers, point.returning])} />
    </figure>
  )
}

export function CampaignBars({
  rows,
  currency,
}: {
  rows: { campaign: string; spend: number; revenue: number }[]
  currency: Currency
}) {
  if (!rows.length) return <EmptyChart />
  return (
    <figure>
      <figcaption className="sr-only">Campaign spend and revenue</figcaption>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="campaign" tick={{ fill: 'var(--muted)', fontSize: 11 }} interval={0} angle={-24} textAnchor="end" height={70} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={56} tickFormatter={(value: number) => formatMoneyAuto(value, currency)} />
            <Tooltip content={<Tip format={(value) => formatMoneyAuto(value, currency)} />} />
            <Legend />
            <Bar dataKey="spend" name="Spend" fill="var(--coral)" radius={[3, 3, 0, 0]} isAnimationActive={!motionOff()} />
            <Bar dataKey="revenue" name="Revenue" fill="var(--cyan)" radius={[3, 3, 0, 0]} isAnimationActive={!motionOff()} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
