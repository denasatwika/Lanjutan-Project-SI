// app/(employee)/employee/riwayat/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/state/auth'
import { useAttendance } from '@/lib/state/attendance'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import { PageHeader } from '@/components/PageHeader'
import { BottomSheet } from '@/components/ui/bottomSheet'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'

function fDatePretty(d: Date) { return format(d, 'd LLL yyyy', { locale: idLocale }) }  // "14 Jul 2025"
function fTimeHMS(d?: Date)   { return d ? format(d, 'HH:mm:ss', { locale: idLocale }) : '--:--' }
function dayISO(d: Date)      { const x = new Date(d); x.setHours(0,0,0,0); return x.toISOString() }
function fmtFull(d: Date)     { return format(d, 'EEEE, d MMMM yyyy', { locale: idLocale }) }

// Single description per day (stored in localStorage)
const descKey = (userId: string, iso: string) => `desc:${userId}:${iso}`

// Simple punctual rule: <= 09:00 = On Time; otherwise Late
function punctualBadge(checkIn?: Date) {
  if (!checkIn) return { label: '—', color: 'bg-gray-200 text-gray-600' }
  const limit = new Date(checkIn); limit.setHours(9,0,0,0)
  const onTime = checkIn.getTime() <= limit.getTime()
  return onTime
    ? { label: 'On Time', color: 'bg-green-500 text-white' }
    : { label: 'Late',    color: 'bg-rose-500 text-white' }
}

export default function AttendanceHistoryPage() {
  const user  = useAuth(s => s.user)
  const items = useAttendance(s => (user ? s.forUser(user.id) : []))

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
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [items])

  // ------- Sheet state (single description per day) -------
  const [sheetOpen, setSheetOpen]     = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [desc, setDesc]               = useState('')

  function openFor(day: Date) {
    setSelectedDay(day)
    setSheetOpen(true)
  }

  // Load existing description on open
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
    toast.success('Description saved')
    setSheetOpen(false)
  }

  function getDesc(day: Date) {
    if (!user) return ''
    try {
      return localStorage.getItem(descKey(user.id, dayISO(day))) ?? ''
    } catch { return '' }
  }

  return (
    <div className="pb-6">
      <PageHeader
        title="History"
        backHref="/employee/dashboard"
        fullBleed
        bleedMobileOnly    // <-- key line
        pullUpPx={24}      // cancels AppShell pt-6
      />

      {!user ? (
        <section className="card max-w-6xl mx-auto mt-4 px-4 py-6 text-sm text-gray-600">
          Please login to view your attendance history.
        </section>
      ) : (
        <>
          <div className="max-w-6xl mx-auto px-4 mt-3">
            <div className="rounded-2xl bg-white shadow-md border overflow-hidden">
          {/* Horizontal scroll with tighter layout */}
          <div className="overflow-x-auto">
            <div className="min-w-[1100px]">
              {/* Header (smaller paddings & text) */}
              <div className="grid grid-cols-[3.25rem,11rem,8.25rem,8.25rem,1fr,3.5rem] items-center bg-gray-50 text-gray-600 text-[13px] font-medium">
                <div className="px-3 py-2.5">No</div>
                <div className="px-2 py-2.5">Date</div>
                <div className="px-2 py-2.5">Check In</div>
                <div className="px-2 py-2.5">Check Out</div>
                <div className="px-2 py-2.5">Status & Description</div>
                <div className="px-2 py-2.5 text-right pr-3">Edit</div>
              </div>

              {/* Rows (tighter paddings, compact line-height) */}
              {rows.map((r, idx) => {
                const punctual = punctualBadge(r.checkIn)
                const dayDesc  = getDesc(r.date)
                return (
                  <div
                    key={r.date.toISOString()}
                    className="grid grid-cols-[3.25rem,11rem,8.25rem,8.25rem,1fr,3.5rem] items-center border-t text-[14px] leading-5"
                  >
                    {/* No */}
                    <div className="px-3 py-2.5 text-gray-500">{idx + 1}</div>

                    {/* Date */}
                    <div className="px-2 py-2.5 font-semibold text-gray-700">{fDatePretty(r.date)}</div>

                    {/* Check-in (green pill) */}
                    <div className="px-2 py-2.5">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-green-500 text-white">
                        {fTimeHMS(r.checkIn)}
                      </span>
                    </div>

                    {/* Check-out (red pill or muted) */}
                    <div className="px-2 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${r.checkOut ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {fTimeHMS(r.checkOut)}
                      </span>
                    </div>

                    {/* Status + punctual + single description */}
                    <div className="px-2 py-2.5 text-gray-500">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-gray-600 font-medium">Present</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${punctual.color}`}>
                          {punctual.label}
                        </span>
                      </div>
                      {dayDesc && (
                        <p className="text-[13px] leading-5">{dayDesc}</p>
                      )}
                    </div>

                    {/* Edit button (green circle, compact) */}
                    <div className="px-2 py-2.5 pr-3 text-right">
                      <button
                        onClick={() => openFor(r.date)}
                        className="grid place-items-center w-8 h-8 rounded-full text-white"
                        style={{ backgroundColor: '#22c55e' }}
                        title="Edit description"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {rows.length === 0 && (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">No attendance records yet.</div>
              )}
            </div>
          </div>
        </div>

            <div className="mt-1.5 text-[11px] text-gray-500">Scroll horizontally to see more columns</div>
          </div>

          {/* -------- Sheet-in: single description editor -------- */}
          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} className="max-h-[90dvh]">
            {selectedDay && (
              <div className="space-y-3">
                <div className="mx-auto w-max rounded-2xl px-4 py-2 text-center text-white shadow-md" style={{ background: 'var(--B-900)' }}>
                  <div className="text-sm font-semibold">{fmtFull(selectedDay)}</div>
                </div>

                <div className="rounded-2xl border p-3">
                  <h3 className="font-semibold mb-2 text-[15px]">Today's Description</h3>
                  <textarea
                    value={desc}
                    onChange={(e)=> setDesc(e.target.value)}
                    rows={4}
                    placeholder="Example: Weekly meeting with team, document review, feature X implementation."
                    className="w-full rounded-xl border px-3 py-2 text-[14px]"
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setDesc('')}
                      className="rounded-xl border px-3 py-1.5 text-[13px]"
                    >
                      Clear
                    </button>
                    <button
                      onClick={saveDesc}
                      className="rounded-xl px-3 py-1.5 text-white text-[13px] font-semibold shadow-md"
                      style={{ background: '#16A34A' }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </BottomSheet>
        </>
      )}
    </div>
  )
}