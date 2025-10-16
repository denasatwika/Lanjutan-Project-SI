// app/(employee)/employee/inbox/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import type { LeaveRequest, OvertimeRequest, Request } from '@/lib/types'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import { Bell, CheckCircle2, Clock3, X, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import clsx from 'clsx'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'
import { toast } from 'sonner'
import { buildAttachmentDownloadUrl, formatAttachmentSize } from '@/lib/api/attachments'
import { getRequest } from '@/lib/api/requests'

// ------------------------------
// Small local "read" store (persisted in localStorage)
// ------------------------------
type ReadState = {
  read: Record<string, true>
  markRead: (id: string) => void
  markAll: (ids: string[]) => void
  clear: () => void
}
const useInboxRead = create<ReadState>()(
  persist(
    (set) => ({
      read: {},
      markRead: (id) => set((s) => ({ read: { ...s.read, [id]: true } })),
      markAll: (ids) =>
        set((s) => ({
          read: { ...s.read, ...Object.fromEntries(ids.map((i) => [i, true])) },
        })),
      clear: () => set({ read: {} }),
    }),
    { name: 'inbox-read-v1' }
  )
)

// ------------------------------
// Helpers
// ------------------------------
function fDate(iso: string | undefined) {
  if (!iso) return '-'
  return format(new Date(iso), 'd MMM yyyy • HH:mm', { locale: idLocale })
}

function fDateOnly(iso?: string | null) {
  if (!iso) return '-'
  return format(new Date(iso), 'd MMM yyyy', { locale: idLocale })
}

function StatusPill({ status }: { status: Request['status'] }) {
  const map: Record<Request['status'], string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-rose-100 text-rose-700',
  }
  const label =
    status === 'pending'
      ? 'Menunggu'
      : status === 'approved'
      ? 'Approved'
      : status === 'rejected'
      ? 'Rejected'
      : 'Draft'
  return (
    <span className={clsx('px-3 py-1 rounded-full text-xs font-semibold', map[status])}>
      {label}
    </span>
  )
}

