// app/(chief)/chief/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { Users, Briefcase, Clock3, CheckCircle2, ArrowRight, FileText, Timer, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import { useRequests } from '@/lib/state/requests'
import { decorateRequest } from '@/lib/utils/requestDisplay'
import { formatDistanceToNow } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

/** Navy tokens */
const NAVY = {
  50:  '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  600: '#1e3a8a',
  700: '#172554',
  800: '#0b1535',
}

type Mode = 'today' | 'week'

/** ===== MOCK DATA (ganti nanti dari API) ===== */
const MOCK = {
  deptName: 'Production (Tech)',
  top: {
    totalKaryawan: 28,
    totalHadirToday: 23,
    pendingToApprove: 5,
  },
  today: {
    hadir: 23,
    izin: 2,
    lemburJam: 6,
  },
  week: {
    hadir: 132, // akumulasi 7 hari
    izin: 8,
    lemburJam: 42,
  },
  approvalsPreview: [
    { id: 'LR-1024', kind: 'leave' as const, name: 'Ayu Prameswari', submittedAt: '10m ago' },
    { id: 'OT-998',  kind: 'overtime' as const, name: 'Rido Pratama', submittedAt: '1h ago' },
    { id: 'LR-1023', kind: 'leave' as const, name: 'Bagus Saputra', submittedAt: '3h ago' },
  ],
  quality: {
    onTimeRate: 0.78,           // 78% on-time
    avgOvertimeHoursThisWeek: 1.5,
    topOvertimeThisWeek: [
      { name: 'Rido Pratama', hours: 6.5 },
      { name: 'Dewi K.', hours: 5 },
      { name: 'Iqbal S.', hours: 4.5 },
    ],
  },
}
/** ============================================ */

