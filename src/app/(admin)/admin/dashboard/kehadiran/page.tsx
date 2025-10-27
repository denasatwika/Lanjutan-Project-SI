'use client'
import { useEffect, useState } from 'react'
import { id as idLocale } from 'date-fns/locale/id'
import { format } from 'date-fns'
import { FileClock, Clock3, CalendarDays, PlusCircle, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { ReactNode } from 'react'
import { useAccount, useSendTransaction } from 'wagmi'
import { parseEther } from 'viem'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmployeeWallet, getWallets } from '@/lib/api/wallets'

function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  return now
}

// Mock data for early validation (front-end only)
const MOCK_TODAY = [
  { name: 'Alex Smith', time: '08:49', activity: 'Check-In' },
  { name: 'Johnny Yes', time: '08:45', activity: 'Check-In' },
  { name: 'Kenny No', time: '08:43', activity: 'Check-In' },
  { name: 'Chandra liak', time: '08:42', activity: 'Check-In' },
  { name: 'Glent arnold', time: '08:40', activity: 'Check-In' },
]

const MOCK_ABSENT = [
  { name: 'Alex Smith', reason: 'Izin' },
  { name: 'Johnny Yes', reason: '-' },
  { name: 'Kenny No', reason: '-' },
  { name: 'Chandra liak', reason: '-' },
]

const MOCK_WEEK = [
  { label: 'Sen', present: 26, absent: 4 },
  { label: 'Sel', present: 24, absent: 2 },
  { label: 'Rab', present: 25, absent: 3 },
  { label: 'Kam', present: 27, absent: 1 },
  { label: 'Jum', present: 28, absent: 0 },
]

const APPROVAL_PATH = '/admin/approval'

function formatWalletLabel(wallet: EmployeeWallet) {
  const alias = wallet.nickname?.trim()
  const shortAddress = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
  return alias ? `${alias} • ${shortAddress}` : shortAddress
}

