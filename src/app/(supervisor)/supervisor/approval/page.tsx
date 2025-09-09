// app/(supervisor)/supervisor/persetujuan/page.tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Filter, Check, X, Timer, Calendar, Clock3, User2 } from 'lucide-react'
import clsx from 'clsx'
import { PageHeader } from '@/components/PageHeader'

type TypeFilter = 'all' | 'leave' | 'overtime'
type Status = 'pending' | 'approved' | 'rejected'

type Req = {
  id: string
  user: { name: string; department: string }
  type: 'leave' | 'overtime'
  status: Status
  createdAt: string // ISO
  forDate?: string // ISO (leave)
  hours?: number   // overtime
  reason?: string
}

const MOCK: Req[] = [
  {
    id: 'REQ-1023',
    user: { name: 'Nadia Putri', department: 'Tech' },
    type: 'overtime',
    status: 'pending',
    createdAt: '2025-08-28T08:25:00Z',
    hours: 3,
    reason: 'Release hotfix',
  },
  {
    id: 'REQ-1018',
    user: { name: 'Ardi Saputra', department: 'Business' },
    type: 'leave',
    status: 'pending',
    createdAt: '2025-08-27T14:05:00Z',
    forDate: '2025-08-29',
    reason: 'Urusan keluarga',
  },
  {
    id: 'REQ-1002',
    user: { name: 'Maya Cahyani', department: 'HR' },
    type: 'leave',
    status: 'approved',
    createdAt: '2025-08-25T03:11:00Z',
    forDate: '2025-09-02',
    reason: 'Kontrol kesehatan',
  },
]

export default function SupervisorApprovalsPage() {
  // === FILTER STATE (tanpa ubah URL) ===
  const [type, setType] = useState<TypeFilter>('all')
  const [onlyPending, setOnlyPending] = useState(true)

  const filtered = useMemo(() => {
    return MOCK.filter(
      (r) => (type === 'all' || r.type === type) && (!onlyPending || r.status === 'pending')
    )
  }, [type, onlyPending])

  const pendingCount = filtered.filter((r) => r.status === 'pending').length

  return (
    <main className="mx-auto w-full max-w-[640px] p-3 pb-28">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-3 border-b border-slate-200 bg-white/95 px-3 pb-3 pt-2 backdrop-blur">
      <PageHeader
        title="Persetujuan"
        backHref="/supervisor/dashboard"
        fullBleed
        bleedMobileOnly    // <-- key line
        pullUpPx={34}      // cancels AppShell pt-6
      />

        {/* Filter chips (tidak mengubah URL) */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto">
          <Chip active={type === 'all'} onClick={() => setType('all')}>
            <Filter className="size-4" /> Semua
          </Chip>
          <Chip active={type === 'leave'} onClick={() => setType('leave')}>
            <Calendar className="size-4" /> Izin/Cuti
          </Chip>
          <Chip active={type === 'overtime'} onClick={() => setType('overtime')}>
            <Clock3 className="size-4" /> Lembur
          </Chip>

          <div className="mx-1 h-6 w-px flex-none bg-slate-200" />

          <Chip
            active={onlyPending}
            onClick={() => setOnlyPending((v) => !v)}
          >
            <Timer className="size-4" /> Pending saja
          </Chip>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Menampilkan <span className="font-semibold">{filtered.length}</span> permintaan
          {onlyPending ? ' (pending)' : ''}. Pending:{' '}
          <span className="font-semibold">{pendingCount}</span>
        </p>
      </div>

      {/* List */}
      <ul className="mt-3 space-y-2">
        {filtered.map((r) => (
          <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid size-10 flex-none place-items-center rounded-xl bg-slate-50">
                <User2 className="size-5 text-slate-600" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.user.name}</p>
                    <p className="text-xs text-slate-500">{r.user.department} • {r.id}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <div className="mt-2 text-xs text-slate-600">
                  {r.type === 'leave' ? (
                    <p>Izin/Cuti untuk tanggal <span className="font-medium">{r.forDate}</span></p>
                  ) : (
                    <p>Lembur <span className="font-medium">{r.hours} jam</span></p>
                  )}
                  {r.reason && <p className="line-clamp-2 mt-1 text-slate-500">Alasan: {r.reason}</p>}
                </div>

                {r.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => alert(`Reject ${r.id}`)}
                    >
                      <X className="size-4" /> Tolak
                    </button>
                    <button
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00156B] px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
                      onClick={() => alert(`Approve ${r.id}`)}
                    >
                      <Check className="size-4" /> Setujui
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Sticky bottom CTA (naik dari bottom-nav) */}
      {pendingCount > 0 && (
        <div
          className="
            fixed inset-x-0 z-20 mx-auto w-full max-w-[640px] p-3
            bottom-[calc(env(safe-area-inset-bottom)+120px)]
            sm:bottom-[84px]
            pointer-events-none
          "
        >
          <div className="pointer-events-auto rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">
                <span className="font-semibold">{pendingCount}</span> menunggu persetujuan
              </p>
              <Link
                href="/supervisor/persetujuan"
                className="rounded-xl bg-[#00156B] px-3 py-2 text-xs font-semibold text-white hover:brightness-110"
              >
                Tinjau sekarang
              </Link>
            </div>
          </div>
        </div>
      )}
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
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition',
        active
          ? 'bg-[#00156B] text-white bg-[#00156B]'
          : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
      )}
    >
      {children}
    </button>
  )
}

function StatusBadge({ status }: { status: Status }) {
  const map = {
    pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    approved: 'bg-green-50 text-green-700 ring-1 ring-green-100',
    rejected: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  } as const
  return (
    <span className={clsx('rounded-full px-2 py-1 text-[11px] font-medium', map[status])}>
      {status === 'pending' ? 'Menunggu' : status === 'approved' ? 'Disetujui' : 'Ditolak'}
    </span>
  )
}
