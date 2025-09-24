'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Filter, SearchCheck, Search, Calendar, Clock3, User2 } from 'lucide-react'
import clsx from 'clsx'
import { PageHeader } from '@/components/PageHeader'
import { useRequests } from '@/lib/state/requests'
import {
  DecoratedRequest,
  decorateRequest,
  formatLeavePeriod,
  formatOvertimePeriod,
} from '@/lib/utils/requestDisplay'
import { LeaveRequest, OvertimeRequest } from '@/lib/types'
import { RequestDetailDrawer } from '@/components/RequestDetailDrawer'

type TypeFilter = 'all' | 'leave' | 'overtime'
type Status = 'draft' | 'pending' | 'approved' | 'rejected'

export default function ChiefApprovalsPage() {
  // === FILTER STATE (tanpa ubah URL) ===
  const [type, setType] = useState<TypeFilter>('all')
  const [onlyPending, setOnlyPending] = useState(true)
  const [q, setQ] = useState('')

  const requests = useRequests((s) => s.items)
  const data = useMemo<DecoratedRequest[]>(() => requests.map((r) => decorateRequest(r)), [requests])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return data
      .filter((r) => (type === 'all' || r.type === type))
      .filter((r) => (!onlyPending ? true : r.status === 'pending'))
      .filter((r) =>
        query
          ? `${r.employee.name} ${r.employee.department} ${r.reason ?? ''}`
              .toLowerCase()
              .includes(query)
          : true
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [data, type, onlyPending, q])

  const pendingCount = filtered.filter((r) => r.status === 'pending').length
  const [selected, setSelected] = useState<DecoratedRequest | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const selectRequest = useCallback((req: DecoratedRequest | null, pushUrl = true) => {
    setSelected(req)
    if (!pushUrl) return
    const next = req ? `${pathname}?request=${req.id}` : pathname
    router.replace(next, { scroll: false })
  }, [pathname, router])

  useEffect(() => {
    setMounted(true)

    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const reqId = params.get('request')
    if (!reqId) {
      selectRequest(null, false)
      return
    }
    const match = data.find((r) => r.id === reqId)
    if (match) {
      selectRequest(match, false)
    }
  }, [data, selectRequest])

  if (!mounted) return null

  return (
    <main className="mx-auto w-full max-w-[640px] p-3 pb-28">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-3 border-b border-slate-200 bg-white/95 px-3 pb-3 pt-2 backdrop-blur">
        <PageHeader
          title="Persetujuan"
          backHref="/chief/dashboard"
          fullBleed
          bleedMobileOnly
          pullUpPx={34}      // cancels AppShell pt-6
        />

        {/* Filter chips (tidak mengubah URL) */}
        <div className="mt-3 mb-3 flex items-center gap-2 overflow-x-auto">
          <Chip active={type === 'all'} onClick={() => setType('all')}>
            <Filter className="size-4" /> Semua
          </Chip>
          <Chip active={type === 'leave'} onClick={() => setType('leave')}>
            <Calendar className="size-4" /> Izin/Cuti
          </Chip>
          <Chip active={type === 'overtime'} onClick={() => setType('overtime')}>
            <Clock3 className="size-4" /> Lembur
          </Chip>
        </div>
        <div className="relative ml-auto min-w-[160px]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama/alasan…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[rgba(0,21,107,0.25)]"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          </div>
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
                    <p className="truncate text-sm font-semibold">{r.employee.name}</p>
                    <p className="text-xs text-slate-500">{r.employee.department} • {r.id}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <div className="mt-2 text-xs text-slate-600">
                  {r.type === 'leave' ? (
                    <>
                      <p>
                        {r.leaveTypeLabel ?? 'Izin/Cuti'} •{' '}
                        <span className="font-medium">{formatLeavePeriod(r as LeaveRequest)}</span>
                      </p>
                      <p>Durasi <span className="font-medium">{(r as LeaveRequest).days} hari</span></p>
                    </>
                  ) : (
                    <p>
                      Lembur <span className="font-medium">{(r as OvertimeRequest).hours} jam</span>{' '}
                      • {formatOvertimePeriod(r as OvertimeRequest)}
                    </p>
                  )}
                  {r.reason && <p className="line-clamp-2 mt-1 text-slate-500">Alasan: {r.reason}</p>}
                </div>

                <div className="mt-3 flex flex-row-reverse gap-2">
                  <button
                    className="inline-flex flex-2 items-center justify-center gap-2 rounded-xl bg-[#00156B] px-8 py-2 text-sm font-semibold text-white hover:brightness-110"
                    onClick={() => selectRequest(r)}
                  >
                    <SearchCheck className="size-6" /> Tinjau
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <RequestDetailDrawer
        request={selected}
        onClose={() => selectRequest(null)}
        role="chief"
      />
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
    draft: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    approved: 'bg-green-50 text-green-700 ring-1 ring-green-100',
    rejected: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  } as const
  return (
    <span className={clsx('rounded-full px-2 py-1 text-[11px] font-medium', map[status])}>
      {status === 'pending'
        ? 'Menunggu'
        : status === 'approved'
        ? 'Disetujui'
        : status === 'rejected'
        ? 'Ditolak'
        : 'Draft'}
    </span>
  )
}
