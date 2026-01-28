'use client'

import Image from 'next/image'
import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import clsx from 'clsx'
import { toast } from 'sonner'
import { Paperclip, Download, ChevronRight } from 'lucide-react'

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
import type { LeaveRequest, OvertimeRequest } from '@/lib/types'

export default function ApproverHistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const request = useRequests((state) => (id ? state.byId(id) : undefined))
  const upsertRequest = useRequests((state) => state.upsertFromApi)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id || request) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const fetched = await getRequest(id)
        if (!cancelled) upsertRequest(fetched)
      } catch (e) {
        if (!cancelled) toast.error('Failed to load request')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, request, upsertRequest])

  // --- Derived Data ---
  const isLeave = request?.type === 'leave'
  const leaveData = isLeave ? (request as LeaveRequest) : undefined
  const overtimeData = request?.type === 'overtime' ? (request as OvertimeRequest) : undefined
  
  const attachmentUrl = normalizeAttachmentUrl(request?.attachmentUrl, request?.attachmentCid)
  const isImage = request?.attachmentMimeType?.startsWith('image/')
  const downloadUrl = attachmentUrl ?? (request?.attachmentId ? buildAttachmentDownloadUrl(request.attachmentId, request.attachmentDownloadPath) : null)

  const employeeName = request?.employeeName ?? request?.employeeId ?? 'Unknown'
  const department = request?.employeeDepartment ?? '—'

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-20">
      <PageHeader
        title="History Detail"
        backHref="/approver/history"
        fullBleed
        bleedMobileOnly
        pullUpPx={32}
      />

      {loading && !request && (
        <div className="mt-12 text-center text-sm text-slate-400">Loading details...</div>
      )}

      {request && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          
          {/* 1. Header Section: Identity & Status */}
          <div className="flex items-start justify-between border-b border-slate-100 p-6">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{employeeName}</h1>
              <p className="text-sm text-slate-500">{department}</p>
              <p className="mt-1 text-xs text-slate-400">
                Applied on {formatWhen(request.createdAt)}
              </p>
            </div>
            <StatusPill status={request.status} />
          </div>

          {/* 2. Key Metrics Grid (Simplified) */}
          <div className="grid grid-cols-2 gap-y-6 border-b border-slate-100 p-6 sm:grid-cols-4">
            <Metric label="Type" value={<span className="capitalize">{request.type}</span>} />
            
            {leaveData && (
              <>
                <Metric label="Category" value={leaveData.leaveTypeName ?? resolveLeaveTypeLabel(leaveData.leaveTypeId)} />
                <Metric label="Duration" value={`${leaveData.days} Days`} />
                <Metric label="Dates" value={
                  <div className="flex flex-col text-xs sm:text-sm">
                    <span>{leaveData.startDate}</span>
                    <span className="text-slate-400">to</span>
                    <span>{leaveData.endDate}</span>
                  </div>
                } />
              </>
            )}

            {overtimeData && (
              <>
                <Metric label="Date" value={overtimeData.workDate} />
                <Metric label="Hours" value={`${overtimeData.hours} hrs`} />
                <Metric label="Time" value={`${overtimeData.startTime} - ${overtimeData.endTime}`} />
              </>
            )}
          </div>

          {/* 3. Reason & Notes (Text Content) */}
          <div className="space-y-6 p-6">
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Reason</h3>
              <p className="text-sm leading-relaxed text-slate-700">
                {request.reason || '—'}
              </p>
            </div>
            
            {request.notes && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Notes</h3>
                <p className="text-sm leading-relaxed text-slate-600">{request.notes}</p>
              </div>
            )}
          </div>

          {/* 4. Attachment (Compact) */}
          {(request.attachmentId || request.attachmentUrl) && (
            <div className="bg-slate-50 p-4">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                {/* Preview Thumbnail or Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400">
                  {attachmentUrl && isImage ? (
                    <div className="relative h-full w-full overflow-hidden rounded">
                      <Image src={attachmentUrl} alt="Preview" fill className="object-cover" />
                    </div>
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {request.attachmentName || 'Attachment'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {request.attachmentSize ? formatAttachmentSize(request.attachmentSize) : 'File'}
                  </p>
                </div>

                <a
                  href={downloadUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
              
              {/* Optional: Large Image Expand */}
              {attachmentUrl && isImage && (
                <div className="mt-3">
                   <details className="group">
                      <summary className="flex cursor-pointer items-center text-xs font-medium text-slate-500 hover:text-slate-700">
                        <ChevronRight className="mr-1 h-3 w-3 transition-transform group-open:rotate-90" />
                        View Full Image
                      </summary>
                      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                        <Image
                          src={attachmentUrl}
                          alt="Attachment Full"
                          width={600}
                          height={400}
                          className="w-full bg-slate-100 object-contain"
                        />
                      </div>
                   </details>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  )
}

// --- Simplified Components ---

function Metric({ label, value }: { label: string, value: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  )
}

function StatusPill({ status }: { status: string | undefined | null }) {
  const s = status || 'unknown'
  const colors = {
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    draft: 'bg-slate-100 text-slate-600',
    unknown: 'bg-slate-100 text-slate-600',
  }
  
  return (
    <span className={clsx(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
      colors[s as keyof typeof colors] || colors.unknown
    )}>
      {s}
    </span>
  )
}