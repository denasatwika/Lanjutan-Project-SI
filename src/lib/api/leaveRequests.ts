import type { TypedData, TypedDataDomain, TypedDataParameter } from 'viem'
import type { AttachmentInfo } from './attachments'
import { HttpError } from '../types/errors'

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
  type: 'LEAVE'
  requesterId: string
  leaveType: LeaveType
  leaveStartDate: string
  leaveEndDate: string
  leaveDays: number
  leaveReason: string
  notes?: string | null
  attachmentIds?: string[]
  approvals?: ApprovalSeed[]
}

export type LeaveRequestResponse = {
  id: string
  requesterId: string
  requesterWalletAddress?: string | null
  onChainRequestId?: string | null
  type: 'LEAVE'
  status: RequestStatus
  docHash?: string | null
  leaveType: LeaveType
  leaveStartDate: string
  leaveEndDate: string
  leaveDays: number
  leaveReason: string
  notes: string | null
  attachmentId: string | null
  attachmentIds?: string[] | null
  attachment?: AttachmentInfo | null
  attachments?: AttachmentInfo[] | null
  createdAt: string | null
  updatedAt: string | null
}

export type LeaveRequestQuery = {
  status?: RequestStatus
  leaveType?: LeaveType
  requesterId?: string
}

export type LeaveMetaPreparePayload = {
  leaveRequestId: string
}

export type MetaTransactionPreparePayload = {
  from: `0x${string}`
  gas: bigint | number | string
  data: `0x${string}`
  to?: `0x${string}`
  value?: bigint | number | string
  nonce: bigint | number | string
  deadline: bigint | number | string
  metadata?: Record<string, unknown>
}

export type MetaTransactionRequest = {
  from: `0x${string}`
  to: `0x${string}`
  gas: string
  data: `0x${string}`
  value?: string
  nonce: string
  deadline: string
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export type MetaTransactionTypedDataResponse<
  PrimaryType extends string = string,
  Message extends TypedData = TypedData,
> = {
  domain: TypedDataDomain
  types: Record<string, readonly TypedDataParameter[]>
  primaryType?: PrimaryType
  message: Message
  request: MetaTransactionRequest
}

export type MetaTransactionSubmitPayload = {
  request: MetaTransactionRequest
  signature: `0x${string}`
  approvalId?: string
  metadata?: Record<string, unknown>
}

export type MetaTransactionSubmitResponse = {
  txHash: `0x${string}`
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? safeParseJSON(text) : undefined

  if (!response.ok) {
    const message = (data as ErrorPayload | undefined)?.error ?? response.statusText ?? 'Request failed'
    throw new HttpError(message, response.status)
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
  const data = await parseJson<LeaveRequestResponse[]>(response)
  return data.map(normalizeAttachment)
}

export async function getLeaveRequest(id: string): Promise<LeaveRequestResponse> {
  const response = await fetch(buildUrl(`/leave-requests/${id}`), {
    method: 'GET',
    credentials: 'include',
  })

  const data = await parseJson<LeaveRequestResponse>(response)
  return normalizeAttachment(data)
}

export async function getLeaveRequestByUser(userId: string): Promise<LeaveRequestResponse> {
  const response = await fetch(buildUrl(`/leave-requests/by-user/${userId}`), {
    method: 'GET',
    credentials: 'include',
  })

  const data = await parseJson<LeaveRequestResponse>(response)
  return normalizeAttachment(data)
}

export async function createLeaveRequest(payload: LeaveRequestPayload): Promise<LeaveRequestResponse> {
  const response = await fetch(buildUrl('/leave-requests'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await parseJson<LeaveRequestResponse>(response)
  return normalizeAttachment(data)
}

function normalizeAttachment(input: LeaveRequestResponse): LeaveRequestResponse {
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

export async function prepareLeaveRequestMeta<
  PrimaryType extends string = string,
  Message extends TypedData = TypedData,
>(
  payload: LeaveMetaPreparePayload,
): Promise<MetaTransactionTypedDataResponse<PrimaryType, Message>> {
  const response = await fetch(buildUrl('/leave-requests/meta/prepare'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leaveRequestId: payload.leaveRequestId,
    }),
  })

  return parseJson<MetaTransactionTypedDataResponse<PrimaryType, Message>>(response)
}

export async function submitLeaveRequestMeta(
  payload: MetaTransactionSubmitPayload,
): Promise<MetaTransactionSubmitResponse> {
  const response = await fetch(buildUrl('/leave-requests/meta/submit'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJson<MetaTransactionSubmitResponse>(response)
}

export function buildMetaPreparePayload(payload: MetaTransactionPreparePayload) {
  return {
    from: payload.from,
    to: payload.to,
    gas: normalizeQuantity(payload.gas),
    value: payload.value !== undefined ? normalizeQuantity(payload.value) : undefined,
    nonce: normalizeQuantity(payload.nonce),
    deadline: normalizeQuantity(payload.deadline),
    data: payload.data,
    metadata: payload.metadata,
  }
}

function normalizeQuantity(value: bigint | number | string) {
  if (typeof value === 'bigint') {
    if (value < BigInt(0)) {
      throw new Error('Numeric values must be non-negative.')
    }
    return value.toString()
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Gas/value must be a finite non-negative number')
    }
    return value.toString()
  }
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error('Gas/value cannot be empty')
  }
  return trimmed
}
