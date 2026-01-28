// app/(hr)/hr/history/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import {
  Calendar as CalendarIcon,
  ChevronRight,
  Search,
  Info,
  Download,
  Users
} from 'lucide-react'

type Status = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'cuti'
type Department = 'Business' | 'Tech' | 'HR'

type Row = {
  id: string
  employeeId: string
  name: string
  department: Department
  date: string // ISO
  checkIn: string // HH:mm:ss
  checkOut: string // HH:mm:ss
  status: Status
}

/** ───────── Helpers ───────── */
function fDateID(iso: string) {
  return format(new Date(iso), 'd MMMM yyyy', { locale: idLocale })
}

/** ───────── Mock (multi-employee) ───────── */
const NAMES = [
  ['E001', 'Alex Klemer', 'Business'],
  ['E002', 'Budi Santoso', 'Business'],
  ['E003', 'Cinta Lestari', 'Tech'],
  ['E004', 'Dewi Kencana', 'Tech'],
  ['E005', 'Eko Prasetyo', 'HR'],
  ['E006', 'Fajar Maulana', 'Tech'],
  ['E007', 'Gita Maharani', 'Business'],
  ['E008', 'Hendra Wijaya', 'HR'],
] as const

const STATUSES: Status[] = ['hadir', 'terlambat', 'izin', 'sakit', 'cuti']

function seedRand(seed: number) {
  let x = seed
  return () => {
    x ^= x << 13; x ^= x >> 17; x ^= x << 5
    return Math.abs(x) / 0x7fffffff
  }
}

function makeMonthMock(year: number, monthIdx0: number): Row[] {
  const start = new Date(Date.UTC(year, monthIdx0, 1))
  const end = new Date(Date.UTC(year, monthIdx0 + 1, 0))
  const days = end.getUTCDate()
  const rows: Row[] = []
  let id = 1
  const rand = seedRand(12345 + year * 100 + monthIdx0)

  for (let d = 1; d <= days; d++) {
    const iso = new Date(Date.UTC(year, monthIdx0, d)).toISOString()
    for (const [empId, name, dept] of NAMES) {
      const day = new Date(iso).getUTCDay()
      if (day === 0 || day === 6) continue

      const r = rand()
      let status: Status = 'hadir'
      if (r < 0.08) status = 'terlambat'
      else if (r < 0.11) status = 'izin'
      else if (r < 0.13) status = 'sakit'
      else if (r < 0.15) status = 'cuti'

      const baseIn = status === 'terlambat' ? 9 * 60 + 15 : 8 * 60 + Math.floor(rand() * 30)
      const baseOut = 17 * 60 + Math.floor(rand() * 30)
      const toHHMMSS = (m: number) => {
        const h = Math.floor(m / 60).toString().padStart(2, '0')
        const mm = (m % 60).toString().padStart(2, '0')
        return `${h}:${mm}:${Math.floor(rand() * 60).toString().padStart(2, '0')}`
      }

      rows.push({
        id: String(id++),
        employeeId: empId,
        name,
        department: dept as Department,
        date: iso,
        checkIn: toHHMMSS(baseIn),
        checkOut: toHHMMSS(baseOut),
        status,
      })
    }
  }
  return rows
}

// default: August 2025 mock
const MOCK: Row[] = makeMonthMock(2025, 7)

