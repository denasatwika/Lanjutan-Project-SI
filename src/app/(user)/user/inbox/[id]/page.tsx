'use client'

import Image from 'next/image'
import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { encodeAbiParameters, getAddress, keccak256 } from 'viem'
import { toast } from 'sonner'
import {
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Paperclip,
  Download,
  ChevronRight,
  Link as LinkIcon
} from 'lucide-react'
import clsx from 'clsx'

import { PageHeader } from '@/components/PageHeader'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import type { LeaveRequest, OvertimeRequest, Request } from '@/lib/types'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'
import { buildAttachmentDownloadUrl, formatAttachmentSize, normalizeAttachmentUrl } from '@/lib/api/attachments'
import { getRequest, listApprovals, type ApprovalResponse } from '@/lib/api/requests'
import { getLeaveRequest } from '@/lib/api/leaveRequests'
import { getApprovalState, type ApprovalState } from '@/lib/api/multisig'
import { useInboxRead } from '../useInboxRead'
import { formatDateOnly, formatDateTime } from '../utils'

// --- Main Component ---

export default function InboxDetailPage() {
  const params = useParams<{ id: string }>()
  const requestId = Array.isArray(params?.id) ? params?.id[0] : params?.id
  const user = useAuth((state) => state.user)
  const byId = useRequests((state) => state.byId)
  const upsertFromApi = useRequests((state) => state.upsertFromApi)
  const markRead = useInboxRead((state) => state.markRead)

  // State Management
  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [approvals, setApprovals] = useState<ApprovalResponse[]>([])
  const [approvalsError, setApprovalsError] = useState<string | null>(null)
  const [approvalState, setApprovalState] = useState<ApprovalState | null>(null)
  const [loadingApprovalState, setLoadingApprovalState] = useState(false)

  // Chain Meta
  const [onChainRequestId, setOnChainRequestId] = useState<`0x${string}` | null>(null)
  const [requesterWallet, setRequesterWallet] = useState<`0x${string}` | null>(null)

  // 1. Fetch Request & Approvals
  useEffect(() => {
    if (!requestId) return
    let cancelled = false
    setLoading(true)
    setApprovalsError(null)

    const cached = byId(requestId)
    setRequest(cached ?? null)
    markRead(requestId)

    async function load() {
      try {
        const [requestResult, approvalsResult] = await Promise.allSettled([
          getRequest(requestId),
          listApprovals({ requestId }),
        ])

        if (cancelled) return

        if (requestResult.status === 'fulfilled') {
          const normalized = upsertFromApi(requestResult.value)
          setRequest(normalized)
        } else {
          toast.error(requestResult.reason instanceof Error ? requestResult.reason.message : 'Failed to load request')
        }

        if (approvalsResult.status === 'fulfilled') {
          setApprovals(approvalsResult.value)
        } else {
          setApprovals([])
          setApprovalsError('Failed to load approval history.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [requestId, byId, upsertFromApi, markRead])

  // 2. Load Chain Metadata (Logic Unchanged)
  useEffect(() => {
    if (!request || request.type !== 'leave') {
      setOnChainRequestId(null)
      setRequesterWallet(null)
      return
    }
    let cancelled = false

    // Check existing approvals first
    const approvalMeta = approvals.find((item) => item.onChainRequestId || item.requesterWalletAddress)
    if (approvalMeta?.onChainRequestId) setOnChainRequestId(approvalMeta.onChainRequestId as `0x${string}`)
    if (approvalMeta?.requesterWalletAddress) setRequesterWallet(getAddress(approvalMeta.requesterWalletAddress as `0x${string}`))

    async function loadChainMeta() {
      try {
        const leaveDetail = await getLeaveRequest(request.id)
        if (cancelled) return
        if (leaveDetail.onChainRequestId) setOnChainRequestId(leaveDetail.onChainRequestId as `0x${string}`)
        if (leaveDetail.requesterWalletAddress) setRequesterWallet(getAddress(leaveDetail.requesterWalletAddress as `0x${string}`))
      } catch (error) {
        console.warn('Failed to load leave chain metadata', error)
      }
    }
    loadChainMeta()
    return () => { cancelled = true }
  }, [request?.id, request?.type, approvals])

  // 3. Load OnChain Approval State (Logic Unchanged)
  useEffect(() => {
    if (!request || request.type !== 'leave') {
      setApprovalState(null)
      return
    }
    if (!onChainRequestId && !requesterWallet) return

    let cancelled = false
    async function loadOnChainApprovalState() {
      try {
        setLoadingApprovalState(true)
        const derivedRequestId = onChainRequestId ?? (requesterWallet ? (keccak256(encodeAbiParameters([{ name: 'dbId', type: 'string' }, { name: 'address', type: 'address' }], [request.id, requesterWallet])) as `0x${string}`) : null)

        if (!derivedRequestId) {
          setApprovalState(null)
          return
        }
        const state = await getApprovalState(derivedRequestId)
        if (!cancelled) setApprovalState(state)
      } catch (error) {
        console.error('Failed to load on-chain approval state', error)
      } finally {
        if (!cancelled) setLoadingApprovalState(false)
      }
    }
    loadOnChainApprovalState()
    return () => { cancelled = true }
  }, [request, onChainRequestId, requesterWallet])

  // --- UI Logic & Derived State ---

  const isLeave = request?.type === 'leave'
  const detailLeave = isLeave ? (request as LeaveRequest) : null
  const detailOvertime = !isLeave && request?.type === 'overtime' ? (request as OvertimeRequest) : null

  const typeLabel = request
    ? request.type === 'leave'
      ? resolveLeaveTypeLabel(detailLeave?.leaveTypeId) ?? 'Leave Request'
      : request.type === 'overtime' ? 'Overtime Request' : 'Request'
    : 'Request'

  // Attachment Logic
  const attachmentUrl = normalizeAttachmentUrl(request?.attachmentUrl, request?.attachmentCid)
  const isImageAttachment = Boolean(request?.attachmentMimeType?.startsWith('image/'))
  const downloadUrl = attachmentUrl ?? (request?.attachmentId ? buildAttachmentDownloadUrl(request.attachmentId, request.attachmentDownloadPath) : null)

  // Approval Processing Logic (Keep existing complexity)
  const onChainApprovals = approvalState?.approvals ?? []
  const totalApprovals = approvalState?.threshold ?? (approvals.length > 0 ? approvals.length : onChainApprovals.length)
  const approvedCount = approvalState ? approvalState.approvalCount : approvals.reduce((count, approval) => (approval.status === 'APPROVED' ? count + 1 : count), 0)
  const approvalProgress = totalApprovals > 0 ? Math.round((approvedCount / totalApprovals) * 100) : 0

  const normalizeRole = (value?: string | null) => value?.trim().toUpperCase() ?? ''
  const onChainApprovalsNormalized = onChainApprovals.map((item) => ({ ...item, normalizedRole: normalizeRole(item.approverRole) }))
  const onChainByRole = new Map(onChainApprovalsNormalized.map((item) => [item.normalizedRole, item]))
  const thresholdReached = approvalState?.thresholdReached ?? false
  const usedOnChainIndexes = new Set<number>()

  const findOnChainForApproval = (stage: number, approverLevel: string | null | undefined) => {
    const roleKey = normalizeRole(approverLevel)
    if (roleKey && onChainByRole.has(roleKey)) {
      const match = onChainApprovalsNormalized.find((item, idx) => item.normalizedRole === roleKey && !usedOnChainIndexes.has(idx))
      if (match) {
        usedOnChainIndexes.add(onChainApprovalsNormalized.indexOf(match))
        return match
      }
    }
    const stageIndex = Math.max(0, stage - 1)
    if (onChainApprovalsNormalized[stageIndex] && !usedOnChainIndexes.has(stageIndex)) {
      usedOnChainIndexes.add(stageIndex)
      return onChainApprovalsNormalized[stageIndex]
    }
    const firstUnusedIdx = onChainApprovalsNormalized.findIndex((_, idx) => !usedOnChainIndexes.has(idx))
    if (firstUnusedIdx !== -1) {
      usedOnChainIndexes.add(firstUnusedIdx)
      return onChainApprovalsNormalized[firstUnusedIdx]
    }
    return undefined
  }

  const approvalsToRender = approvals.length > 0
    ? approvals.map((approval) => {
      const onChain = findOnChainForApproval(approval.stage, approval.approverLevel)
      const isOnChainApproved = Boolean(onChain?.approvedAt || onChain?.onChainConfirmed)
      const isApprovedByChainCompletion = thresholdReached && onChainApprovalsNormalized.length > 0
      const finalStatus = isOnChainApproved || isApprovedByChainCompletion ? ('APPROVED' as ApprovalResponse['status']) : approval.status
      return {
        key: approval.id,
        stage: approval.stage,
        approverLevel: approval.approverLevel ?? null,
        status: finalStatus,
        decidedAt: approval.decidedAt ?? onChain?.approvedAt ?? null,
        comments: approval.comments ?? null,
        signature: approval.signature ?? null,
        blockchainTxHash: approval.blockchainTxHash ?? onChain?.txHash ?? (onChain as any)?.transactionHash ?? (onChain as any)?.tx_hash ?? (onChain as any)?.transaction_hash ?? null,
        onChain,
      }
    })
    : onChainApprovals.map((onChain, index) => ({
      key: `chain-${onChain.approverRole}-${index}`,
      stage: index + 1,
      approverLevel: onChain.approverRole,
      status: 'APPROVED' as ApprovalResponse['status'],
      decidedAt: onChain.approvedAt,
      comments: null,
      signature: null,
      blockchainTxHash: onChain.txHash ?? (onChain as any)?.transactionHash ?? (onChain as any)?.tx_hash ?? (onChain as any)?.transaction_hash ?? null,
      onChain,
    }))


  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-20">
      <PageHeader
        title="Request Detail"
        backHref="/user/inbox"
        fullBleed
        bleedMobileOnly
        pullUpPx={32}
      />

      {loading && !request && (
        <div className="mt-12 text-center text-sm text-slate-400">Loading details...</div>
      )}

      {!user && !loading && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-600">Please Login</div>
      )}

      {request && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* 1. Header: Type & Status */}
          <div className="flex items-start justify-between border-b border-slate-100 p-6">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{typeLabel}</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="h-3 w-3" />
                <span>Created {formatDateTime(request.createdAt)}</span>
              </div>
            </div>
            <StatusPill status={request.status} />
          </div>

          {/* 2. Metrics Grid */}
          <div className="grid grid-cols-2 gap-y-6 border-b border-slate-100 p-6 sm:grid-cols-4">
            <Metric label="Type" value={<span className="capitalize">{request.type}</span>} />

            {detailLeave && (
              <>
                <Metric label="Duration" value={`${detailLeave.days} Days`} />
                <Metric label="Start" value={formatDateOnly(detailLeave.startDate)} />
                <Metric label="End" value={formatDateOnly(detailLeave.endDate)} />
              </>
            )}

            {detailOvertime && (
              <>
                <Metric label="Work Date" value={formatDateOnly(detailOvertime.workDate)} />
                <Metric label="Time" value={`${detailOvertime.startTime} - ${detailOvertime.endTime}`} />
                <Metric label="Total" value={`${detailOvertime.hours} hrs`} />
              </>
            )}

            {request.updatedAt && request.updatedAt !== request.createdAt && (
              <Metric label="Updated" value={formatDateTime(request.updatedAt)} />
            )}
          </div>

          {/* 3. Reason & Notes */}
          <div className="space-y-6 p-6">
            {request.reason && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Reason</h3>
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{request.reason}</p>
              </div>
            )}
            {request.notes && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Notes</h3>
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{request.notes}</p>
              </div>
            )}
          </div>

          {/* 4. Attachment (Compact Bar) */}
          {(request.attachmentId || request.attachmentUrl) && (
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400">
                  {isImageAttachment && attachmentUrl ? (
                    <div className="relative h-full w-full overflow-hidden rounded">
                      <Image src={attachmentUrl} alt="Preview" fill className="object-cover" />
                    </div>
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">{request.attachmentName || 'Attachment'}</p>
                  <p className="text-xs text-slate-400">{request.attachmentSize ? formatAttachmentSize(request.attachmentSize) : 'File'}</p>
                </div>
                <a
                  href={downloadUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>

              {isImageAttachment && attachmentUrl && (
                <details className="group mt-2">
                  <summary className="flex cursor-pointer items-center text-xs font-medium text-slate-500 hover:text-slate-700">
                    <ChevronRight className="mr-1 h-3 w-3 transition-transform group-open:rotate-90" />
                    View Full Image
                  </summary>
                  <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                    <Image src={attachmentUrl} alt="Full" width={600} height={400} className="w-full bg-slate-100 object-contain" />
                  </div>
                </details>
              )}
            </div>
          )}

          {/* 5. Approval Timeline */}
          <div className="border-t border-slate-100 p-6">
            <div className="mb-4 flex items-end justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Approval History</h3>
              <span className="text-xs font-medium text-slate-500">{approvedCount}/{totalApprovals} Approved</span>
            </div>

            {/* Slim Progress Bar */}
            <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-slate-800 transition-all duration-500" style={{ width: `${approvalProgress}%` }} />
            </div>

            <div className="relative space-y-6 pl-2">
              {/* Vertical Line Connector (Optional decorative element) */}
              {approvalsToRender.length > 1 && (
                <div className="absolute left-[15px] top-2 bottom-4 w-px bg-slate-200" aria-hidden="true" />
              )}

              {approvalsToRender.length === 0 && (
                <p className="text-xs text-slate-400 italic">No approval history yet.</p>
              )}

              {approvalsToRender.map((item, idx) => (
                <ApprovalTimelineItem key={item.key || idx} item={item} />
              ))}
            </div>

            {loadingApprovalState && isLeave && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                Checking blockchain status...
              </div>
            )}
          </div>

        </div>
      )}
    </main>
  )
}

// --- Sub Components ---

function Metric({ label, value }: { label: string, value: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</span>
      <span className="text-sm font-medium text-slate-900 truncate">{value}</span>
    </div>
  )
}

function StatusPill({ status }: { status: string | undefined | null }) {
  const s = status || 'unknown'
  const styles = {
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
    pending: 'bg-amber-100 text-amber-800',
    draft: 'bg-slate-100 text-slate-600',
    unknown: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', styles[s as keyof typeof styles] || styles.unknown)}>
      {s}
    </span>
  )
}

function ApprovalTimelineItem({ item }: { item: any }) {
  const isApproved = item.status === 'APPROVED'
  const isRejected = item.status === 'REJECTED'
  const isPending = item.status === 'PENDING' || !item.decidedAt

  return (
    <div className="relative z-10 flex gap-4">
      {/* Icon Indicator */}
      <div className={clsx(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ring-4 ring-white",
        isApproved ? "border-emerald-200 bg-emerald-50 text-emerald-600" :
          isRejected ? "border-rose-200 bg-rose-50 text-rose-600" :
            "border-slate-200 bg-white text-slate-400"
      )}>
        {isApproved ? <CheckCircle2 className="h-3.5 w-3.5" /> :
          isRejected ? <XCircle className="h-3.5 w-3.5" /> :
            <Clock className="h-3.5 w-3.5" />}
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <p className="text-sm font-medium text-slate-900">
            Step {item.stage} <span className="font-normal text-slate-500">• {item.approverLevel || 'Approver'}</span>
          </p>
          {item.decidedAt && (
            <span className="text-xs text-slate-400">{formatDateTime(item.decidedAt)}</span>
          )}
        </div>

        {/* Comments */}
        {item.comments && (
          <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
            “{item.comments}”
          </div>
        )}

        {/* Blockchain Meta (Simplified) */}
        {item.blockchainTxHash && (
          <div className="mt-2 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-[10px] text-blue-700">
              <LinkIcon className="h-3 w-3" />
              <span className="font-mono">{formatSignaturePreview(item.blockchainTxHash)}</span>
            </div>
            {item.onChain?.onChainConfirmed && (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                ✓ On-Chain Verified
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function formatSignaturePreview(value: string) {
  if (value.length <= 18) return value
  return `${value.slice(0, 8)}...${value.slice(-6)}`
}