export default function InboxPage() {
  const user = useAuth((s) => s.user)
  const all = useRequests((s) => (user ? s.forEmployee(user.id) : []))
  const loadRequests = useRequests((s) => s.load)
  const upsertFromApi = useRequests((s) => s.upsertFromApi)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)
  const [attachmentLoading, setAttachmentLoading] = useState(false)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    loadRequests({ requesterId: user.id }).catch((error) => {
      const message = error instanceof Error ? error.message : 'Failed to load requests'
      toast.error(message)
    })
  }, [user?.id, loadRequests])

  // Only leave + overtime, excluding drafts
  const updates = useMemo(() => {
    const list = all
      .filter((r) => (r.type === 'leave' || r.type === 'overtime') && r.status !== 'draft')
      .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
    return list
  }, [all])

  const filtered = updates.filter((r) => (filter === 'all' ? true : r.status === filter))

  // read state
  const read = useInboxRead((s) => s.read)
  const markRead = useInboxRead((s) => s.markRead)
  const markAll = useInboxRead((s) => s.markAll)

  async function handleViewDetail(id: string) {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError(null)
    const cached = all.find((item) => item.id === id)
    setSelectedRequest(cached ?? null)
    setAttachmentPreview(null)
    setAttachmentError(null)
    setAttachmentLoading(false)

    try {
      const response = await getRequest(id)
      const normalized = upsertFromApi(response)
      setSelectedRequest(normalized)
      markRead(id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load request detail'
      toast.error(message)
      setDetailError(message)
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetailOpen(false)
    setSelectedRequest(null)
    setDetailError(null)
    setAttachmentPreview(null)
    setAttachmentError(null)
    setAttachmentLoading(false)
  }

  useEffect(() => {
    if (!detailOpen) {
      setAttachmentPreview(null)
      setAttachmentLoading(false)
      setAttachmentError(null)
      return
    }

    const current = selectedRequest
    const attachmentId = current?.attachmentId
    if (!current || !attachmentId) {
      setAttachmentPreview(null)
      setAttachmentLoading(false)
      setAttachmentError(null)
      return
    }

    const downloadPath = current.attachmentDownloadPath
    const mime = current.attachmentMimeType ?? ''
    if (!mime.startsWith('image/')) {
      setAttachmentPreview(null)
      setAttachmentLoading(false)
      setAttachmentError(null)
      return
    }

    const id = attachmentId as string
    const path = downloadPath

    let cancelled = false
    const controller = new AbortController()
    let objectUrl: string | null = null

    async function loadAttachment() {
      setAttachmentLoading(true)
      setAttachmentError(null)
      try {
        const url = buildAttachmentDownloadUrl(id, path)
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
      } catch (error) {
        if (controller.signal.aborted || cancelled) return
        console.error(error)
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
  }, [
    detailOpen,
    selectedRequest?.attachmentId,
    selectedRequest?.attachmentMimeType,
    selectedRequest?.attachmentDownloadPath,
  ])

  const isDetailLeave = selectedRequest?.type === 'leave'
  const detailLeave = isDetailLeave ? (selectedRequest as LeaveRequest) : null
  const detailOvertime =
    !isDetailLeave && selectedRequest?.type === 'overtime'
      ? (selectedRequest as OvertimeRequest)
      : null
  const detailAttachmentLink = selectedRequest?.attachmentId
    ? buildAttachmentDownloadUrl(
        selectedRequest.attachmentId,
        selectedRequest.attachmentDownloadPath,
      )
    : null
  const detailAttachmentSize =
    selectedRequest && typeof selectedRequest.attachmentSize === 'number' && selectedRequest.attachmentSize > 0
      ? formatAttachmentSize(selectedRequest.attachmentSize)
      : null
  const detailTypeLabel = selectedRequest
    ? selectedRequest.type === 'leave'
      ? resolveLeaveTypeLabel(detailLeave?.leaveTypeId) ?? 'Permintaan Cuti'
      : 'Permintaan Lembur'
    : ''

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbox"
        backHref="/employee/dashboard"
        fullBleed
        bleedMobileOnly    // <-- key line
        pullUpPx={24}      // cancels AppShell pt-6
      />

      {!user ? (
        <section className="card p-5 text-sm text-gray-600">
          Please Login
        </section>
      ) : (
        <>
      {/* Filters */}
      <div className="flex items-center gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={clsx(
  'px-3 py-1.5 rounded-full text-sm font-medium border',
  filter === f.key
    ? 'bg-[#00156B] text-white border-[var(--B-200)]' // <-- This line is changed
    : 'text-gray-700 hover:bg-gray-50 border-gray-200'
)}
          >
            {f.label}
          </button>
        ))}
        {filtered.length > 0 && (
          <button
            onClick={() => markAll(filtered.map((r) => r.id))}
            className="ml-auto text-sm text-[var(--B-700)] hover:underline"
          >
            Tandai semua dibaca
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((r) => {
          const isRead = !!read[r.id]
          const isLeave = r.type === 'leave'
          const icon =
            r.status === 'approved' ? (
              <CheckCircle2 className="text-green-600" />
            ) : r.status === 'rejected' ? (
              <XCircle className="text-rose-600" />
            ) : (
              <Clock3 className="text-amber-500" />
            )

          const title =
            isLeave
              ? `Permintaan ${resolveLeaveTypeLabel((r as LeaveRequest).leaveTypeId) ?? 'Izin'}`
              : 'Permintaan Lembur'

          const desc =
            isLeave
              ? [
                  r.startDate ? `Mulai: ${fDate(r.startDate)}` : null,
                  r.endDate ? `Selesai: ${fDate(r.endDate)}` : null,
                ]
                  .filter(Boolean)
                  .join(' • ')
              : [
                  r.workDate ? `Tanggal: ${fDate(r.workDate)}` : null,
                  r.startTime && r.endTime
                    ? `Jam: ${r.startTime}–${r.endTime}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' • ')

          return (
            <div
              key={r.id}
              className={clsx(
                'card p-4 flex gap-3 items-start border transition',
                !isRead && 'ring-1 ring-[var(--B-200)]'
              )}
            >
              <div className="shrink-0 size-10 rounded-full grid place-items-center bg-gray-50">
                {icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {r.updatedAt ? `Diperbarui ${fDate(r.updatedAt)}` : `Dibuat ${fDate(r.createdAt)}`}
                    </div>
                  </div>
                  <StatusPill status={r.status} />
                </div>

                {desc && <div className="text-sm text-gray-700 mt-2">{desc}</div>}

                {r.reason && (
                  <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                    Alasan: {r.reason}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-3">
                  {!isRead && (
                    <button
                      onClick={() => markRead(r.id)}
                      className="text-sm text-[var(--B-700)] hover:underline"
                    >
                      Tandai dibaca
                    </button>
                  )}
                  <button
                    onClick={() => handleViewDetail(r.id)}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    Lihat detail
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="card p-6 text-center text-gray-500">
            <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-gray-100 grid place-items-center">
              <Bell className="text-gray-400" size={18} />
            </div>
            No notifications found
          </div>
        )}
      </div>
        </>
      )}

      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetail} />
          <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Detail Permintaan</h2>
                {selectedRequest && (
                  <p className="mt-1 text-sm text-gray-500">{detailTypeLabel}</p>
                )}
              </div>
              <button
                onClick={closeDetail}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="size-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-sm text-gray-500">Memuat detail…</div>
            ) : detailError ? (
              <div className="py-12 text-center text-sm text-rose-600">{detailError}</div>
            ) : selectedRequest ? (
              <div className="mt-4 space-y-4 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  <StatusPill status={selectedRequest.status} />
                </div>

                <div className="grid gap-1">
                  <div className="text-gray-500">Dibuat</div>
                  <div>{fDate(selectedRequest.createdAt)}</div>
                  {selectedRequest.updatedAt && selectedRequest.updatedAt !== selectedRequest.createdAt && (
                    <div className="mt-2">
                      <div className="text-gray-500">Diperbarui</div>
                      <div>{fDate(selectedRequest.updatedAt)}</div>
                    </div>
                  )}
                </div>

                {isDetailLeave && detailLeave ? (
                  <div className="grid gap-1">
                    <div className="text-gray-500">Tanggal Cuti</div>
                    <div>
                      {fDateOnly(detailLeave.startDate)} – {fDateOnly(detailLeave.endDate)}
                    </div>
                    <div className="text-gray-500 mt-2">Durasi</div>
                    <div>{detailLeave.days} hari</div>
                  </div>
                ) : (
                  <div className="grid gap-1">
                    <div className="text-gray-500">Tanggal Lembur</div>
                    <div>{fDateOnly(detailOvertime?.workDate)}</div>
                    {detailOvertime?.startTime && detailOvertime?.endTime && (
                      <>
                        <div className="text-gray-500 mt-2">Jam</div>
                        <div>{detailOvertime.startTime} – {detailOvertime.endTime}</div>
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

                {selectedRequest.reason && (
                  <div>
                    <div className="text-gray-500">Alasan</div>
                    <div className="whitespace-pre-wrap">{selectedRequest.reason}</div>
                  </div>
                )}

                {selectedRequest.notes && (
                  <div>
                    <div className="text-gray-500">Catatan</div>
                    <div className="whitespace-pre-wrap">{selectedRequest.notes}</div>
                  </div>
                )}

                <div>
                  <div className="text-gray-500">Lampiran</div>
                  {attachmentLoading ? (
                    <div className="mt-2 text-sm text-gray-500">Memuat lampiran…</div>
                  ) : selectedRequest.attachmentId ? (
                    <div className="mt-2 space-y-2">
                      <div className="text-sm font-medium text-gray-700">
                        {selectedRequest.attachmentName ?? 'Lampiran'}
                        {detailAttachmentSize ? ` • ${detailAttachmentSize}` : ''}
                      </div>
                      {attachmentError && (
                        <div className="text-xs text-rose-600">{attachmentError}</div>
                      )}
                      {attachmentPreview ? (
                        <img
                          src={attachmentPreview}
                          alt={selectedRequest.attachmentName ?? 'Lampiran'}
                          className="max-h-64 w-full rounded-xl border object-contain"
                        />
                      ) : (
                        <a
                          href={detailAttachmentLink ?? '#'}
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
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-gray-500">Detail tidak tersedia.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
