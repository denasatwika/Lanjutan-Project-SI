// app/(hr)/hr/persetujuan/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadges'
import { Eye, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import {
  DecoratedRequest,
  decorateRequest,
  formatLeavePeriod,
  formatOvertimePeriod,
} from '@/lib/utils/requestDisplay'
import { LeaveRequest, OvertimeRequest } from '@/lib/types'

type TabKey = 'mine' | 'others' | 'done' | 'all'
type TypeFilter = 'all' | 'leave' | 'overtime'

function fTypeLabel(req: DecoratedRequest) {
  if (req.type === 'overtime') return 'Lembur'
  return req.leaveTypeLabel ?? 'Izin'
}
const isDone = (status: string) => status === 'approved' || status === 'rejected'

export default function HRApprovalPage() {
  const me = useAuth((s) => s.user)
  const myId = me?.id ?? ''
  const requests = useRequests((s) => s.items)

  const list = useMemo(() => requests.map((r) => decorateRequest(r)), [requests])

  // === FILTER STATE (tanpa ubah URL => bebas 404) ===
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [tab, setTab] = useState<TabKey>('mine')
  const [q, setQ] = useState('')

  // Buckets (pending mine/others + done/all)
  const buckets = useMemo(() => {
    const pending = list.filter((r) => r.status === 'pending')
    const mine   = myId ? pending.filter((r) => (r.approverId ? r.approverId === myId : true)) : []
    const others = myId ? pending.filter((r) => (r.approverId ? r.approverId !== myId : false)) : pending
    const done   = list.filter((r) => isDone(r.status))
    const all    = list
    return { mine, others, done, all }
  }, [list, myId])

  // Apply tab → type → search
  const current = useMemo(() => {
    const raw =
      tab === 'mine'   ? buckets.mine   :
      tab === 'others' ? buckets.others :
      tab === 'done'   ? buckets.done   :
                         buckets.all

    const byType = typeFilter === 'all' ? raw : raw.filter((r) => r.type === typeFilter)
    const query = q.trim().toLowerCase()

    return byType
      .filter((r) =>
        query
          ? `${r.employee.name} ${r.employee.department} ${r.reason ?? ''}`
              .toLowerCase()
              .includes(query)
          : true
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [buckets, tab, typeFilter, q])

  const counts = {
    mine:   buckets.mine.length,
    others: buckets.others.length,
    done:   buckets.done.length,
    all:    buckets.all.length,
  }

  const [review, setReview] = useState<DecoratedRequest | null>(null)

  return (
    <div className="pb-8 overflow-x-hidden">
      <PageHeader title="Persetujuan" backHref="/hr/dashboard/kehadiran" bg="var(--B-950)" />

      <div className="max-w-7xl mx-auto px-5 mt-4 space-y-4">
        {!me ? (
          <section className="card p-6 text-sm text-gray-600">
            Silakan login sebagai HR untuk mengelola persetujuan.
          </section>
        ) : (
          <>
        {/* Filters bar */}
        <div className="rounded-2xl bg-[#EFF4FF]/60 border p-2 flex flex-wrap items-center gap-2">
          {/* Tabs */}
          <TabButton active={tab === 'mine'}   onClick={() => setTab('mine')}   label="Menunggu Persetujuan Saya"  count={counts.mine} />
          <TabButton active={tab === 'others'} onClick={() => setTab('others')} label="Menunggu Persetujuan Lain" count={counts.others} />
          <TabButton active={tab === 'done'}   onClick={() => setTab('done')}   label="Selesai"                    count={counts.done} />
          <TabButton active={tab === 'all'}    onClick={() => setTab('all')}    label="Semua"                      count={counts.all} />

          {/* Type filter pills */}
          <div className="flex items-center gap-2 ml-auto">
            <TypePill
              active={typeFilter === 'all'}
              onClick={() => setTypeFilter('all')}
            >
              Semua
            </TypePill>
            <TypePill
              active={typeFilter === 'leave'}
              onClick={() => setTypeFilter('leave')}
            >
              Izin/Cuti
            </TypePill>
            <TypePill
              active={typeFilter === 'overtime'}
              onClick={() => setTypeFilter('overtime')}
            >
              Lembur
            </TypePill>

            {/* Search */}
            <div className="relative ml-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama/alasan…"
                className="pl-9 pr-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[var(--B-200)]"
              />
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Table */}
        <section className="rounded-2xl bg-white shadow-md border overflow-hidden">
          <div className="grid grid-cols-[1.2fr,1fr,0.9fr,1.4fr,0.6fr,0.8fr,0.6fr] items-center bg-gray-50 text-[15px] text-[var(--B-800)] font-extrabold">
            <Cell h>Karyawan</Cell>
            <Cell h>Departemen</Cell>
            <Cell h>Jenis</Cell>
            <Cell h>Periode</Cell>
            <Cell h>Skor/Info</Cell>
            <Cell h>Status</Cell>
            <Cell h className="text-right pr-5">Aksi</Cell>
          </div>

          {current.map((r) => {
            const jenis = fTypeLabel(r)
            const period = r.type === 'overtime'
              ? formatOvertimePeriod(r as OvertimeRequest)
              : formatLeavePeriod(r as LeaveRequest)

            const info = r.type === 'overtime' ? `${r.hours} jam` : `${r.days} hari`
            const dept = r.employee.department
            const name = r.employee.name
            const badgeStatus = (r.status === 'approved' ? 'signed' : r.status) as 'pending' | 'signed' | 'rejected'

            return (
              <div key={r.id} className="grid grid-cols-[1.2fr,1fr,0.9fr,1.4fr,0.6fr,0.8fr,0.6fr] items-center border-t">
                <Cell>
                  <div className="font-semibold">{name}</div>
                  <div className="text-gray-500 text-sm line-clamp-1">{r.reason}</div>
                </Cell>
                <Cell>{dept}</Cell>
                <Cell>{jenis}</Cell>
                <Cell>{period}</Cell>
                <Cell><span className="font-bold">{info}</span></Cell>
                <Cell>
                  <StatusBadge status={badgeStatus} />
                </Cell>
                <Cell className="text-right pr-5">
                  <button
                    className="inline-flex items-center gap-2 text-[var(--B-900)] font-semibold px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                    onClick={() => setReview(r)}
                  >
                    <Eye size={16} /> Tinjau
                  </button>
                </Cell>
              </div>
            )
          })}

          {current.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">Tidak ada pengajuan untuk filter ini.</div>
          )}
        </section>
          </>
        )}
      </div>

      {/* Review modal */}
      <ReviewModal
        open={!!review}
        onClose={() => setReview(null)}
        req={review}
        onApprove={(note) => doUpdate(review, 'approved', note)}
        onReject={(note) => doUpdate(review, 'rejected', note)}
      />
    </div>
  )

  function doUpdate(req: DecoratedRequest | null, status: 'approved' | 'rejected', _note?: string) {
    if (!req) return
    const api: any = (useRequests as any).getState?.()
    if (api?.updateStatus) {
      api.updateStatus(req.id, status)
    } else if (api?.setStatus) {
      api.setStatus(req.id, status)
    }
    toast.success(`Pengajuan ${status === 'approved' ? 'disetujui' : 'ditolak'}`)
    setReview(null)
  }
}

/* ---------- UI bits ---------- */

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-4 py-2 rounded-xl font-bold flex items-center gap-2',
        active ? 'bg-[#00156B] text-white shadow' : 'text-[#00156B] bg-white border'
      )}
    >
      {label}
      <span className={clsx('px-2 py-0.5 rounded-full text-sm font-bold', active ? 'bg-white/20' : 'bg-gray-100 text-gray-700')}>
        {count}
      </span>
    </button>
  )
}

