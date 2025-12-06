'use client'
import { RoleSwitcher } from '@/components/RoleSwitcher'
// app/(employee)/employee/dashboard/page.tsx
import { useAuth } from '@/lib/state/auth'
import { useAttendance } from '@/lib/state/attendance'
import { useMemo, useEffect, useState, useRef } from 'react'
import CheckInSheet from '@/components/CheckInSheet'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import Link from 'next/link'
import { CalendarDays, Clock, TrendingUp, Zap, Info, Check, Files } from 'lucide-react'
import { toast } from 'sonner'
import { BottomSheet } from '@/components/ui/bottomSheet'
import { useRouter } from 'next/navigation'
import { anvilLocal } from '@/lib/web3/wagmiConfig'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

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

function formatDateLongID(d: Date) { return format(d, 'EEEE, d MMMM yyyy', { locale: idLocale }) }
// function formatDateShortID(d: Date) { return format(d, 'EEE, dd/MM/yyyy', { locale: idLocale }) }
function timeHHmm(d?: Date) { return d ? format(d, 'HH:mm', { locale: idLocale }) : '--:--' }

export default function Page() {
  const user = useAuth(s => s.user)
  const att = useAttendance(s => (user ? s.forUser(user.id) : []))
  const now = useLiveClock()
  const [showCheckIn, setShowCheckIn] = useState(false)

  const firstName = user?.name?.split(' ')[0] ?? 'Employee'
  const initial = firstName.charAt(0).toUpperCase()
  const walletAddress = user?.address
  const walletDisplay = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '—'
  const [formattedCutiBalance, setFormattedCutiBalance] = useState<string>('—')
  const [tokenSymbol, setTokenSymbol] = useState<string>('CUTI')
  const lastBalanceErrorMessage = useRef<string | null>(null)

  useEffect(() => {
    if (!walletAddress) {
      setFormattedCutiBalance('—')
      setTokenSymbol('CUTI')
      return
    }
    const controller = new AbortController()
    setFormattedCutiBalance('…')

    const url = new URL('/wallet/balance', API_BASE)
    url.searchParams.set('address', walletAddress)

    fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorPayload = await res.json().catch(() => undefined)
          const message = errorPayload?.error ?? res.statusText ?? 'Failed to fetch balance'
          throw new Error(message)
        }
        return res.json() as Promise<{
          formatted: string
          decimals: number
          symbol: string
        }>
      })
      .then((data) => {
        const numeric = Number.parseFloat(data.formatted)
        const display = Number.isNaN(numeric)
          ? data.formatted
          : new Intl.NumberFormat('en-US', {
            maximumFractionDigits: numeric < 1 ? 6 : 2,
          }).format(numeric)
        setFormattedCutiBalance(display)
        setTokenSymbol(data.symbol)
        lastBalanceErrorMessage.current = null
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        const message = error instanceof Error ? error.message : 'Gagal memuat saldo CUTI'
        console.error('[wallet balance]', message)
        if (lastBalanceErrorMessage.current !== message) {
          lastBalanceErrorMessage.current = message
          toast.error('Gagal memuat saldo CUTI')
        }
        setFormattedCutiBalance('—')
      })

    return () => controller.abort()
  }, [walletAddress])

  const tokenTiles = useMemo(() => [{
    label: tokenSymbol || 'CUTI',
    value: formattedCutiBalance,
    color: 'var(--B-500)',
  }], [tokenSymbol, formattedCutiBalance])

  function dayISO(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.toISOString() }
  const descKey = (userId: string, iso: string) => `desc:${userId}:${iso}`

  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [desc, setDesc] = useState('')
  const [copied, setCopied] = useState(false)
  const department = user?.department ?? '—'

  async function handleCopyWallet() {
    if (!walletAddress) return
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      toast.error('Clipboard tidak tersedia')
      return
    }
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success('Alamat wallet disalin')
    } catch {
      toast.error('Gagal menyalin wallet')
    }
  }


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

  // Total attendance this month (count days with at least one record)
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
          Loading employee data…
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
          Welcome, {firstName}!
        </h1>
        <div className="flex items-center gap-3">
        </div>

        <RoleSwitcher
          storageKey={`role:${user.id}`}
          onChange={(next) => {
            toast.success(`Role changed to ${next}`)
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
            <p className="text-xs uppercase tracking-wide">Department</p>
            <p className="font-semibold">{department}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide">Wallet</p>
            <div
              className={`flex items-center gap-2 ${walletAddress ? 'cursor-pointer' : 'cursor-default opacity-70'}`}
              onClick={handleCopyWallet}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Files className="w-4 h-4 hover:text-gray-700" />
              )}
              <p className="font-medium">{walletDisplay}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {tokenTiles.map((tile) => (
            <TokenTile
              key={tile.label}
              label={tile.label}
              value={tile.value}
              color={tile.color}
            />
          ))}
        </div>
        {/* Here is my button */}
        <button
          onClick={() => setShowCheckIn(true)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-white/95"
        >
          <Clock className="size-4" />
          {ctaLabel}
        </button>
      </section>

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-gray-500"><TrendingUp className="size-5" /> <span>Total Attendance</span></div>
            <div className="text-2xl font-bold" style={{ color: 'var(--S-800)' }}>{totalMonth}</div>
          </div>
          <div className="text-xs text-gray-500 mt-1">This month</div>
        </div>
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-gray-500"><Zap className="size-5" /> <span>Status</span></div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${today.working ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{today.working ? 'Online' : 'Offline'}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Working</div>
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
          employeeId={user.id}
          mode={isWorking ? 'out' : 'in'}
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
            toast.success(`${ctaLabel} successful`)
          }}
        />
      </section>

      <div className="mt-6 mb-4 ml-3">
        <h2 className="text-lg font-semibold">Attendance this week</h2>
      </div>
      <section className="max-h-[420px] overflow-auto">
        <div className="rounded-2xl bg-white shadow-md border">
          {days.map(({ date, checkIn, checkOut }, idx) => {
            const present = !!checkIn;
            const statusText = present ? 'Present' : 'Absent';
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
                        <span className="font-medium">In:</span> {timeHHmm(checkIn)}
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Out:</span> {timeHHmm(checkOut)}
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
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${present
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                      {statusText}
                    </span>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => openDaySheet(date)}
                      title="Add / Edit description"
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
              <h3 className="font-semibold mb-2 text-[15px]">Today's Description</h3>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={4}
                placeholder="Example: Weekly meeting, document review, feature X implementation."
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
    </div>
  )
}

function TokenTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  const displayValue = typeof value === 'number' ? value.toString() : value
  return (
    <div className="rounded-xl bg-white/10 p-4 border border-white/20 backdrop-blur">
      <div
        className="w-12 h-12 grid place-items-center rounded-full text-xs font-semibold sm:text-xl"
        style={{ color, background: 'white' }}
        title={displayValue}
      >
        {displayValue}
      </div>
      <div className="mt-3 font-semibold">{label}</div>
    </div>
  )
}
