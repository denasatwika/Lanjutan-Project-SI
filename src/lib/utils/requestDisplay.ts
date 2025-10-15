import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import { LeaveRequest, OvertimeRequest, Request } from '@/lib/types'

type EmployeeMeta = {
  id: string
  name: string
  department?: string
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: 'Annual Leave',
  SICK: 'Sick Leave',
  UNPAID: 'Unpaid Leave',
  EMERGENCY: 'Emergency Leave',
  MATERNITY: 'Maternity Leave',
  PATERNITY: 'Paternity Leave',
  CUTI: 'Cuti',
  SAKIT: 'Sakit',
  IZIN: 'Izin',
}

function toTitle(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function resolveLeaveTypeLabel(value?: string | null) {
  if (!value) return undefined
  const key = value.trim().toUpperCase()
  return LEAVE_TYPE_LABELS[key] ?? toTitle(key)
}

export type DecoratedRequest = (Request & { approverId?: string }) & {
  employee: EmployeeMeta
  leaveTypeLabel?: string
}

export function decorateRequest(request: Request & { approverId?: string }): DecoratedRequest {
  const employee: EmployeeMeta = {
    id: request.employeeId,
    name: request.employeeName ?? request.employeeId,
    department: request.employeeDepartment,
  }

  return {
    ...request,
    employee,
    leaveTypeLabel:
      request.type === 'leave'
        ? request.leaveTypeName ?? resolveLeaveTypeLabel((request as LeaveRequest).leaveTypeId)
        : undefined,
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
