'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { toast } from 'sonner'

import { PageHeader } from '@/components/PageHeader'
import {
  buildAttachmentDownloadUrl,
  formatAttachmentSize,
  normalizeAttachmentUrl,
} from '@/lib/api/attachments'
import { getRequest, listApprovals, type ApprovalResponse } from '@/lib/api/requests'
import { useRequests } from '@/lib/state/requests'
import { formatWhen } from '@/lib/utils/date'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'
import type { LeaveRequest, OvertimeRequest, Request } from '@/lib/types'

type DecisionState = 'idle' | 'loading'

export default function ApproverHistoryDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const approvalIdFromQuery = searchParams.get('approval')

  const request = useRequests((state) => (id ? state.byId(id) : undefined))
  const upsertRequest = useRequests((state) => state.upsertFromApi)

  const [approvals, setApprovals] = useState<ApprovalResponse[]>([])
  const [activeApproval, setActiveApproval] = useState<ApprovalResponse | null>(null)
  const [loading, setLoading] = useState<DecisionState>('idle')

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      setLoading('loading')
      try {
        if (!request) {
          const fetched = await getRequest(id)
          if (cancelled) return
          upsertRequest(fetched)
        }

        const approvalList = await listApprovals({ requestId: id })
        if (cancelled) return
        setApprovals(approvalList)

        let current =
          approvalList.find((item) => item.id === approvalIdFromQuery) ??
          approvalList[0] ??
          null
        setActiveApproval(current)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Failed to load history detail'
        toast.error(message)
      } finally {
        if (!cancelled) setLoading('idle')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [approvalIdFromQuery, id, request, upsertRequest])

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
  const attachmentHref =
    normalizedAttachmentUrl ??
    (request?.attachmentId
      ? buildAttachmentDownloadUrl(request.attachmentId, request.attachmentDownloadPath)
      : null)

  const approvalsChain = approvals.length > 0 ? approvals : activeApproval ? [activeApproval] : []
  const employeeName =
    request?.employeeName ??
    activeApproval?.requesterName ??
    request?.employeeId ??
    activeApproval?.requesterId ??
    'Unknown employee'
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
    return `${type} ${request.id}`
  }, [id, request])

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
                <h1 className="text-xl font-bold text-slate-900">{heading}</h1>
                <p className="text-sm font-semibold text-slate-900">{employeeName}</p>
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
                {attachmentHref ? (
                  <a
                    href={attachmentHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00156B] transition hover:underline"
                  >
                    {request.attachmentName ?? 'View attachment'}
                    {attachmentSize ? ` (${attachmentSize})` : ''}
                  </a>
                ) : (
                  '—'
                )}
              </DetailRow>
            </div>
          </section>

          <section className="card space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Approval chain</h2>
              {activeApproval && (
                <span className="text-xs text-slate-500">
                  Stage {activeApproval.stage}
                  {activeApproval.approverLevel ? ` • ${activeApproval.approverLevel}` : ''}
                </span>
              )}
            </div>

            {approvalsChain.length === 0 ? (
              <p className="text-sm text-slate-500">No approval records found for this request.</p>
            ) : (
              <ul className="space-y-2">
                {approvalsChain.map((approval) => (
                  <li
                    key={approval.id}
                    className={clsx(
                      'rounded-xl border p-3 text-sm',
                      approval.id === activeApproval?.id
                        ? 'border-[#00156B] bg-[#00156B]/5'
                        : 'border-slate-200 bg-white',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-slate-900">
                        Stage {approval.stage}
                        {approval.approverLevel ? ` • ${approval.approverLevel}` : ''}
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {formatApprovalStatus(approval.status)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {approval.decidedAt ? `Decided ${formatWhen(approval.decidedAt)}` : 'Awaiting decision'}
                    </div>
                    {approval.comments && (
                      <p className="mt-2 text-sm text-slate-600">“{approval.comments}”</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Will use this later if needed */}
          {/* <section className="card space-y-3 p-5">
            <h2 className="text-base font-semibold text-slate-900">Additional info</h2>
            <DetailRow label="Approval ID">
              <code className="text-xs">{activeApproval?.id ?? '—'}</code>
            </DetailRow>
            <DetailRow label="Request ID">
              <code className="text-xs">{request.id}</code>
            </DetailRow>
            <DetailRow label="Submitted">
              {formatWhen(request.createdAt)}
            </DetailRow>
            <DetailRow label="Decided">
              {activeApproval?.decidedAt ? formatWhen(activeApproval.decidedAt) : 'Pending'}
            </DetailRow>
            {request.reason && <DetailRow label="Reason">{request.reason}</DetailRow>}
            {activeApproval?.comments && <DetailRow label="Comments">{activeApproval.comments}</DetailRow>}
          </section> */}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.push('/approver/history')}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
            >
              Back to history
            </button>
          </div>
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

function formatApprovalStatus(status: ApprovalResponse['status']) {
  if (status === 'APPROVED') return 'Approved'
  if (status === 'REJECTED') return 'Rejected'
  if (status === 'BLOCKED') return 'Blocked'
  if (status === 'CANCELLED') return 'Cancelled'
  if (status === 'DRAFT') return 'Draft'
  return 'Pending'
}
