'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import DateRangePicker from '@/components/DateRangePicker'
import type { DateRange } from 'react-day-picker'
import { createLeaveRequest, type LeaveType } from '@/lib/api/leaveRequests'
import {
  formatAttachmentSize,
  isSupportedAttachmentType,
  MAX_ATTACHMENT_BYTES,
  uploadAttachment,
  type AttachmentInfo,
} from '@/lib/api/attachments'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'

/* ---- Helpers ---- */
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

const LEAVE_TYPE_OPTIONS = [
  { value: 'Cuti' as LeaveType, label: 'Cuti' },
  { value: 'Sakit' as LeaveType, label: 'Sakit' },
  { value: 'Izin' as LeaveType, label: 'Izin' },
] as const

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
  const alignClass = align === 'end' ? 'sm:right-0 sm:left-auto' : 'sm:left-0 sm:right-auto'
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-50 mt-2 left-1/2 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border bg-white p-2 shadow-lg sm:min-w-[260px] sm:w-auto sm:translate-x-0 ${alignClass}`}
        >
          {children}
        </div>
      )}
    </div>
  )
}

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
  const selected = options.find(o => o.value === value)?.label ?? 'Select'
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

export type LeaveKind = (typeof LEAVE_TYPE_OPTIONS)[number]['value']

export function LeaveRequestForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const router = useRouter()
  const { user } = useAuth()
  const upsertRequest = useRequests((s) => s.upsertFromApi)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [attachmentMeta, setAttachmentMeta] = useState<AttachmentInfo | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [form, setForm] = useState<{
    leaveType: LeaveKind
    startDate: string
    endDate: string
    reason: string
    attachment: File | null
  }>({
    leaveType: LEAVE_TYPE_OPTIONS[0].value,
    startDate: '',
    endDate: '',
    reason: '',
    attachment: null,
  })

  const fileRef = useRef<HTMLInputElement | null>(null)

  const dateRange = useMemo<DateRange>(() => ({
    from: fromISODate(form.startDate),
    to: fromISODate(form.endDate),
  }), [form.startDate, form.endDate])

  const days = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0
    const start = new Date(form.startDate)
    const end = new Date(form.endDate)
    const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1
    return Number.isNaN(diff) || diff < 0 ? 0 : diff
  }, [form.startDate, form.endDate])

  const hasDateOrderIssue =
    form.startDate &&
    form.endDate &&
    new Date(form.startDate) > new Date(form.endDate)

  const valid =
    !!form.startDate &&
    !!form.endDate &&
    !hasDateOrderIssue &&
    days > 0 &&
    form.reason.trim().length > 0 &&
    !!form.attachment

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
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

    setForm(s => ({ ...s, attachment: f }))
    setAttachmentMeta(null)
    setAttachmentError(null)
  }
  function clearFile() {
    setForm(s => ({ ...s, attachment: null }))
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
    if (!form.attachment) {
      toast.error('Please select an attachment before submitting.')
      return
    }
    if (uploadingAttachment) {
      toast.error('Please wait until the attachment upload finishes.')
      return
    }
    setSubmitting(true)
    setUploadingAttachment(true)
    setAttachmentError(null)
    try {
      const file = form.attachment
      const uploaded = await uploadAttachment(file, user.id, {
        requesterId: user.id,
        requestType: 'LEAVE',
      })
      setAttachmentMeta(uploaded)
      setUploadingAttachment(false)

      const created = await createLeaveRequest({
        type: 'LEAVE',
        requesterId: user.id,
        leaveType: form.leaveType,
        leaveStartDate: form.startDate,
        leaveEndDate: form.endDate,
        leaveDays: days,
        leaveReason: form.reason.trim(),
        attachmentIds: [uploaded.id],
        approvals: [],
      })
      upsertRequest({
        ...created,
        overtimeDate: null,
        overtimeStartTime: null,
        overtimeEndTime: null,
        overtimeHours: null,
        overtimeReason: null
      })
      toast.success('Leave request submitted')
      setForm({
        leaveType: LEAVE_TYPE_OPTIONS[0].value,
        startDate: '',
        endDate: '',
        reason: '',
        attachment: null,
      })
      setAttachmentMeta(null)
      setAttachmentError(null)
      if (fileRef.current) fileRef.current.value = ''
      onSubmitted?.()
      router.push(`/user/inbox/${created.id}`)
    } catch (error) {
      const status = (error as any)?.status
      const detail = (error as any)?.details
      let message = detail || (error instanceof Error ? error.message : 'Failed to submit leave request')
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
    if (!form.attachment) return null
    return form.attachment.type.startsWith('image/') ? URL.createObjectURL(form.attachment) : null
  }, [form.attachment])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const isImg = !!previewUrl

  return (
    <form className="grid gap-4 text-[15px]" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <SelectBox<LeaveKind>
        label="Leave type"
        value={form.leaveType}
        onChange={(v) => setForm(s => ({ ...s, leaveType: v }))}
        options={LEAVE_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
      />

      <DateRangePicker
        label="Leave dates"
        range={dateRange}
        onChange={(next: DateRange) =>
          setForm((s) => ({
            ...s,
            startDate: next.from ? toISODate(next.from) : '',
            endDate: next.to ? toISODate(next.to) : '',
          }))
        }
      />

      {hasDateOrderIssue && (
        <div className="text-sm text-rose-600 -mt-2">
          End date cannot be earlier than the start date.
        </div>
      )}

      <div className="rounded-xl border px-3 py-2 text-gray-600" style={{ borderColor: '#00156B20' }}>
        Total: <span className="font-semibold text-gray-800">{days}</span> days
      </div>

      <label className="block">
        <span className="text-sm text-gray-700">Leave reason</span>
        <textarea
          rows={5}
          value={form.reason}
          onChange={(e) => setForm(s => ({ ...s, reason: e.target.value }))}
          className="w-full mt-1 rounded-xl border px-3 py-3 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-0"
          style={{ borderColor: '#00156B20', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}
          placeholder="Example: family event, doctor appointment, etc."
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
          {form.attachment && (
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
        {form.attachment && (
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
                : `${form.attachment.name} (${formatAttachmentSize(form.attachment.size)})`}
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
        {uploadingAttachment ? 'Uploading attachment...' : submitting ? 'Submitting...' : 'Submit Leave Request'}
      </button>
    </form>
  )
}