export default function HRDashboard() {
  const now = useNow()
  const present = 26; const absent = 4; const total = present + absent
  const percent = Math.round((present / total) * 100)
  const { isConnected } = useAccount()
  const { sendTransactionAsync, isPending } = useSendTransaction()
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [wallets, setWallets] = useState<EmployeeWallet[]>([])
  const [walletsLoading, setWalletsLoading] = useState(true)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [selectedWalletId, setSelectedWalletId] = useState<string>('')

  useEffect(() => {
    const controller = new AbortController()
    setWalletsLoading(true)

    getWallets({ signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setWallets(data)
        setWalletError(null)
        setSelectedWalletId((prev) => {
          if (prev && data.some((wallet) => wallet.id === prev)) {
            return prev
          }
          return data[0]?.id ?? ''
        })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        console.error('[wallets] load error', error)
        const message = error instanceof Error ? error.message : 'Tidak dapat memuat daftar wallet'
        setWalletError(message)
        toast.error('Gagal memuat daftar wallet')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setWalletsLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  async function handleSubmit() {
    if (!isConnected) {
      toast.error('Hubungkan wallet HR terlebih dahulu')
      return
    }

    const targetWallet = wallets.find((wallet) => wallet.id === selectedWalletId)
    if (!targetWallet) {
      toast.error('Pilih wallet tujuan terlebih dahulu')
      return
    }

    const trimmedRecipient = targetWallet.address.trim()
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedRecipient)) {
      toast.error('Alamat wallet tidak valid')
      return
    }

    const normalizedAmount = amount.trim()
    if (!normalizedAmount) {
      toast.error('Isi jumlah token yang ingin dikirim')
      return
    }

    let value: bigint
    try {
      value = parseEther(normalizedAmount)
    } catch {
      toast.error('Jumlah token tidak valid')
      return
    }

    try {
      const tx = await sendTransactionAsync({
        to: trimmedRecipient as `0x${string}`,
        value,
      })
      toast.success(`Transaksi dikirim (${tx})`)
      setAmount('')
      setShowTransferForm(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transaksi gagal'
      toast.error(message)
    }
  }

  return (
    <div className="space-y-4">
      {/* 12-col canvas */}
      <div className="grid grid-cols-12 gap-4">
        {/* LEFT HALF (xl: 8/12) — stats + chart */}
        <div className="col-span-12 xl:col-span-8 space-y-4">
          {/* Top stat cards (2x2) — only half screen on xl */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <StatCard
              title="Permintaan Izin"
              icon={<FileClock className="text-amber-500" />}
              value={9}
              subtitle="Menunggu Persetujuan anda"
              href={`${APPROVAL_PATH}?type=leave&tab=mine`}  // <-- Izin/Cuti
            />

            <StatCard
              title="Permintaan Lembur"
              icon={<Clock3 className="text-green-600" />}
              value={12}
              subtitle="Menunggu Persetujuan anda"
              href={`${APPROVAL_PATH}?type=overtime&tab=mine`} // <-- Lembur
            />

            <StatCard
              title="Permintaan Cuti"
              icon={<CalendarDays className="text-[var(--B-600)]" />}
              value={3}
              subtitle="Menunggu Persetujuan anda"
              href={`${APPROVAL_PATH}?type=leave&tab=mine`}
            />

            <StatCard
              title="Sakit"
              icon={<PlusCircle className="text-rose-500" />}
              value={1}
              subtitle="Menunggu Persetujuan anda"
              href={`${APPROVAL_PATH}?type=leave&tab=mine`}
            />
          </div>

          {/* Big chart below the stats */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Kehadiran Minggu Ini</h3>
              <TrendingUp className="text-green-600" />
            </div>
            <BarChart data={MOCK_WEEK} />
          </div>
        </div>

        {/* RIGHT RAIL (xl: 4/12) — date card on TOP, then other widgets */}
        <div className="col-span-12 xl:col-span-4 space-y-4">
          {/* Date (Blue) — pinned to top-right */}
          <div className="rounded-2xl p-4 text-white" style={{ background: 'var(--B-900)' }}>
            <div className="text-sm opacity-90">
              {format(now, 'EEEE, d MMMM yyyy', { locale: idLocale })}
            </div>
            <div className="text-2xl font-extrabold mt-1">{format(now, 'HH:mm:ss')}</div>
          </div>

          {/* Hari Ini donut */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold">Hari Ini</h4>
              <div className="size-9 rounded-full bg-gray-100 grid place-items-center">
                <div className="size-6 rounded-full bg-gray-300" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Donut
                percent={percent}                 // e.g., 87
                size={128}
                thickness={18}
                presentColor="#00156B"            // Navy
                absentColor="#C1121F"             // Red
                labelTop={`${percent}%`}
                labelBottom="Hadir"
              />
              <div className="space-y-2 self-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00156B] text-white text-sm font-semibold shadow-sm">
                  Hadir: {present}
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C1121F] text-white text-sm font-semibold shadow-sm">
                  Absen: {absent}
                </div>
              </div>
            </div>
          </div>

          {/* Transfer KPGT form */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowTransferForm((prev) => !prev)}
              disabled={!isConnected}
              className="w-full rounded-xl bg-[var(--B-900)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-300 ease-in-out hover:scale-105 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Transfer KPGT
            </button>
            {!isConnected && (
              <p className="text-center text-sm text-gray-500">
                Hubungkan wallet untuk mengirim token
              </p>
            )}

            {showTransferForm && (
              <div className="card space-y-4 p-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Alamat Wallet Karyawan
                  </label>
                  <Select
                    value={selectedWalletId}
                    onValueChange={setSelectedWalletId}
                    disabled={walletsLoading || wallets.length === 0}
                  >
                    <SelectTrigger className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--B-600)] focus:outline-none focus:ring-2 focus:ring-[var(--B-200)]">
                      <SelectValue placeholder={walletsLoading ? 'Memuat daftar wallet...' : 'Pilih wallet karyawan'} />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          {formatWalletLabel(wallet)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!walletsLoading && wallets.length === 0 && !walletError && (
                    <p className="mt-2 text-sm text-gray-500">Belum ada wallet karyawan yang tersedia.</p>
                  )}
                  {walletError && (
                    <p className="mt-2 text-sm text-red-500">{walletError}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Jumlah Token (KPGT)
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Contoh: 1.5"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--B-600)] focus:outline-none focus:ring-2 focus:ring-[var(--B-200)]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTransferForm(false)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending || walletsLoading || !selectedWalletId}
                    className="rounded-xl bg-[var(--B-900)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-300 ease-in-out hover:scale-105 disabled:cursor-progress disabled:opacity-80"
                  >
                    {isPending ? 'Mengirim...' : 'Kirim Token'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Kehadiran Hari ini table */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <h4 className="font-bold">Kehadiran Hari ini</h4>
              <div className="size-7 rounded-md bg-[var(--B-50)] grid place-items-center text-[var(--B-700)]">≡</div>
            </div>
            <Table head={['Nama', 'Jam', 'Kegiatan']} rows={MOCK_TODAY.map(r => [r.name, r.time, r.activity])} />
          </div>

          {/* Absen table */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <h4 className="font-bold">Absen</h4>
              <div className="size-7 rounded-full bg-rose-100 grid place-items-center text-rose-600">×</div>
            </div>
            <Table head={['Nama', 'Alasan']} rows={MOCK_ABSENT.map(r => [r.name, r.reason])} />
          </div>
        </div>
      </div>
    </div>
  )
}

type Props = {
  title: string
  icon: ReactNode
  value: number
  subtitle: string
  /** Optional link target (e.g. "/admin/approval?type=leave&tab=mine") */
  href?: string
}

function StatCard({ title, icon, value, subtitle, href }: Props) {
  const Card = (
    <div className="card p-4 hover:shadow-lg transition-shadow cursor-pointer">
      <div className="flex items-center justify-between">
        <h4 className="font-bold">{title}</h4>
        <div className="size-8 grid place-items-center rounded-full bg-gray-50">{icon}</div>
      </div>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>
      <div className="text-sm text-gray-500">{subtitle}</div>
    </div>
  )

  return href ? <Link href={href} className="block">{Card}</Link> : Card
}

function Donut({
  percent,
  size = 120,
  thickness = 16,
  presentColor = '#00156B',
  absentColor = '#C1121F',
  labelTop,
  labelBottom,
}: {
  percent: number
  size?: number
  thickness?: number
  presentColor?: string
  absentColor?: string
  labelTop?: string
  labelBottom?: string
}) {
  const clamped = Math.max(0, Math.min(100, percent))
  const absentPct = 100 - clamped

  const r = (size - thickness) / 2
  const c = size / 2
  const circumference = 2 * Math.PI * r
  const absentLen = (absentPct / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`Hadir ${clamped}%`}>
        {/* Base (present) ring */}
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={presentColor}
          strokeWidth={thickness}
          strokeLinecap="butt"
        />
        {/* Absent wedge drawn over the base */}
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={absentColor}
          strokeWidth={thickness}
          strokeLinecap="butt"
          strokeDasharray={`${absentLen} ${circumference}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${c} ${c})`} // start at 12 o'clock
        />
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-tight">
          {labelTop && <div className="text-lg font-extrabold">{labelTop}</div>}
          {labelBottom && <div className="text-xs font-semibold text-gray-900">{labelBottom}</div>}
        </div>
      </div>
    </div>
  )
}


function BarChart({
  data,
  height = 450,
  barWidth = 72,
  gap = 38,
  // force navy with a fallback in case the CSS var isn't set
  presentColor = 'var(--B-800, #00156B)',
  absentColor = '#C1121F',
  showLegend = true,
  absentAtBottom = false, // set true if you want red at the bottom
}: {
  data: { label: string; present: number; absent: number }[]
  height?: number
  barWidth?: number
  gap?: number
  presentColor?: string
  absentColor?: string
  showLegend?: boolean
  absentAtBottom?: boolean
}) {
  const padLeft = 36
  const padRight = 20
  const padTop = 10
  const padBottom = 40

  const n = data.length
  const vbWidth = padLeft + padRight + n * barWidth + (n - 1) * gap
  const vbHeight = height
  const chartBottom = vbHeight - padBottom
  const chartTop = padTop
  const chartHeight = chartBottom - chartTop

  const maxTotal = Math.max(1, ...data.map(d => d.present + d.absent))
  const toH = (v: number) => (v / maxTotal) * chartHeight

  // grid lines
  const ticks = 4
  const gridYs = Array.from({ length: ticks + 1 }, (_, i) => chartBottom - (i / ticks) * chartHeight)
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => Math.round((i / ticks) * maxTotal))

  return (
    <div className="w-full overflow-x-auto">
      {showLegend && (
        <div className="flex items-center gap-4 text-sm mb-2">
          <span className="inline-flex items-center gap-2">
            <i className="inline-block w-3 h-3 rounded-sm" style={{ background: presentColor }} /> Hadir
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${vbWidth} ${vbHeight}`}
        width="100%"
        height={height}
        role="img"
        aria-label="Kehadiran Minggu Ini"
      >
        {/* grid */}
        {gridYs.map((y, i) => (
          <g key={`g-${i}`}>
            <line x1={padLeft} x2={vbWidth - padRight} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={padLeft - 8} y={y} textAnchor="end" dominantBaseline="central" fontSize="10" fill="#9ca3af">
              {gridVals[i]}
            </text>
          </g>
        ))}

        {/* bars */}
        {data.map((d, i) => {
          const x = padLeft + i * (barWidth + gap)
          const hPresent = toH(d.present)
          const hAbsent = toH(d.absent)
          const baseY = chartBottom

          // choose stacking order
          const parts = absentAtBottom
            ? [
              { h: hAbsent, fill: absentColor },
            ]
            : [
              { h: hPresent, fill: presentColor },
            ]

          let yCursor = baseY
          return (
            <g key={d.label}>
              {parts.map((p, idx) => {
                const y = yCursor - p.h
                yCursor = y
                return (
                  <rect
                    key={idx}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={p.h}
                    fill={p.fill}
                    rx={6}
                    // ensure no black stroke/border
                    stroke="none"
                  />
                )
              })}

              {/* tooltip */}
              <title>
                {d.label}
                {`\nHadir: ${d.present}`}
                {`\nAbsen: ${d.absent}`}
                {`\nTotal: ${d.present + d.absent}`}
              </title>

              {/* day label */}
              <text x={x + barWidth / 2} y={baseY + 18} fontSize="11" textAnchor="middle" fill="#111827">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[var(--B-50)] text-[var(--B-900)]">
          <tr>
            {head.map((h, i) => (
              <th key={i} className={"px-4 py-2 text-left " + (i === head.length - 1 ? 'text-right' : '')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t">
              {r.map((c, i) => (
                <td key={i} className={"px-4 py-2 " + (i === head.length - 1 ? 'text-right' : '')}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
