// app/(supervisor)/supervisor/riwayat/page.tsx
'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Search, User2, X, ChevronDown } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { enUS as enLocale } from 'date-fns/locale/en-US'
import { PageHeader } from '@/components/PageHeader'
import DateRangePicker from '@/components/DateRangePicker'

/** Brand color */
const BRAND = '#00156B'

type Status = 'pending' | 'approved' | 'rejected'
type Kind = 'leave' | 'overtime'

type Opt<T extends string> = { value: T; label: string }

type Req = {
  id: string
  user: { name: string; department: string }
  type: Kind
  status: Status
  createdAt: string // ISO
  updatedAt?: string // ISO
  payload?: any
}

/** --- MOCK DATA (replace later with your data store) --- */
const MOCK: Req[] = [
  {
    id: 'REQ-1102',
    user: { name: 'Nadia Putri', department: 'Tech' },
    type: 'overtime',
    status: 'approved',
    createdAt: '2025-08-27T14:05:00Z',
    updatedAt: '2025-08-28T03:18:00Z',
    payload: { date: '2025-08-27', startTime: '19:00', endTime: '22:00', reason: 'Hotfix release' },
  },
  {
    id: 'REQ-1097',
    user: { name: 'Ardi Saputra', department: 'Business' },
    type: 'leave',
    status: 'rejected',
    createdAt: '2025-08-26T01:11:00Z',
    updatedAt: '2025-08-27T02:40:00Z',
    payload: { kind: 'cuti', date: '2025-09-02', reason: 'Keperluan keluarga' },
  },
  {
    id: 'REQ-1091',
    user: { name: 'Maya Cahyani', department: 'HR' },
    type: 'leave',
    status: 'approved',
    createdAt: '2025-08-24T05:12:00Z',
    updatedAt: '2025-08-24T05:40:00Z',
    payload: { kind: 'sakit', start: '2025-08-25', end: '2025-08-26', reason: 'Kontrol dokter' },
  },
  {
    id: 'REQ-1088',
    user: { name: 'Raka Mahesa', department: 'Tech' },
    type: 'overtime',
    status: 'approved',
    createdAt: '2025-08-20T10:10:00Z',
    updatedAt: '2025-08-20T12:20:00Z',
    payload: { date: '2025-08-19', startTime: '18:30', endTime: '21:00', reason: 'Support deployment' },
  },
]

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
  const current = options.find(o => o.value === value)?.label ?? 'Select'

  return (
    <div className="relative">
      <label className="block text-xs text-gray-600">{label}</label>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="mt-1 w-full rounded-xl border bg-white px-3 py-3 text-left shadow-sm flex items-center justify-between"
        style={{ borderColor: '#00156B20', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}
      >
        <span className="truncate">{current}</span>
        <ChevronDown className="size-4 opacity-70" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 sm:bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}

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

type TypeFilter = 'all' | 'leave' | 'overtime'
type StatusFilter = 'all' | Status

export default function ApproverHistoryPage() {
  // --- LOCAL FILTER STATE (does not change the URL) ---
  const [typeF, setTypeF] = useState<TypeFilter>('all')
  const [statusF, setStatusF] = useState<StatusFilter>('all')
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined })
  const [q, setQ] = useState('')

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
    return (req: Req) => {
      if (!start && !end) return true
      if (req.type === 'leave') {
        const startIso = req.payload?.start ?? req.payload?.date
        const endIso = req.payload?.end ?? req.payload?.date
        return check(startIso) || check(endIso)
      }
      const overtimeDate = req.payload?.date ?? req.updatedAt ?? req.createdAt
      return check(overtimeDate)
    }
  }, [rangeWindow])

  const filtered = useMemo(() => {
    return MOCK.filter((r) => {
      const inRange = matchesRange(r)
      const byType = typeF === 'all' ? true : r.type === typeF
      const byStatus = statusF === 'all' ? true : r.status === statusF
      const text =
        (r.user.name + ' ' + r.user.department + ' ' + (r.payload?.reason || '')).toLowerCase()
      const byQuery = q.trim() ? text.includes(q.trim().toLowerCase()) : true
      return inRange && byType && byStatus && byQuery
    }).sort((a, b) =>
      (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)
    )
  }, [typeF, statusF, q, matchesRange])

  // group by date (yyyy-mm-dd) of updatedAt/createdAt
  const groups = useMemo(() => {
    const map: Record<string, Req[]> = {}
    for (const r of filtered) {
      const key = (r.updatedAt ?? r.createdAt).slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(r)
    }
    // return as array of [key, items] sorted desc by date
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const counts = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter((x) => x.status === 'pending').length,
    approved: filtered.filter((x) => x.status === 'approved').length,
    rejected: filtered.filter((x) => x.status === 'rejected').length,
  }), [filtered])

  const [detail, setDetail] = useState<Req | null>(null)

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
            value={typeF}
            onChange={setTypeF}
            options={[
              { value: 'all', label: 'All types' },
              { value: 'leave', label: 'Leave' },
              { value: 'overtime', label: 'Overtime' },
            ]}
          />
          <SimpleDropdown
            label="Status"
            value={statusF}
            onChange={setStatusF}
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
          className="sm:col-span-2 mt-3"
        />
        <div className="relative mt-3 ml-auto min-w-[160px]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name/reason…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[rgba(0,21,107,0.25)]"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-medium">
            {counts.total} items
          </span>
          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
            {counts.pending} pending
          </span>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
            {counts.approved} approved
          </span>
          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
            {counts.rejected} rejected
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
                        <p className="truncate text-sm font-semibold">{r.user.name}</p>
                        <p className="text-xs text-slate-500">{r.user.department} • {r.id}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>

                    <div className="mt-2 text-xs text-slate-600">
                      {r.type === 'leave' ? (
                        <p>{labelLeave(r.payload)}</p>
                      ) : (
                        <p>
                          Overtime <span className="font-medium">{r.payload?.startTime}–{r.payload?.endTime}</span> • {formatDate(r.payload?.date)}
                        </p>
                      )}
                      {r.payload?.reason && (
                        <p className="line-clamp-2 mt-1 text-slate-500">Reason: {r.payload.reason}</p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-slate-500">
                        Updated: {fDateTime(r.updatedAt ?? r.createdAt)}
                      </p>
                      <button
                        onClick={() => setDetail(r)}
                        className="text-xs font-semibold rounded-xl px-3 py-1.5 border hover:bg-slate-50 text-[color:var(--brand,_#00156B)]"
                        style={{ ['--brand' as any]: BRAND }}
                      >
                        Details
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
            No history for this filter.
          </div>
        )}
      </div>

      {/* Detail side modal */}
      <DetailModal open={!!detail} req={detail} onClose={() => setDetail(null)} />
    </main>
  )
}

