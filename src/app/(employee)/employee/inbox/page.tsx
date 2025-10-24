// app/(employee)/employee/inbox/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import type { LeaveRequest } from '@/lib/types'
import { Bell, CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import clsx from 'clsx'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'
import { toast } from 'sonner'
import { StatusPill, formatDateTime } from './utils'
import { useInboxRead } from './useInboxRead'

export default function InboxPage() {
  const router = useRouter()
  const user = useAuth((state) => state.user)
  const all = useRequests((state) => (user ? state.forEmployee(user.id) : []))
  const loadRequests = useRequests((state) => state.load)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

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

  const read = useInboxRead((state) => state.read)
  const markRead = useInboxRead((state) => state.markRead)
  const markAll = useInboxRead((state) => state.markAll)

  function handleViewDetail(id: string) {
    markRead(id)
    router.push(`/employee/inbox/${id}`)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbox"
        backHref="/employee/dashboard"
        fullBleed
        bleedMobileOnly
        pullUpPx={24}
      />

      {!user ? (
        <section className="card p-5 text-sm text-gray-600">Please Login</section>
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
                  'px-3 py-1.5 rounded-full text-sm font-medium border',
                  filter === option.key
                    ? 'bg-[#00156B] text-white border-[var(--B-200)]'
                    : 'text-gray-700 hover:bg-gray-50 border-gray-200'
                )}
              >
                {option.label}
              </button>
            ))}
            {filtered.length > 0 && (
              <button
                onClick={() => markAll(filtered.map((request) => request.id))}
                className="ml-auto text-sm text-[var(--B-700)] hover:underline"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="space-y-3">
            {filtered.map((request) => {
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

              const title = isLeave
                ? `Permintaan ${resolveLeaveTypeLabel((request as LeaveRequest).leaveTypeId) ?? 'Izin'}`
                : 'Permintaan Lembur'

              const description = isLeave
                ? [
                    request.startDate ? `Mulai: ${formatDateTime(request.startDate)}` : null,
                    request.endDate ? `Selesai: ${formatDateTime(request.endDate)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')
                : [
                    request.workDate ? `Tanggal: ${formatDateTime(request.workDate)}` : null,
                    request.startTime && request.endTime ? `Jam: ${request.startTime}–${request.endTime}` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')

              return (
                <div
                  key={request.id}
                  className={clsx(
                    'card p-4 flex gap-3 items-start border transition',
                    !isRead && 'ring-1 ring-[var(--B-200)]'
                  )}
                >
                  <div className="shrink-0 size-10 rounded-full grid place-items-center bg-gray-50">{icon}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {request.updatedAt
                            ? `Diperbarui ${formatDateTime(request.updatedAt)}`
                            : `Dibuat ${formatDateTime(request.createdAt)}`}
                        </div>
                      </div>
                      <StatusPill status={request.status} />
                    </div>

                    {description && <div className="text-sm text-gray-700 mt-2">{description}</div>}

                    {request.reason && (
                      <div className="text-sm text-gray-500 mt-1 line-clamp-2">Alasan: {request.reason}</div>
                    )}

                    <div className="mt-3 flex items-center gap-3">
                      {!isRead && (
                        <button
                          onClick={() => markRead(request.id)}
                          className="text-sm text-[var(--B-700)] hover:underline"
                        >
                          Tandai dibaca
                        </button>
                      )}
                      <button
                        onClick={() => handleViewDetail(request.id)}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        Lihat detail
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="card p-6 text-center text-gray-500">
                <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-gray-100 grid place-items-center">
                  <Bell className="text-gray-400" size={18} />
                </div>
                No notifications found
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
