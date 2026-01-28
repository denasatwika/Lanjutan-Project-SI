import { HttpError } from '../types/errors'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

// Backend schema types
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'
export type EmployeeLevel = 'EMPLOYEE' | 'SUPERVISOR' | 'CHIEF' | 'HR'
export type EmployeeRole = 'USER' | 'APPROVER' | 'ADMIN'

export type EmployeeResponse = {
  id: string
  fullName: string
  email: string
  phone: string
  employmentType: EmploymentType
  level: EmployeeLevel
  role: EmployeeRole
  departmentId: string
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

export type EmployeeCreatePayload = {
  fullName: string
  email: string
  phone: string
  employmentType: EmploymentType
  level: EmployeeLevel
  role?: EmployeeRole
  departmentId: string
  isActive?: boolean
}

export type EmployeeUpdatePayload = {
  fullName?: string
  email?: string
  phone?: string
  employmentType?: EmploymentType
  level?: EmployeeLevel
  role?: EmployeeRole
  departmentId?: string
  isActive?: boolean
  name?: string
  avatarUrl?: string | null
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

export async function listEmployees(): Promise<EmployeeResponse[]> {
  const response = await fetch(`${API_BASE}/employees`, {
    method: 'GET',
    credentials: 'include',
  })

  return parseJson<EmployeeResponse[]>(response)
}

export async function getEmployee(id: string): Promise<EmployeeResponse> {
  const response = await fetch(`${API_BASE}/employees/${id}`, {
    method: 'GET',
    credentials: 'include',
  })

  return parseJson<EmployeeResponse>(response)
}

export async function createEmployee(payload: EmployeeCreatePayload): Promise<EmployeeResponse> {
  const response = await fetch(`${API_BASE}/employees`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJson<EmployeeResponse>(response)
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

export async function deleteEmployee(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/employees/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    const text = await response.text()
    const data = text ? safeParseJSON(text) : undefined
    const message = (data as ErrorPayload | undefined)?.error ?? response.statusText ?? 'Failed to delete employee'
    throw new HttpError(message, response.status)
  }
}
