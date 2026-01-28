export type Role = 'user' | 'approver' | 'admin'
export const roles: Role[] = ['user', 'approver', 'admin']

export type User = {
  id: string
  roles: Role[]
  primaryRole: Role
  address: `0x${string}`
  name?: string
  email?: string
  phone?: string
  department?: string
  departmentId?: string
  avatarUrl?: string | null
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
  attachmentId?: string
  attachmentName?: string
  attachmentMimeType?: string
  attachmentSize?: number
  attachmentDownloadPath?: string
  attachmentCid?: string | null
  attachmentUrl?: string | null
  notes?: string | null
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
