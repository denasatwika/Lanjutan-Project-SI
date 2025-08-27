'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import { useAttendance } from '@/lib/state/attendance'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import clsx from 'clsx'
import Link from 'next/link'

// ---------- Konfigurasi ----------
const CUT_OFF_LATE = { h: 9, m: 10 } // 09:10
const DEPARTMENTS = [
  { id: 'production', name: 'Production (Tech)' },
  { id: 'executive',  name: 'Executive (Business)' },
  { id: 'operation',  name: 'Operation (HR)' },
]

// Dummy users untuk demo/enrichment userId -> user (ganti jika kamu sudah punya useUsers)
const PEOPLE: Record<string, { id: string; name: string; deptId: string }> = {
  u_alex:  { id: 'u_alex',  name: 'Alex Klemer',  deptId: 'executive'  },
  u_mark:  { id: 'u_mark',  name: 'Mark Brown',   deptId: 'production' },
  u_david: { id: 'u_david', name: 'David Brown',  deptId: 'operation'  },
  u_ava:   { id: 'u_ava',   name: 'Ava Smith',    deptId: 'production' },
}
// ---------------------------------

// Util tanggal
function startOfDay(d = new Date()){ const x = new Date(d); x.setHours(0,0,0,0); return x }
function endOfDay(d = new Date()){ const x = new Date(d); x.setHours(23,59,59,999); return x }
function isSameDayISO(iso: string){ const t = new Date(iso); const s = startOfDay(); const e = endOfDay(); return t >= s && t <= e }
function firstCheckInToday(records: any[]): Date | undefined {
  const today = records.filter(r => isSameDayISO(r.checkInAt)).map(r => new Date(r.checkInAt))
  return today.length ? new Date(Math.min(...today.map(d => d.getTime()))) : undefined
}
function isLate(d?: Date){
  if(!d) return false
  const limit = new Date(d); limit.setHours(CUT_OFF_LATE.h, CUT_OFF_LATE.m, 0, 0)
  // bandingkan hanya jam/menit hari itu
  const t = new Date(d); t.setSeconds(0,0)
  const l = new Date(d); l.setHours(CUT_OFF_LATE.h, CUT_OFF_LATE.m, 0, 0)
  return t.getTime() > l.getTime()
}
function fDateHuman(d: Date){ return format(d, 'EEEE, d MMM yyyy', { locale: idLocale }) }

// Leave & overtime helpers
function leaveActiveToday(payload: any){
  // cuti/izin bisa berupa {date} atau {start,end}
  const s = payload?.start ? new Date(payload.start) : (payload?.date ? new Date(payload.date) : null)
  const e = payload?.end   ? new Date(payload.end)   : s
  if(!s || !e) return false
  const S = startOfDay(s), E = endOfDay(e)
  const today = new Date()
  return today >= S && today <= E
}
function overtimeIsToday(payload: any){
  if(!payload?.date) return false
  return isSameDayISO(new Date(payload.date).toISOString())
}