export default function ChiefDashboard() {
  const [mode, setMode] = useState<Mode>('today')
  const requests = useRequests((s) => s.items)
  const pendingRequests = useMemo(() => (
    requests
      .map((r) => decorateRequest(r))
      .filter((r) => r.status === 'pending')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  ), [requests])

  const totalKaryawan = MOCK.top.totalKaryawan
  const totalHadir = useMemo(
    () => (mode === 'today' ? MOCK.today.hadir : MOCK.week.hadir),
    [mode]
  )
  const pending = pendingRequests.length

  const izin = mode === 'today' ? MOCK.today.izin : MOCK.week.izin
  const lembur = mode === 'today' ? MOCK.today.lemburJam : MOCK.week.lemburJam
  const absen = Math.max(0, totalKaryawan - (mode === 'today' ? (MOCK.today.hadir + MOCK.today.izin) : 0))

  return (
    <main className="mx-auto w-full max-w-[640px] p-3 pb-24">
      {/* Top hero card */}
      <section
        className="relative overflow-hidden rounded-2xl p-4 text-white"
        style={{
          background: `linear-gradient(135deg, ${NAVY[700]} 0%, ${NAVY[600]} 60%, ${NAVY[800]} 100%)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mt-1 text-2xl font-bold">Halo, Chief 👋</h1>
            <p className="mt-1 text-sm/5 opacity-90">
              Ada <span className="font-semibold">{pending}</span> permintaan menunggu persetujuan.
            </p>
          </div>
          <Link
            href="/chief/approval"
            className="inline-flex items-center gap-1 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow hover:bg-white"
          >
            Lihat Approval <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Mini stats */}
        <div className="mt-4 mb-2 grid grid-cols-3 gap-2">
          <MiniStat icon={<Users className="size-4" />} label="Karyawan" value={totalKaryawan} />
          <MiniStat icon={<CheckCircle2 className="size-4" />} label="Hadir" value={totalHadir} />
          <MiniStat icon={<Clock3 className="size-4" />} label="Menunggu" value={pending} />
        </div>

        {/* Mode switch */}
        <div className="mt-2 inline-flex rounded-full bg-white/10 p-1">
          <ModeChip active={mode === 'today'} onClick={() => setMode('today')}>Hari ini</ModeChip>
          <ModeChip active={mode === 'week'} onClick={() => setMode('week')}>Minggu ini</ModeChip>
        </div>
      </section>

      {/* Departemen summary */}
      <section className="mt-4 space-y-3">
        <h2 className="px-1 text-sm font-semibold text-slate-600">Ringkasan Departemen</h2>
        <DeptCard
          stat={{
            dept: MOCK.deptName,
            total: totalKaryawan,
            hadir: mode === 'today' ? MOCK.today.hadir : undefined,
            absen: mode === 'today' ? absen : undefined,
            izin,
            lembur,
            mode,
          }}
        />
      </section>

      {/* Approvals preview */}
      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-slate-600">Butuh Aksi</h2>
          <Link href="/chief/approval" className="text-xs font-semibold text-[--B-800] underline underline-offset-2">
            Lihat semua
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
          {pendingRequests.slice(0, 3).map((r, idx) => (
            <ApprovalItem
              key={r.id}
              id={r.id}
              kind={r.type}
              name={r.employee.name}
              submittedAt={formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: idLocale })}
              last={idx === Math.min(3, pendingRequests.length) - 1}
            />
          ))}
          {pendingRequests.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-500">Belum ada permintaan menunggu persetujuan.</p>
          )}
        </div>
      </section>

      {/* Quality signals */}
      <section className="mt-5">
        <h2 className="mb-2 px-1 text-sm font-semibold text-slate-600">Kualitas Hari Ini</h2>
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-5 text-green-600" />
                <div>
                  <p className="text-xs/5 text-slate-500">On-time rate</p>
                  <p className="text-sm font-semibold">{Math.round(MOCK.quality.onTimeRate * 100)}%</p>
                </div>
              </div>
              <Progress value={Math.round(MOCK.quality.onTimeRate * 100)} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="size-5 text-amber-600" />
                <div>
                  <p className="text-xs/5 text-slate-500">Rata-rata lembur minggu ini</p>
                  <p className="text-sm font-semibold">{MOCK.quality.avgOvertimeHoursThisWeek} jam / orang</p>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-1 text-xs/5 text-slate-500">Top lembur minggu ini</p>
              <ul className="space-y-1">
                {MOCK.quality.topOvertimeThisWeek.map((t, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate">{t.name}</span>
                    <span className="font-semibold">{t.hours} jam</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </section>
      {/* Sticky bottom CTA moved here */}
      {pending > 0 && (
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
                <span className="font-semibold">{pending}</span> menunggu persetujuan
              </p>
              <Link
                href="/chief/approval"
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

function ModeChip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-3 py-1.5 text-xs font-semibold rounded-full',
        active ? 'bg-white text-slate-900' : 'text-white/80 hover:text-white'
      )}
    >
      {children}
    </button>
  )
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
      <div className="flex items-center gap-2 text-xs/5 opacity-90">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  )
}

function DeptPill({ n, label, tone = 'default' }: { n: number | undefined; label: string; tone?: 'default' | 'good' | 'warn' }) {
  if (n === undefined) return null
  const toneClass = clsx(
    'rounded-full px-2 py-1 text-[11px] font-medium',
    tone === 'good' && 'bg-green-50 text-green-700 ring-1 ring-green-100',
    tone === 'warn' && 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    tone === 'default' && 'bg-slate-50 text-slate-700 ring-1 ring-slate-100',
  )
  return (
    <span className={toneClass}>
      <span className="font-semibold">{n}</span> {label}
    </span>
  )
}

function DeptCard({
  stat,
}: {
  stat: { dept: string; total: number; hadir?: number; absen?: number; izin: number; lembur: number; mode: Mode }
}) {
  const subtitle = stat.mode === 'today' ? 'Hari ini' : 'Minggu ini'
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="grid size-9 place-items-center rounded-xl text-white"
            style={{ backgroundColor: NAVY[600] }}
          >
            <Briefcase className="size-5" />
          </div>
          <div>
            <p className="text-xs/5 text-slate-500">{subtitle}</p>
            <h3 className="text-base font-semibold">{stat.dept}</h3>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs/5 text-slate-500">Total Karyawan</p>
          <p className="text-lg font-bold">{stat.total}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {stat.hadir !== undefined && <DeptPill n={stat.hadir} label="Hadir" tone="good" />}
        {stat.absen !== undefined && <DeptPill n={stat.absen} label="Absen" tone="warn" />}
        <DeptPill n={stat.izin} label="Izin" />
        <DeptPill n={stat.lembur} label={stat.mode === 'today' ? 'Lembur (jam)' : 'Lembur (jam/minggu)'} />
      </div>
    </div>
  )
}

function ApprovalItem({
  id, kind, name, submittedAt, last,
}: {
  id: string
  kind: 'leave' | 'overtime'
  name: string
  submittedAt: string
  last?: boolean
}) {
  const iconBg = kind === 'leave' ? '#F7DDB7' : '#DCFCE7'
  return (
    <div className={clsx('flex items-center gap-3 p-2', !last && 'border-b border-slate-100')}>
      <div className="grid size-9 place-items-center rounded-xl" style={{ background: iconBg }}>
        {kind === 'leave' ? <FileText className="size-5 text-amber-600" /> : <Timer className="size-5 text-emerald-600" />}
      </div>
      <div className="min-w-0 grow">
        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
        <p className="text-[11px] text-slate-500">
          {kind === 'leave' ? 'Izin' : 'Lembur'} • {id} • {submittedAt}
        </p>
      </div>
      <Link href={`/chief/approval?request=${id}`} className="text-xs font-semibold text-[--B-800] underline underline-offset-2">
        Review
      </Link>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">{children}</div>
}

function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="w-28">
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full"
          style={{ width: `${v}%`, background: NAVY[600] }}
        />
      </div>
      <div className="mt-1 text-right text-[11px] text-slate-500">{v}%</div>
    </div>
  )
}
