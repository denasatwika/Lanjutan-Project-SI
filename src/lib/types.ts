export type Role = 'requester' | 'approver'
export const roles: Role[] = ['requester', 'approver']

export type User = {
  id: string
  role: Role
  address: `0x${string}`
  name?: string
  department?: string
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
  attachmentUrl?: string
  createdAt: string
  updatedAt: string
  employeeName?: string
  employeeDepartment?: string
  leaveTypeName?: string
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
