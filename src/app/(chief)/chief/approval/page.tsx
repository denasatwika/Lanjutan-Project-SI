// app/(chief)/chief/persetujuan/page.tsx
'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import { StatusBadge } from '@/components/ui/StatusBadges'
import { Eye, Filter, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import { toast } from 'sonner'
import clsx from 'clsx'

type TabKey = 'mine' | 'others' | 'done' | 'all'
type TypeFilter = 'all' | 'leave' | 'overtime'

type Req = {
  id: string
  userId: string
  user?: { name?: string; department?: string; deptId?: string }
  type: 'leave' | 'overtime'
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  updatedAt?: string
  approverId?: string
  stage?: 'supervisor' | 'chief' | 'hr' | 'done'
  payload?: any
}

// Dummy users
const PEOPLE: Record<string, { name: string; department: string; deptId: string }> = {
  u_alex:  { name: 'Alex Klemer',  department: 'Business',   deptId: 'executive'  },
  u_mark:  { name: 'Mark Brown',   department: 'Tech',       deptId: 'production' },
  u_david: { name: 'David Brown',  department: 'HR',         deptId: 'operation'  },
  u_ava:   { name: 'Ava Smith',    department: 'Tech',       deptId: 'production' },
}

function fDate(d?: string) {
  if (!d) return '-'
  return format(new Date(d), 'd MMM yyyy', { locale: idLocale })
}
function fTimeHM(s?: string) {
  if (!s) return ''
  return s
}
function fTypeLabel(t: 'leave' | 'overtime', payload: any) {
  if (t === 'overtime') return 'Lembur'
  const kind = payload?.kind
  if (kind === 'cuti') return 'Cuti'
  if (kind === 'sakit') return 'Sakit'
  return 'Izin'
}
const isDone = (s: string) => s === 'approved' || s === 'rejected'

function normalizeType(t: string | null): TypeFilter {
  const v = (t ?? '').toLowerCase()
  if (['izin', 'leave', 'cuti', 'sakit'].includes(v)) return 'leave'
  if (['lembur', 'overtime'].includes(v)) return 'overtime'
  return 'all'
}

export default function ChiefApprovalPage() {
  const me = useAuth((s) => s.user)!
  const sp = useSearchParams()
  const router = useRouter()

  // Enrich requests
  const raw = useRequests((s) => s.items) as Req[]
  const list = useMemo(
    () => raw.map((r) => ({ ...r, user: { ...PEOPLE[r.userId] } })),
    [raw]
  )

  // URL state
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(() => normalizeType(sp.get('type')))
  const [tab, setTab] = useState<TabKey>(() => {
    const t = (sp.get('tab') || 'mine').toLowerCase()
    return (['mine', 'others', 'done', 'all'].includes(t) ? t : 'mine') as TabKey
  })
  const [q, setQ] = useState('')

  useEffect(() => {
    setTypeFilter(normalizeType(sp.get('type')))
    const t = (sp.get('tab') || 'mine').toLowerCase()
    setTab((['mine', 'others', 'done', 'all'].includes(t) ? t : 'mine') as TabKey)
  }, [sp])

  function setQuery(next: Partial<{ type: TypeFilter; tab: TabKey }>) {
    const p = new URLSearchParams(sp.toString())
    if (next.type) p.set('type', next.type)
    if (next.tab) p.set('tab', next.tab)
    router.replace(`/chief/persetujuan?${p.toString()}`, { scroll: false })
  }

  // Chief buckets
  const buckets = useMemo(() => {
    const pendingStageChief = list.filter(
      (r) => r.status === 'pending' && (r.stage ? r.stage === 'chief' : true)
    )
    const mine = pendingStageChief.filter((r) => (r.approverId ? r.approverId === me.id : true))
    const others = pendingStageChief.filter((r) => (r.approverId ? r.approverId !== me.id : false))
    const done = list.filter((r) => isDone(r.status))
    const all = list
    return { mine, others, done, all }
  }, [list, me.id])

  const current = useMemo(() => {
    const rawList =
      tab === 'mine' ? buckets.mine : tab === 'others' ? buckets.others : tab === 'done' ? buckets.done : buckets.all

    const byType = typeFilter === 'all' ? rawList : rawList.filter((r) => r.type === typeFilter)

    return byType
      .filter((r) =>
        q.trim()
          ? (r.user?.name || '').toLowerCase().includes(q.trim().toLowerCase()) ||
            (r.payload?.reason || '').toLowerCase().includes(q.trim().toLowerCase())
          : true
      )
      .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
  }, [buckets, tab, typeFilter, q])

  const counts = {
    mine: buckets.mine.length,
    others: buckets.others.length,
    done: buckets.done.length,
    all: buckets.all.length,
  }

  const [review, setReview] = useState<Req | null>(null)

  return (
    <div className="pb-24 overflow-x-hidden">
      {/* Header */}
      <PageHeader title="Persetujuan" backHref="/chief/dashboard/" bg="var(--B-950)" />

      <div className="max-w-7xl mx-auto px-4 sm:px-5 mt-4 space-y-4">
        {/* Filter bar */}
        <div className="rounded-2xl bg-[#EFF4FF]/60 border p-2 sm:p-3">
          {/* Tabs — turn into horizontally scrollable chips on mobile */}
          <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mb-1">
            <TabButton active={tab === 'mine'}    onClick={() => { setTab('mine'); setQuery({ tab: 'mine' }) }}    label="Menunggu Saya" count={counts.mine} />
            <TabButton active={tab === 'others'}  onClick={() => { setTab('others'); setQuery({ tab: 'others' }) }} label="Menunggu Lain" count={counts.others} />
            <TabButton active={tab === 'done'}    onClick={() => { setTab('done'); setQuery({ tab: 'done' }) }}    label="Selesai" count={counts.done} />
            <TabButton active={tab === 'all'}     onClick={() => { setTab('all'); setQuery({ tab: 'all' }) }}      label="Semua" count={counts.all} />
          </div>

          {/* Type + Search — stacked on mobile, inline on md+ */}
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex gap-2">
              <TypePill active={typeFilter === 'all'}      onClick={() => { setTypeFilter('all'); setQuery({ type: 'all' }) }}>Semua</TypePill>
              <TypePill active={typeFilter === 'leave'}    onClick={() => { setTypeFilter('leave'); setQuery({ type: 'leave' }) }}>Izin/Cuti</TypePill>
              <TypePill active={typeFilter === 'overtime'} onClick={() => { setTypeFilter('overtime'); setQuery({ type: 'overtime' }) }}>Lembur</TypePill>
            </div>

            <div className="relative sm:ml-auto">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama/alasan…"
                className="w-full sm:w-[280px] pl-9 pr-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[var(--B-200)] bg-white"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* List / Table */}
        {/* Mobile: card list */}
        <section className="md:hidden space-y-3">
          {current.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 bg-white rounded-2xl border">Tidak ada pengajuan untuk filter ini.</div>
          )}
          {current.map((r) => {
            const jenis = fTypeLabel(r.type, r.payload)
            const period =
              r.type === 'overtime'
                ? `${fDate(r.payload?.date)} • ${fTimeHM(r.payload?.startTime)}–${fTimeHM(r.payload?.endTime)}`
                : r.payload?.start && r.payload?.end
                ? `${fDate(r.payload.start)} → ${fDate(r.payload.end)}`
                : r.payload?.date
                ? fDate(r.payload.date)
                : '-'
            const badgeStatus = (r.status === 'approved' ? 'signed' : r.status) as 'pending' | 'signed' | 'rejected'

            return (
              <article key={r.id} className="rounded-2xl bg-white border shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-[#00156B]">{r.user?.name ?? '—'}</div>
                    <div className="text-sm text-gray-500">{r.user?.department ?? '—'}</div>
                  </div>
                  <StatusBadge status={badgeStatus} />
                </div>

                {r.payload?.reason && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{r.payload.reason}</p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <KV k="Jenis" v={jenis} />
                  <KV k="Periode" v={period} />
                  {r.payload?.kpi && <KV k="Skor" v={r.payload.kpi} />}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    className="inline-flex items-center gap-2 text-[#00156B] font-semibold px-3 py-2 rounded-lg border hover:bg-gray-50"
                    onClick={() => setReview(r)}
                  >
                    <Eye size={16} /> Tinjau
                  </button>
                </div>
              </article>
            )
          })}
        </section>

        {/* Desktop / Tablet: table view */}
        <section className="hidden md:block rounded-2xl bg-white shadow-md border overflow-hidden">
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
            const jenis = fTypeLabel(r.type, r.payload)
            const period =
              r.type === 'overtime'
                ? `${fDate(r.payload?.date)} • ${fTimeHM(r.payload?.startTime)}–${fTimeHM(r.payload?.endTime)}`
                : r.payload?.start && r.payload?.end
                ? `${fDate(r.payload.start)} → ${fDate(r.payload.end)}`
                : r.payload?.date
                ? fDate(r.payload.date)
                : '-'
            const skor = r.payload?.kpi ?? '—'
            const dept = r.user?.department ?? '—'
            const name = r.user?.name ?? '—'
            const badgeStatus = (r.status === 'approved' ? 'signed' : r.status) as 'pending' | 'signed' | 'rejected'

            return (
              <div key={r.id} className="grid grid-cols-[1.2fr,1fr,0.9fr,1.4fr,0.6fr,0.8fr,0.6fr] items-center border-t">
                <Cell>
                  <div className="font-semibold">{name}</div>
                  <div className="text-gray-500 text-sm line-clamp-1">{r.payload?.reason}</div>
                </Cell>
                <Cell>{dept}</Cell>
                <Cell>{jenis}</Cell>
                <Cell>{period}</Cell>
                <Cell><span className="font-bold">{skor}</span></Cell>
                <Cell><StatusBadge status={badgeStatus} /></Cell>
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

  function doUpdate(req: Req | null, status: 'approved' | 'rejected', _note?: string) {
    if (!req) return
    const api: any = (useRequests as any).getState?.()
    if (status === 'approved') {
      if (api?.update) {
        api.update(req.id, { stage: 'hr' })
        toast.success('Diteruskan ke HR')
      } else if (api?.updateStatus) {
        api.updateStatus(req.id, 'approved')
        toast.success('Disetujui (demo)')
      } else if (api?.setStatus) {
        api.setStatus(req.id, 'approved')
        toast.success('Disetujui (demo)')
      }
    } else {
      if (api?.updateStatus) api.updateStatus(req.id, 'rejected')
      else if (api?.setStatus) api.setStatus(req.id, 'rejected')
      else if (api?.update) api.update(req.id, { status: 'rejected', stage: 'done' })
      toast.success('Ditolak')
    }
    setReview(null)
  }
}

/* ---------- UI bits ---------- */

function TabButton({
  active, onClick, label, count,
}: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'snap-start px-4 py-2 rounded-xl font-bold flex items-center gap-2 shrink-0',
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
        'px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors',
        active ? 'bg-[#00156B] text-white shadow' : 'bg-white text-[#00156B] hover:bg-gray-50'
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

/* Mobile KV helper */
function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 border p-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{k}</div>
      <div className="text-sm font-semibold">{v}</div>
    </div>
  )
}

/* ---------- Review Modal ---------- */
function ReviewModal({
  open, onClose, req, onApprove, onReject,
}: {
  open: boolean
  onClose: () => void
  req: Req | null
  onApprove: (note?: string) => void
  onReject: (note?: string) => void
}) {
  const [note, setNote] = useState('')

  if (!open || !req) return null

  const jenis = fTypeLabel(req.type, req.payload)
  const period =
    req.type === 'overtime'
      ? `${fDate(req.payload?.date)} • ${req.payload?.startTime ?? ''}–${fTimeHM(req.payload?.endTime ?? '')}`
      : req.payload?.start && req.payload?.end
      ? `${fDate(req.payload?.start)} → ${fDate(req.payload?.end)}`
      : req.payload?.date
      ? fDate(req.payload?.date)
      : '-'

  const badgeStatus = (req.status === 'approved' ? 'signed' : req.status) as 'pending' | 'signed' | 'rejected'

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl p-5 overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Tinjau Pengajuan</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X /></button>
        </div>

        <div className="mt-4 space-y-3">
          <Row label="Karyawan"   value={req.user?.name ?? '—'} />
          <Row label="Departemen" value={req.user?.department ?? '—'} />
          <Row label="Jenis"      value={jenis} />
          <Row label="Periode"    value={period} />
          {req.payload?.reason && <Row label="Alasan"   value={req.payload.reason} />}
          {req.payload?.kpi    && <Row label="Skor KPI" value={req.payload.kpi} />}
          <Row label="Status saat ini" value={<StatusBadge status={badgeStatus} />} />
        </div>

        <div className="mt-4">
          <label className="text-sm text-gray-600">Catatan (opsional)</label>
          <textarea
            className="mt-1 w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-[var(--B-200)]"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tambahkan catatan…"
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            className="px-4 py-2 rounded-xl font-semibold text-white"
            style={{ background: '#16A34A' }}
            onClick={() => onApprove(note)}
          >
            Setujui (→ HR)
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
    <div className="grid grid-cols-[120px,1fr] sm:grid-cols-[140px,1fr] gap-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
