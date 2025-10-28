import type { AttachmentInfo } from './attachments'
import type { ApprovalSeed, LeaveType, RequestStatus as LeaveRequestStatus } from './leaveRequests'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

export type RequestType = 'LEAVE' | 'OVERTIME' | (string & {})
export type RequestStatus = LeaveRequestStatus

export type RequestResponse = {
  id: string
  requesterId: string
  requesterName?: string | null
  requesterDepartment?: string | null
  type: RequestType
  status: RequestStatus
  overtimeDate: string | null
  overtimeStartTime: string | null
  overtimeEndTime: string | null
  overtimeHours: number | null
  overtimeReason: string | null
  leaveType: LeaveType | null
  leaveStartDate: string | null
  leaveEndDate: string | null
  leaveDays: number | null
  leaveReason: string | null
  notes: string | null
  attachmentId: string | null
  attachmentIds?: string[] | null
  attachment?: AttachmentInfo | null
  attachments?: AttachmentInfo[] | null
  createdAt: string | null
  updatedAt: string | null
}

export type RequestListQuery = {
  type?: RequestType
  status?: RequestStatus
}

export type RequestUpdatePayload = {
  status?: RequestStatus
  notes?: string | null
  attachmentId?: string | null
}

export type ApprovalStatus = RequestStatus | 'BLOCKED'

export type ApprovalResponse = {
  id: string
  requestId: string
  requestType: RequestType
  approverId: string
  approverLevel: string
  stage: number
  status: ApprovalStatus
  comments: string | null
  decidedAt: string | null
  createdAt: string | null
  requesterId?: string | null
  requesterName?: string | null
  requesterDepartment?: string | null
}

export type ApprovalListQuery = {
  approverId?: string
  status?: ApprovalStatus
  requestId?: string
  requestType?: RequestType
}

export type ApprovalDecisionPayload = {
  status: 'APPROVED' | 'REJECTED'
  comments?: string | null
}

export type OvertimeRequestCreatePayload = {
  type: 'OVERTIME'
  requesterId: string
  overtimeDate: string
  overtimeStartTime: string
  overtimeEndTime: string
  overtimeHours: number
  overtimeReason: string
  notes?: string | null
  attachmentId: string
  approvals?: ApprovalSeed[]
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

export async function listRequests(query?: RequestListQuery): Promise<RequestResponse[]> {
  const response = await fetch(
    buildUrl('/requests', {
      type: query?.type,
      status: query?.status,
    }),
    {
      method: 'GET',
      credentials: 'include',
    },
  )
  const data = await parseJson<RequestResponse[]>(response)
  return data.map(normalizeAttachment)
}

export async function getRequest(id: string): Promise<RequestResponse> {
  const response = await fetch(buildUrl(`/requests/${id}`), {
    method: 'GET',
    credentials: 'include',
  })

  const data = await parseJson<RequestResponse>(response)
  return normalizeAttachment(data)
}

export async function createOvertimeRequest(payload: OvertimeRequestCreatePayload): Promise<RequestResponse> {
  const response = await fetch(buildUrl('/overtime-requests'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await parseJson<RequestResponse>(response)
  return normalizeAttachment(data)
}

export async function updateRequest(id: string, payload: RequestUpdatePayload): Promise<RequestResponse> {
  const response = await fetch(buildUrl(`/requests/${id}`), {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await parseJson<RequestResponse>(response)
  return normalizeAttachment(data)
}

export async function listRequestApprovals(id: string): Promise<ApprovalResponse[]> {
  const response = await fetch(buildUrl(`/requests/${id}/approvals`), {
    method: 'GET',
    credentials: 'include',
  })

  return parseJson<ApprovalResponse[]>(response)
}

export async function listApprovals(query?: ApprovalListQuery): Promise<ApprovalResponse[]> {
  const response = await fetch(
    buildUrl('/approvals', {
      approverId: query?.approverId,
      status: query?.status,
      requestId: query?.requestId,
      requestType: query?.requestType,
    }),
    {
      method: 'GET',
      credentials: 'include',
    },
  )

  return parseJson<ApprovalResponse[]>(response)
}

export async function updateApproval(id: string, payload: ApprovalDecisionPayload): Promise<ApprovalResponse> {
  const response = await fetch(buildUrl(`/approvals/${id}`), {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJson<ApprovalResponse>(response)
}

function normalizeAttachment(input: RequestResponse): RequestResponse {
  const attachments = input.attachments ?? (input.attachment ? [input.attachment] : null)
  const firstAttachment = attachments?.[0] ?? input.attachment ?? null
  return {
    ...input,
    attachmentId: input.attachmentId ?? firstAttachment?.id ?? null,
    attachmentIds: input.attachmentIds ?? (attachments ? attachments.map((item) => item.id) : input.attachmentId ? [input.attachmentId] : undefined),
    attachment: firstAttachment,
    attachments: attachments ?? (firstAttachment ? [firstAttachment] : null),
  }
}
