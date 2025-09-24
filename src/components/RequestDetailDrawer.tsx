'use client'

import { ReactNode } from 'react'
import { DecoratedRequest, formatLeavePeriod, formatOvertimePeriod } from '@/lib/utils/requestDisplay'
import { LeaveRequest, OvertimeRequest } from '@/lib/types'
import { X, FileText, Clock, CalendarDays } from 'lucide-react'
import clsx from 'clsx'

const BRAND = '#00156B'

export function RequestDetailDrawer({
  request,
  onClose,
  role,
}: {
  request: DecoratedRequest | null
  onClose: () => void
  role?: 'supervisor' | 'chief'
}) {
  if (!request) return null

  const isLeave = request.type === 'leave'
  const leave = isLeave ? (request as LeaveRequest) : undefined
  const overtime = !isLeave ? (request as OvertimeRequest) : undefined

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[460px] bg-white shadow-xl p-5 overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold">Detail Permintaan</h2>
            <p className="text-xs text-slate-500">Untuk {request.employee.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X />
          </button>
        </div>

        <div className="mt-4 grid gap-3 text-sm">
          <DetailRow label="Karyawan" value={request.employee.name} />
          <DetailRow label="Departemen" value={request.employee.department} />
          <DetailRow label="Jenis" value={isLeave ? request.leaveTypeLabel ?? 'Izin' : 'Lembur'} />
          <DetailRow
            label="Periode"
            value={isLeave ? formatLeavePeriod(leave!) : formatOvertimePeriod(overtime!)}
            icon={isLeave ? <CalendarDays className="size-4" /> : <Clock className="size-4" />}
          />
          <DetailRow
            label={isLeave ? 'Durasi (hari)' : 'Durasi (jam)'}
            value={isLeave ? String(leave?.days ?? '-') : String(overtime?.hours ?? '-')}
          />
          <DetailRow label="Status" value={formatStatus(request.status)} />
          <DetailRow label="Dibuat" value={new Date(request.createdAt).toLocaleString()} />
          {request.updatedAt && request.updatedAt !== request.createdAt && (
            <DetailRow label="Diperbarui" value={new Date(request.updatedAt).toLocaleString()} />
          )}
          <DetailRow label="Lampiran" value={request.attachmentUrl} icon={<FileText className="size-4" />} />
          {request.reason && <DetailRow label="Alasan" value={request.reason} multiline />}
          <DetailRow label="ID" value={request.id} code />
        </div>

        {role && (
          <div className="mt-6 space-y-2">
            <p className="text-xs text-slate-500">Aksi cepat</p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={onClose}
              >
                Batalkan
              </button>
              <button
                className="flex-1 rounded-xl bg-[color:var(--brand,_#00156B)] px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
                style={{ ['--brand' as any]: BRAND }}
                onClick={onClose}
              >
                Tandai Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  icon,
  multiline,
  code,
}: {
  label: string
  value?: ReactNode
  icon?: ReactNode
  multiline?: boolean
  code?: boolean
}) {
  return (
    <div className="grid grid-cols-[120px,1fr] gap-3 items-start">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className={clsx('text-sm', multiline && 'whitespace-pre-wrap leading-5', code && 'font-mono text-xs')}>{value ?? '—'}</div>
    </div>
  )
}

function formatStatus(status: string) {
  if (status === 'approved') return 'Disetujui'
  if (status === 'rejected') return 'Ditolak'
  if (status === 'pending') return 'Menunggu'
  return 'Draft'
}
