const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

export type MultisigRole = 'NONE' | 'SUPERVISOR' | 'CHIEF' | 'HR'

export type ApproverRole = {
  id: string
  walletAddress: `0x${string}`
  role: MultisigRole
  employeeId: string | null
}

export type ApprovalInfo = {
  approverAddress: `0x${string}`
  approverRole: MultisigRole
  approvedAt: string
  onChainConfirmed: boolean
  txHash: `0x${string}` | null
}

export type ApprovalState = {
  requestId: `0x${string}`
  approvalCount: number
  threshold: number
  thresholdReached: boolean
  executed: boolean
  approvals: ApprovalInfo[]
}

export type SetApproverRolePayload = {
  walletAddress: `0x${string}`
  role: MultisigRole
  employeeId?: string
}

export type RecordApprovalPayload = {
  requestId: `0x${string}`
  approverAddress: `0x${string}`
  approverRole: MultisigRole
  signature?: `0x${string}`
  leaveRequestId?: string
  txHash?: `0x${string}`
}

export type RecordRejectionPayload = {
  requestId: `0x${string}`
  rejectorAddress: `0x${string}`
  rejectorRole: MultisigRole
  reason: string
  signature?: `0x${string}`
  leaveRequestId?: string
  txHash?: `0x${string}`
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

function buildUrl(path: string) {
  return `${API_BASE}${path}`
}

export async function getAllApprovers(): Promise<ApproverRole[]> {
  const response = await fetch(buildUrl('/multisig/approvers'), {
    method: 'GET',
    credentials: 'include',
  })
  return parseJson<ApproverRole[]>(response)
}

export async function setApproverRole(payload: SetApproverRolePayload): Promise<ApproverRole> {
  const response = await fetch(buildUrl('/multisig/approvers'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson<ApproverRole>(response)
}

export async function getApprovalState(requestId: `0x${string}`): Promise<ApprovalState> {
  const response = await fetch(buildUrl(`/multisig/approvals/${requestId}`), {
    method: 'GET',
    credentials: 'include',
  })
  return parseJson<ApprovalState>(response)
}

export async function recordApproval(payload: RecordApprovalPayload): Promise<{ id: string; requestId: string }> {
  const response = await fetch(buildUrl('/multisig/approvals'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson<{ id: string; requestId: string }>(response)
}

export async function recordRejection(payload: RecordRejectionPayload): Promise<{ id: string; requestId: string }> {
  const response = await fetch(buildUrl('/multisig/rejections'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson<{ id: string; requestId: string }>(response)
}