function TypePill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-3 py-1.5 rounded-lg text-sm font-semibold border',
        active ? 'bg-[#00156B] text-white shadow' : 'bg-white text-[#00156B]'
      )}
    >
      {children}
    </button>
  )
}

function Cell({ children, className = '', h = false }: { children: React.ReactNode; className?: string; h?: boolean }) {
  return (
    <div className={clsx('px-4 py-4', h && 'text-[#00156B]')}>
      <div className={className}>{children}</div>
    </div>
  )
}

/* ---------- Review Modal ---------- */
function ReviewModal({
  open,
  onClose,
  req,
  onApprove,
  onReject,
}: {
  open: boolean
  onClose: () => void
  req: DecoratedRequest | null
  onApprove: (note?: string) => void
  onReject: (note?: string) => void
}) {
  const [note, setNote] = useState('')

  if (!open || !req) return null

  const jenis = fTypeLabel(req)
  const period = req.type === 'overtime'
    ? formatOvertimePeriod(req as OvertimeRequest)
    : formatLeavePeriod(req as LeaveRequest)

  const badgeStatus = (req.status === 'approved' ? 'signed' : req.status) as 'pending' | 'signed' | 'rejected'

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl p-5 overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Tinjau Pengajuan</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Row label="Karyawan"   value={req.employee.name} />
          <Row label="Departemen" value={req.employee.department} />
          <Row label="Jenis"      value={jenis} />
          <Row label="Periode"    value={period} />
          {req.type === 'leave' && <Row label="Durasi" value={`${req.days} hari`} />}
          {req.type === 'overtime' && <Row label="Durasi" value={`${req.hours} jam`} />}
          {req.reason && <Row label="Alasan"   value={req.reason} />}
          <Row label="Lampiran" value={req.attachmentUrl} />
          <Row label="Status saat ini" value={<StatusBadge status={badgeStatus} />} />
        </div>

        <div className="mt-4">
          <label className="text-sm text-gray-600">Catatan (opsional)</label>
          <textarea
            className="mt-1 w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-[var(--B-200)]"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tambahkan catatan untuk karyawan…"
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            className="px-4 py-2 rounded-xl font-semibold text-white"
            style={{ background: '#16A34A' }}
            onClick={() => onApprove(note)}
          >
            Setujui
          </button>
          <button
            className="px-4 py-2 rounded-xl font-semibold text-white"
            style={{ background: '#EF4444' }}
            onClick={() => onReject(note)}
          >
            Tolak
          </button>
          <button className="ml-auto px-4 py-2 rounded-xl border" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px,1fr] gap-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
