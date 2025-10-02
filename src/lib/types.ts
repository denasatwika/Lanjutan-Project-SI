export type Role = 'employee'|'supervisor'|'hr'|'chief'
export const roles: Role[] = ['employee','supervisor','hr','chief']

export type User = {
  id: string
  name: string
  role: Role
  department?: string
  address?: `0x${string}`
}

export type Attendance = {
  id: string
  userId: string
  checkInAt: string
  photoDataUrl?: string
}

export type RequestType = 'leave' | 'overtime'
export type RequestStatus = 'draft' | 'pending' | 'approved' | 'rejected'

type RequestBase = {
  id: string
  employeeId: string
  status: RequestStatus
  reason?: string
  attachmentUrl: string
  createdAt: string
  updatedAt: string
}

export type LeaveRequest = RequestBase & {
  type: 'leave'
  leaveTypeId: string
  startDate: string
  endDate: string
  days: number
}

export type OvertimeRequest = RequestBase & {
  type: 'overtime'
  workDate: string
  startTime: string
  endTime: string
  hours: number
}

export type Request = LeaveRequest | OvertimeRequest
