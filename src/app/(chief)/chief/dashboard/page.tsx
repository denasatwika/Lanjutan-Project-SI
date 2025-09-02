// app/(chief)/chief/page.tsx
'use client'

import { useMemo } from 'react'
import { Users, Briefcase, Clock3, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

/** Navy tokens (kept inline so you can tweak quickly) */
const NAVY = {
  50:  '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  600: '#1e3a8a',
  700: '#172554',
  800: '#0b1535',
}

type DeptKey = 'Business' | 'Tech' | 'HR'

type DeptStat = {
  dept: DeptKey
  total: number
  hadir: number
  absen: number
  izin: number
  lembur: number
}

const MOCK_DEPTS: DeptStat[] = [
  { dept: 'Business', total: 12, hadir: 10, absen: 1, izin: 1, lembur: 2 },
  { dept: 'Tech',     total: 15, hadir: 13, absen: 1, izin: 1, lembur: 4 },
  { dept: 'HR',       total:  3, hadir:  3, absen: 0, izin: 0, lembur: 0 },
]

const MOCK_PENDING_TO_APPROVE = 5 // you can wire to state/api

export default function ChiefDashboard() {
  const totalKaryawan = useMemo(
    () => MOCK_DEPTS.reduce((a, d) => a + d.total, 0),
    []
  )
  const totalHadir = useMemo(
    () => MOCK_DEPTS.reduce((a, d) => a + d.hadir, 0),
    []
  )

  return (
    <main className="mx-auto w-full max-w-[640px] p-3 pb-24">
      {/* Top hero card (no PageHeader) */}
      <section
        className="relative overflow-hidden rounded-2xl p-4 text-white"
        style={{
          background: `linear-gradient(135deg, ${NAVY[700]} 0%, ${NAVY[600]} 60%, ${NAVY[800]} 100%)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs/5 opacity-90">Chief Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold">Halo, Chief 👋</h1>
            <p className="mt-1 text-sm/5 opacity-90">
              Ada <span className="font-semibold">{MOCK_PENDING_TO_APPROVE}</span> permintaan menunggu persetujuan.
            </p>
          </div>
          <Link
            href="/chief/approval"
            className="rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow hover:bg-white"
          >
            Lihat Approval
          </Link>
        </div>

        {/* Quick stats strip */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniStat
            icon={<Users className="size-4" />}
            label="Karyawan"
            value={totalKaryawan}
          />
          <MiniStat
            icon={<CheckCircle2 className="size-4" />}
            label="Hadir"
            value={totalHadir}
          />
          <MiniStat
            icon={<Clock3 className="size-4" />}
            label="Menunggu"
            value={MOCK_PENDING_TO_APPROVE}
          />
        </div>
      </section>

      {/* Department cards */}
      <section className="mt-4 space-y-3">
        <h2 className="px-1 text-sm font-semibold text-slate-600">Ringkasan Per Departemen</h2>
        {MOCK_DEPTS.map((d) => (
          <DeptCard key={d.dept} stat={d} />
        ))}
      </section>
    </main>
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

function DeptPill({ n, label, tone = 'default' }: { n: number; label: string; tone?: 'default' | 'good' | 'warn' }) {
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

function DeptCard({ stat }: { stat: DeptStat }) {
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
            <p className="text-xs/5 text-slate-500">Departemen</p>
            <h3 className="text-base font-semibold">{stat.dept}</h3>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs/5 text-slate-500">Total</p>
          <p className="text-lg font-bold">{stat.total}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <DeptPill n={stat.hadir} label="Hadir" tone="good" />
        <DeptPill n={stat.absen} label="Absen" tone="warn" />
        <DeptPill n={stat.izin} label="Izin" />
        <DeptPill n={stat.lembur} label="Lembur" />
      </div>
    </div>
  )
}
