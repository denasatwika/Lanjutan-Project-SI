'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import {
  buildAttachmentDownloadUrl,
  formatAttachmentSize,
  normalizeAttachmentUrl,
} from '@/lib/api/attachments'
import { DecoratedRequest, formatLeavePeriod, formatOvertimePeriod } from '@/lib/utils/requestDisplay'
import { LeaveRequest, OvertimeRequest } from '@/lib/types'
import { X, FileText, Clock, CalendarDays } from 'lucide-react'
import clsx from 'clsx'
import type { ApprovalResponse } from '@/lib/api/requests'

const BRAND = '#00156B'

export function RequestDetailDrawer({
  request,
  onClose,
  role,
  approval,
  onDecision,
}: {
  request: DecoratedRequest | null
  onClose: () => void
  role?: 'approver'
  approval?: ApprovalResponse
  onDecision?: (decision: 'APPROVED' | 'REJECTED', comments: string) => Promise<void>
}) {
  if (!request) return null

  const isLeave = request.type === 'leave'
  const leave = isLeave ? (request as LeaveRequest) : undefined
  const overtime = !isLeave ? (request as OvertimeRequest) : undefined
  const normalizedAttachmentUrl = normalizeAttachmentUrl(request.attachmentUrl, request.attachmentCid)
  const attachmentHref =
    normalizedAttachmentUrl ??
    (request.attachmentId
      ? buildAttachmentDownloadUrl(request.attachmentId, request.attachmentDownloadPath)
      : null)
  const attachmentLink = attachmentHref ? (
    <a
      href={attachmentHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm font-medium text-[#00156B] hover:underline"
    >
      <span>{request.attachmentName ?? 'View attachment'}</span>
      {typeof request.attachmentSize === 'number' && request.attachmentSize > 0 && (
        <span className="text-xs text-slate-500">
          ({formatAttachmentSize(request.attachmentSize)})
        </span>
      )}
    </a>
  ) : '—'

  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const approvalIsPending = approval?.status === 'PENDING'
  const canDecide =
    role === 'approver' &&
    request.status === 'pending' &&
    Boolean(onDecision) &&
    approvalIsPending

  useEffect(() => {
    setComments('')
    setSubmitting(null)
    setActionError(null)
  }, [request.id])

  const approvalStageLabel = useMemo(() => {
    if (!approval) return undefined
    const parts = [`Stage ${approval.stage}`]
    if (approval.approverLevel) parts.push(approval.approverLevel)
    return parts.join(' • ')
  }, [approval])
  const approvalStatusLabel = useMemo(() => {
    if (!approval) return undefined
    return formatApprovalStatus(approval.status)
  }, [approval])

  async function handleDecision(decision: 'APPROVED' | 'REJECTED') {
    if (!onDecision) return
    const note = comments.trim()
    setSubmitting(decision)
    setActionError(null)
    try {
      await onDecision(decision, note)
      setComments('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit decision'
      setActionError(message)
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-xl p-6 overflow-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Request detail</p>
            <h2 className="text-2xl font-extrabold text-slate-900">{request.employee.name}</h2>
            <p className="text-xs text-slate-500">{request.employee.department}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 transition">
            <X />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <DetailRow label="Name" value={request.employee.name} />
          <DetailRow label="Department" value={request.employee.department} />
          <DetailRow label="Type" value={isLeave ? request.leaveTypeLabel ?? 'Leave' : 'Overtime'} />
          <DetailRow
            label="Period"
            value={isLeave ? formatLeavePeriod(leave!) : formatOvertimePeriod(overtime!)}
            icon={isLeave ? <CalendarDays className="size-4" /> : <Clock className="size-4" />}
          />
          <DetailRow
            label={isLeave ? 'Duration (days)' : 'Duration (hours)'}
            value={isLeave ? String(leave?.days ?? '-') : String(overtime?.hours ?? '-')}
          />
          <DetailRow label="Status" value={formatStatus(request.status)} />
          {approvalStatusLabel && <DetailRow label="Approval status" value={approvalStatusLabel} />}
          {approvalStageLabel && <DetailRow label="Approval stage" value={approvalStageLabel} />}
          {approval?.decidedAt && (
            <DetailRow label="Decided" value={new Date(approval.decidedAt).toLocaleString()} />
          )}
          <DetailRow label="Created" value={new Date(request.createdAt).toLocaleString()} />
          {request.updatedAt && request.updatedAt !== request.createdAt && (
            <DetailRow label="Updated" value={new Date(request.updatedAt).toLocaleString()} />
          )}
          <DetailRow label="Attachment" value={attachmentLink} icon={<FileText className="size-4" />} />
          {request.reason && <DetailRow label="Reason" value={request.reason} multiline />}
          <DetailRow label="Request ID" value={request.id} code />
        </div>

        {role && (
          <div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Actions</h3>
            </div>
            <textarea
              rows={3}
              placeholder="Add a note for the employee (optional)"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-[color:var(--brand,_#00156B)] focus:ring-2 focus:ring-[color:var(--brand,_#00156B)]/20"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={submitting !== null || !canDecide}
            />
            {actionError && (
              <p className="text-xs text-rose-600">
                {actionError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
              <button
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-white"
                onClick={onClose}
                disabled={submitting !== null}
              >
                Dismiss
              </button>
              <button
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-white"
                onClick={() => handleDecision('REJECTED')}
                disabled={!canDecide || submitting !== null}
              >
                {submitting === 'REJECTED' ? 'Submitting...' : 'Request Changes'}
              </button>
              <button
                className="flex-1 rounded-xl bg-[color:var(--brand,_#00156B)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                style={{ ['--brand' as any]: BRAND }}
                onClick={() => handleDecision('APPROVED')}
                disabled={!canDecide || submitting !== null}
              >
                {submitting === 'APPROVED' ? 'Approving...' : 'Approve Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  icon,
  multiline,
  code,
}: {
  label: string
  value?: ReactNode
  icon?: ReactNode
  multiline?: boolean
  code?: boolean
}) {
  return (
    <div className="grid grid-cols-[120px,1fr] gap-3 items-start">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className={clsx('text-sm', multiline && 'whitespace-pre-wrap leading-5', code && 'font-mono text-xs')}>{value ?? '—'}</div>
    </div>
  )
}

function formatStatus(status: string) {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'pending') return 'Pending'
  return 'Draft'
}

function formatApprovalStatus(status: ApprovalResponse['status']) {
  if (status === 'APPROVED') return 'Approved'
  if (status === 'REJECTED') return 'Rejected'
  if (status === 'BLOCKED') return 'Blocked'
  if (status === 'CANCELLED') return 'Cancelled'
  if (status === 'DRAFT') return 'Draft'
  return 'Pending'
}
