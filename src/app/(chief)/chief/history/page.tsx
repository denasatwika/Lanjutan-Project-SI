// app/(chief)/chief/riwayat/page.tsx
'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Search, User2, X, ChevronDown } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import { PageHeader } from '@/components/PageHeader'
import { useRequests } from '@/lib/state/requests'
import {
  DecoratedRequest,
  decorateRequest,
  formatLeavePeriod,
  formatOvertimePeriod,
} from '@/lib/utils/requestDisplay'
import { LeaveRequest, OvertimeRequest } from '@/lib/types'
// Import your new component
import DateRangePicker from '@/components/DateRangePicker'

/** Brand color */
const BRAND = '#00156B'

type Status = 'draft' | 'pending' | 'approved' | 'rejected'
type Kind = 'leave' | 'overtime'

type TypeFilter = 'all' | 'leave' | 'overtime'
type StatusFilter = 'all' | Status
type Opt<T extends string> = { value: T; label: string }

function SimpleDropdown<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: Opt<T>[]
}) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.value === value)?.label ?? 'Pilih'

  return (
    <div className="relative">
      <label className="block text-xs text-gray-600">{label}</label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="mt-1 w-full rounded-xl border bg-white px-3 py-3 text-left shadow-sm flex items-center justify-between"
        style={{ borderColor: '#00156B20', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}
      >
        <span className="truncate">{current}</span>
        <ChevronDown className="size-4 opacity-70" />
      </button>

      {/* Overlay (mobile-friendly click-outside) */}
      {open && (
        <div
          className="fixed inset-0 z-40 sm:bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Menu */}
      {open && (
        <div
          className="z-50 absolute left-0 right-0 mt-2 rounded-2xl border bg-white shadow-lg sm:max-h-72 sm:overflow-auto
                     sm:absolute sm:left-0 sm:right-0
                     sm:[box-shadow:0_10px_30px_rgba(0,0,0,.08)]"
          style={{ borderColor: '#00156B20' }}
          role="listbox"
        >
          <ul className="py-1">
            {options.map(opt => {
              const active = opt.value === value
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl
                                hover:bg-gray-100 active:bg-gray-100
                                ${active ? 'bg-indigo-50 font-medium' : ''}`}
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

export default function ChiefHistoryPage() {
  // --- FILTER STATE (lokal; tidak mengubah URL) ---
  const [typeF, setTypeF] = useState<TypeFilter>('all')
  const [statusF, setStatusF] = useState<StatusFilter>('all')
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined })
  const [q, setQ] = useState('')

  const requests = useRequests((s) => s.items)
  const data = useMemo<DecoratedRequest[]>(() => requests.map((r) => decorateRequest(r)), [requests])

  const rangeWindow = useMemo(() => {
    const start = dateRange.from ? new Date(dateRange.from) : undefined
    if (start) start.setHours(0, 0, 0, 0)
    const end = dateRange.to ? new Date(dateRange.to) : undefined
    if (end) end.setHours(23, 59, 59, 999)
    return { start, end }
  }, [dateRange])

  const matchesRange = useMemo(() => {
    const { start, end } = rangeWindow
    const check = (iso?: string) => {
      if (!iso) return false
      const d = parseISO(iso)
      if (Number.isNaN(d.getTime())) return false
      if (start && end) return d >= start && d <= end
      if (start) return d >= start
      if (end) return d <= end
      return true
    }
    return (req: DecoratedRequest) => {
      if (!start && !end) return true
      if (req.type === 'leave') {
        const leave = req as LeaveRequest
        return check(leave.startDate) || check(leave.endDate)
      }
      const overtime = req as OvertimeRequest
      return check(overtime.workDate)
    }
  }, [rangeWindow])

  const filtered = useMemo(() => {
    return data.filter((r) => {
      const inRange = matchesRange(r)
      const byType = typeF === 'all' ? true : r.type === typeF
      const byStatus = statusF === 'all' ? true : r.status === statusF
      const text = `${r.employee.name} ${r.employee.department} ${r.reason ?? ''}`.toLowerCase()
      const byQuery = q.trim() ? text.includes(q.trim().toLowerCase()) : true
      return inRange && byType && byStatus && byQuery
    }).sort((a, b) =>
      (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)
    )
  }, [data, typeF, statusF, q, matchesRange])

  const groups = useMemo(() => {
    const map: Record<string, DecoratedRequest[]> = {}
    for (const r of filtered) {
      const key = (r.updatedAt ?? r.createdAt).slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(r)
    }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const counts = useMemo(() => ({
    total: filtered.length,
    approved: filtered.filter((x) => x.status === 'approved').length,
    rejected: filtered.filter((x) => x.status === 'rejected').length,
  }), [filtered])

  const [detail, setDetail] = useState<DecoratedRequest | null>(null)

  return (
    <main className="mx-auto w-full max-w-[640px] p-3 pb-20">
      <div className="sticky top-0 z-10 -mx-3 border-b border-slate-200 bg-white/95 px-3 pb-3 pt-2 backdrop-blur">
        <PageHeader
          title="Riwayat"
          backHref="/chief/dashboard"
          fullBleed
          bleedMobileOnly
          pullUpPx={34}
        />

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SimpleDropdown
            label="Tipe"
            value={typeF}
            onChange={setTypeF}
            options={[
              { value: 'all', label: 'Semua Tipe' },
              { value: 'leave', label: 'Izin/Cuti' },
              { value: 'overtime', label: 'Lembur' },
            ]}
          />
          <SimpleDropdown
            label="Status"
            value={statusF}
            onChange={setStatusF}
            options={[
              { value: 'all', label: 'Semua status' },
              { value: 'approved', label: 'Disetujui' },
              { value: 'rejected', label: 'Ditolak' },
            ]}
          />
        </div>
        <DateRangePicker
            label="Rentang tanggal"
            range={dateRange}
            onChange={setDateRange}
            className="sm:col-span-2 mt-3"
          />
        <div className="relative mt-3 ml-auto min-w-[160px]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama/alasan…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[rgba(0,21,107,0.25)]"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-medium">
            {counts.total} item
          </span>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
            {counts.approved} disetujui
          </span>
          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
            {counts.rejected} ditolak
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-6">
        {groups.map(([key, items]) => (
          <section key={key} className="space-y-2">
            <h3 className="px-1 text-[13px] font-semibold text-slate-500">
              {fmtDate(key)}
            </h3>

            {items.map((r) => (
              <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
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
                        <p>{labelLeaveRequest(r as LeaveRequest, r.leaveTypeLabel)}</p>
                      ) : (
                        <p>Lembur <span className="font-medium">{formatOvertimePeriod(r as OvertimeRequest)}</span></p>
                      )}
                      {r.reason && (
                        <p className="line-clamp-2 mt-1 text-slate-500">Alasan: {r.reason}</p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-slate-500">
                        Diperbarui: {fDateTime(r.updatedAt ?? r.createdAt)}
                      </p>
                      <button
                        onClick={() => setDetail(r)}
                        className="text-xs font-semibold rounded-xl px-3 py-1.5 border hover:bg-slate-50 text-[color:var(--brand,_#00156B)]"
                        style={{ ['--brand' as any]: BRAND }}
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ))}

        {groups.length === 0 && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
            Tidak ada riwayat untuk filter ini.
          </div>
        )}
      </div>

      <DetailModal open={!!detail} req={detail} onClose={() => setDetail(null)} />
    </main>
  )
}

/* ---------- Helpers & UI bits ---------- */

function fmtDate(keyYYYYMMDD: string) {
  const d = parseISO(keyYYYYMMDD)
  return format(d, 'EEEE, d MMM yyyy', { locale: idLocale })
}
function fDateTime(iso: string) {
  const d = parseISO(iso)
  return format(d, 'd MMM yyyy, HH:mm', { locale: idLocale })
}
function labelLeaveRequest(req: LeaveRequest, label?: string) {
  const base = label ?? 'Izin'
  return `${base} • ${formatLeavePeriod(req)}`
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

function DetailModal({
  open,
  req,
  onClose,
}: {
  open: boolean
  req: DecoratedRequest | null
  onClose: () => void
}) {
  if (!open || !req) return null
  const when = fDateTime(req.updatedAt ?? req.createdAt)
  const jenis = req.type === 'leave'
    ? labelLeaveRequest(req as LeaveRequest, req.leaveTypeLabel)
    : `Lembur ${formatOvertimePeriod(req as OvertimeRequest)}`
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl p-5 overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Detail Riwayat</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Row label="Karyawan" value={req.employee.name} />
          <Row label="Departemen" value={req.employee.department} />
          <Row label="Jenis" value={jenis} />
          <Row label="Status" value={<StatusBadge status={req.status} />} />
          <Row label="Waktu" value={when} />
          {req.type === 'leave' && <Row label="Durasi" value={`${(req as LeaveRequest).days} hari`} />}
          {req.type === 'overtime' && <Row label="Durasi" value={`${(req as OvertimeRequest).hours} jam`} />}
          {req.reason && <Row label="Alasan" value={req.reason} />}
          <Row label="Lampiran" value={req.attachmentUrl} />
          {req.id && <Row label="ID" value={<code className="text-xs">{req.id}</code>} />}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-semibold text-white"
            style={{ background: BRAND }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px,1fr] gap-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}