'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { Search, User2, ChevronDown } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import {
  format,
  parseISO,
  startOfToday,
  startOfWeek,
  endOfWeek,
  subDays,
  startOfDay,
} from 'date-fns'
import { enUS as enLocale } from 'date-fns/locale/en-US'
import { toast } from 'sonner'

import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import DateRangePicker, { type DateRangePickerHandle } from '@/components/DateRangePicker'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import { listApprovals, getRequest, type ApprovalResponse } from '@/lib/api/requests'
import type { Request } from '@/lib/types'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'

/** Brand color */
const BRAND = '#00156B'
const PAGE_SIZE = 5

type TypeFilter = 'all' | 'leave' | 'overtime'
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

type HistoryRow = {
  approval: ApprovalResponse
  request?: Request
  status: 'pending' | 'approved' | 'rejected'
  type: 'leave' | 'overtime'
  createdAt: string
  updatedAt: string
  reason?: string
  requesterName?: string
}

type DropdownOption<T extends string> = { value: T; label: string }
type DatePresetKey = 'all' | 'today' | 'this-week' | 'last-30' | 'custom'
type DatePreset = {
  key: DatePresetKey
  label: string
  compute?: () => DateRange
}

const PRESET_OPTIONS: DatePreset[] = [
  {
    key: 'all',
    label: 'All time',
    compute: () => ({ from: undefined, to: undefined }),
  },
  {
    key: 'today',
    label: 'Today',
    compute: () => {
      const start = startOfToday()
      return { from: start, to: start }
    },
  },
  {
    key: 'this-week',
    label: 'This week',
    compute: () => {
      const now = new Date()
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: startOfDay(endOfWeek(now, { weekStartsOn: 1 })),
      }
    },
  },
  {
    key: 'last-30',
    label: 'Last 30 days',
    compute: () => {
      const today = new Date()
      return {
        from: startOfDay(subDays(today, 29)),
        to: startOfDay(today),
      }
    },
  },
]

function datesEqual(a?: Date, b?: Date) {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.getTime() === b.getTime()
}

function rangesEqual(a: DateRange, b: DateRange) {
  return datesEqual(a.from, b.from) && datesEqual(a.to, b.to)
}

