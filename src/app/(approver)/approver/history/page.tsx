'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { Search, User2, ChevronDown } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { enUS as enLocale } from 'date-fns/locale/en-US'
import { toast } from 'sonner'

import { PageHeader } from '@/components/PageHeader'
import DateRangePicker from '@/components/DateRangePicker'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import { listApprovals, getRequest, type ApprovalResponse } from '@/lib/api/requests'
import type { Request } from '@/lib/types'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'

/** Brand color */
const BRAND = '#00156B'

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

export default function ApproverHistoryPage() {
  const router = useRouter()
  const user = useAuth((state) => state.user)
  const upsertRequest = useRequests((state) => state.upsertFromApi)
  const requests = useRequests((state) => state.items)

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
  const [search, setSearch] = useState('')

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

  const rangeWindow = useMemo(() => {
    const start = dateRange.from ? new Date(dateRange.from) : undefined
    if (start) start.setHours(0, 0, 0, 0)
    const end = dateRange.to ? new Date(dateRange.to) : undefined
    if (end) end.setHours(23, 59, 59, 999)
    return { start, end }
  }, [dateRange])

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

  const groups = useMemo(() => {
    const map = new Map<string, HistoryRow[]>()
    for (const row of filtered) {
      const key = (row.updatedAt ?? row.createdAt).slice(0, 10)
      const bucket = map.get(key)
      if (bucket) bucket.push(row)
      else map.set(key, [row])
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

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
        <DateRangePicker
          label="Date range"
          range={dateRange}
          onChange={setDateRange}
          className="mt-3 sm:col-span-2"
        />
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
        <div className="fixed inset-0 z-40 sm:bg-transparent" onClick={() => setOpen(false)} />
      )}

      {open && (
        <div
          className="z-50 mt-2 rounded-2xl border bg-white shadow-lg sm:absolute sm:left-0 sm:right-0 sm:max-h-72 sm:overflow-auto sm:[box-shadow:0_10px_30px_rgba(0,0,0,.08)]"
          style={{ borderColor: '#00156B20' }}
          role="listbox"
        >
          <ul className="py-1">
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
