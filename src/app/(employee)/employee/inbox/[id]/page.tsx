'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import type { LeaveRequest, OvertimeRequest, Request } from '@/lib/types'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'
import { buildAttachmentDownloadUrl, formatAttachmentSize } from '@/lib/api/attachments'
import { getRequest } from '@/lib/api/requests'
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
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)
  const [attachmentLoading, setAttachmentLoading] = useState(false)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  useEffect(() => {
    if (!requestId) return
    let cancelled = false

    setError(null)
    setAttachmentPreview(null)
    setAttachmentError(null)
    setAttachmentLoading(false)
    setLoading(true)

    const cached = byId(requestId)
    setRequest(cached ?? null)
    markRead(requestId)

    getRequest(requestId)
      .then((response) => {
        if (cancelled) return
        const normalized = upsertFromApi(response)
        setRequest(normalized)
      })
      .catch((err) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to load request detail'
        toast.error(message)
        setError(message)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [requestId, byId, upsertFromApi, markRead])

  useEffect(() => {
    if (!requestId) return

    if (!request?.attachmentId || !request.attachmentDownloadPath) {
      setAttachmentPreview(null)
      setAttachmentLoading(false)
      setAttachmentError(null)
      return
    }

    const mime = request.attachmentMimeType ?? ''
    if (!mime.startsWith('image/')) {
      setAttachmentPreview(null)
      setAttachmentLoading(false)
      setAttachmentError(null)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    let objectUrl: string | null = null

    async function loadAttachment() {
      setAttachmentLoading(true)
      setAttachmentError(null)
      try {
        const url = buildAttachmentDownloadUrl(request.attachmentId!, request.attachmentDownloadPath!)
        const response = await fetch(url, {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`Failed to load attachment (${response.status})`)
        }
        const blob = await response.blob()
        if (cancelled) return
        if (!blob.type.startsWith('image/')) {
          setAttachmentPreview(null)
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setAttachmentPreview(objectUrl)
      } catch (err) {
        if (controller.signal.aborted || cancelled) return
        console.error(err)
        setAttachmentError('Gagal memuat lampiran.')
        setAttachmentPreview(null)
      } finally {
        if (!controller.signal.aborted && !cancelled) {
          setAttachmentLoading(false)
        }
      }
    }

    loadAttachment()

    return () => {
      cancelled = true
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [requestId, request?.attachmentId, request?.attachmentDownloadPath, request?.attachmentMimeType])

  const isLeave = request?.type === 'leave'
  const detailLeave = isLeave ? (request as LeaveRequest) : null
  const detailOvertime =
    !isLeave && request?.type === 'overtime' ? (request as OvertimeRequest) : null

  const attachmentLink =
    request?.attachmentId && request.attachmentDownloadPath
      ? buildAttachmentDownloadUrl(request.attachmentId, request.attachmentDownloadPath)
      : null

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Detail Permintaan"
        backHref="/employee/inbox"
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
            {attachmentLoading ? (
              <div className="mt-2 text-sm text-gray-500">Memuat lampiran…</div>
            ) : request.attachmentId ? (
              <div className="mt-2 space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  {request.attachmentName ?? 'Lampiran'}
                  {attachmentSize ? ` • ${attachmentSize}` : ''}
                </div>
                {attachmentError && (
                  <div className="text-xs text-rose-600">{attachmentError}</div>
                )}
                {attachmentPreview ? (
                  <img
                    src={attachmentPreview}
                    alt={request.attachmentName ?? 'Lampiran'}
                    className="max-h-64 w-full rounded-xl border object-contain"
                  />
                ) : (
                  <a
                    href={attachmentLink ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-[var(--B-700)] hover:underline"
                  >
                    Unduh lampiran
                  </a>
                )}
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-500">Tidak ada lampiran</div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
