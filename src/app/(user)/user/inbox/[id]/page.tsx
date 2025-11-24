'use client'

import Image from 'next/image'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { encodeAbiParameters, getAddress, keccak256 } from 'viem'
import { PageHeader } from '@/components/PageHeader'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import type { LeaveRequest, OvertimeRequest, Request } from '@/lib/types'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'
import { buildAttachmentDownloadUrl, formatAttachmentSize, normalizeAttachmentUrl } from '@/lib/api/attachments'
import { getRequest, listApprovals, type ApprovalResponse } from '@/lib/api/requests'
import { getLeaveRequest } from '@/lib/api/leaveRequests'
import { getApprovalState, type ApprovalState } from '@/lib/api/multisig'
import { StatusPill, formatDateOnly, formatDateTime } from '../utils'
import { useInboxRead } from '../useInboxRead'
import { toast } from 'sonner'

export default function InboxDetailPage() {
  const params = useParams<{ id: string }>()
  const requestId = Array.isArray(params?.id) ? params?.id[0] : params?.id
  const user = useAuth((state) => state.user)
  const byId = useRequests((state) => state.byId)
  const upsertFromApi = useRequests((state) => state.upsertFromApi)
  const markRead = useInboxRead((state) => state.markRead)

  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [approvals, setApprovals] = useState<ApprovalResponse[]>([])
  const [approvalsError, setApprovalsError] = useState<string | null>(null)
  const [approvalState, setApprovalState] = useState<ApprovalState | null>(null)
  const [loadingApprovalState, setLoadingApprovalState] = useState(false)
  const [onChainRequestId, setOnChainRequestId] = useState<`0x${string}` | null>(null)
  const [requesterWallet, setRequesterWallet] = useState<`0x${string}` | null>(null)
  useEffect(() => {
    if (!requestId) return
    let cancelled = false

    setError(null)
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

        const requestFailed = requestResult.status === 'rejected'

        if (requestResult.status === 'fulfilled') {
          const normalized = upsertFromApi(requestResult.value)
          setRequest(normalized)
        } else {
          const reason = requestResult.reason
          const message =
            reason instanceof Error ? reason.message : 'Failed to load request detail'
          toast.error(message)
          setError(message)
        }

        if (approvalsResult.status === 'fulfilled') {
          setApprovals(approvalsResult.value)
        } else {
          const reason = approvalsResult.reason
          const message =
            reason instanceof Error ? reason.message : 'Failed to load approval chain'
          if (!requestFailed) {
            toast.error(message)
          }
          setApprovals([])
          setApprovalsError('Gagal memuat riwayat persetujuan.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [requestId, byId, upsertFromApi, markRead])

  useEffect(() => {
    if (!request || request.type !== 'leave') {
      setOnChainRequestId(null)
      setRequesterWallet(null)
      return
    }

    let cancelled = false
    const approvalMeta = approvals.find((item) => item.onChainRequestId || item.requesterWalletAddress)

    if (approvalMeta?.onChainRequestId) {
      setOnChainRequestId((prev) => prev ?? (approvalMeta.onChainRequestId as `0x${string}`))
    }

    if (approvalMeta?.requesterWalletAddress) {
      setRequesterWallet((prev) => prev ?? getAddress(approvalMeta.requesterWalletAddress as `0x${string}`))
    }

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
  }, [request?.id, request?.type, approvals])

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
        console.error('Failed to load on-chain approval state', error)
      } finally {
        if (!cancelled) {
          setLoadingApprovalState(false)
        }
      }
    }

    loadOnChainApprovalState()

    return () => {
      cancelled = true
    }
  }, [request, onChainRequestId, requesterWallet])

  const attachmentUrl = normalizeAttachmentUrl(request?.attachmentUrl, request?.attachmentCid)
  const isImageAttachment = Boolean(request?.attachmentMimeType?.startsWith('image/'))
  const attachmentDownloadHref =
    attachmentUrl ??
    (request?.attachmentId
      ? buildAttachmentDownloadUrl(request.attachmentId, request.attachmentDownloadPath)
      : null)
  const attachmentPreviewSrc = attachmentUrl && isImageAttachment ? attachmentUrl : null

  const isLeave = request?.type === 'leave'
  const detailLeave = isLeave ? (request as LeaveRequest) : null
  const detailOvertime =
    !isLeave && request?.type === 'overtime' ? (request as OvertimeRequest) : null

  const attachmentSize =
    request && typeof request.attachmentSize === 'number' && request.attachmentSize > 0
      ? formatAttachmentSize(request.attachmentSize)
      : null

  const typeLabel = request
    ? request.type === 'leave'
      ? resolveLeaveTypeLabel(detailLeave?.leaveTypeId) ?? 'Permintaan Cuti'
      : request.type === 'overtime'
        ? 'Permintaan Lembur'
      : ''
    : ''

  const onChainApprovals = approvalState?.approvals ?? []
  const totalApprovals =
    approvalState?.threshold ??
    (approvals.length > 0 ? approvals.length : onChainApprovals.length)
  const approvedCount = approvalState
    ? approvalState.approvalCount
    : approvals.reduce(
        (count, approval) => (approval.status === 'APPROVED' ? count + 1 : count),
        0,
      )
  const approvalProgress = totalApprovals > 0 ? Math.round((approvedCount / totalApprovals) * 100) : 0
  const approvalsEmptyMessage = approvalsError ?? 'Belum ada data persetujuan.'
  const hasApprovalData = approvals.length > 0 || onChainApprovals.length > 0

  const approvalsToRender = approvals.length > 0
    ? approvals.map((approval) => {
        const roleKey = approval.approverLevel?.toUpperCase() ?? ''
        const onChain = roleKey
          ? onChainApprovals.find((item) => item.approverRole.toUpperCase() === roleKey)
          : undefined
        return {
          key: approval.id,
          stage: approval.stage,
          approverLevel: approval.approverLevel ?? null,
          status: approval.status,
          decidedAt: approval.decidedAt ?? null,
          comments: approval.comments ?? null,
          signature: approval.signature ?? null,
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
        onChain,
      }))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Detail Permintaan"
        backHref="/user/inbox"
        fullBleed
        bleedMobileOnly
        pullUpPx={24}
      />

      {!user ? (
        <section className="card p-5 text-sm text-gray-600">Please Login</section>
      ) : loading ? (
        <section className="card p-6 text-center text-sm text-gray-500">Memuat detail…</section>
      ) : error ? (
        <section className="card p-6 text-center text-sm text-rose-600">{error}</section>
      ) : !request ? (
        <section className="card p-6 text-center text-sm text-gray-500">
          Detail tidak tersedia.
        </section>
      ) : (
        <section className="card p-6 space-y-4 text-sm text-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{typeLabel || 'Detail Permintaan'}</h2>
              <p className="mt-1 text-xs text-gray-500">
                ID Permintaan: <span className="font-medium text-gray-700">{request.id}</span>
              </p>
            </div>
            <StatusPill status={request.status} />
          </div>

          <div className="grid gap-1">
            <div className="text-gray-500">Dibuat</div>
            <div>{formatDateTime(request.createdAt)}</div>
            {request.updatedAt && request.updatedAt !== request.createdAt && (
              <div className="mt-2">
                <div className="text-gray-500">Diperbarui</div>
                <div>{formatDateTime(request.updatedAt)}</div>
              </div>
            )}
          </div>

          {isLeave && detailLeave ? (
            <div className="grid gap-1">
              <div className="text-gray-500">Tanggal Cuti</div>
              <div>
                {formatDateOnly(detailLeave.startDate)} – {formatDateOnly(detailLeave.endDate)}
              </div>
              <div className="text-gray-500 mt-2">Durasi</div>
              <div>{detailLeave.days} hari</div>
            </div>
          ) : (
            <div className="grid gap-1">
              <div className="text-gray-500">Tanggal Lembur</div>
              <div>{formatDateOnly(detailOvertime?.workDate)}</div>
              {detailOvertime?.startTime && detailOvertime?.endTime && (
                <>
                  <div className="text-gray-500 mt-2">Jam</div>
                  <div>
                    {detailOvertime.startTime} – {detailOvertime.endTime}
                  </div>
                </>
              )}
              {typeof detailOvertime?.hours === 'number' && (
                <>
                  <div className="text-gray-500 mt-2">Durasi</div>
                  <div>{detailOvertime.hours} jam</div>
                </>
              )}
            </div>
          )}

          {request.reason && (
            <div>
              <div className="text-gray-500">Alasan</div>
              <div className="whitespace-pre-wrap">{request.reason}</div>
            </div>
          )}

          {request.notes && (
            <div>
              <div className="text-gray-500">Catatan</div>
              <div className="whitespace-pre-wrap">{request.notes}</div>
            </div>
          )}

          <div>
            <div className="text-gray-500">Lampiran</div>
            {request?.attachmentId || request?.attachmentUrl ? (
              <div className="mt-2 space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  {request.attachmentName ?? 'Lampiran'}
                  {attachmentSize ? ` • ${attachmentSize}` : ''}
                </div>
                {isImageAttachment && attachmentPreviewSrc ? (
                  <a
                    href={attachmentDownloadHref ?? attachmentPreviewSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Image
                      src={attachmentPreviewSrc}
                      alt={request.attachmentName ?? 'Lampiran'}
                      width={800}
                      height={600}
                      className="h-auto max-h-72 w-full object-contain"
                    />
                  </a>
                ) : attachmentDownloadHref ? (
                  <a
                    href={attachmentDownloadHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-[var(--B-700)] hover:underline"
                  >
                    Unduh lampiran
                  </a>
                ) : (
                  <div className="text-sm text-gray-500">Lampiran tidak tersedia.</div>
                )}
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-500">Tidak ada lampiran</div>
            )}
          </div>

          <div>
            <div className="text-gray-500">Riwayat Persetujuan</div>
            {!hasApprovalData ? (
              <div className="mt-2 text-sm text-gray-500">
                {loadingApprovalState && isLeave ? 'Memuat status persetujuan…' : approvalsEmptyMessage}
              </div>
            ) : (
              <>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {approvedCount} dari {totalApprovals || approvalsToRender.length} disetujui
                    </span>
                    <span>{approvalProgress}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-[#00156B]"
                      style={{ width: `${approvalProgress}%` }}
                    />
                  </div>
                  {loadingApprovalState && isLeave && (
                    <div className="mt-1 text-[11px] text-gray-500">Memuat status on-chain…</div>
                  )}
                </div>

                <ul className="mt-4 space-y-2">
                  {approvalsToRender.map((approval) => {
                    const decidedAt = approval.decidedAt ?? approval.onChain?.approvedAt ?? null
                    const statusLabel = formatApprovalStatus(approval.status)
                    return (
                      <li key={approval.key} className="rounded-xl border border-gray-200 bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="font-medium text-gray-900">
                            Tahap {approval.stage}
                            {approval.approverLevel ? ` • ${approval.approverLevel}` : ''}
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {statusLabel}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {decidedAt ? `Diputuskan ${formatDateTime(decidedAt)}` : 'Menunggu keputusan'}
                        </div>
                        {approval.comments && (
                          <p className="mt-2 text-sm text-gray-600">"{approval.comments}"</p>
                        )}
                        {approval.signature && (
                          <div
                            className="mt-2 break-all text-[11px] font-mono text-gray-500"
                            title={approval.signature}
                          >
                            Signature: {formatSignaturePreview(approval.signature)}
                          </div>
                        )}
                        {approval.onChain && (
                          <div className="mt-2 space-y-1 rounded-lg bg-gray-50 p-3 text-[11px] text-gray-600">
                            <div className="text-xs font-semibold text-gray-800">Detail on-chain</div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-gray-500">Dompet:</span>
                              <span className="font-mono text-[11px] text-gray-800">
                                {formatAddressPreview(approval.onChain.approverAddress)}
                              </span>
                            </div>
                            {approval.onChain.txHash && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-gray-500">Tx:</span>
                                <span className="font-mono text-[11px] text-gray-800">
                                  {formatSignaturePreview(approval.onChain.txHash)}
                                </span>
                              </div>
                            )}
                            <div
                              className={`flex items-center gap-1 ${
                                approval.onChain.onChainConfirmed ? 'text-green-700' : 'text-amber-700'
                              }`}
                            >
                              <span>
                                {approval.onChain.onChainConfirmed
                                  ? 'Terkonfirmasi di blockchain'
                                  : 'Menunggu konfirmasi blockchain'}
                              </span>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function formatApprovalStatus(status: ApprovalResponse['status']) {
  if (status === 'APPROVED') return 'Disetujui'
  if (status === 'REJECTED') return 'Ditolak'
  if (status === 'BLOCKED') return 'Diblokir'
  if (status === 'CANCELLED') return 'Dibatalkan'
  if (status === 'DRAFT') return 'Draft'
  return 'Menunggu'
}

function formatSignaturePreview(value: string) {
  if (value.length <= 18) return value
  return `${value.slice(0, 10)}…${value.slice(-8)}`
}

function formatAddressPreview(value: string) {
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}
