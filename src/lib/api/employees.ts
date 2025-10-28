const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

export type EmployeeUpdatePayload = {
  name?: string
  email?: string
  phone?: string
  departmentId?: string
  avatarUrl?: string | null
}

export type EmployeeResponse = {
  id: string
  name?: string | null
  email?: string | null
  phone?: string | null
  departmentId?: string | null
  department?: string | null
  departmentName?: string | null
  address?: string | null
  role?: 'user' | 'approver' | 'admin'
  avatarUrl?: string | null
  [key: string]: unknown
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

export async function updateEmployee(id: string, payload: EmployeeUpdatePayload): Promise<EmployeeResponse> {
  const response = await fetch(`${API_BASE}/employees/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJson<EmployeeResponse>(response)
}

export async function getEmployee(id: string): Promise<EmployeeResponse> {
  const response = await fetch(`${API_BASE}/employees/${id}`, {
    method: 'GET',
    credentials: 'include',
  })

  return parseJson<EmployeeResponse>(response)
}
