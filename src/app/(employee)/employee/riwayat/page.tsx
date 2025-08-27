// app/(employee)/employee/riwayat/page.tsx
'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useAuth } from '@/lib/state/auth'
import { useAttendance } from '@/lib/state/attendance'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import { PageHeader } from '@/components/PageHeader'

function fDate(d: Date)   { return format(d, 'd - MM - yyyy', { locale: idLocale }) }
function fTime(d?: Date)  { return d ? format(d, 'HH:mm', { locale: idLocale }) : '--:--' }

export default function RiwayatKehadiranPage() {
  const user = useAuth((s) => s.user)!
  const items = useAttendance((s) => s.forUser(user.id))

  // Group attendance by day -> {date, checkIn, checkOut}
  const rows = useMemo(() => {
    const map = new Map<string, { date: Date; times: Date[] }>()
    for (const a of items) {
      const t = new Date(a.checkInAt)
      const day = new Date(t.getFullYear(), t.getMonth(), t.getDate())
      const key = day.toISOString()
      if (!map.has(key)) map.set(key, { date: day, times: [] })
      map.get(key)!.times.push(t)
    }
    return Array.from(map.values())
      .map(({ date, times }) => {
        times.sort((a, b) => a.getTime() - b.getTime())
        const checkIn  = times[0]
        const checkOut = times.length > 1 ? times[times.length - 1] : undefined
        return { date, checkIn, checkOut }
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime()) // oldest → newest like your mock
  }, [items])

  return (
    <div className="pb-8">
      {/* Header */}
       <PageHeader
        title="Riwayat Kehadiran"
        backHref="/employee/dashboard"
        // optional gradient example:
        // gradient="linear-gradient(135deg, var(--B-950) 0%, var(--S-800) 100%)"
      />

      {/* Table */}
      <div className="max-w-6xl mx-auto px-5 mt-4">
        <div className="rounded-2xl bg-white shadow-md border overflow-hidden">
          <div className="grid grid-cols-[3rem,1fr,6rem,6rem,6.5rem] items-center bg-gray-50 text-gray-600 text-sm font-medium">
            <div className="px-4 py-3">No</div>
            <div className="px-2 py-3">Tanggal</div>
            <div className="px-2 py-3">Masuk</div>
            <div className="px-2 py-3">Keluar</div>
            <div className="px-4 py-3 text-right">Status</div>
          </div>

          {rows.map((r, idx) => (
            <div key={r.date.toISOString()} className="grid grid-cols-[3rem,1fr,6rem,6rem,6.5rem] items-center border-t">
              <div className="px-4 py-3">{idx + 1}</div>
              <div className="px-2 py-3 font-medium">{fDate(r.date)}</div>
              <div className="px-2 py-3 text-gray-600">{fTime(r.checkIn)}</div>
              <div className="px-2 py-3 text-gray-600">{fTime(r.checkOut)}</div>
              <div className="px-4 py-3">
                <span className="inline-flex items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 float-right">
                  Masuk
                </span>
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">Belum ada kehadiran.</div>
          )}
        </div>
      </div>
    </div>
  )
}
