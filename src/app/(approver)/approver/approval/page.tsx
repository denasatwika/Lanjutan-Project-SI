'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Check, Clock3, Filter, Search, User2 } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'

import { PageHeader } from '@/components/PageHeader'
import { useAuth } from '@/lib/state/auth'
import {
  getRequest,
  listApprovals,
  type ApprovalResponse,
  type RequestResponse,
} from '@/lib/api/requests'
import { useRequests } from '@/lib/state/requests'

type TypeFilter = 'all' | 'leave' | 'overtime'

export default function ApproverApprovalsPage() {
  const router = useRouter()
  const user = useAuth((s) => s.user)
  const upsertRequest = useRequests((s) => s.upsertFromApi)

  const [type, setType] = useState<TypeFilter>('all')
  const [onlyPending, setOnlyPending] = useState(true)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [approvals, setApprovals] = useState<ApprovalResponse[]>([])
  const [requestsById, setRequestsById] = useState<Map<string, RequestResponse>>(new Map())

  const loadApprovals = useCallback(async () => {
    setLoading(true)
    setLoaded(false)

    if (!user?.id) {
      setApprovals([])
      setRequestsById(new Map())
      setLoading(false)
      setLoaded(true)
      return
    }

    try {
      const fetchedApprovals = await listApprovals({ approverId: user.id })
      setApprovals(fetchedApprovals)

      const uniqueIds = Array.from(new Set(fetchedApprovals.map((item) => item.requestId)))
      if (uniqueIds.length === 0) {
        setRequestsById(new Map())
        return
      }

      const results = await Promise.allSettled(uniqueIds.map((id) => getRequest(id)))
      const map = new Map<string, RequestResponse>()
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const request = result.value
          map.set(request.id, request)
          upsertRequest(request)
        } else {
          console.warn('Failed to fetch request detail', result.reason)
        }
      })
      setRequestsById(map)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load approvals'
      toast.error(message)
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }, [upsertRequest, user?.id])

  useEffect(() => {
    loadApprovals()
  }, [loadApprovals])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return approvals
      .filter((item) => type === 'all' || item.requestType.toLowerCase() === type)
      .filter((item) => (!onlyPending ? true : item.status === 'PENDING'))
      .filter((item) => {
        if (query.length === 0) return true
        const request = requestsById.get(item.requestId)
        const haystack = [
          item.requestId,
          item.approverLevel,
          item.status,
          item.requesterName,
          item.requesterId,
          request?.requesterName,
          request?.requesterDepartment,
          item.requesterDepartment,
          request?.notes,
          request?.leaveReason,
          request?.overtimeReason,
          item.comments,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(query)
      })
      .sort((a, b) => {
        const aTime = dateValue(a.decidedAt ?? a.createdAt)
        const bTime = dateValue(b.decidedAt ?? b.createdAt)
        return bTime - aTime
      })
  }, [approvals, onlyPending, requestsById, search, type])

  const pendingCount = useMemo(
    () => approvals.filter((item) => item.status === 'PENDING').length,
    [approvals],
  )

  function handleOpen(item: ApprovalResponse) {
    router.push(`/approver/approval/${item.requestId}?approval=${item.id}`)
  }

  return (
    <main className="mx-auto w-full max-w-[640px] p-3 pb-28">
      <div className="sticky top-0 z-10 -mx-3 border-b border-slate-200 bg-white/95 px-3 pb-3 pt-2 backdrop-blur">
        <PageHeader
          title="Approvals"
          backHref="/approver/dashboard"
          fullBleed
          bleedMobileOnly
          pullUpPx={34}
        />

        <div className="mt-3 mb-3 flex items-center gap-2 overflow-x-auto">
          <Chip active={type === 'all'} onClick={() => setType('all')}>
            <Filter className="size-4" /> All
          </Chip>
          <Chip active={type === 'leave'} onClick={() => setType('leave')}>
            <Calendar className="size-4" /> Leave
          </Chip>
          <Chip active={type === 'overtime'} onClick={() => setType('overtime')}>
            <Clock3 className="size-4" /> Overtime
          </Chip>
          <Chip active={onlyPending} onClick={() => setOnlyPending((prev) => !prev)}>
            <Check className="size-4" /> Pending only
          </Chip>
        </div>

        <div className="relative ml-auto min-w-[160px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, level, reason…"
            className="w-full rounded-xl border px-3 py-2 pl-9 text-sm outline-none focus:ring-2 focus:ring-[rgba(0,21,107,0.25)]"
          />
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        </div>

        {loaded && (
          <p className="mt-2 text-xs text-slate-500">
            Pending now: <span className="font-semibold">{pendingCount}</span> • Showing{' '}
            <span className="font-semibold">{filtered.length}</span>
          </p>
        )}
      </div>

      {loading && (
        <p className="mt-6 text-center text-sm text-slate-500">Loading approvals…</p>
      )}

      {!loading && filtered.length === 0 && loaded && (
        <p className="mt-6 text-center text-sm text-slate-500">
          {search || type !== 'all' || !onlyPending
            ? 'No approvals match your filters.'
            : 'No approvals assigned to you yet.'}
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {filtered.map((approval) => {
          const request = requestsById.get(approval.requestId)
          const reason =
            request?.leaveReason ??
            request?.overtimeReason ??
            (request?.notes ? `Notes: ${request.notes}` : undefined) ??
            approval.comments ??
            undefined
          const employeeName =
            request?.requesterName ??
            approval.requesterName ??
            request?.requesterId ??
            approval.requesterId ??
            'Unknown employee'
          const department =
            request?.requesterDepartment ??
            approval.requesterDepartment ??
            '—'
          return (
            <li
              key={approval.id}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-[rgba(0,21,107,0.4)] hover:shadow"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-10 flex-none place-items-center rounded-xl bg-slate-50">
                  <User2 className="size-5 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{employeeName}</p>
                      <p className="text-xs text-slate-500">
                        {department} • {approval.requestId}
                      </p>
                    </div>
                    <ApprovalStatusBadge status={approval.status} />
                  </div>

                  <div className="mt-2 text-xs text-slate-600 space-y-1">
                    <p>
                      {resolveRequestTypeLabel(approval.requestType)} • Stage {approval.stage}{' '}
                      {approval.approverLevel ? `(${approval.approverLevel})` : ''}
                    </p>
                    <p>Submitted {formatDateTime(approval.createdAt)}</p>
                    {approval.decidedAt && <p>Decided {formatDateTime(approval.decidedAt)}</p>}
                  </div>
                </div>
              </div>

              {reason && (
                <p className="mt-3 text-sm text-slate-600">
                  {reason}
                </p>
              )}

              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleOpen(approval)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00156B] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Review
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition',
        active
          ? 'bg-[#00156B] text-white'
          : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  )
}

function ApprovalStatusBadge({ status }: { status: ApprovalResponse['status'] }) {
  const tone = clsx(
    'rounded-full px-2 py-1 text-[11px] font-medium',
    status === 'APPROVED' && 'bg-green-50 text-green-700 ring-1 ring-green-200',
    status === 'REJECTED' && 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    status === 'PENDING' && 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    status === 'BLOCKED' && 'bg-slate-200 text-slate-700',
    status === 'CANCELLED' && 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    status === 'DRAFT' && 'bg-slate-50 text-slate-600 ring-1 ring-slate-100',
  )
  return (
    <span className={tone}>
      {status === 'APPROVED'
        ? 'Approved'
        : status === 'REJECTED'
        ? 'Rejected'
        : status === 'BLOCKED'
        ? 'Blocked'
        : status === 'CANCELLED'
        ? 'Cancelled'
        : status === 'DRAFT'
        ? 'Draft'
        : 'Pending'}
    </span>
  )
}

function resolveRequestTypeLabel(value: ApprovalResponse['requestType']) {
  if (value === 'LEAVE') return 'Leave'
  if (value === 'OVERTIME') return 'Overtime'
  return value
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'd MMM yyyy HH:mm', { locale: idLocale })
  } catch {
    return iso
  }
}

function dateValue(iso?: string | null) {
  if (!iso) return 0
  const time = new Date(iso).getTime()
  return Number.isNaN(time) ? 0 : time
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}
