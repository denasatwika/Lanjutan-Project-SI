import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import { LeaveRequest, OvertimeRequest, Request } from '@/lib/types'
import { getEmployeeMeta, getLeaveTypeMeta } from '@/lib/mock/requests'

export type DecoratedRequest = (Request & { approverId?: string }) & {
  employee: ReturnType<typeof getEmployeeMeta>
  leaveTypeLabel?: string
}

export function decorateRequest(request: Request & { approverId?: string }): DecoratedRequest {
  return {
    ...request,
    employee: getEmployeeMeta(request.employeeId),
    leaveTypeLabel: request.type === 'leave' ? getLeaveTypeMeta(request.leaveTypeId)?.label : undefined,
  }
}

export function formatDateID(iso?: string) {
  if (!iso) return '-'
  return format(new Date(iso), 'd MMM yyyy', { locale: idLocale })
}

export function formatTimeHM(value?: string) {
  return value ?? ''
}

export function formatLeavePeriod(req: LeaveRequest) {
  if (req.startDate === req.endDate) return formatDateID(req.startDate)
  return `${formatDateID(req.startDate)} → ${formatDateID(req.endDate)}`
}

export function formatOvertimePeriod(req: OvertimeRequest) {
  return `${formatDateID(req.workDate)} • ${formatTimeHM(req.startTime)}–${formatTimeHM(req.endTime)}`
}