export default function ChiefDashboardPage(){
  const me = useAuth(s => s.user)! // diasumsikan Chief
  const reqItems = useRequests(s => s.items) as any[]              // { id, userId, type, status, payload, createdAt, updatedAt, ... }
  const attItems = useAttendance((s:any) => s.items ?? s.all?.() ?? []) as any[] // fallback bila API berbeda

  // Enrich requests: tambahkan user (nama & dept)
  const requests = useMemo(() => reqItems.map(r => ({
    ...r,
    user: PEOPLE[r.userId], // kalau kamu punya useUsers, ganti ke mapping aslinya
  })), [reqItems])

  // Index attendance by user
  const attByUser = useMemo(() => {
    const map = new Map<string, any[]>()
    for(const a of attItems){
      const uid = a.userId
      if(!map.has(uid)) map.set(uid, [])
      map.get(uid)!.push(a)
    }
    return map
  }, [attItems])

  // Helper per user
  function isPresentToday(userId: string){
    const rec = attByUser.get(userId) ?? []
    return rec.some(r => isSameDayISO(r.checkInAt))
  }
  function isLateToday(userId: string){
    const rec = attByUser.get(userId) ?? []
    const first = firstCheckInToday(rec)
    return isLate(first)
  }

  // Kumpulan user per departemen
  const users = useMemo(() => Object.values(PEOPLE), [])
  const usersByDept = useMemo(() => {
    const map: Record<string, { id:string; name:string }[]> = {}
    for(const d of DEPARTMENTS) map[d.id] = []
    for(const u of users){
      (map[u.deptId] ??= []).push({ id: u.id, name: u.name })
    }
    return map
  }, [users])

  // Hitung statistik HARI INI (per departemen)
  const todayDeptStats = useMemo(() => {
    return DEPARTMENTS.map(dep => {
      const members = usersByDept[dep.id] ?? []
      const present = members.filter(u => isPresentToday(u.id))
      const leaveApprovedToday = requests.filter(r => r.status==='approved' && r.type==='leave' && r.user?.deptId===dep.id && leaveActiveToday(r.payload))
      const overtimeApprovedToday = requests.filter(r => r.status==='approved' && r.type==='overtime' && r.user?.deptId===dep.id && overtimeIsToday(r.payload))
      const presentIds = new Set(present.map(u=>u.id))
      const leaveIds = new Set(leaveApprovedToday.map(r=>r.userId))
      const absent = members.filter(u => !presentIds.has(u.id) && !leaveIds.has(u.id))
      const late = members.filter(u => isLateToday(u.id))

      return {
        depId: dep.id,
        depName: dep.name,
        total: members.length,
        present: present.length,
        absent: absent.length,
        leave: leaveApprovedToday.length,
        overtime: overtimeApprovedToday.length,
        late: late.length,
      }
    })
  }, [usersByDept, requests, attByUser])

  // Aggregat untuk StatCards utama (semua departemen yang Chief pegang)
  const totals = useMemo(() => {
    const t = { present:0, absent:0, leave:0, overtime:0, late:0 }
    for(const s of todayDeptStats){
      t.present  += s.present
      t.absent   += s.absent
      t.leave    += s.leave
      t.overtime += s.overtime
      t.late     += s.late
    }
    return t
  }, [todayDeptStats])

  // Menunggu Persetujuan Saya (fallback: semua pending dianggap tahap Chief)
  const pendingForChief = useMemo(() => {
    return requests.filter(r => r.status === 'pending') // fallback
  }, [requests])

  // Optional: preview 3 request terbaru (tanpa chart)
  const latestQueue = useMemo(() => {
    return [...pendingForChief].sort((a,b)=> (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)).slice(0,3)
  }, [pendingForChief])

  // UI kecil untuk pencarian cepat (opsional di dashboard)
  const [q, setQ] = useState('')

  return (
    <div className="pb-10 overflow-x-hidden">
      {/* Top greeting sederhana */}
      <div className="max-w-xl mx-auto px-4 pt-4">
        <div className="text-sm text-gray-500">Halo, {me?.name?.split(' ')[0] ?? 'Chief'}</div>
        <div className="text-xs text-gray-500">{fDateHuman(new Date())}</div>
      </div>

      {/* StatCards utama */}
      <div className="max-w-xl mx-auto px-4 mt-3 grid grid-cols-2 gap-3">
        <StatCard
          title="Menunggu Persetujuan"
          value={pendingForChief.length}
          subtitle="Butuh tindakan"
          href="/chief/persetujuan?tab=mine"
        />
        <StatCard title="Hadir (Hari Ini)" value={totals.present} subtitle="Karyawan hadir" />
        <StatCard title="Tidak Hadir" value={totals.absent} subtitle="Belum ada aktivitas" />
        <StatCard title="Izin/Cuti" value={totals.leave} subtitle="Aktif hari ini" />
        <StatCard title="Lembur" value={totals.overtime} subtitle="Dijadwalkan hari ini" />
        <StatCard title="Terlambat" value={totals.late} subtitle={`> ${CUT_OFF_LATE.h.toString().padStart(2,'0')}:${CUT_OFF_LATE.m.toString().padStart(2,'0')}`} />
      </div>

      {/* Snapshot per-departemen */}
      <div className="max-w-xl mx-auto px-4 mt-4 space-y-3">
        <h3 className="text-sm font-extrabold text-[#00156B]">Ringkasan Per Departemen</h3>
        {todayDeptStats.map(s => (
          <div key={s.depId} className="rounded-2xl bg-white shadow-md border p-4">
            <div className="font-semibold">{s.depName}</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <MiniStat label="Hadir"     value={s.present}  />
              <MiniStat label="Tidak Hadir" value={s.absent} />
              <MiniStat label="Izin/Cuti" value={s.leave}    />
              <MiniStat label="Lembur"    value={s.overtime} />
            </div>
            <div className="mt-2 text-xs text-gray-500">Terlambat: {s.late}</div>
          </div>
        ))}
      </div>

      {/* Antrian terbaru (opsional) */}
      <div className="max-w-xl mx-auto px-4 mt-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-extrabold text-[#00156B]">Antrian Terbaru</div>
          <div className="ml-auto">
            <Link href="/chief/persetujuan?tab=mine" className="text-sm font-semibold" style={{ color:'#00156B' }}>
              Lihat semua
            </Link>
          </div>
        </div>

        {latestQueue.length === 0 && (
          <div className="rounded-2xl bg-white border p-4 text-sm text-gray-500">
            Tidak ada pengajuan menunggu persetujuan.
          </div>
        )}

        {latestQueue.map(r=>(
          <div key={r.id} className="rounded-2xl bg-white shadow-sm border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold leading-tight">{r.user?.name ?? '—'}</div>
                <div className="text-xs text-gray-500">
                  {r.user?.deptId ? (DEPARTMENTS.find(d=>d.id===r.user.deptId)?.name ?? '—') : '—'}
                </div>
              </div>
              <span className={clsx(
                'px-2 py-1 rounded-full text-xs font-semibold',
                r.type==='overtime' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'
              )}>
                {r.type==='overtime' ? 'Lembur' : (r.payload?.kind==='cuti' ? 'Cuti' : r.payload?.kind==='sakit' ? 'Sakit' : 'Izin')}
              </span>
            </div>
            {r.payload?.reason && <div className="mt-2 text-sm line-clamp-2">{r.payload.reason}</div>}
            <div className="mt-2 text-xs text-gray-500">
              Diajukan {format(new Date(r.createdAt), 'd MMM yyyy HH:mm', { locale: idLocale })}
            </div>
            <div className="mt-3">
              <Link
                href="/chief/persetujuan?tab=mine"
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background:'#00156B' }}
              >
                Tinjau
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="h-8" />
    </div>
  )
}

/* ---------- UI bits ---------- */

function StatCard({ title, value, subtitle, href }:{
  title:string; value:number; subtitle?:string; href?:string
}){
  const content = (
    <div className="rounded-2xl bg-white shadow-md border p-4 hover:shadow-lg transition-shadow">
      <div className="text-xs text-gray-500">{subtitle}</div>
      <div className="mt-0.5 text-base font-bold">{title}</div>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>
    </div>
  )
  return href ? <Link href={href} className="block">{content}</Link> : content
}

function MiniStat({ label, value }:{ label:string; value:number }){
  return (
    <div className="rounded-xl border bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  )
}
