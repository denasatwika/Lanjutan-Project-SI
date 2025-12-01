'use client'

import { useMemo, useRef, useState, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import { Calendar as CalendarIcon, Clock, ChevronDown } from 'lucide-react'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import { createOvertimeRequest } from '@/lib/api/requests'
import {
  formatAttachmentSize,
  isSupportedAttachmentType,
  MAX_ATTACHMENT_BYTES,
  uploadAttachment,
  type AttachmentInfo,
} from '@/lib/api/attachments'

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
  return Number.isNaN(d.getTime()) ? undefined : d
}

/* ------------------------------------------
   Popover for DatePicker
------------------------------------------ */
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
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
}) {
  const ref = useOutsideClose(() => onOpenChange(false))
  const alignClass = align === 'end' ? 'right-0' : 'left-0'
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {open && (
        <div className={`absolute z-50 mt-2 min-w-[260px] rounded-2xl border bg-white p-2 shadow-lg ${alignClass}`}>{children}</div>
      )}
    </div>
  )
}

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
                <span>{format(selected, 'd MMMM yyyy', { locale: enUS })}</span>
              ) : (
                <span className="text-gray-400">Select a date</span>
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
          locale={enUS}
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
function fmtHHMM(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
function generateTimeSlots(step: number) {
  const slots: string[] = []
  for (let minutes = 0; minutes < 24 * 60; minutes += step) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    slots.push(fmtHHMM(h, m))
  }
  return slots
}
function formatTimeDisplay(time: string) {
  const [hourRaw, minuteRaw] = time.split(':')
  let hour = Number(hourRaw)
  if (!Number.isFinite(hour)) hour = 0
  const suffix = hour >= 12 ? 'PM' : 'AM'
  let formattedHour = hour % 12
  if (formattedHour === 0) formattedHour = 12
  return {
    main: `${formattedHour}:${minuteRaw}`,
    suffix,
  }
}
function minutesToTime(totalMinutes: number) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(normalized / 60)
  const m = normalized % 60
  return fmtHHMM(h, m)
}
function getCurrentTimeSlot(step: number) {
  const now = new Date()
  const totalMinutes = now.getHours() * 60 + now.getMinutes()
  const snapped = Math.round(totalMinutes / step) * step
  return minutesToTime(snapped)
}

