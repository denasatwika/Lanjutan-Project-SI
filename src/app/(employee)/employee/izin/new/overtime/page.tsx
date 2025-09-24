'use client'

import React, { useMemo, useRef, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import { Calendar as CalendarIcon, Clock, ChevronDown } from 'lucide-react'

/* ------------------------------------------
   Helpers: date <-> string
------------------------------------------ */
function toISODate(d?: Date) {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function fromISODate(s?: string) {
  if (!s) return undefined
  const d = new Date(s)
  return isNaN(d.getTime()) ? undefined : d
}

/* ------------------------------------------
   Headless Popover for DatePicker
------------------------------------------ */
function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return ref
}
function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  align = 'start',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'start' | 'end'
}) {
  const ref = useOutsideClose(() => onOpenChange(false))
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-50 mt-2 min-w-[260px] rounded-2xl border bg-white p-2 shadow-lg ${
            align === 'end' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------
   DatePicker (Popover + DayPicker)
------------------------------------------ */
function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = fromISODate(value)

  return (
    <div className="grid gap-1.5">
      <span className="text-sm text-gray-700">{label}</span>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger={
          <button
            type="button"
            className="w-full rounded-xl border px-3 py-3 text-left shadow-sm flex items-center justify-between focus-visible:ring-2 focus-visible:ring-offset-0"
            style={{ borderColor: '#00156B20', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}
          >
            <span className="inline-flex items-center gap-2">
              <CalendarIcon className="size-4 opacity-70" />
              {selected ? (
                <span>{format(selected, 'd MMMM yyyy', { locale: idLocale })}</span>
              ) : (
                <span className="text-gray-400">Pilih tanggal</span>
              )}
            </span>
            <ChevronDown className="size-4 opacity-70" />
          </button>
        }
      >
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(d) => {
            onChange(d ? toISODate(d) : '')
            setOpen(false)
          }}
          locale={idLocale}
          classNames={{
            caption: 'px-2 py-2 text-center font-medium',
            nav: 'flex items-center justify-between px-2',
            button_previous: 'px-2 py-1 rounded-lg hover:bg-gray-100',
            button_next: 'px-2 py-1 rounded-lg hover:bg-gray-100',
            month: 'p-2',
            table: 'w-full border-collapse',
            head_cell: 'text-gray-500 text-xs font-medium pb-1',
            row: '',
            cell: 'p-1',
            day: 'w-9 h-9 rounded-lg hover:bg-gray-100',
            day_selected: 'bg-[#00156B] text-white hover:bg-[#00156B] hover:text-white',
            day_today: 'border border-[#00156B33]',
            day_outside: 'text-gray-300',
          }}
        />
      </Popover>
    </div>
  )
}

/* ------------------------------------------
   Time helpers
------------------------------------------ */
const DEFAULT_STEP_MINUTES = 15
function parseTimeHHMM(v: string | undefined) {
  if (!v) return { h: 0, m: 0, ok: false }
  const [hs, ms] = v.split(':')
  const h = Math.max(0, Math.min(23, Number(hs)))
  const m = Math.max(0, Math.min(59, Number(ms)))
  const ok = !Number.isNaN(h) && !Number.isNaN(m)
  return { h, m, ok }
}
function fmtHHMM(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
function clampToStep(m: number, step = DEFAULT_STEP_MINUTES) {
  return Math.round(m / step) * step
}

/* ------------------------------------------
   TimePicker - Mobile Bottom Sheet
------------------------------------------ */
function TimePicker({
  label,
  value,
  onChange,
  placeholder = 'Pilih jam (HH:MM)',
  step = DEFAULT_STEP_MINUTES,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  step?: number
}) {
  const [open, setOpen] = useState(false)

  // local (uncommitted) selection
  const { h: initH, m: initM, ok } = parseTimeHHMM(value)
  const [hour, setHour] = useState<number>(ok ? initH : 9)
  const [minute, setMinute] = useState<number>(ok ? initM : 0)

  React.useEffect(() => {
    const { h, m, ok } = parseTimeHHMM(value)
    if (open && ok) {
      setHour(h)
      setMinute(m)
    }
  }, [value, open])

  const hours = React.useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])
  const minutes = React.useMemo(
    () => Array.from({ length: Math.ceil(60 / step) }, (_, i) => (i * step) % 60),
    [step]
  )

  function commitAndClose(h = hour, m = minute) {
    onChange(fmtHHMM(h, m))
    setOpen(false)
  }
  function clear() {
    onChange('')
    setOpen(false)
  }
  function setNow() {
    const d = new Date()
    const h = d.getHours()
    const m = clampToStep(d.getMinutes(), step) % 60
    setHour(h); setMinute(m); commitAndClose(h, m)
  }
  function plus30() {
    const base = parseTimeHHMM(value).ok ? parseTimeHHMM(value) : { h: hour, m: minute, ok: true }
    const total = base.h * 60 + base.m + 30
    const h = Math.floor((total % (24 * 60) + (24 * 60)) % (24 * 60) / 60)
    const m = (total % 60 + 60) % 60
    setHour(h); setMinute(m); commitAndClose(h, m)
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border px-3 py-3 text-left shadow-sm flex items-center justify-between focus-visible:ring-2 focus-visible:ring-offset-0"
        style={{ borderColor: '#00156B20', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}
      >
        <span className="inline-flex items-center gap-2">
          <Clock className="size-4 opacity-70" />
          {value ? <span>{value}</span> : <span className="text-gray-400">{placeholder}</span>}
        </span>
        <ChevronDown className="size-4 opacity-70" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          {/* overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          {/* sheet */}
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white shadow-2xl">
            {/* grabber */}
            <div className="py-2 grid place-items-center">
              <div className="h-1.5 w-10 rounded-full bg-gray-300" />
            </div>

            <div className="px-4 pb-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-base">Pilih Jam</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clear}
                    className="text-sm text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-100"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => commitAndClose()}
                    className="text-white text-sm px-4 py-2 rounded-xl"
                    style={{ background: '#00156B' }}
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* quick chips */}
              <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={setNow}
                  className="px-3 py-2 rounded-full border text-sm whitespace-nowrap"
                  style={{ borderColor: '#00156B33' }}
                >
                  Now
                </button>
                <button
                  type="button"
                  onClick={plus30}
                  className="px-3 py-2 rounded-full border text-sm whitespace-nowrap"
                  style={{ borderColor: '#00156B33' }}
                >
                  +30m
                </button>
                {['18:00', '19:00', '20:00', '21:00'].map((t) => {
                  const { h, m } = parseTimeHHMM(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => commitAndClose(h, m)}
                      className="px-3 py-2 rounded-full border text-sm whitespace-nowrap"
                      style={{ borderColor: '#00156B33' }}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>

              {/* wheels */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                {/* Hours */}
                <div>
                  <div className="text-xs text-gray-500 mb-2">Jam</div>
                  <div
                    className="max-h-[240px] overflow-y-auto rounded-xl border p-1 scroll-smooth snap-y snap-mandatory"
                    style={{ borderColor: '#00156B20' }}
                  >
                    <ul>
                      {hours.map((h) => (
                        <li key={h} className="snap-start">
                          <button
                            type="button"
                            onClick={() => setHour(h)}
                            className={`w-full px-3 py-3 rounded-lg text-left text-base ${
                              h === hour ? 'bg-[#00156B] text-white font-medium' : 'hover:bg-gray-100'
                            }`}
                          >
                            {String(h).padStart(2, '0')}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Minutes */}
                <div>
                  <div className="text-xs text-gray-500 mb-2">Menit</div>
                  <div
                    className="max-h-[240px] overflow-y-auto rounded-xl border p-1 scroll-smooth snap-y snap-mandatory"
                    style={{ borderColor: '#00156B20' }}
                  >
                    <ul>
                      {minutes.map((m) => (
                        <li key={m} className="snap-start">
                          <button
                            type="button"
                            onClick={() => setMinute(m)}
                            className={`w-full px-3 py-3 rounded-lg text-left text-base ${
                              m === minute ? 'bg-[#00156B] text-white font-medium' : 'hover:bg-gray-100'
                            }`}
                          >
                            {String(m).padStart(2, '0')}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* live preview */}
              <div className="mt-4 text-center text-sm text-gray-600">
                Terpilih: <span className="font-semibold text-gray-800">{fmtHHMM(hour, minute)}</span>
              </div>

              {/* big confirm */}
              <button
                type="button"
                onClick={() => commitAndClose()}
                className="mt-4 mb-3 w-full rounded-xl py-3 text-white font-semibold shadow-sm"
                style={{ background: '#00156B' }}
              >
                Gunakan Waktu Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------
   PAGE: Pengajuan Lembur
------------------------------------------ */
export default function Page() {
  const [form, setForm] = useState<{
    tanggal: string
    mulai: string
    selesai: string
    alasan: string
    lampiran: File | null
  }>({
    tanggal: '',
    mulai: '',
    selesai: '',
    alasan: '',
    lampiran: null,
  })

  const fileRef = useRef<HTMLInputElement | null>(null)

  // Durasi otomatis (dukung lewat tengah malam)
  const durasiJam = useMemo(() => {
    const { tanggal, mulai, selesai } = form
    if (!tanggal || !mulai || !selesai) return 0
    const s = new Date(`${tanggal}T${mulai}:00`)
    let e = new Date(`${tanggal}T${selesai}:00`)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0
    if (e.getTime() < s.getTime()) e = new Date(e.getTime() + 86400000) // +1 hari
    const h = (e.getTime() - s.getTime()) / 3.6e6
    return Math.round(h * 100) / 100
  }, [form.tanggal, form.mulai, form.selesai])

  const durasiLabel = useMemo(() => {
    const totalMin = Math.round(durasiJam * 60)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    if (!h && !m) return '0 jam'
    if (!m) return `${h} jam`
    if (!h) return `${m} menit`
    return `${h} jam ${m} menit`
  }, [durasiJam])

  const valid =
    !!form.tanggal &&
    !!form.mulai &&
    !!form.selesai &&
    form.alasan.trim().length > 0 &&
    durasiJam > 0 &&
    durasiJam <= 24

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setForm((s) => ({ ...s, lampiran: f }))
  }
  function clearFile() {
    setForm((s) => ({ ...s, lampiran: null }))
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit() {
    if (!valid) return
    try {
      const fd = new FormData()
      fd.append('tanggal', form.tanggal)
      fd.append('jamMulai', form.mulai)
      fd.append('jamSelesai', form.selesai)
      fd.append('durasiJam', String(durasiJam))
      fd.append('alasan', form.alasan)
      if (form.lampiran) fd.append('lampiran', form.lampiran)
      // await fetch('/api/lembur', { method: 'POST', body: fd })

      toast.success('Pengajuan lembur terkirim')
      setForm({ tanggal: '', mulai: '', selesai: '', alasan: '', lampiran: null })
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      toast.error('Gagal mengajukan lembur')
    }
  }

  const isImg = form.lampiran?.type.startsWith('image/')
  const previewUrl = form.lampiran && isImg ? URL.createObjectURL(form.lampiran) : null

  return (
    <div className="pb-24">
      <PageHeader
        title="Pengajuan Lembur"
        backHref="/employee/dashboard"
        fullBleed
        bleedMobileOnly
        pullUpPx={24}
      />

      {/* CONTENT */}
      <div className="mx-auto max-w-screen-sm px-4 mt-3 md:max-w-2xl">
        <div className="rounded-2xl bg-white shadow-md border p-4">
          <div className="grid gap-4 text-[15px]">
            {/* Tanggal */}
            <DatePicker
              label="Tanggal lembur"
              value={form.tanggal}
              onChange={(v) => setForm((s) => ({ ...s, tanggal: v }))}
            />

            {/* Jam mulai & selesai */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TimePicker
                label="Jam mulai"
                value={form.mulai}
                onChange={(v) => setForm((s) => ({ ...s, mulai: v }))}
              />
              <TimePicker
                label="Jam selesai"
                value={form.selesai}
                onChange={(v) => setForm((s) => ({ ...s, selesai: v }))}
              />
            </div>

            {/* Durasi otomatis */}
            <div
              className="rounded-xl border px-3 py-2 text-gray-600"
              style={{ borderColor: '#00156B20' }}
            >
              Total durasi:{' '}
              <span className="font-semibold text-gray-800">{durasiJam.toFixed(2)} jam</span>
              <div className="text-xs text-gray-500">{durasiLabel}</div>
            </div>

            {/* Alasan */}
            <label className="block">
              <span className="text-sm text-gray-700">Alasan lembur</span>
              <textarea
                rows={5}
                value={form.alasan}
                onChange={(e) => setForm((s) => ({ ...s, alasan: e.target.value }))}
                className="w-full mt-1 rounded-xl border px-3 py-3 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-0"
                style={{ borderColor: '#00156B20', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}
                placeholder="Contoh: penyelesaian fitur, perbaikan bug produksi, dsb."
              />
            </label>

            {/* Lampiran */}
            <div>
              <span className="text-sm text-gray-700">Dokumen bukti</span>
              <div className="mt-1 flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={onPickFile}
                  className="rounded-xl border px-3 py-2 shadow-sm text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:bg-[#00156B] file:text-white focus-visible:ring-2 focus-visible:ring-offset-0"
                  style={{ borderColor: '#00156B20' }}
                />
                {form.lampiran && (
                  <button
                    type="button"
                    onClick={clearFile}
                    className="rounded-xl border px-3 py-2 text-sm shadow-sm"
                    style={{ borderColor: '#00156B20' }}
                  >
                    Hapus
                  </button>
                )}
              </div>
              {form.lampiran && (
                <div className="mt-3">
                  {isImg ? (
                    <img src={previewUrl || ''} alt="Preview" className="max-h-40 rounded-xl border" />
                  ) : (
                    <div className="text-sm text-gray-600">
                      {form.lampiran.name} ({Math.round((form.lampiran.size || 0) / 1024)} KB)
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={submit}
              disabled={!valid}
              className="w-full inline-flex items-center justify-center rounded-xl px-4 py-3 text-white font-semibold shadow-md disabled:opacity-60"
              style={{ background: '#16A34A' }}
            >
              Ajukan Lembur
            </button>
          </div>
        </div>
      </div>

      {/* spacer supaya konten tidak ketutup bar di mobile */}
      <div className="h-24 md:hidden" />
    </div>
  )
}