/** ───────── Page ───────── */
export default function HRHistoryPage() {
  const [tab, setTab] = useState<'all' | 'hadir' | 'terlambat' | 'izinSakit' | 'cuti'>('all')
  const [dept, setDept] = useState<'all' | Department>('all')
  const [q, setQ] = useState('')
  const [start, setStart] = useState('2025-08-01')
  const [end, setEnd] = useState('2025-08-31')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const data = useMemo(() => MOCK, [])

  const filtered = useMemo(() => {
    const startD = start ? new Date(start + 'T00:00:00') : null
    const endD = end ? new Date(end + 'T23:59:59') : null

    return data.filter(r => {
      const inTab =
        tab === 'all'
          ? true
          : tab === 'hadir'
          ? r.status === 'hadir'
          : tab === 'terlambat'
          ? r.status === 'terlambat'
          : tab === 'izinSakit'
          ? r.status === 'izin' || r.status === 'sakit'
          : r.status === 'cuti'
      if (!inTab) return false
      if (dept !== 'all' && r.department !== dept) return false

      const d = new Date(r.date)
      if (startD && d < startD) return false
      if (endD && d > endD) return false

      if (q.trim()) {
        const t = q.trim().toLowerCase()
        if (!r.name.toLowerCase().includes(t)) return false
      }
      return true
    }).sort((a, b) => b.date.localeCompare(a.date))
  }, [data, tab, dept, q, start, end])

  const summary = useMemo(() => {
    const s = { total: 0, hadir: 0, terlambat: 0, izin: 0, sakit: 0, cuti: 0 }
    for (const r of filtered) {
      s.total++
      s[r.status]++
    }
    return s
  }, [filtered])

  const perEmployee = useMemo(() => {
    const map = new Map<string, { name: string; department: Department; hadir: number; terlambat: number; izin: number; sakit: number; cuti: number; days: number }>()
    for (const r of filtered) {
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, { name: r.name, department: r.department, hadir: 0, terlambat: 0, izin: 0, sakit: 0, cuti: 0, days: 0 })
      }
      const m = map.get(r.employeeId)!
      m[r.status]++
      m.days++
    }
    return Array.from(map.entries())
      .map(([employeeId, v]) => ({ employeeId, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  async function exportRingkasanXLSX() {
    // dynamic import to avoid SSR issues & reduce initial bundle
    const XLSX = await import('xlsx')
    const sheetData = perEmployee.map(e => ({
      'Employee ID': e.employeeId,
      'Nama': e.name,
      'Departemen': e.department,
      'Hadir': e.hadir,
      'Terlambat': e.terlambat,
      'Izin': e.izin,
      'Sakit': e.sakit,
      'Cuti': e.cuti,
      'Total Hari': e.days,
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(sheetData)
    XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan')

    // Optional: a tiny Filters sheet for auditability
    const filters = [
      ['Periode Mulai', start],
      ['Periode Akhir', end],
      ['Departemen', dept === 'all' ? 'Semua' : dept],
      ['Tab Status', tab],
      ['Pencarian Nama', q || '-'],
      ['Jumlah Karyawan', String(perEmployee.length)],
    ]
    const wsFilters = XLSX.utils.aoa_to_sheet([['Filter', 'Nilai'], ...filters])
    XLSX.utils.book_append_sheet(wb, wsFilters, 'Filter')

    XLSX.writeFileXLSX(wb, `ringkasan_kehadiran_${start}_to_${end}.xlsx`)
  }

  return (
    <div className="space-y-4">
      {/* SUMMARY CARDS */}
      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Semua" value={summary.total} />
        <StatCard label="Hadir" value={summary.hadir} badgeColor="bg-green-500" />
        <StatCard label="Terlambat" value={summary.terlambat} badgeColor="bg-amber-500" />
        <StatCard label="Izin" value={summary.izin} badgeColor="bg-sky-500" />
        <StatCard label="Sakit" value={summary.sakit} badgeColor="bg-rose-500" />
        <StatCard label="Cuti" value={summary.cuti} badgeColor="bg-indigo-500" />
      </section>

      {/* PER-EMPLOYEE ROLLUP */}
      <section className="rounded-2xl bg-white shadow-md border">
        <div className="px-5 pt-4 flex items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold">Ringkasan per Karyawan</h2>
            <p className="text-sm text-gray-500">Agregasi sesuai filter aktif.</p>
          </div>
          <div className="ml-auto">
            <button
              onClick={exportRingkasanXLSX}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
              title="Export Ringkasan ke Excel"
            >
              <Download className="size-4" /> Export XLSX
            </button>
          </div>
        </div>

        <div className="overflow-auto mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#00156B] text-white">
                <Th>Nama</Th>
                <Th>Departemen</Th>
                <Th>Hadir</Th>
                <Th>Terlambat</Th>
                <Th>Izin</Th>
                <Th>Sakit</Th>
                <Th>Cuti</Th>
                <Th>Total Hari</Th>
              </tr>
            </thead>
            <tbody>
              {perEmployee.map((e) => (
                <tr key={e.employeeId} className="border-b">
                  <Td>{e.name}</Td>
                  <Td>{e.department}</Td>
                  <Td mono>{e.hadir}</Td>
                  <Td mono>{e.terlambat}</Td>
                  <Td mono>{e.izin}</Td>
                  <Td mono>{e.sakit}</Td>
                  <Td mono>{e.cuti}</Td>
                  <Td mono className="font-semibold">{e.days}</Td>
                </tr>
              ))}
              {perEmployee.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-500">
                    Tidak ada data untuk filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="h-3 rounded-b-2xl" />
      </section>

      {/* MAIN CARD */}
      <section className="rounded-2xl bg-white shadow-md border">
        <div className="px-5 pt-4 flex items-center gap-2">
          <h1 className="text-2xl font-bold">Kehadiran — Semua Karyawan</h1>
          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
            <Users className="size-4" /> {perEmployee.length} karyawan
          </span>
          {/* Removed table-wide export button per your requirement */}
        </div>

        {/* Filters row */}
        <div className="px-5 py-4 flex flex-wrap items-center gap-3">
          <Tabs value={tab} onChange={setTab} />
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value as any)}
            className="px-3 py-2 rounded-xl border text-sm"
            aria-label="Departemen"
          >
            <option value="all">Semua Departemen</option>
            <option value="Business">Business</option>
            <option value="Tech">Tech</option>
            <option value="HR">HR</option>
          </select>

          <div className="ml-auto flex items-center gap-2">
            <DateBox value={start} onChange={v => { setPage(1); setStart(v) }} />
            <ChevronRight className="text-gray-500" />
            <DateBox value={end} onChange={v => { setPage(1); setEnd(v) }} />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value) }}
              placeholder="Cari nama karyawan"
              className="pl-9 pr-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[var(--B-200)]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#00156B] text-white">
                <Th>Nama</Th>
                <Th>Departemen</Th>
                <Th>Tanggal</Th>
                <Th>Check–In</Th>
                <Th>Check–Out</Th>
                <Th>Keterangan</Th>
                <Th className="text-right pr-5">Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id} className="border-b">
                  <Td>{r.name}</Td>
                  <Td>{r.department}</Td>
                  <Td>{fDateID(r.date)}</Td>
                  <Td mono>{r.checkIn}</Td>
                  <Td mono>{r.checkOut}</Td>
                  <Td><StatusChip status={r.status} /></Td>
                  <Td className="text-right pr-5">
                    <button
                      className="inline-grid place-items-center size-8 rounded-full border text-gray-800"
                      title="Detail"
                    >
                      <Info className="size-4" />
                    </button>
                  </Td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">
                    Tidak ada data untuk filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm text-gray-600">
            Menampilkan {(page - 1) * pageSize + 1}
            {'–'}
            {Math.min(page * pageSize, filtered.length)} dari {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-2 rounded-xl border text-sm disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="text-sm">Hal. {page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-2 rounded-xl border text-sm disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>

        <div className="h-3 rounded-b-2xl" />
      </section>
    </div>
  )
}

/* ============ UI bits ============ */

function StatCard({
  label,
  value,
  badgeColor,
}: {
  label: string
  value: number
  badgeColor?: string
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        {badgeColor && <span className={`w-2 h-2 rounded-full ${badgeColor}`} />}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  )
}

function Tabs({
  value,
  onChange,
}: {
  value: 'all' | 'hadir' | 'terlambat' | 'izinSakit' | 'cuti'
  onChange: (v: 'all' | 'hadir' | 'terlambat' | 'izinSakit' | 'cuti') => void
}) {
  const base = 'px-4 py-2 rounded-xl text-sm font-semibold border'
  const active = 'bg-[#00156B] border-[#00156B] text-white shadow'
  const idle = 'bg-white text-gray-700 border-gray-300'
  return (
    <div className="flex items-center gap-2">
      <button className={`${base} ${value==='all'?active:idle}`} onClick={()=>onChange('all')}>Semua</button>
      <button className={`${base} ${value==='hadir'?active:idle}`} onClick={()=>onChange('hadir')}>Hadir</button>
      <button className={`${base} ${value==='terlambat'?active:idle}`} onClick={()=>onChange('terlambat')}>Terlambat</button>
      <button className={`${base} ${value==='izinSakit'?active:idle}`} onClick={()=>onChange('izinSakit')}>Izin/Sakit</button>
      <button className={`${base} ${value==='cuti'?active:idle}`} onClick={()=>onChange('cuti')}>Cuti</button>
    </div>
  )
}

function DateBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer">
      <CalendarIcon className="size-4 text-gray-500" />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent outline-none text-sm"
      />
    </label>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 text-left font-semibold ${className}`}>{children}</th>
}
function Td({
  children,
  className = '',
  mono = false,
}: {
  children: React.ReactNode
  className?: string
  mono?: boolean
}) {
  return (
    <td className={`px-5 py-3 ${mono ? 'font-mono tabular-nums' : ''} ${className}`}>
      {children}
    </td>
  )
}

function StatusChip({ status }: { status: Status }) {
  if (status === 'hadir')
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <span className="size-2 rounded-full bg-green-500" /> Hadir
      </span>
    )
  if (status === 'terlambat')
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <span className="size-2 rounded-full bg-amber-500" /> Terlambat
      </span>
    )
  if (status === 'cuti')
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
        <span className="size-2 rounded-full bg-indigo-500" /> Cuti
      </span>
    )
  if (status === 'izin')
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
        <span className="size-2 rounded-full bg-sky-500" /> Izin
      </span>
    )
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
      <span className="size-2 rounded-full bg-rose-500" /> Sakit
    </span>
  )
}
