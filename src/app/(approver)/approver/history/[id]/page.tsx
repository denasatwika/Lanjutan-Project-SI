'use client'

import Image from 'next/image'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import clsx from 'clsx'
import { toast } from 'sonner'

import { PageHeader } from '@/components/PageHeader'
import {
  buildAttachmentDownloadUrl,
  formatAttachmentSize,
  normalizeAttachmentUrl,
} from '@/lib/api/attachments'
import { getRequest } from '@/lib/api/requests'
import { useRequests } from '@/lib/state/requests'
import { formatWhen } from '@/lib/utils/date'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'
import type { LeaveRequest, OvertimeRequest, Request } from '@/lib/types'

type DecisionState = 'idle' | 'loading'

export default function ApproverHistoryDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const request = useRequests((state) => (id ? state.byId(id) : undefined))
  const upsertRequest = useRequests((state) => state.upsertFromApi)

  const [loading, setLoading] = useState<DecisionState>('idle')

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function loadMissingRequest() {
      if (request) return

      setLoading('loading')
      try {
        const fetched = await getRequest(id)
        if (cancelled) return
        upsertRequest(fetched)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Failed to load history detail'
        toast.error(message)
      } finally {
        if (!cancelled) {
          setLoading('idle')
        }
      }
    }

    loadMissingRequest()
    return () => {
      cancelled = true
    }
  }, [id, request, upsertRequest])

  const isLeave = request?.type === 'leave'
  const leaveRequest = isLeave ? (request as LeaveRequest) : undefined
  const overtimeRequest = request?.type === 'overtime' ? (request as OvertimeRequest) : undefined
  const leaveLabel = leaveRequest
    ? leaveRequest.leaveTypeName ?? resolveLeaveTypeLabel(leaveRequest.leaveTypeId)
    : undefined

  const attachmentSize =
    typeof request?.attachmentSize === 'number' && request.attachmentSize > 0
      ? formatAttachmentSize(request.attachmentSize)
      : null
  const normalizedAttachmentUrl = normalizeAttachmentUrl(request?.attachmentUrl, request?.attachmentCid)
  const isImageAttachment = Boolean(request?.attachmentMimeType?.startsWith('image/'))
  const attachmentDownloadHref =
    normalizedAttachmentUrl ??
    (request?.attachmentId
      ? buildAttachmentDownloadUrl(request.attachmentId, request.attachmentDownloadPath)
      : null)
  const attachmentPreviewSrc =
    normalizedAttachmentUrl && isImageAttachment ? normalizedAttachmentUrl : null

  const employeeName = request?.employeeName ?? request?.employeeId ?? 'Unknown employee'
  const department = request?.employeeDepartment ?? '—'

  const statusTone = request?.status === 'approved'
    ? 'bg-green-50 text-green-700 ring-green-200'
    : request?.status === 'rejected'
    ? 'bg-rose-50 text-rose-700 ring-rose-200'
    : request?.status === 'pending'
    ? 'bg-amber-50 text-amber-700 ring-amber-200'
    : 'bg-slate-100 text-slate-600 ring-slate-200'

  const heading = useMemo(() => {
    if (!request) return `Request ${id}`
    const type = request.type === 'leave' ? 'Leave' : request.type === 'overtime' ? 'Overtime' : 'Request'
    return `${type}`
  }, [request])

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-28">
      <PageHeader
        title="History Detail"
        backHref="/approver/history"
        fullBleed
        bleedMobileOnly
        pullUpPx={32}
      />

      {loading === 'loading' && (
        <p className="mt-8 text-center text-sm text-slate-500">Loading history detail…</p>
      )}

      {!request && loading === 'idle' && (
        <p className="mt-8 text-center text-sm text-slate-500">
          Request data unavailable. It may have been removed.
        </p>
      )}

      {request && (
        <div className="space-y-6">
          <section className="card space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{employeeName}</h1>
                <p className="text-md font-bold text-slate-900">Requested {heading}</p>
                <p className="text-xs text-slate-500">{department}</p>
                <p className="text-xs text-slate-500">
                  Created {formatWhen(request.createdAt)} • Last updated {formatWhen(request.updatedAt)}
                </p>
              </div>
              <span
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-semibold ring-1',
                  statusTone,
                )}
              >
                {formatRequestStatus(request.status)}
              </span>
            </div>

            <div className="grid gap-3 text-sm">
              <DetailRow label="Type">
                <span className="capitalize font-semibold">{request.type}</span>
              </DetailRow>
              {leaveRequest ? (
                <>
                  <DetailRow label="Leave type">{leaveLabel ?? leaveRequest.leaveTypeId}</DetailRow>
                  <DetailRow label="Start">{leaveRequest.startDate}</DetailRow>
                  <DetailRow label="End">{leaveRequest.endDate}</DetailRow>
                  <DetailRow label="Duration">{leaveRequest.days} day(s)</DetailRow>
                </>
              ) : overtimeRequest ? (
                <>
                  <DetailRow label="Work date">{overtimeRequest.workDate}</DetailRow>
                  <DetailRow label="From">{overtimeRequest.startTime}</DetailRow>
                  <DetailRow label="To">{overtimeRequest.endTime}</DetailRow>
                  <DetailRow label="Hours">{overtimeRequest.hours}</DetailRow>
                </>
              ) : null}
              <DetailRow label="Reason">{request.reason ?? '—'}</DetailRow>
              <DetailRow label="Notes">{request.notes ?? '—'}</DetailRow>
              <DetailRow label="Attachment">
                {request?.attachmentId || request?.attachmentUrl ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-700">
                      {request.attachmentName ?? 'Attachment'}
                      {attachmentSize ? ` (${attachmentSize})` : ''}
                    </div>
                    {attachmentPreviewSrc ? (
                      <a
                        href={attachmentDownloadHref ?? attachmentPreviewSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-xl border"
                      >
                        <Image
                          src={attachmentPreviewSrc}
                          alt={request.attachmentName ?? 'Attachment preview'}
                          width={960}
                          height={600}
                          className="h-auto max-h-72 w-full object-contain bg-slate-100"
                        />
                      </a>
                    ) : attachmentDownloadHref ? (
                      <a
                        href={attachmentDownloadHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-semibold text-[#00156B] hover:underline"
                      >
                        Download attachment
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">Attachment unavailable.</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">No attachment</span>
                )}
              </DetailRow>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px,1fr] gap-3 items-start">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  )
}

function formatRequestStatus(status: string | undefined | null) {
  if (!status) return 'Unknown'
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'pending') return 'Pending'
  if (status === 'draft') return 'Draft'
  return status
}
