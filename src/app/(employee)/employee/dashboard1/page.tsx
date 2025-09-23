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
            className="flex flex-col items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-medium text-white backdrop-blur"
        >
            <div className="grid size-7 place-items-center rounded-full bg-white/15 text-white">
                {icon}
            </div>
            <span className="truncate text-center leading-4">{label}</span>
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

    const firstName = useMemo(() => user?.name?.split(' ')[0] ?? 'User', [user?.name])
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
    const ctaLabel = today.working ? 'Check-Out' : 'Check-In'

    if (!user) {
        return (
            <main className="mx-auto w-full max-w-[640px] space-y-5 p-3 pb-28">
                <section className="card p-5 text-sm text-gray-600">Silakan login untuk mengakses dashboard karyawan.</section>
            </main>
        )
    }

    return (
        <main className="mx-auto w-full max-w-[640px] space-y-5 p-3 pb-28">
            {/* Hero */}
            <section
                className="relative overflow-hidden rounded-2xl p-4 text-white shadow-sm"
                style={{
                    background: `linear-gradient(135deg, ${NAVY[700]} 0%, ${NAVY[600]} 60%, ${NAVY[800]} 100%)`,
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15 text-base font-semibold md:size-14">
                        {initial}
                    </div>
                    <div>
                        <p className="text-xs text-white/70">Selamat datang kembali</p>
                        <h1 className="text-lg font-semibold leading-snug md:text-xl">{firstName}</h1>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p className="text-xs text-white/70">Tanggal</p>
                        <p className="font-medium leading-5">{formatDateLongID(now)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-white/70">Jam sekarang</p>
                        <p className="font-semibold text-base tracking-tight">{format(now, 'HH.mm.ss')}</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowCheckIn(true)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-white/95"
                >
                    <Clock className="size-4" />
                    {ctaLabel}
                </button>

                <div className="mt-4 grid grid-cols-2 gap-2">
                    <MiniStat icon={<Clock className="size-4" />} label="Riwayat" href="/employee/riwayat" />
                    <MiniStat icon={<FileText className="size-4" />} label="Izin" href="/employee/izin" />
                    <MiniStat icon={<Inbox className="size-4" />} label="Inbox" href="/employee/inbox" />
                    <MiniStat icon={<User className="size-4" />} label="Profil" href="/employee/profile" />
                </div>
            </section>

            {/* Info */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 text-sm text-slate-600">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Departemen</p>
              <p className="font-semibold text-slate-900">Production</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-400">Wallet</p>
              <p className="font-medium text-slate-900">0x97F5E6...2sdke1</p>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Pantau izin, pesan, dan profil kamu langsung dari menu cepat di atas.
          </div>
        </div>
      </section>

            {/* KPI */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 text-slate-500">
                            <TrendingUp className="size-4" />
                            <span className="text-sm font-medium">Total Kehadiran</span>
                        </div>
                        <span className="text-lg font-semibold text-slate-900">{totalMonth}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Rekap bulan ini</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Zap className="size-4" />
                            <span className="text-sm font-medium">Status</span>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${today.working ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                            {today.working ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Tidak Bekerja</p>
                </div>
            </section>

            {/* Activity */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-700">Aktivitas Hari Ini</h2>
                    <CalendarDays className="size-4 text-slate-400" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-500">
                    <div>
                        <p className="text-xs uppercase tracking-wide">Check-In</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{timeHHmm(today.checkIn)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase tracking-wide">Check-Out</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{timeHHmm(today.checkOut)}</p>
                    </div>
                </div>

                <CheckInSheet
                    open={showCheckIn}
                    onClose={() => setShowCheckIn(false)}
                    onStored={(p) => {
                        const api = (useAttendance as any).getState?.()
                        if (api?.add) {
                            api.add({
                                id: crypto.randomUUID(),
                                userId: user.id,
                                checkInAt: new Date().toISOString(),
                                photo: p?.filename ?? p?.url
                            })
                        } else if (api?.checkIn) {
                            api.checkIn(user.id)
                        }
                        toast.success(`${ctaLabel} berhasil`)
                    }}
                />
            </section>

            {/* Recent days */}
            <section>
                <div className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-sm font-semibold text-slate-700">Kehadiran 7 Hari Terakhir</h2>
                </div>
                <div className="space-y-3">
                    {days.map(({ date, checkIn, checkOut }) => {
                        const present = !!checkIn
                        const statusText = present ? 'Hadir' : 'Absen'
                        const dot = present ? 'bg-green-500' : 'bg-rose-500'
                        const statusColor = present ? 'text-green-600' : 'text-rose-600'
                        const preview = getDescPreview(date)

                        return (
                            <div key={date.toISOString()} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-2">
                                        <div className="text-sm font-semibold text-slate-800">
                                            {formatDateShortID(date)}
                                        </div>
                                        <div className="text-sm font-medium text-slate-600">
                                            {timeHHmm(checkIn)} – {timeHHmm(checkOut)}
                                        </div>
                                        {preview && (
                                            <p className="text-xs leading-5 text-slate-500 line-clamp-2">
                                                {preview}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold ${statusColor}`}>
                                            <span className={`inline-block size-2 rounded-full ${dot}`} />
                                            {statusText}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => openDaySheet(date)}
                                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                        >
                                            <Info className="size-3.5" />
                                            Keterangan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} className="max-h-[90dvh]">
                {selectedDay && (
                    <div className="space-y-4 p-1">
                        <div
                            className="mx-auto w-max rounded-full px-4 py-2 text-center text-xs font-semibold text-white"
                            style={{ background: 'var(--B-900)' }}
                        >
                            {formatDateLongID(selectedDay)}
                        </div>

                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
                            <div className="text-sm font-semibold text-slate-800">Catatan Hari Ini</div>
                            <textarea
                                value={desc}
                                onChange={(e) => setDesc(e.target.value)}
                                rows={4}
                                placeholder="Contoh: Weekly meeting, review dokumen, implementasi fitur X."
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00156B]"
                            />
                            <div className="flex items-center justify-end gap-2 text-xs">
                                <button
                                    onClick={() => setDesc('')}
                                    className="rounded-xl border border-slate-200 px-3 py-1 font-medium text-slate-600"
                                >
                                    Kosongkan
                                </button>
                                <button
                                    onClick={saveDesc}
                                    className="rounded-xl bg-[#16A34A] px-3 py-1 font-semibold text-white shadow-sm"
                                >
                                    Simpan
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </BottomSheet>
        </main>
    )
}
