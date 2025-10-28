'use client'
import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { buildAttachmentDownloadUrl, formatAttachmentSize, withImageOptimisation } from '@/lib/api/attachments'
import { useRequests } from '@/lib/state/requests'
import { formatWhen } from '@/lib/utils/date'
import { LeaveRequest, OvertimeRequest } from '@/lib/types'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'
import { getRequest } from '@/lib/api/requests'
import { toast } from 'sonner'

export default function Page(){
  const { id } = useParams<{id:string}>()
  const request = useRequests(s=>s.byId(id))
  const upsert = useRequests(s=>s.upsertFromApi)

  useEffect(() => {
    if (!id || request) return
    getRequest(id)
      .then(upsert)
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to load request'
        toast.error(message)
      })
  }, [id, request, upsert])

  if(!request) return <div className="text-sm text-gray-600">Request not found</div>
  const isLeave = request.type === 'leave'
  const leave = isLeave ? (request as LeaveRequest) : undefined
  const overtime = !isLeave ? (request as OvertimeRequest) : undefined
  const leaveLabel = leave ? resolveLeaveTypeLabel(leave.leaveTypeId) : undefined
  const attachmentSize =
    typeof request.attachmentSize === 'number' && request.attachmentSize > 0
      ? formatAttachmentSize(request.attachmentSize)
      : null
  const baseAttachmentHref =
    request.attachmentUrl ??
    (request.attachmentId
      ? buildAttachmentDownloadUrl(request.attachmentId, request.attachmentDownloadPath)
      : null)
  const attachmentHref =
    baseAttachmentHref && request.attachmentMimeType?.startsWith('image/')
      ? withImageOptimisation(baseAttachmentHref)
      : baseAttachmentHref
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Request Detail</h1>
      <div className="card p-4 grid gap-2">
        <div><span className="text-gray-500">Type:</span> <span className="capitalize font-medium">{request.type}</span></div>
        <div><span className="text-gray-500">Status:</span> <span className="font-medium">{request.status}</span></div>
        <div><span className="text-gray-500">Created:</span> {formatWhen(request.createdAt)}</div>
        <div>
          <span className="text-gray-500">Attachment:</span>{' '}
          {attachmentHref ? (
            <a
              href={attachmentHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00156B] font-medium hover:underline"
            >
              {request.attachmentName ?? 'View attachment'}
              {attachmentSize ? ` (${attachmentSize})` : ''}
            </a>
          ) : '—'}
        </div>
        <div><span className="text-gray-500">Reason:</span> {request.reason || '—'}</div>

        {isLeave && leave ? (
          <div className="mt-2 grid gap-1 text-sm">
            <div><span className="text-gray-500">Leave Type:</span> {leaveLabel ?? leave.leaveTypeId}</div>
            <div><span className="text-gray-500">Start:</span> {leave.startDate}</div>
            <div><span className="text-gray-500">End:</span> {leave.endDate}</div>
            <div><span className="text-gray-500">Days:</span> {leave.days}</div>
          </div>
        ) : (
          <div className="mt-2 grid gap-1 text-sm">
            <div><span className="text-gray-500">Work Date:</span> {overtime?.workDate}</div>
            <div><span className="text-gray-500">From:</span> {overtime?.startTime}</div>
            <div><span className="text-gray-500">To:</span> {overtime?.endTime}</div>
            <div><span className="text-gray-500">Hours:</span> {overtime?.hours}</div>
          </div>
        )}
      </div>
    </div>
  )
}
