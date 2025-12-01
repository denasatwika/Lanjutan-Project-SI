'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { encodeAbiParameters, getAddress, keccak256 } from 'viem'
import {
  buildAttachmentDownloadUrl,
  formatAttachmentSize,
  normalizeAttachmentUrl,
} from '@/lib/api/attachments'
import { useRequests } from '@/lib/state/requests'
import { formatWhen } from '@/lib/utils/date'
import { LeaveRequest, OvertimeRequest } from '@/lib/types'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'
import { getRequest } from '@/lib/api/requests'
import { getLeaveRequest } from '@/lib/api/leaveRequests'
import { getApprovalState, type ApprovalState } from '@/lib/api/multisig'
import { ApprovalStatus } from '@/components/ApprovalStatus'
import { toast } from 'sonner'

export default function Page(){
  const { id } = useParams<{id:string}>()
  const request = useRequests(s=>s.byId(id))
  const upsert = useRequests(s=>s.upsertFromApi)
  const [approvalState, setApprovalState] = useState<ApprovalState | null>(null)
  const [loadingApprovals, setLoadingApprovals] = useState(false)
  const [onChainRequestId, setOnChainRequestId] = useState<`0x${string}` | null>(null)
  const [requesterWallet, setRequesterWallet] = useState<`0x${string}` | null>(null)

  useEffect(() => {
    if (!id || request) return
    getRequest(id)
      .then(upsert)
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to load request'
        toast.error(message)
      })
  }, [id, request, upsert])

  useEffect(() => {
    if (!request || request.type !== 'leave') {
      setOnChainRequestId(null)
      setRequesterWallet(null)
      return
    }

    let cancelled = false

    async function loadChainMeta() {
      try {
        const leaveDetail = await getLeaveRequest(request.id)
        if (cancelled) return

        if (leaveDetail.onChainRequestId) {
          setOnChainRequestId((prev) => prev ?? (leaveDetail.onChainRequestId as `0x${string}`))
        }

        if (leaveDetail.requesterWalletAddress) {
          setRequesterWallet((prev) => prev ?? getAddress(leaveDetail.requesterWalletAddress as `0x${string}`))
        }
      } catch (error) {
        console.warn('Failed to load leave chain metadata', error)
      }
    }

    loadChainMeta()

    return () => {
      cancelled = true
    }
  }, [request?.id, request?.type])

  useEffect(() => {
    if (!request || request.type !== 'leave') {
      setApprovalState(null)
      return
    }

    if (!onChainRequestId && !requesterWallet) return

    let cancelled = false

    async function loadApprovalState() {
      try {
        setLoadingApprovals(true)
        const derivedRequestId =
          onChainRequestId ??
          (requesterWallet
            ? (keccak256(
                encodeAbiParameters(
                  [
                    { name: 'dbId', type: 'string' },
                    { name: 'address', type: 'address' },
                  ],
                  [request.id, requesterWallet],
                ),
              ) as `0x${string}`)
            : null)

        if (!derivedRequestId) {
          console.warn('Missing on-chain requestId, skipping approval state fetch')
          setApprovalState(null)
          return
        }

        const state = await getApprovalState(derivedRequestId)
        if (!cancelled) {
          setApprovalState(state)
        }
      } catch (error) {
        console.error('Failed to load approval state', error)
      } finally {
        if (!cancelled) {
          setLoadingApprovals(false)
        }
      }
    }

    loadApprovalState()

    return () => {
      cancelled = true
    }
  }, [request, onChainRequestId, requesterWallet])

  if(!request) return <div className="text-sm text-gray-600">Request not found</div>
  const isLeave = request.type === 'leave'
  const leave = isLeave ? (request as LeaveRequest) : undefined
  const overtime = !isLeave ? (request as OvertimeRequest) : undefined
  const leaveLabel = leave ? resolveLeaveTypeLabel(leave.leaveTypeId) : undefined
  const attachmentSize =
    typeof request.attachmentSize === 'number' && request.attachmentSize > 0
      ? formatAttachmentSize(request.attachmentSize)
      : null
  const normalizedAttachmentUrl = normalizeAttachmentUrl(request.attachmentUrl, request.attachmentCid)
  const attachmentHref =
    normalizedAttachmentUrl ??
    (request.attachmentId
      ? buildAttachmentDownloadUrl(request.attachmentId, request.attachmentDownloadPath)
      : null)
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

      {isLeave && (
        <div className="mt-4">
          <ApprovalStatus state={approvalState} loading={loadingApprovals} />
        </div>
      )}
    </div>
  )
}