export default function ApproverHistoryPage() {
  const router = useRouter()
  const user = useAuth((state) => state.user)
  const upsertRequest = useRequests((state) => state.upsertFromApi)
  const requests = useRequests((state) => state.items)
  const datePickerRef = useRef<DateRangePickerHandle | null>(null)

  const requestMap = useMemo(() => {
    const map = new Map<string, Request>()
    for (const item of requests) {
      map.set(item.id, item)
    }
    return map
  }, [requests])

  const [approvals, setApprovals] = useState<ApprovalResponse[]>([])
  const [loading, setLoading] = useState(false)

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined })
  const [selectedPreset, setSelectedPreset] = useState<DatePresetKey>('all')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const loadHistory = useCallback(async () => {
    if (!user?.id) {
      setApprovals([])
      return
    }
    setLoading(true)
    try {
      const fetched = await listApprovals({ approverId: user.id })
      setApprovals(fetched)

      const uniqueRequestIds = Array.from(new Set(fetched.map((item) => item.requestId)))
      if (uniqueRequestIds.length === 0) return

      await Promise.allSettled(
        uniqueRequestIds.map(async (requestId) => {
          try {
            const response = await getRequest(requestId)
            upsertRequest(response)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load request detail'
            console.warn('[approver history] request fetch failed:', message)
          }
        }),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load approval history'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [upsertRequest, user?.id])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const rows = useMemo<HistoryRow[]>(() => {
    return approvals.map((approval) => {
      const request = requestMap.get(approval.requestId)
      const type = deriveType(request, approval)
      const status = deriveStatus(request?.status, approval.status)
      const createdAt = request?.createdAt ?? approval.createdAt ?? new Date().toISOString()
      const updatedAt =
        request?.updatedAt ?? approval.decidedAt ?? approval.createdAt ?? createdAt
      const reason = request?.reason ?? request?.notes ?? approval.comments ?? undefined
      const requesterName =
        request?.employeeName ??
        approval.requesterName ??
        request?.employeeId ??
        approval.requesterId ??
        undefined

      return {
        approval,
        request,
        status,
        type,
        createdAt,
        updatedAt,
        reason,
        requesterName,
      }
    })
  }, [approvals, requestMap])

  const applyPreset = useCallback((key: DatePresetKey) => {
    const preset = PRESET_OPTIONS.find((option) => option.key === key)
    setSelectedPreset(key)
    if (preset?.compute) {
      setDateRange(preset.compute())
    }
    if (key === 'custom') {
      datePickerRef.current?.open()
    }
  }, [])

  const handleDateRangeChange = useCallback((next: DateRange) => {
    setDateRange(next)
    const matchedPreset = PRESET_OPTIONS.find((option) => {
      if (!option.compute) return false
      const presetRange = option.compute()
      return rangesEqual(next, presetRange)
    })
    if (matchedPreset) {
      setSelectedPreset(matchedPreset.key)
    } else if (!next.from && !next.to) {
      setSelectedPreset('all')
    } else {
      setSelectedPreset('custom')
    }
  }, [])

  const rangeWindow = useMemo(() => {
    const start = dateRange.from ? new Date(dateRange.from) : undefined
    if (start) start.setHours(0, 0, 0, 0)
    const end = dateRange.to ? new Date(dateRange.to) : undefined
    if (end) end.setHours(23, 59, 59, 999)
    return { start, end }
  }, [dateRange])

  const activePreset = useMemo(
    () => PRESET_OPTIONS.find((option) => option.key === selectedPreset),
    [selectedPreset],
  )
  const dateRangeLabel = selectedPreset === 'custom' ? undefined : activePreset?.label

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows
      .filter((row) => (typeFilter === 'all' ? true : row.type === typeFilter))
      .filter((row) => (statusFilter === 'all' ? true : row.status === statusFilter))
      .filter((row) => matchesRange(row, rangeWindow))
      .filter((row) => {
        if (!query) return true
        const request = row.request
        const haystack = [
          row.requesterName,
          request?.employeeName,
          request?.employeeDepartment,
          row.approval.requesterDepartment,
          row.reason,
          request?.id,
          row.approval.requestId,
          row.approval.id,
          row.approval.requesterName,
          row.approval.requesterId,
          row.approval.comments,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(query)
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [rangeWindow, rows, search, statusFilter, typeFilter])

  const counts = useMemo(
    () => ({
      total: filtered.length,
      pending: filtered.filter((row) => row.status === 'pending').length,
      approved: filtered.filter((row) => row.status === 'approved').length,
      rejected: filtered.filter((row) => row.status === 'rejected').length,
    }),
    [filtered],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(start, start + PAGE_SIZE)

  useEffect(() => {
    setCurrentPage(1)
  }, [typeFilter, statusFilter, search, dateRange.from, dateRange.to])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const groups = useMemo(() => {
    const map = new Map<string, HistoryRow[]>()
    for (const row of pageItems) {
      const key = (row.updatedAt ?? row.createdAt).slice(0, 10)
      const bucket = map.get(key)
      if (bucket) bucket.push(row)
      else map.set(key, [row])
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [pageItems])

  return (
    <main className="mx-auto w-full max-w-[640px] p-3 pb-20">
      <div className="sticky top-0 z-10 -mx-3 border-b border-slate-200 bg-white/95 px-3 pb-3 pt-2 backdrop-blur">
        <PageHeader
          title="History"
          backHref="/approver/dashboard"
          fullBleed
          bleedMobileOnly
          pullUpPx={34}
        />

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SimpleDropdown
            label="Type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: 'All types' },
              { value: 'leave', label: 'Leave' },
              { value: 'overtime', label: 'Overtime' },
            ]}
          />
          <SimpleDropdown
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
        </div>
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-600">Date range</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESET_OPTIONS.map((preset) => {
              const active = preset.key === selectedPreset
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => applyPreset(preset.key)}
                  className={clsx(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition sm:text-sm',
                    active
                      ? 'border-[#00156B] bg-[#00156B] text-white shadow-sm'
                      : 'border-gray-200 text-slate-600 hover:border-[#00156B]/40 hover:text-[#00156B]',
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="relative mt-3 ml-auto min-w-[160px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee/reason…"
            className="w-full rounded-xl border px-3 py-2 pl-9 text-sm outline-none focus:ring-2 focus:ring-[rgba(0,21,107,0.25)]"
          />
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">
            {counts.total} items
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700">
            {counts.pending} pending
          </span>
          <span className="rounded-full bg-green-100 px-2 py-1 font-medium text-green-700">
            {counts.approved} approved
          </span>
          <span className="rounded-full bg-red-100 px-2 py-1 font-medium text-red-700">
            {counts.rejected} rejected
          </span>
        </div>
      </div>

      {loading && (
        <p className="mt-6 text-center text-sm text-slate-500">Loading approval history…</p>
      )}

      <div className="mt-3 space-y-6">
        {groups.map(([key, items]) => (
          <section key={key} className="space-y-2">
            <h3 className="px-1 text-[13px] font-semibold text-slate-500">
              {formatDateHeader(key)}
            </h3>

            {items.map((row) => {
              const request = row.request
              const employeeName =
                row.requesterName ??
                request?.employeeName ??
                request?.employeeId ??
                row.approval.requesterId ??
                'Unknown employee'
              const department =
                request?.employeeDepartment ??
                row.approval.requesterDepartment ??
                '—'

              return (
                <article
                  key={`${row.approval.id}-${row.approval.requestId}`}
                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 flex-none place-items-center rounded-xl bg-slate-50">
                      <User2 className="size-5 text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{employeeName}</p>
                          <p className="text-xs text-slate-500">
                            {department} • {row.approval.requestId}
                          </p>
                        </div>
                        <StatusBadge status={row.status} />
                      </div>

                      <div className="mt-2 text-xs text-slate-600">
                        {row.type === 'leave' ? (
                          <p>{leaveSummary(request)}</p>
                        ) : (
                          <p>{overtimeSummary(request)}</p>
                        )}
                        {row.reason && (
                          <p className="mt-1 line-clamp-2 text-slate-500">Reason: {row.reason}</p>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-[11px] text-slate-500">
                          Updated: {formatDateTime(row.updatedAt)}
                        </p>
                        <button
                          onClick={() =>
                            router.push(`/approver/history/${row.approval.requestId}?approval=${row.approval.id}`)
                          }
                          className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-[color:var(--brand,_#00156B)] transition hover:bg-slate-50"
                          style={{ ['--brand' as any]: BRAND }}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        ))}

        {!loading && groups.length === 0 && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
            No history for this filter.
          </div>
        )}

        {filtered.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Pagination
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </main>
  )
}

function SimpleDropdown<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: DropdownOption<T>[]
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((opt) => opt.value === value)?.label ?? 'Select'

  return (
    <div className="relative">
      <label className="block text-xs text-gray-600">{label}</label>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="mt-1 flex w-full items-center justify-between rounded-xl border bg-white px-3 py-3 text-left shadow-sm"
        style={{ borderColor: '#00156B20', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}
      >
        <span className="truncate">{current}</span>
        <ChevronDown className="size-4 opacity-70" />
      </button>

      {open && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}

      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-2 origin-top rounded-2xl border bg-white shadow-xl ring-1 ring-black/5"
          style={{ borderColor: '#00156B20' }}
          role="listbox"
        >
          <ul className="max-h-64 overflow-auto py-1">
            {options.map((opt) => {
              const active = opt.value === value
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className={clsx(
                      'w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-gray-100 active:bg-gray-100',
                      active && 'bg-indigo-50 font-medium',
                    )}
                  >
                    {opt.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const tone = clsx(
    'rounded-full px-2 py-1 text-[11px] font-medium',
    status === 'pending' && 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    status === 'approved' && 'bg-green-50 text-green-700 ring-1 ring-green-100',
    status === 'rejected' && 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  )
  return (
    <span className={tone}>
      {status === 'pending' ? 'Pending' : status === 'approved' ? 'Approved' : 'Rejected'}
    </span>
  )
}

function deriveType(request: Request | undefined, approval: ApprovalResponse): 'leave' | 'overtime' {
  if (request?.type === 'overtime') return 'overtime'
  if (request?.type === 'leave') return 'leave'
  return approval.requestType === 'OVERTIME' ? 'overtime' : 'leave'
}

function deriveStatus(
  requestStatus: Request['status'] | undefined,
  approvalStatus: ApprovalResponse['status'],
): 'pending' | 'approved' | 'rejected' {
  if (requestStatus === 'approved') return 'approved'
  if (requestStatus === 'rejected') return 'rejected'
  if (requestStatus === 'pending' || requestStatus === 'draft') return 'pending'
  if (approvalStatus === 'APPROVED') return 'approved'
  if (approvalStatus === 'REJECTED' || approvalStatus === 'CANCELLED') return 'rejected'
  return 'pending'
}

function matchesRange(row: HistoryRow, range: { start?: Date; end?: Date }) {
  const { start, end } = range
  if (!start && !end) return true

  const dates: string[] = []
  const request = row.request

  if (request?.type === 'leave') {
    if (request.startDate) dates.push(request.startDate)
    if (request.endDate) dates.push(request.endDate)
  } else if (request?.type === 'overtime') {
    if (request.workDate) dates.push(request.workDate)
  }

  if (dates.length === 0) {
    dates.push(row.updatedAt, row.createdAt, row.approval.decidedAt ?? '')
  }

  return dates.some((iso) => withinRange(iso, start, end))
}

function withinRange(iso: string | undefined, start?: Date, end?: Date) {
  if (!iso) return false
  const parsed = parseISO(iso)
  if (Number.isNaN(parsed.getTime())) return false
  if (start && end) return parsed >= start && parsed <= end
  if (start) return parsed >= start
  if (end) return parsed <= end
  return true
}

function leaveSummary(request?: Request) {
  if (!request || request.type !== 'leave') return 'Leave request'
  const start = request.startDate ? formatShortDate(request.startDate) : undefined
  const end = request.endDate ? formatShortDate(request.endDate) : undefined
  const label = request.leaveTypeName ?? resolveLeaveTypeLabel(request.leaveTypeId ?? '') ?? 'Leave'
  if (start && end && start !== end) return `${label} • ${start} → ${end}`
  if (start) return `${label} • ${start}`
  return label
}

function overtimeSummary(request?: Request) {
  if (!request || request.type !== 'overtime') return 'Overtime request'
  const date = request.workDate ? formatShortDate(request.workDate) : undefined
  const time =
    request.startTime && request.endTime
      ? `${request.startTime}–${request.endTime}`
      : undefined
  if (date && time) return `Overtime ${time} • ${date}`
  if (date) return `Overtime • ${date}`
  return 'Overtime request'
}

function formatDateHeader(isoDate: string) {
  try {
    return format(parseISO(isoDate), 'EEEE, d MMM yyyy', { locale: enLocale })
  } catch {
    return isoDate
  }
}

function formatShortDate(iso?: string) {
  if (!iso) return '-'
  try {
    return format(parseISO(iso), 'd MMM yyyy', { locale: enLocale })
  } catch {
    return iso
  }
}

function formatDateTime(iso?: string) {
  if (!iso) return '-'
  try {
    return format(parseISO(iso), 'd MMM yyyy, HH:mm', { locale: enLocale })
  } catch {
    return iso
  }
}
