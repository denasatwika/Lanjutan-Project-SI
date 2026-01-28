// app/(user)/user/inbox/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import type { LeaveRequest } from '@/lib/types'
import { Bell, CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import clsx from 'clsx'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'
import { toast } from 'sonner'
import { StatusPill, formatDateOnly } from './utils'
import { useInboxRead } from './useInboxRead'

const BRAND = '#00156B'
const PAGE_SIZE = 5
export default function InboxPage() {
  const router = useRouter()
  const user = useAuth((state) => state.user)
  const all = useRequests((state) => (user ? state.forEmployee(user.id) : []))
  const loadRequests = useRequests((state) => state.load)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (!user?.id) return
    loadRequests({ requesterId: user.id }).catch((error) => {
      const message = error instanceof Error ? error.message : 'Failed to load requests'
      toast.error(message)
    })
  }, [user?.id, loadRequests])

  const updates = useMemo(() => {
    return all
      .filter((request) => (request.type === 'leave' || request.type === 'overtime') && request.status !== 'draft')
      .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
  }, [all])

  const filtered = updates.filter((request) => (filter === 'all' ? true : request.status === filter))
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(start, start + PAGE_SIZE)

  const read = useInboxRead((state) => state.read)
  const markRead = useInboxRead((state) => state.markRead)

  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    if (currentPage > maxPage) {
      setCurrentPage(maxPage)
    }
  }, [filtered.length, currentPage])

  function handleViewDetail(id: string) {
    markRead(id)
    router.push(`/user/inbox/${id}`)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbox"
        backHref="/user/dashboard"
        fullBleed
        bleedMobileOnly
        pullUpPx={24}
      />

      {!user ? (
        <section className="card p-5 text-sm text-gray-600">Please login</section>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'approved', label: 'Approved' },
              { key: 'rejected', label: 'Rejected' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setFilter(option.key as typeof filter)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-sm font-medium border transition',
                  filter === option.key
                    ? 'bg-[#00156B] text-white border-[var(--B-200)] shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50 border-gray-200'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {pageItems.map((request) => {
              const isRead = !!read[request.id]
              const isLeave = request.type === 'leave'
              const icon =
                request.status === 'approved' ? (
                  <CheckCircle2 className="text-green-600" />
                ) : request.status === 'rejected' ? (
                  <XCircle className="text-rose-600" />
                ) : (
                  <Clock3 className="text-amber-500" />
                )

              const typeLabel =
                isLeave && resolveLeaveTypeLabel((request as LeaveRequest).leaveTypeId)
                  ? ` • ${resolveLeaveTypeLabel((request as LeaveRequest).leaveTypeId)}`
                  : ''
              const title = isLeave ? `Leave request${typeLabel}` : 'Overtime request'

              const description = isLeave
                ? [
                    request.startDate ? `Start: ${formatDateOnly(request.startDate)}` : null,
                    request.endDate ? `End: ${formatDateOnly(request.endDate)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')
                : [request.workDate ? `Date: ${formatDateOnly(request.workDate)}` : null]
                    .filter(Boolean)
                    .join(' • ')

              return (
                <div
                  key={request.id}
                  className={clsx(
                    'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md flex gap-3 items-start',
                    !isRead && 'ring-1 ring-[var(--B-200)]'
                  )}
                >
                  <div className="shrink-0 size-10 rounded-full grid place-items-center bg-gray-50 text-amber-500">
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {request.updatedAt
                            ? `Updated ${formatDateOnly(request.updatedAt)}`
                            : `Created ${formatDateOnly(request.createdAt)}`}
                        </div>
                      </div>
                      <StatusPill status={request.status} />
                    </div>

                    {description && <div className="text-sm text-gray-700 mt-2">{description}</div>}

                    {request.reason && (
                      <div className="text-sm text-gray-500 mt-1 line-clamp-2">Reason: {request.reason}</div>
                    )}

                    <div className="mt-3 flex items-center gap-3">
                      {!isRead && (
                        <button
                          onClick={() => markRead(request.id)}
                          className="text-sm text-[var(--B-700)] hover:underline"
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={() => handleViewDetail(request.id)}
                        className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-[color:var(--brand,_#00156B)] transition hover:bg-slate-50"
                        style={{ ['--brand' as any]: BRAND }}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-gray-500">
                <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-gray-100 grid place-items-center">
                  <Bell className="text-gray-400" size={18} />
                </div>
                No requests found
              </div>
            )}

            {filtered.length > 0 && (
              <div className="pt-4 flex justify-center">
                <Pagination
                  totalItems={filtered.length}
                  pageSize={PAGE_SIZE}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
