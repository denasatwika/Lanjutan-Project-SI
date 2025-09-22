// app/(employee)/employee/dashboard/page.tsx
'use client'
import { useAuth } from '@/lib/state/auth'
import { useAttendance } from '@/lib/state/attendance'
import { useMemo, useEffect, useState } from 'react'
import CheckInSheet from '@/components/CheckInSheet'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import Link from 'next/link'
import { CalendarDays, Clock, TrendingUp, Zap, Info, FileText, Inbox, User } from 'lucide-react'
import { toast } from 'sonner'
import { BottomSheet } from '@/components/ui/bottomSheet'
// di atas: tambahkan import ini
import { useRouter } from 'next/navigation'

// ... (kode lain)

// ---------- Role Switcher ----------
type RoleKey = 'employee' | 'supervisor' | 'hr'
function RoleSwitcher({
  storageKey,
  onChange,
}: {
  storageKey: string
  onChange?: (role: RoleKey) => void
}) {
  const router = useRouter()
  const roles: RoleKey[] = ['employee', 'supervisor', 'hr']
  const [role, setRole] = useState<RoleKey>('employee')

  // map label -> segment url
  const roleToSeg: Record<RoleKey, string> = {
    employee: 'employee',
    supervisor: 'supervisor',
    hr: 'hr',
  }

  // hydrate
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey) as RoleKey | null
      if (saved && roles.includes(saved)) setRole(saved)
    } catch {}
  }, [storageKey])

  function handleChange(next: RoleKey) {
    setRole(next)
    try { localStorage.setItem(storageKey, next) } catch {}
    onChange?.(next)
    // langsung pindah page: /<segment>/dashboard
    router.push(`/${roleToSeg[next]}/dashboard`)
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-gray-600 hidden sm:inline">Peran</span>
      <div className="relative">
        <select
          value={role}
          onChange={(e) => handleChange(e.target.value as RoleKey)}
          className="appearance-none rounded-xl border border-gray-300 bg-white/80 px-3 py-2 pr-8 text-sm font-medium shadow-sm
                     hover:bg-white focus:outline-none focus:ring-2 focus:ring-[--S-800]/30"
          aria-label="Ganti peran"
        >
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <svg aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </label>
  )
}
// ---------- end Role Switcher ----------
function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  return now
}

const NAVY = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  600: '#1e3a8a',
  700: '#172554',
  800: '#0b1535',
}

function MiniStat({
  icon,
  label,
  href
}: {
  icon: React.ReactNode
  label: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-white/10 p-3 backdrop-blur text-white min-w-[80px] flex flex-col items-center"
    >
      <div className="flex items-center gap-2 text-xs opacity-90">
        {icon}
        <span>{label}</span>
      </div>

    </Link>
  )
}

function formatDateLongID(d: Date) { return format(d, 'EEEE, d MMMM yyyy', { locale: idLocale }) }
function formatDateShortID(d: Date) { return format(d, 'EEE, dd/MM/yyyy', { locale: idLocale }) }
function timeHHmm(d?: Date) { return d ? format(d, 'HH:mm', { locale: idLocale }) : '--:--' }

