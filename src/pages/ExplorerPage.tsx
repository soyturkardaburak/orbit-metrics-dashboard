import { useEffect, useMemo, useState } from 'react'
import { createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type SortingState, type VisibilityState } from '@tanstack/react-table'
import { Panel } from '../components/Dialog'
import { useOrbitModel } from '../hooks/useOrbitModel'
import { downloadText, ordersToCsv } from '../lib/csv'
import { formatMoney } from '../lib/format'
import { filterOrders } from '../lib/metrics'
import { useDashboard } from '../store/dashboard-store'
import type { OrderRecord } from '../types'

const helper = createColumnHelper<OrderRecord>()

export function ExplorerPage() {
  const model = useOrbitModel()
  const currency = useDashboard((state) => state.prefs.currency)
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [visibility, setVisibility] = useState<VisibilityState>({})
  const rows = useMemo(() => filterOrders(model.facts?.orders ?? [], search), [model.facts, search])
  const filterKey = `${search}|${model.filters?.range.start ?? ''}|${model.filters?.range.end ?? ''}|${rows.length}`
  const [seenKey, setSeenKey] = useState(filterKey)
  const [page, setPage] = useState(0)
  if (seenKey !== filterKey) {
    setSeenKey(filterKey)
    setPage(0)
  }

  useEffect(() => {
    document.title = 'Explorer — Orbit Metrics'
  }, [])

  const columns = useMemo(
    () => [
      helper.accessor('date', { header: 'Date' }),
      helper.accessor('id', { header: 'Order' }),
      helper.accessor('channel', { header: 'Channel' }),
      helper.accessor('category', { header: 'Category' }),
      helper.accessor('product', { header: 'Product' }),
      helper.accessor('units', { header: 'Units' }),
      helper.accessor('revenue', { header: 'Revenue', cell: (info) => formatMoney(info.getValue(), currency) }),
      helper.accessor('newCustomer', { header: 'New customer', cell: (info) => (info.getValue() ? 'Yes' : 'No') }),
      helper.accessor('region', { header: 'Region' }),
      helper.accessor('campaign', { header: 'Campaign', cell: (info) => info.getValue() ?? '—' }),
    ],
    [currency],
  )

  // TanStack Table returns functions that the React compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility: visibility, pagination: { pageIndex: page, pageSize: 12 } },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex: page, pageSize: 12 }) : updater
      setPage(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (!model.filters) return <p className="text-sm text-[var(--muted)]">Choose a valid date range to explore orders.</p>

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.22em] text-[var(--cyan)] uppercase">Data explorer</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Orders</h1>
        </div>
        <button type="button" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm disabled:opacity-40" disabled={rows.length === 0} onClick={() => downloadText('orbit-orders.csv', ordersToCsv(rows))}>
          Export filtered CSV
        </button>
      </header>
      <Panel>
        <div className="flex flex-wrap items-end gap-4">
          <label className="min-w-60 flex-1 text-sm">
            Search orders
            <input className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2" value={search} placeholder="Product, order, channel, region" onChange={(event) => setSearch(event.target.value)} />
          </label>
          <fieldset className="min-w-0">
            <legend className="text-sm">Columns</legend>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {table.getAllLeafColumns().map((column) => (
                <label key={column.id} className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()} />
                  {column.columnDef.header as string}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]" role="status">
          {rows.length === 1 ? '1 order matches' : `${rows.length.toLocaleString('en-US')} orders match`} the current search and filters.
        </p>
        {rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center">
            <p className="font-display text-xl">No orders match</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Clear the search or widen the date range. The built-in dataset runs from 1 Nov 2025 through 31 Oct 2026.</p>
            {search ? (
              <button type="button" className="mt-4 text-sm font-medium text-[var(--cyan)]" onClick={() => setSearch('')}>
                Clear search
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label="Orders">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead>
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id} className="border-b border-[var(--line)] text-xs tracking-wide text-[var(--muted)] uppercase">
                      {group.headers.map((header) => (
                        <th key={header.id} scope="col" aria-sort={header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : 'none'} className="px-2 py-2 font-medium">
                          <button type="button" onClick={header.column.getToggleSortingHandler()}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </button>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--line)]">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-2 py-2.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <button type="button" className="rounded-full border border-[var(--line)] px-3 py-1 disabled:opacity-40" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                Previous
              </button>
              <p>
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </p>
              <button type="button" className="rounded-full border border-[var(--line)] px-3 py-1 disabled:opacity-40" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </button>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