/* ---------- Helpers & UI bits ---------- */

function fmtDate(keyYYYYMMDD: string) {
  const d = parseISO(keyYYYYMMDD)
  return format(d, 'EEEE, d MMM yyyy', { locale: enLocale })
}
function formatDate(iso?: string) {
  if (!iso) return '-'
  return format(parseISO(iso), 'd MMM yyyy', { locale: enLocale })
}
function fDateTime(iso: string) {
  const d = parseISO(iso)
  return format(d, 'd MMM yyyy, HH:mm', { locale: enLocale })
}
function labelLeave(payload: any) {
  const kind = payload?.kind
  const start = payload?.start ?? payload?.date
  const end = payload?.end ?? payload?.date
  const label = kindLabel(kind)
  if (start && end && start !== end) {
    return `${label} • ${formatDate(start)} → ${formatDate(end)}`
  }
  if (start) {
    return `${label} • ${formatDate(start)}`
  }
  return label
}
function kindLabel(kind?: string) {
  if (kind === 'cuti') return 'Annual leave'
  if (kind === 'sakit') return 'Sick leave'
  return 'Leave'
}

function StatusBadge({ status }: { status: Status }) {
  const map = {
    pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    approved: 'bg-green-50 text-green-700 ring-1 ring-green-100',
    rejected: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  } as const
  return (
    <span className={clsx('rounded-full px-2 py-1 text-[11px] font-medium', map[status])}>
      {status === 'pending' ? 'Pending' : status === 'approved' ? 'Approved' : 'Rejected'}
    </span>
  )
}

function DetailModal({
  open,
  req,
  onClose,
}: {
  open: boolean
  req: Req | null
  onClose: () => void
}) {
  if (!open || !req) return null
  const when = fDateTime(req.updatedAt ?? req.createdAt)
  const description =
    req.type === 'leave'
      ? labelLeave(req.payload)
      : `Overtime ${req.payload?.startTime}–${req.payload?.endTime} • ${formatDate(req.payload?.date)}`
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl p-5 overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">History Details</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Row label="Employee" value={req.user.name} />
          <Row label="Department" value={req.user.department} />
          <Row label="Type" value={description} />
          <Row label="Status" value={<StatusBadge status={req.status} />} />
          <Row label="Time" value={when} />
          {req.payload?.reason && <Row label="Reason" value={req.payload.reason} />}
          {req.id && <Row label="ID" value={<code className="text-xs">{req.id}</code>} />}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-semibold text-white"
            style={{ background: BRAND }}
          >
            Close
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