export default function Page() {
  const user = useAuth(s => s.user)
  const att = useAttendance(s => (user ? s.forUser(user.id) : []))
  const now = useLiveClock()
  const [showCheckIn, setShowCheckIn] = useState(false)

  const firstName = user?.name?.split(' ')[0] ?? 'Karyawan'
  const initial = firstName.charAt(0).toUpperCase()

  function dayISO(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.toISOString() }
  const descKey = (userId: string, iso: string) => `desc:${userId}:${iso}`

  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [desc, setDesc] = useState('')

  // Open sheet for a given day
  function openDaySheet(day: Date) {
    setSelectedDay(day)
    setSheetOpen(true)
  }

  // Load existing description when sheet opens
  useEffect(() => {
    if (!user || !sheetOpen || !selectedDay) return
    try {
      const raw = localStorage.getItem(descKey(user.id, dayISO(selectedDay)))
      setDesc(raw ?? '')
    } catch { setDesc('') }
  }, [sheetOpen, selectedDay, user?.id])

  function saveDesc() {
    if (!user || !selectedDay) return
    localStorage.setItem(descKey(user.id, dayISO(selectedDay)), (desc ?? '').trim())
    setSheetOpen(false)
  }

  function getDescPreview(day: Date) {
    if (!user) return ''
    try {
      const raw = localStorage.getItem(descKey(user.id, dayISO(day))) ?? ''
      return raw
    } catch { return '' }
  }
  // Build last 7 days (today first)
  const days = useMemo(() => {
    const out: { date: Date; checkIn?: Date; checkOut?: Date }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(d.getDate() + 1)
      const records = att
        .map(a => new Date(a.checkInAt))
        .filter(ts => ts >= d && ts < next)
        .sort((a, b) => a.getTime() - b.getTime())
      const checkIn = records[0]
      const checkOut = records.length > 1 ? records[records.length - 1] : undefined
      out.push({ date: d, checkIn, checkOut })
    }
    return out
  }, [att])

  // Today activity & working status
  const today = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setDate(start.getDate() + 1)
    const records = att
      .map(a => new Date(a.checkInAt))
      .filter(ts => ts >= start && ts < end)
      .sort((a, b) => a.getTime() - b.getTime())
    const checkIn = records[0]
    const checkOut = records.length > 1 ? records[records.length - 1] : undefined
    const working = records.length % 2 === 1
    return { checkIn, checkOut, working }
  }, [att])

  // Total hadir this month (count days with at least one record)
  const totalMonth = useMemo(() => {
    const now = new Date()
    const m = now.getMonth(), y = now.getFullYear()
    const set = new Set<string>()
    for (const a of att) {
      const d = new Date(a.checkInAt)
      if (d.getMonth() === m && d.getFullYear() === y) {
        d.setHours(0, 0, 0, 0)
        set.add(d.toISOString())
      }
    }
    return set.size
  }, [att])

  // NEW: dynamic CTA label (logic stays the same as your old storage model)
  const isWorking = today.working
  const ctaLabel = isWorking ? 'Check-Out' : 'Check-In'

  if (!user) {
    return (
      <div className="space-y-5">
        <section className="card p-6 text-center text-sm text-gray-500">
          Memuat data karyawan…
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <section className="flex items-center gap-3">
        <div
          className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full grid place-items-center text-white"
          style={{ background: 'linear-gradient(135deg, var(--R-900) 0%, var(--S-800) 100%)' }}  // pick any brand hex
        >
          <span className="text-sm md:text-base font-semibold">{initial}</span>
        </div>

        <h1 className="text-xl md:text-2xl font-extrabold leading-tight tracking-tight">
          Selamat datang, {firstName}!
        </h1>
        <div className="flex items-center gap-3">
  </div>

  <RoleSwitcher
    storageKey={`role:${user.id}`}
    onChange={(next) => {
      // opsional: toast atau analytics di sini
      toast.success(`Peran diganti ke ${next}`)
    }}
  />
      </section>

      {/* Date + Clock card */}
      <section className="card p-4 flex items-center justify-between">
        <div>
          <div className="text-gray-600">{formatDateLongID(now)}</div>
          <div className="mt-1 flex items-center gap-2" style={{ color: 'var(--S-800)' }}>
            <Clock className="size-4" />
            <span className="font-semibold text-lg">{format(now, 'HH.mm.ss')}</span>
          </div>
        </div>
        <CalendarDays className="size-6" style={{ color: 'var(--S-800)' }} />
      </section>

      {/* Wallet / Department gradient card */}
      <section className="rounded-2xl p-5 text-white shadow-md"
        style={{
          background: `linear-gradient(135deg, ${NAVY[700]} 0%, ${NAVY[600]} 60%, ${NAVY[800]} 100%)`,
        }}>
        <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide">Departemen</p>
              <p className="font-semibold">Production</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide">Wallet</p>
              <p className="font-medium">0x97F5E6...2sdke1</p>
            </div>
          </div>
        <button
          onClick={() => setShowCheckIn(true)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-white/95"
        >
          <Clock className="size-4" />
          {ctaLabel}
        </button>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <MiniStat icon={<Clock size={14} />} label="Riwayat" href="/employee/riwayat" />
          <MiniStat icon={<FileText size={14} />} label="Izin" href="/employee/izin" />
          <MiniStat icon={<Inbox size={14} />} label="Inbox" href="/employee/inbox" />
          <MiniStat icon={<User size={14} />} label="Profil" href="/employee/profile" />
        </div>
      </section>

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-gray-500"><TrendingUp className="size-5" /> <span>Total Kehadiran</span></div>
            <div className="text-2xl font-bold" style={{ color: 'var(--S-800)' }}>{totalMonth}</div>
          </div>
          <div className="text-xs text-gray-500 mt-1">Bulan ini</div>
        </div>
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-gray-500"><Zap className="size-5" /> <span>Status</span></div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${today.working ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{today.working ? 'Online' : 'Offline'}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Bekerja</div>
        </div>
      </section>

      {/* Activity card */}
      <section className="card p-4">
        <h2 className="text-lg font-semibold">Activity</h2>
        <div className="grid grid-cols-2 mt-3">
          <div className="text-gray-500">Check-In<br /><span className="text-[--S-800] font-semibold">{timeHHmm(today.checkIn)}</span></div>
          <div className="text-right text-gray-500">Check-Out<br /><span className="text-[--S-800] font-semibold">{timeHHmm(today.checkOut)}</span></div>
        </div>
        {/* Bottom-sheet; same storage semantics as your original code */}
        <CheckInSheet
          open={showCheckIn}
          onClose={() => setShowCheckIn(false)}
          onStored={(p) => {
            const api = (useAttendance as any).getState?.()
            if (api?.add) {
              // IMPORTANT: We still write a NEW record for BOTH check-in and check-out.
              // This preserves your original "first = in, last = out" behavior.
              api.add({
                id: crypto.randomUUID(),
                userId: user.id,
                checkInAt: new Date().toISOString(),
                photo: p?.filename ?? p?.url
              })
            } else if (api?.checkIn) {
              // Fallback if your store exposes a checkIn method only; call it twice for out.
              api.checkIn(user.id) // same effect: add another timestamp entry
            }
            toast.success(`${ctaLabel} berhasil`)
          }}
        />
      </section>

      <div className="mt-6 mb-4 ml-3">
        <h2 className="text-lg font-semibold">Kehadiran minggu ini</h2>
      </div>

      {/* Recent days — scrollable up to 7 days */}
      <h2 className="text-lg font-semibold mb-3 ml-2">Kehadiran 7 Hari Terakhir</h2>
      <section className="max-h-[420px] overflow-auto">

        <div className="rounded-2xl bg-white shadow-md border">
          {days.map(({ date, checkIn, checkOut }, idx) => {
            const present = !!checkIn;
            const statusText = present ? 'Hadir' : 'Absen';
            const preview = getDescPreview(date);
            
            return (
              <div 
                key={date.toISOString()} 
                className="group bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 p-5"
              >
                <div className="flex items-center justify-between">
                  {/* Left side - Date and time info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {/* Status indicator */}
                      <div className={`w-3 h-3 rounded-full ${present ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      
                      {/* Date */}
                      <h3 className="text-gray-900 font-medium text-base">
                        {formatDateLongID(date)}
                      </h3>
                    </div>
                    
                    {/* Time range */}
                    <div className="ml-6 flex items-center gap-4">
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Masuk:</span> {timeHHmm(checkIn)}
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Keluar:</span> {timeHHmm(checkOut)}
                      </div>
                    </div>
                    
                    {/* Description preview if exists */}
                    {preview && (
                      <div className="ml-6 mt-2">
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {preview}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Right side - Status and action */}
                  <div className="flex items-center gap-4">
                    {/* Status badge */}
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      present 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {statusText}
                    </span>
                    
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => openDaySheet(date)}
                      className="opacity-60 group-hover:opacity-100 transition-opacity duration-200 p-2 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700"
                      title="Tambah / Edit keterangan"
                    >
                      <Info className="size-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} className="max-h-[90dvh]">
        {selectedDay && (
          <div className="space-y-3">
            <div
              className="mx-auto w-max rounded-2xl px-4 py-2 text-center text-white shadow-md"
              style={{ background: 'var(--B-900)' }}
            >
              <div className="text-sm font-semibold">
                {formatDateLongID(selectedDay)}
              </div>
            </div>

            <div className="rounded-2xl border p-3">
              <h3 className="font-semibold mb-2 text-[15px]">Keterangan Hari Ini</h3>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={4}
                placeholder="Contoh: Weekly meeting, review dokumen, implementasi fitur X."
                className="w-full rounded-xl border px-3 py-2 text-[14px]"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDesc('')}
                  className="rounded-xl border px-3 py-1.5 text-[13px]"
                >
                  Kosongkan
                </button>
                <button
                  onClick={saveDesc}
                  className="rounded-xl px-3 py-1.5 text-white text-[13px] font-semibold shadow-md"
                  style={{ background: '#16A34A' }}
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>


    </div>
  )
}
