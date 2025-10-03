'use client'
import { useParams } from 'next/navigation'
import { useRequests } from '@/lib/state/requests'
import { formatWhen } from '@/lib/utils/date'
import { LeaveRequest, OvertimeRequest } from '@/lib/types'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'

export default function Page(){
  const { id } = useParams<{id:string}>()
  const r = useRequests(s=>s.byId(id))
  if(!r) return <div className="text-sm text-gray-600">Request not found</div>
  const isLeave = r.type === 'leave'
  const leave = isLeave ? (r as LeaveRequest) : undefined
  const overtime = !isLeave ? (r as OvertimeRequest) : undefined
  const leaveLabel = leave ? resolveLeaveTypeLabel(leave.leaveTypeId) : undefined
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Request Detail</h1>
      <div className="card p-4 grid gap-2">
        <div><span className="text-gray-500">Type:</span> <span className="capitalize font-medium">{r.type}</span></div>
        <div><span className="text-gray-500">Status:</span> <span className="font-medium">{r.status}</span></div>
        <div><span className="text-gray-500">Created:</span> {formatWhen(r.createdAt)}</div>
        <div><span className="text-gray-500">Attachment:</span> {r.attachmentUrl || '—'}</div>
        <div><span className="text-gray-500">Reason:</span> {r.reason || '—'}</div>

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
