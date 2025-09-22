'use client'

import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'

type Jenis = 'Cuti' | 'Sakit' | 'Lembur' | 'Lainnya'

/* --- Tiny headless Popover --- */
function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
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
  const desktopAlignClass = align === 'end' ? 'sm:right-0 sm:left-auto' : 'sm:left-0 sm:right-auto'
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-50 mt-2 left-1/2 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border bg-white p-2 shadow-lg sm:min-w-[260px] sm:w-auto sm:translate-x-0 ${desktopAlignClass}`}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/* --- Custom Select (headless) --- */
function SelectBox<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)?.label ?? 'Pilih'
  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}</span>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger={
          <button
            type="button"
            className="w-full mt-1 rounded-xl border px-3 py-3 text-left shadow-sm flex items-center justify-between"
            style={{ borderColor: '#00156B20', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}
          >
            <span>{selected}</span>
            <ChevronDown className="size-4 opacity-70" />
          </button>
        }
        align="start"
      >
        <ul role="listbox" className="max-h-[260px] overflow-auto py-1">
          {options.map(opt => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 ${opt.value === value ? 'bg-gray-50 font-medium' : ''}`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </Popover>
    </label>
  )
}

/* --- Date helpers & DatePicker --- */
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

function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  min?: string
  max?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = fromISODate(value)
  const minDate = fromISODate(min)
  const maxDate = fromISODate(max)

  return (
    <div className="grid gap-1.5">
      <span className="text-sm text-gray-700">{label}</span>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger={
          <button
            type="button"
            className="w-full rounded-xl border px-3 py-3 text-left shadow-sm flex items-center justify-between"
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
          fromDate={minDate}
          toDate={maxDate}
          className="rdp-root"
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

export default function Page() {
  const [form, setForm] = useState<{
    jenis: Jenis
    dari: string
    sampai: string
    alasan: string
    lampiran: File | null
  }>({
    jenis: 'Cuti',
    dari: '',
    sampai: '',
    alasan: '',
    lampiran: null,
  })

  const fileRef = useRef<HTMLInputElement | null>(null)

  const hari = useMemo(() => {
    if (!form.dari || !form.sampai) return 0
    const a = new Date(form.dari)
    const b = new Date(form.sampai)
    const diff = Math.ceil((b.getTime() - a.getTime()) / 86400000) + 1
    return isNaN(diff) || diff < 0 ? 0 : diff
  }, [form.dari, form.sampai])

  const valid =
    !!form.dari &&
    !!form.sampai &&
    new Date(form.dari) <= new Date(form.sampai) &&
    form.alasan.trim().length > 0

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setForm(s => ({ ...s, lampiran: f }))
  }
  function clearFile() {
    setForm(s => ({ ...s, lampiran: null }))
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit() {
    if (!valid) return
    try {
      const fd = new FormData()
      fd.append('jenis', form.jenis)
      fd.append('tanggalMulai', form.dari)
      fd.append('tanggalSelesai', form.sampai)
      fd.append('alasan', form.alasan)
      if (form.lampiran) fd.append('lampiran', form.lampiran)
      // await fetch('/api/izin', { method: 'POST', body: fd })
      toast.success('Pengajuan izin terkirim')
      setForm({ jenis: 'Cuti', dari: '', sampai: '', alasan: '', lampiran: null })
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      toast.error('Gagal mengajukan izin')
    }
  }

  const isImg = form.lampiran?.type.startsWith('image/')
  const previewUrl = form.lampiran && isImg ? URL.createObjectURL(form.lampiran) : null

  return (
    <div className="">
      <PageHeader title="Pengajuan Izin" backHref="/employee/dashboard" fullBleed bleedMobileOnly pullUpPx={24} />

      <div className="mx-auto max-w-screen-sm px-4 mt-3 md:max-w-2xl">
        <div className="rounded-2xl bg-white shadow-md border p-4">
          <div className="grid gap-4 text-[15px]">
            <SelectBox<Jenis>
              label="Jenis izin"
              value={form.jenis}
              onChange={(v) => setForm(s => ({ ...s, jenis: v }))}
              options={[
                { value: 'Cuti', label: 'Cuti' },
                { value: 'Sakit', label: 'Sakit' },
                { value: 'Lembur', label: 'Lembur' },
                { value: 'Lainnya', label: 'Lainnya' },
              ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DatePicker
                label="Tanggal mulai"
                value={form.dari}
                onChange={(v) => setForm(s => ({ ...s, dari: v }))}
                max={form.sampai || undefined}
              />
              <DatePicker
                label="Tanggal selesai"
                value={form.sampai}
                onChange={(v) => setForm(s => ({ ...s, sampai: v }))}
                min={form.dari || undefined}
              />
            </div>

            {form.dari && form.sampai && new Date(form.dari) > new Date(form.sampai) && (
              <div className="text-sm text-rose-600 -mt-2">
                Tanggal selesai tidak boleh lebih awal dari tanggal mulai.
              </div>
            )}

            <div className="rounded-xl border px-3 py-2 text-gray-600" style={{ borderColor: '#00156B20' }}>
              Total: <span className="font-semibold text-gray-800">{hari}</span> hari
            </div>

            <label className="block">
              <span className="text-sm text-gray-700">Alasan izin</span>
              <textarea
                rows={5}
                value={form.alasan}
                onChange={e => setForm(s => ({ ...s, alasan: e.target.value }))}
                className="w-full mt-1 rounded-xl border px-3 py-3 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-0"
                style={{ borderColor: '#00156B20', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}
                placeholder="Contoh: acara keluarga, kontrol dokter, dll."
              />
            </label>

            <div>
              <span className="text-sm text-gray-700">Lampiran (opsional)</span>
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={onPickFile}
                  className="w-full rounded-xl border px-3 py-2 shadow-sm text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:bg-[#00156B] file:text-white focus-visible:ring-2 focus-visible:ring-offset-0 sm:w-auto"
                  style={{ borderColor: '#00156B20' }}
                />
                {form.lampiran && (
                  <button
                    type="button"
                    onClick={clearFile}
                    className="w-full rounded-xl border px-3 py-2 text-sm shadow-sm self-start sm:w-auto sm:self-auto"
                    style={{ borderColor: '#00156B20' }}
                  >
                    Hapus
                  </button>
                )}
              </div>
              {form.lampiran && (
                <div className="mt-3">
                  {isImg ? (
                    <img src={previewUrl || ''} alt="Preview" className="max-h-40 max-w-full rounded-xl border" />
                  ) : (
                    <div className="text-sm text-gray-600 break-words">
                      {form.lampiran.name} ({Math.round((form.lampiran.size || 0) / 1024)} KB)
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={submit}
              disabled={!valid}
              className="w-full inline-flex items-center justify-center rounded-xl px-4 py-3 text-white font-semibold shadow-md"
              style={{ background: '#16A34A' }}
            >
              Ajukan Izin
            </button>
          </div>
        </div>
      </div>

      <div className="h-24 md:hidden" />
    </div>
  )
}
