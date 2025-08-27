// app/(employee)/employee/dashboard/page.tsx
'use client'
import { useAuth } from '@/lib/state/auth'
import { useAttendance } from '@/lib/state/attendance'
import { useMemo, useEffect, useState } from 'react'
import CheckInSheet from '@/components/CheckInSheet'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import Link from 'next/link'
import { CalendarDays, Clock, TrendingUp, Zap, Info } from 'lucide-react'
import { toast } from 'sonner'

function useLiveClock(){
  const [now, setNow] = useState(new Date())
  useEffect(()=>{ const t = setInterval(()=> setNow(new Date()), 1000); return ()=> clearInterval(t) },[])
  return now
}

function formatDateLongID(d: Date){ return format(d, 'EEEE, d MMMM yyyy', { locale: idLocale }) }
function formatDateShortID(d: Date){ return format(d, 'EEE, dd/MM/yyyy', { locale: idLocale }) }
function timeHHmm(d?: Date){ return d ? format(d, 'HH:mm', { locale: idLocale }) : '--:--' }

export default function Page(){
  const user = useAuth(s=>s.user)!
  const att = useAttendance(s=>s.forUser(user.id))
  const now = useLiveClock()
  const [showCheckIn, setShowCheckIn] = useState(false)

  const firstName = useMemo(()=> user.name.split(' ')[0], [user.name])
  const initial = firstName.charAt(0).toUpperCase()

  // Build last 7 days (today first)
  const days = useMemo(()=>{
    const out: { date: Date; checkIn?: Date; checkOut?: Date }[] = []
    for(let i=0;i<7;i++){
      const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0)
      const next = new Date(d); next.setDate(d.getDate()+1)
      const records = att
        .map(a=> new Date(a.checkInAt))
        .filter(ts => ts >= d && ts < next)
        .sort((a,b)=> a.getTime()-b.getTime())
      const checkIn = records[0]
      const checkOut = records.length>1 ? records[records.length-1] : undefined
      out.push({ date: d, checkIn, checkOut })
    }
    return out
  },[att])

  // Today activity & working status
  const today = useMemo(()=>{
    const start = new Date(); start.setHours(0,0,0,0)
    const end = new Date(start); end.setDate(start.getDate()+1)
    const records = att.map(a=> new Date(a.checkInAt)).filter(ts=> ts>=start && ts<end).sort((a,b)=> a.getTime()-b.getTime())
    const checkIn = records[0]
    const checkOut = records.length>1 ? records[records.length-1] : undefined
    const working = records.length % 2 === 1
    return { checkIn, checkOut, working }
  },[att])

  // Total hadir this month (count days with at least one record)
  const totalMonth = useMemo(()=>{
    const now = new Date()
    const m = now.getMonth(), y = now.getFullYear()
    const set = new Set<string>()
    for(const a of att){
      const d = new Date(a.checkInAt)
      if(d.getMonth()===m && d.getFullYear()===y){
        d.setHours(0,0,0,0)
        set.add(d.toISOString())
      }
    }
    return set.size
  },[att])

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
      </section>


      {/* Date + Clock card */}
      <section className="card p-4 flex items-center justify-between">
        <div>
          <div className="text-gray-600">{formatDateLongID(now)}</div>
          <div className="mt-1 flex items-center gap-2" style={{ color: 'var(--S-800)'}}>
            <Clock className="size-4"/>
            <span className="font-semibold text-lg">{format(now, 'HH.mm.ss')}</span>
          </div>
        </div>
        <CalendarDays className="size-6" style={{ color: 'var(--S-800)'}}/>
      </section>

      {/* Wallet / Department gradient card */}
      <section className="rounded-2xl p-5 text-white shadow-md" style={{ backgroundColor: '#00156B' }}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs leading-5 text-white/80">Wallet Address</div>
            <div className="font-semibold tracking-wide">0x97F5E6...2sdke1</div>
          </div>
          <div>
            <div className="text-xs leading-5 text-white/80">Departemen</div>
            <div className="font-semibold">Production</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/employee/riwayat" className="btn" style={{ backgroundColor: '#BD0016', color: 'white' }}>Riwayat</Link>
          <Link href="/employee/izin" className="btn" style={{ backgroundColor: '#BD0016', color: 'white' }}>Izin</Link>
          <Link href="/employee/inbox" className="btn" style={{ backgroundColor: '#BD0016', color: 'white' }}>Inbox</Link>
          <Link href="/employee/profile" className="btn" style={{ backgroundColor: '#BD0016', color: 'white' }}>Profil</Link>
        </div>
      </section>

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-gray-500"><TrendingUp className="size-5"/> <span>Total Kehadiran</span></div>
            <div className="text-2xl font-bold" style={{ color: 'var(--S-800)'}}>{totalMonth}</div>
          </div>
          <div className="text-xs text-gray-500 mt-1">Bulan ini</div>
        </div>
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-gray-500"><Zap className="size-5"/> <span>Status</span></div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${today.working ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{today.working ? 'Online' : 'Offline'}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Bekerja</div>
        </div>
      </section>

      {/* Activity card */}
      <section className="card p-4">
        <h2 className="text-lg font-semibold">Activity</h2>
        <div className="grid grid-cols-2 mt-3">
          <div className="text-gray-500">Check-In<br/><span className="text-[--S-800] font-semibold">{timeHHmm(today.checkIn)}</span></div>
          <div className="text-right text-gray-500">Check-Out<br/><span className="text-[--S-800] font-semibold">{timeHHmm(today.checkOut)}</span></div>
        </div>
        <button
          onClick={() => setShowCheckIn(true)}
          className="btn mt-4 text-white"
          style={{ background: '#16A34A' }}
        >
          Check-In
        </button>

        {/* Bottom-sheet check-in; uses your CameraCapture + /api/upload under the hood */}
        <CheckInSheet
          open={showCheckIn}
          onClose={() => setShowCheckIn(false)}
          onStored={(p) => {
            // Persist to attendance store (choose whichever action your store provides)
            const api = (useAttendance as any).getState?.()
            if (api?.add) {
              api.add({ id: crypto.randomUUID(), userId: user.id, checkInAt: new Date().toISOString(), photo: p?.filename ?? p?.url })
            } else if (api?.checkIn) {
              api.checkIn(user.id)
            }
            toast.success('Check-In berhasil')
          }}
        />
      </section>

      {/* Recent days — scrollable up to 7 days */}
      <section className="max-h-[420px] overflow-auto">
        <div className="rounded-2xl bg-white shadow-md border">
          {days.map(({ date, checkIn, checkOut }, idx) => {
            const present = !!checkIn
            const statusText = present ? 'Hadir' : 'Absen'
            const dot = present ? 'bg-green-500' : 'bg-rose-500'
            const statusColor = present ? 'text-green-600' : 'text-rose-600'

            return (
              <div key={date.toISOString()} className={idx !== days.length - 1 ? 'p-4 md:p-5 border-b' : 'p-4 md:p-5'}>
                <div className="flex items-start justify-between gap-3">
                  {/* Left: date + time range */}
                  <div>
                    <div className="font text-lg md:text-xl">
                      {formatDateLongID(date)}
                    </div>
                    <div className="mt-2 text-base md:text-lg font-medium">
                      {timeHHmm(checkIn)} – {timeHHmm(checkOut)}
                    </div>
                  </div>

                  {/* Right: status + info button */}
                  <div className="flex items-center gap-3">
                    <div className={`inline-flex items-center gap-2 ${statusColor} font-semibold`}>
                      <span className={`inline-block size-2 rounded-full ${dot}`} />
                      {statusText}
                    </div>
                    <button
                      type="button"
                      className="grid place-items-center size-9 rounded-full border border-black/80 text-black"
                      title="Detail"
                    >
                      <Info className="size-5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
    </section>
    </div>
  )
}
