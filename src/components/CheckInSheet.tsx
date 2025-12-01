'use client'

import { useEffect, useState } from 'react'
import { BottomSheet } from '@/components/ui/bottomSheet'
import { CameraCapture } from '@/components/CameraCapture'
import { Camera, RotateCw } from 'lucide-react'
import * as attendanceApi from '@/lib/api/attendance'

type Mode = 'in' | 'out'

type Props = {
  open: boolean
  onClose: () => void
  employeeId: string
  /** Called after a successful upload so you can write to your store */
  onStored?: (payload: { filename?: string; url?: string }) => void
  mode?: Mode // default: 'in'
}

function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export default function CheckInSheet({ open, onClose, employeeId, onStored, mode = 'in' }: Props) {
  const now = useNow()
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  async function submit() {
    if (!preview) return
    setBusy(true)
    try {
      // Call the backend attendance API
      if (mode === 'in') {
        const result = await attendanceApi.checkIn(employeeId, preview)
        console.log('[CheckInSheet] Check-in result:', result)
        setStatus('Check-in berhasil')
        onStored?.({ url: result.checkInPhoto || undefined })
      } else {
        const result = await attendanceApi.checkOut(employeeId, preview)
        console.log('[CheckInSheet] Check-out result:', result)
        setStatus('Check-out berhasil')
        onStored?.({ url: result.checkOutPhoto || undefined })
      }
      onClose()
    } catch (error) {
      console.error('[CheckInSheet] Error:', error)
      const message = error instanceof Error ? error.message : 'Gagal menyimpan'
      setStatus(message)
    } finally {
      setBusy(false)
    }
  }

  // reset state whenever the sheet re-opens
  useEffect(() => {
    if (open) { setPreview(null); setStatus(null); setBusy(false) }
  }, [open])

  return (
    <BottomSheet open={open} onClose={onClose} className="max-h-[90dvh]">
      {/* Date pill */}
      <div className="mx-auto w-max rounded-2xl px-4 py-2 text-center text-white shadow-md" style={{ background: 'var(--B-900)' }}>
        <div className="text-md font-semibold">
          {now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div className="text-xl font-extrabold -mt-0.5">{now.toLocaleTimeString('id-ID', { hour12: false })}</div>
      </div>

      {/* Camera */}
      <div className="mt-4">
        {!preview ? (
          <div className="rounded-2xl border-2 p-3" style={{ borderColor: 'var(--B-900)' }}>
            <CameraCapture onCapture={setPreview} />
          </div>
        ) : (
          <div className="rounded-2xl border p-3">
            <img src={preview} alt="preview" className="w-full rounded-xl border border-slate-200" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setPreview(null)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium"
        >
          <RotateCw size={16} /> Ulangi
        </button>
        <button
          type="button"
          disabled={!preview || busy}
          onClick={submit}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-white font-semibold shadow-md disabled:opacity-60"
          style={{ background: '#16A34A' }}
        >
          <Camera size={16} /> {busy ? 'Menyimpan...' : (mode === 'in' ? 'Simpan Check-In' : 'Simpan Check-Out')}
        </button>
      </div>

      {status && <p className="mt-2 text-sm">{status}</p>}
    </BottomSheet>
  )
}
