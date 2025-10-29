'use client'

import Image from 'next/image'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { toast } from 'sonner'
import { useAccount, useWalletClient } from 'wagmi'
import { getAddress, isAddressEqual, keccak256, stringToBytes } from 'viem'
import type { Address } from 'viem'

import { PageHeader } from '@/components/PageHeader'
import {
  buildAttachmentDownloadUrl,
  formatAttachmentSize,
  normalizeAttachmentUrl,
} from '@/lib/api/attachments'
import {
  getRequest,
  getApprovalChallenge,
  listApprovals,
  updateApproval,
  type ApprovalResponse,
  type ApprovalChallengeResponse,
} from '@/lib/api/requests'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import { formatWhen } from '@/lib/utils/date'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'
import type { LeaveRequest, OvertimeRequest } from '@/lib/types'

export default function ApproverApprovalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const approvalIdFromQuery = searchParams.get('approval')
  const user = useAuth((state) => state.user)
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()

  const request = useRequests((state) => (id ? state.byId(id) : undefined))
  const upsertRequest = useRequests((state) => state.upsertFromApi)

  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<ApprovalResponse[]>([])
  const [activeApproval, setActiveApproval] = useState<ApprovalResponse | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const challengeCacheRef = useRef<Map<string, ApprovalChallengeResponse<'Decision'>>>(
    new Map(),
  )

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      setLoading(true)
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
          (user?.id ? approvalList.find((item) => item.approverId === user.id) ?? null : null)

        if (!current && approvalList.length > 0) {
          current = approvalList[0]
        }

        setActiveApproval(current ?? null)
        setNote(current?.comments ?? '')
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Failed to load approval detail'
        toast.error(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [approvalIdFromQuery, id, request, upsertRequest, user?.id])

  useEffect(() => {
    setNote(activeApproval?.comments ?? '')
  }, [activeApproval?.id])

  const canAct = Boolean(
    activeApproval &&
      activeApproval.status === 'PENDING' &&
      (user?.primaryRole === 'approver' || user?.primaryRole === 'admin') &&
      (!user?.id || activeApproval.approverId === user.id),
  )

  const isLeave = request?.type === 'leave'
  const leaveRequest = isLeave ? (request as LeaveRequest) : undefined
  const overtimeRequest = !isLeave ? (request as OvertimeRequest) : undefined
  const leaveLabel = leaveRequest ? resolveLeaveTypeLabel(leaveRequest.leaveTypeId) : undefined

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

  async function handleDecision(decision: 'APPROVED' | 'REJECTED') {
    if (!id || !activeApproval) return
    if (!walletClient) {
      toast.error('Connect your wallet to submit a decision.')
      return
    }
    if (!address) {
      toast.error('No wallet address found. Please reconnect and try again.')
      return
    }

    setSubmitting(decision)
    setErrorMessage(null)
    try {
      let challenge = challengeCacheRef.current.get(activeApproval.id)
      if (!challenge || isChallengeExpired(challenge)) {
        challenge = await getApprovalChallenge(activeApproval.id)
        challengeCacheRef.current.set(activeApproval.id, challenge)
      }

      if (isChallengeExpired(challenge)) {
        challengeCacheRef.current.delete(activeApproval.id)
        throw new Error('Signature challenge expired. Please try again.')
      }

      let connectedAddress: Address
      let challengeAddress: Address
      try {
        connectedAddress = getAddress(address)
        challengeAddress = getAddress(challenge.walletAddress)
      } catch {
        throw new Error('Invalid wallet address provided by challenge. Please retry.')
      }

      if (!isAddressEqual(connectedAddress, challengeAddress)) {
        throw new Error('Connected wallet does not match the approver address on file.')
      }

      const trimmedNote = note.trim()
      const typedMessage: Record<string, unknown> = {
        ...challenge.message,
        decision,
      }

      if (trimmedNote.length > 0) {
        typedMessage.commentsHash = keccak256(stringToBytes(trimmedNote))
      }

      const signature = await walletClient.signTypedData({
        account: connectedAddress,
        domain: challenge.domain,
        types: challenge.types,
        primaryType: challenge.primaryType ?? 'Decision',
        message: typedMessage,
      })

      const updatedApproval = await updateApproval(activeApproval.id, {
        decision,
        comments: trimmedNote.length > 0 ? trimmedNote : undefined,
        nonce: challenge.nonce,
        signature,
      })

      setApprovals((prev) =>
        prev.map((item) => (item.id === updatedApproval.id ? updatedApproval : item)),
      )
      setActiveApproval((prev) => (prev && prev.id === updatedApproval.id ? updatedApproval : prev))
      challengeCacheRef.current.delete(activeApproval.id)

      const updatedRequest = await getRequest(id)
      upsertRequest(updatedRequest)

      toast.success(decision === 'APPROVED' ? 'Request approved' : 'Request rejected')
      router.push('/approver/approval')
    } catch (error) {
      const status = (error as any)?.status as number | undefined
      const message =
        status === 422
          ? 'Signature invalid or wrong account. Please reconnect with the correct wallet.'
          : error instanceof Error
          ? error.message
          : 'Failed to submit decision'
      console.error('Failed to submit approval decision', error)
      toast.error(message)
      setErrorMessage(message)
      if (activeApproval) {
        challengeCacheRef.current.delete(activeApproval.id)
      }
    } finally {
      setSubmitting(null)
    }
  }

  const primaryApproval = activeApproval ?? approvals[0] ?? null

  const employeeName =
    request?.employeeName ??
    primaryApproval?.requesterName ??
    request?.employeeId ??
    primaryApproval?.requesterId ??
    'Unknown employee'
  const department =
    request?.employeeDepartment ??
    primaryApproval?.requesterDepartment ??
    '—'

  const statusTone = request?.status === 'approved'
    ? 'bg-green-50 text-green-700 ring-green-200'
    : request?.status === 'rejected'
    ? 'bg-rose-50 text-rose-700 ring-rose-200'
    : request?.status === 'pending'
    ? 'bg-amber-50 text-amber-700 ring-amber-200'
    : 'bg-slate-100 text-slate-600 ring-slate-200'

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-28">
      <PageHeader
        title="Approval Detail"
        backHref="/approver/approval"
        fullBleed
        bleedMobileOnly
        pullUpPx={24}
      />

      {loading && <p className="mt-8 text-center text-sm text-slate-500">Loading request…</p>}

      {!loading && !request && (
        <p className="mt-8 text-center text-sm text-slate-500">
          Request data unavailable. It may have been removed.
        </p>
      )}

      {!loading && request && (
        <div className="space-y-6">
          <section className="card space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Request {request.id}</h1>
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
              <InfoRow label="Type">
                <span className="capitalize font-semibold">{request.type}</span>
              </InfoRow>
              {leaveRequest ? (
                <>
                  <InfoRow label="Leave type">{leaveLabel ?? leaveRequest.leaveTypeId}</InfoRow>
                  <InfoRow label="Start">{leaveRequest.startDate}</InfoRow>
                  <InfoRow label="End">{leaveRequest.endDate}</InfoRow>
                  <InfoRow label="Duration">{leaveRequest.days} hari</InfoRow>
                </>
              ) : overtimeRequest ? (
                <>
                  <InfoRow label="Work date">{overtimeRequest.workDate}</InfoRow>
                  <InfoRow label="From">{overtimeRequest.startTime}</InfoRow>
                  <InfoRow label="To">{overtimeRequest.endTime}</InfoRow>
                  <InfoRow label="Hours">{overtimeRequest.hours}</InfoRow>
                </>
              ) : null}
              <InfoRow label="Reason">{request.reason ?? '—'}</InfoRow>
              <InfoRow label="Notes">{request.notes ?? '—'}</InfoRow>
              <InfoRow label="Attachment">
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
              </InfoRow>
            </div>
          </section>

          <section className="card space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Approval chain</h2>
              {activeApproval && (
                <span className="text-xs text-slate-500">
                  You are at stage {activeApproval.stage}
                  {activeApproval.approverLevel ? ` • ${activeApproval.approverLevel}` : ''}
                </span>
              )}
            </div>

            {approvals.length === 0 ? (
              <p className="text-sm text-slate-500">No approval records found for this request.</p>
            ) : (
              <ul className="space-y-2">
                {approvals.map((item) => (
                  <li
                    key={item.id}
                    className={clsx(
                      'rounded-xl border p-3 text-sm',
                      item.id === activeApproval?.id
                        ? 'border-[#00156B] bg-[#00156B]/5'
                        : 'border-slate-200 bg-white',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-slate-900">
                        Stage {item.stage}
                        {item.approverLevel ? ` • ${item.approverLevel}` : ''}
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {formatApprovalStatus(item.status)}
                      </span>
                    </div>
                <div className="mt-1 text-xs text-slate-500">
                  {item.decidedAt ? `Decided ${formatWhen(item.decidedAt)}` : 'Awaiting decision'}
                </div>
                {item.comments && (
                  <p className="mt-2 text-sm text-slate-600">“{item.comments}”</p>
                )}
              </li>
            ))}
          </ul>
        )}
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="text-base font-semibold text-slate-900">Decision</h2>
            {!activeApproval && (
              <p className="text-sm text-slate-500">
                We were unable to find an approval entry assigned to you.
              </p>
            )}

            {activeApproval && (
              <>
                <textarea
                  rows={4}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#00156B] focus:ring-2 focus:ring-[#00156B]/20 disabled:bg-slate-100"
                  placeholder="Add a note for the employee (optional)"
                  disabled={!canAct || submitting !== null}
                />
                {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => router.push('/approver/approval')}
                    disabled={submitting !== null}
                  >
                    Back to list
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleDecision('REJECTED')}
                    disabled={!canAct || submitting !== null}
                  >
                    {submitting === 'REJECTED' ? 'Submitting…' : 'Request changes'}
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl bg-[#00156B] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleDecision('APPROVED')}
                    disabled={!canAct || submitting !== null}
                  >
                    {submitting === 'APPROVED' ? 'Approving…' : 'Approve request'}
                  </button>
                </div>

                {!canAct && (
                  <p className="text-xs text-slate-500">
                    Approval is no longer pending or you are not the assigned approver for this stage.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px,1fr] items-start gap-3 text-sm">
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

function isChallengeExpired(
  challenge: ApprovalChallengeResponse<'Decision'>,
  graceMs = 5000,
): boolean {
  const expiryMs = normalizeEpochMs(challenge.expiresAt)
  if (expiryMs === null) return false
  return expiryMs <= Date.now() + graceMs
}

function normalizeEpochMs(input: unknown): number | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null
    return input < 1e12 ? input * 1000 : input
  }
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return null
    const numeric = Number(trimmed)
    if (Number.isFinite(numeric)) {
      return numeric < 1e12 ? numeric * 1000 : numeric
    }
    const parsed = Date.parse(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}
