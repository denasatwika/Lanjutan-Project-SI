// app/(employee)/employee/inbox/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import type { Request } from '@/lib/types'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import { Bell, CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import clsx from 'clsx'

// ------------------------------
// Small local "read" store (persisted in localStorage)
// ------------------------------
type ReadState = {
  read: Record<string, true>
  markRead: (id: string) => void
  markAll: (ids: string[]) => void
  clear: () => void
}
const useInboxRead = create<ReadState>()(
  persist(
    (set) => ({
      read: {},
      markRead: (id) => set((s) => ({ read: { ...s.read, [id]: true } })),
      markAll: (ids) =>
        set((s) => ({
          read: { ...s.read, ...Object.fromEntries(ids.map((i) => [i, true])) },
        })),
      clear: () => set({ read: {} }),
    }),
    { name: 'inbox-read-v1' }
  )
)

// ------------------------------
// Helpers
// ------------------------------
function fDate(iso: string | undefined) {
  if (!iso) return '-'
  return format(new Date(iso), 'd MMM yyyy • HH:mm', { locale: idLocale })
}

function StatusPill({ status }: { status: Request['status'] }) {
  const map: Record<Request['status'], string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-rose-100 text-rose-700',
  }
  const label =
    status === 'pending'
      ? 'Menunggu'
      : status === 'approved'
      ? 'Approved'
      : status === 'rejected'
      ? 'Rejected'
      : 'Draft'
  return (
    <span className={clsx('px-3 py-1 rounded-full text-xs font-semibold', map[status])}>
      {label}
    </span>
  )
}

export default function InboxPage() {
  const user = useAuth((s) => s.user)!
  const all = useRequests((s) => s.forUser(user.id))
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  // Only leave + overtime, excluding drafts
  const updates = useMemo(() => {
    const list = all
      .filter((r) => (r.type === 'leave' || r.type === 'overtime') && r.status !== 'draft')
      .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
    return list
  }, [all])

  const filtered = updates.filter((r) => (filter === 'all' ? true : r.status === filter))

  // read state
  const read = useInboxRead((s) => s.read)
  const markRead = useInboxRead((s) => s.markRead)
  const markAll = useInboxRead((s) => s.markAll)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbox"
        backHref="/employee/dashboard"
        fullBleed
        bleedMobileOnly    // <-- key line
        pullUpPx={24}      // cancels AppShell pt-6
      />

      {/* Filters */}
      <div className="flex items-center gap-2">
        {[
          { key: 'all', label: 'Semua' },
          { key: 'pending', label: 'Menunggu' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={clsx(
  'px-3 py-1.5 rounded-full text-sm font-medium border',
  filter === f.key
    ? 'bg-[#00156B] text-white border-[var(--B-200)]' // <-- This line is changed
    : 'text-gray-700 hover:bg-gray-50 border-gray-200'
)}
          >
            {f.label}
          </button>
        ))}
        {filtered.length > 0 && (
          <button
            onClick={() => markAll(filtered.map((r) => r.id))}
            className="ml-auto text-sm text-[var(--B-700)] hover:underline"
          >
            Tandai semua dibaca
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((r) => {
          const isRead = !!read[r.id]
          const isLeave = r.type === 'leave'
          const icon =
            r.status === 'approved' ? (
              <CheckCircle2 className="text-green-600" />
            ) : r.status === 'rejected' ? (
              <XCircle className="text-rose-600" />
            ) : (
              <Clock3 className="text-amber-500" />
            )

          const title =
            isLeave
              ? `Permintaan ${r.payload?.kind === 'cuti' ? 'Cuti' : 'Izin'}`
              : 'Permintaan Lembur'

          const desc =
            isLeave
              ? [
                  r.payload?.start ? `Awal: ${fDate(r.payload?.start)}` : null,
                  r.payload?.end ? `Akhir: ${fDate(r.payload?.end)}` : null,
                ]
                  .filter(Boolean)
                  .join(' • ')
              : [
                  r.payload?.date ? `Tanggal: ${fDate(r.payload?.date)}` : null,
                  r.payload?.startTime && r.payload?.endTime
                    ? `Jam: ${r.payload.startTime}–${r.payload.endTime}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' • ')

          return (
            <div
              key={r.id}
              className={clsx(
                'card p-4 flex gap-3 items-start border transition',
                !isRead && 'ring-1 ring-[var(--B-200)]'
              )}
            >
              <div className="shrink-0 size-10 rounded-full grid place-items-center bg-gray-50">
                {icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {r.updatedAt ? `Diperbarui ${fDate(r.updatedAt)}` : `Dibuat ${fDate(r.createdAt)}`}
                    </div>
                  </div>
                  <StatusPill status={r.status} />
                </div>

                {desc && <div className="text-sm text-gray-700 mt-2">{desc}</div>}

                {r.payload?.reason && (
                  <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                    Alasan: {r.payload.reason}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-3">
                  {!isRead && (
                    <button
                      onClick={() => markRead(r.id)}
                      className="text-sm text-[var(--B-700)] hover:underline"
                    >
                      Tandai dibaca
                    </button>
                  )}
                  <button className="text-sm text-gray-600 hover:underline">Lihat detail</button>
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
            Belum ada pembaruan untuk filter ini.
          </div>
        )}
      </div>
    </div>
  )
}
