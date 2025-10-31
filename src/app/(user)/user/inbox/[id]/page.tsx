'use client'

import Image from 'next/image'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import type { LeaveRequest, OvertimeRequest, Request } from '@/lib/types'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'
import { buildAttachmentDownloadUrl, formatAttachmentSize, normalizeAttachmentUrl } from '@/lib/api/attachments'
import { getRequest, listApprovals, type ApprovalResponse } from '@/lib/api/requests'
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

  const totalApprovals = approvals.length
  const approvedCount = approvals.reduce(
    (count, approval) => (approval.status === 'APPROVED' ? count + 1 : count),
    0,
  )
  const approvalProgress = totalApprovals > 0 ? Math.round((approvedCount / totalApprovals) * 100) : 0
  const approvalsEmptyMessage = approvalsError ?? 'Belum ada data persetujuan.'

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
            {approvals.length === 0 ? (
              <div className="mt-2 text-sm text-gray-500">{approvalsEmptyMessage}</div>
            ) : (
              <>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {approvedCount} dari {totalApprovals} disetujui
                    </span>
                    <span>{approvalProgress}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-[#00156B]"
                      style={{ width: `${approvalProgress}%` }}
                    />
                  </div>
                </div>

                <ul className="mt-4 space-y-2">
                  {approvals.map((approval) => (
                    <li key={approval.id} className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="font-medium text-gray-900">
                          Tahap {approval.stage}
                          {approval.approverLevel ? ` • ${approval.approverLevel}` : ''}
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {formatApprovalStatus(approval.status)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {approval.decidedAt
                          ? `Diputuskan ${formatDateTime(approval.decidedAt)}`
                          : 'Menunggu keputusan'}
                      </div>
                      {approval.comments && (
                        <p className="mt-2 text-sm text-gray-600">"{approval.comments}"</p>
                      )}
                    </li>
                  ))}
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