function TimePicker({
  label,
  value,
  onChange,
  placeholder = 'Select time (HH:MM)',
  step = DEFAULT_STEP_MINUTES,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  step?: number
}) {
  const [open, setOpen] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const slots = useMemo(() => generateTimeSlots(step), [step])
  const selected = value && slots.includes(value) ? value : null

  useEffect(() => {
    if (!open) return
    if (!listRef.current) return
    if (!selected) {
      listRef.current.scrollTop = 0
      return
    }
    const active = listRef.current.querySelector<HTMLButtonElement>(`[data-time="${selected}"]`)
    if (active) {
      active.scrollIntoView({ block: 'center' })
    }
  }, [open, selected])

  const display = selected ? formatTimeDisplay(selected) : null

  const handleSelect = (slot: string) => {
    onChange(slot)
    setOpen(false)
  }

  const handleNow = () => {
    const snapped = getCurrentTimeSlot(step)
    onChange(snapped)
    setOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setOpen(false)
  }

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
              <Clock className="size-4 opacity-70" />
              {display ? (
                <span className="inline-flex items-baseline gap-2">
                  <span>{display.main}</span>
                  <span className="text-xs uppercase tracking-wide text-gray-400">{display.suffix}</span>
                </span>
              ) : (
                <span className="text-gray-400">{placeholder}</span>
              )}
            </span>
            <ChevronDown className="size-4 opacity-70" />
          </button>
        }
        align="start"
      >
        <div className="w-60 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleNow}
              className="rounded-full bg-[#FFE2DC] px-3 py-1 text-xs font-semibold text-[#E0574D] hover:bg-[#ffd3c8]"
            >
              Now
            </button>
          </div>

          <div
            ref={listRef}
            className="mt-3 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
          >
            <ul className="space-y-1">
              {slots.map((slot) => {
                const isActive = slot === selected
                const { main, suffix } = formatTimeDisplay(slot)
                return (
                  <li key={slot}>
                    <button
                      type="button"
                      data-time={slot}
                      onClick={() => handleSelect(slot)}
                      className={`flex w-full items-baseline justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-[#00156B] text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      aria-pressed={isActive}
                    >
                      <span className="text-lg">{main}</span>
                      <span
                        className={`text-xs uppercase ${
                          isActive ? 'text-white/80' : 'text-gray-400'
                        }`}
                      >
                        {suffix}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </Popover>
    </div>
  )
}

/* ------------------------------------------
   Overtime Request Form
------------------------------------------ */
export function OvertimeRequestForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const router = useRouter()
  const { user } = useAuth()
  const upsertRequest = useRequests((s) => s.upsertFromApi)
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
  const [submitting, setSubmitting] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [attachmentMeta, setAttachmentMeta] = useState<AttachmentInfo | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement | null>(null)

  const durationHours = useMemo(() => {
    const { tanggal, mulai, selesai } = form
    if (!tanggal || !mulai || !selesai) return 0
    const start = new Date(`${tanggal}T${mulai}:00`)
    const end = new Date(`${tanggal}T${selesai}:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
    let diff = (end.getTime() - start.getTime()) / (60 * 60 * 1000)
    if (diff < 0) diff += 24
    return Math.max(0, Number(diff.toFixed(2)))
  }, [form.tanggal, form.mulai, form.selesai])

  const valid =
    !!form.tanggal &&
    !!form.mulai &&
    !!form.selesai &&
    durationHours > 0 &&
    form.alasan.trim().length > 0 &&
    !!form.lampiran

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    if (!isSupportedAttachmentType(f.type)) {
      toast.error('Only PDF or image files (PNG, JPEG, etc.) are allowed.')
      e.target.value = ''
      return
    }

    if (f.size > MAX_ATTACHMENT_BYTES) {
      toast.error(`File must be smaller than ${formatAttachmentSize(MAX_ATTACHMENT_BYTES)}.`)
      e.target.value = ''
      return
    }

    setForm(s => ({ ...s, lampiran: f }))
    setAttachmentMeta(null)
    setAttachmentError(null)
  }
  function clearFile() {
    setForm(s => ({ ...s, lampiran: null }))
    setAttachmentMeta(null)
    setAttachmentError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit() {
    if (!valid) return
    if (!user?.id) {
      toast.error('Unable to determine the requester. Please sign in again.')
      return
    }
    if (uploadingAttachment) {
      toast.error('Please wait until the attachment upload finishes.')
      return
    }
    const file = form.lampiran
    if (!file) {
      toast.error('Attachment is missing. Please choose a file and try again.')
      return
    }
    setSubmitting(true)
    setUploadingAttachment(true)
    setAttachmentError(null)
    try {
      const uploaded = await uploadAttachment(file, user.id, {
        requesterId: user.id,
        requestType: 'OVERTIME',
      })
      setAttachmentMeta(uploaded)
      setUploadingAttachment(false)

      const created = await createOvertimeRequest({
        type: 'OVERTIME',
        requesterId: user.id,
        overtimeDate: form.tanggal,
        overtimeStartTime: form.mulai,
        overtimeEndTime: form.selesai,
        overtimeHours: Number(durationHours),
        overtimeReason: form.alasan.trim(),
        attachmentIds: [uploaded.id],
        approvals: [],
      })
      upsertRequest(created)
      toast.success('Overtime request submitted')
      setForm({ tanggal: '', mulai: '', selesai: '', alasan: '', lampiran: null })
      setAttachmentMeta(null)
      setAttachmentError(null)
      if (fileRef.current) fileRef.current.value = ''
      onSubmitted?.()
      router.push(`/user/inbox/${created.id}`)
    } catch (error) {
      const status = (error as any)?.status
      const detail = (error as any)?.details
      let message = detail || (error instanceof Error ? error.message : 'Failed to submit overtime request')
      if (status === 400) {
        message = 'Attachment is too large or a required field is missing.'
      } else if (status === 404) {
        message = 'Requester not found. Please sign in again.'
      } else if (status === 403 || status === 409) {
        message = 'Attachment could not be linked. Please re-upload and try again.'
      } else if (status === 415) {
        message = 'File type not supported. Please upload a PDF or image.'
      }
      setAttachmentError(message)
      toast.error(message)
    } finally {
      setUploadingAttachment(false)
      setSubmitting(false)
    }
  }

  const previewUrl = useMemo(() => {
    if (!form.lampiran) return null
    return form.lampiran.type.startsWith('image/') ? URL.createObjectURL(form.lampiran) : null
  }, [form.lampiran])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const isImg = !!previewUrl

  return (
    <form className="grid gap-4 text-[15px]" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <DatePicker label="Overtime date" value={form.tanggal} onChange={(v) => setForm(s => ({ ...s, tanggal: v }))} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TimePicker label="Start time" value={form.mulai} onChange={(v) => setForm(s => ({ ...s, mulai: v }))} />
        <TimePicker label="End time" value={form.selesai} onChange={(v) => setForm(s => ({ ...s, selesai: v }))} />
      </div>

      <div className="rounded-xl border px-3 py-2 text-gray-600" style={{ borderColor: '#00156B20' }}>
        Duration: <span className="font-semibold text-gray-800">{durationHours}</span> hours
      </div>

      <label className="block">
        <span className="text-sm text-gray-700">Reason</span>
        <textarea
          rows={4}
          value={form.alasan}
          onChange={(e) => setForm(s => ({ ...s, alasan: e.target.value }))}
          className="w-full mt-1 rounded-xl border px-3 py-3 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-0"
          style={{ borderColor: '#00156B20', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}
          placeholder="Example: release support, production outage, etc."
        />
      </label>

      <div>
        <span className="text-sm text-gray-700">Attachment (required)</span>
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
              Remove
            </button>
          )}
        </div>
        {uploadingAttachment && (
          <div className="mt-2 text-xs text-gray-500">Uploading attachment…</div>
        )}
        {attachmentError && (
          <div className="mt-2 text-sm text-rose-600">{attachmentError}</div>
        )}
        {form.lampiran && (
          <div className="mt-3 space-y-2">
            {isImg && (
              <img
                src={previewUrl || ''}
                alt="Attachment preview"
                className="max-h-40 max-w-full rounded-xl border object-contain"
              />
            )}
            <div className="text-sm text-gray-600 break-words">
              {attachmentMeta
                ? `${attachmentMeta.name} (${formatAttachmentSize(attachmentMeta.size)})`
                : `${form.lampiran.name} (${formatAttachmentSize(form.lampiran.size)})`}
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!valid || submitting || uploadingAttachment || !user}
        className="w-full inline-flex items-center justify-center rounded-xl px-4 py-3 text-white font-semibold shadow-md transition disabled:cursor-not-allowed disabled:bg-slate-400"
        style={{ background: '#00156B' }}
      >
        {uploadingAttachment ? 'Uploading attachment...' : submitting ? 'Submitting...' : 'Submit Overtime Request'}
      </button>
    </form>
  )
}
