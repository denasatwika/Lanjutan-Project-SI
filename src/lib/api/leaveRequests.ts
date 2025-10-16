import type { AttachmentUploadResponse } from './attachments'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | (string & {})
export type LeaveType = 'Cuti' | 'Sakit' | 'Izin' | (string & {})
export type EmployeeLevel = string & {}

export type ApprovalSeed = {
  approverId: string
  approverLevel: EmployeeLevel
  stage: number
  status?: RequestStatus
}

export type LeaveRequestPayload = {
  requesterId: string
  leaveType: LeaveType
  leaveStartDate: string
  leaveEndDate: string
  leaveDays: number
  leaveReason: string
  notes?: string | null
  attachmentId?: string | null
  approvals?: ApprovalSeed[]
}

export type LeaveRequestResponse = {
  id: string
  requesterId: string
  type: 'LEAVE'
  status: RequestStatus
  leaveType: LeaveType
  leaveStartDate: string
  leaveEndDate: string
  leaveDays: number
  leaveReason: string
  notes: string | null
  attachmentId: string | null
  attachment?: AttachmentUploadResponse | null
  createdAt: string | null
  updatedAt: string | null
}

export type LeaveRequestQuery = {
  status?: RequestStatus
  leaveType?: LeaveType
  requesterId?: string
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? safeParseJSON(text) : undefined

  if (!response.ok) {
    const message = (data as ErrorPayload | undefined)?.error ?? response.statusText ?? 'Request failed'
    const error = new Error(message)
    ;(error as any).status = response.status
    throw error
  }

  return data as T
}

function safeParseJSON(input: string) {
  try {
    return JSON.parse(input)
  } catch {
    return undefined
  }
}

function buildUrl(path: string, query?: Record<string, string | undefined>) {
  const url = `${API_BASE}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) params.append(key, value)
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

export async function listLeaveRequests(query?: LeaveRequestQuery): Promise<LeaveRequestResponse[]> {
  const response = await fetch(
    buildUrl('/leave-requests', {
      status: query?.status,
      leaveType: query?.leaveType,
      requesterId: query?.requesterId,
    }),
    { method: 'GET', credentials: 'include' },
  )
  return parseJson<LeaveRequestResponse[]>(response)
}

export async function getLeaveRequest(id: string): Promise<LeaveRequestResponse> {
  const response = await fetch(buildUrl(`/leave-request/${id}`), {
    method: 'GET',
    credentials: 'include',
  })

  return parseJson<LeaveRequestResponse>(response)
}

export async function getLeaveRequestByUser(userId: string): Promise<LeaveRequestResponse> {
  const response = await fetch(buildUrl(`/leave-requests/by-user/${userId}`), {
    method: 'GET',
    credentials: 'include',
  })

  return parseJson<LeaveRequestResponse>(response)
}

export async function createLeaveRequest(payload: LeaveRequestPayload): Promise<LeaveRequestResponse> {
  const response = await fetch(buildUrl('/leave-requests'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJson<LeaveRequestResponse>(response)
}
