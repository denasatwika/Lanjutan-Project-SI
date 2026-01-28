import { HttpError } from '../types/errors'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

export type DepartmentResponse = {
  id: string
  name: string
  code: string
  description: string | null
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

// In-memory cache for departments
let departmentsCache: DepartmentResponse[] | null = null

export async function listDepartments(): Promise<DepartmentResponse[]> {
  if (departmentsCache) {
    return departmentsCache
  }

  const response = await fetch(`${API_BASE}/departments`, {
    method: 'GET',
    credentials: 'include',
  })

  const departments = await parseJson<DepartmentResponse[]>(response)
  departmentsCache = departments
  return departments
}

export async function getDepartmentName(departmentId: string): Promise<string> {
  const departments = await listDepartments()
  const dept = departments.find((d) => d.id === departmentId)
  return dept?.name ?? 'Unknown'
}
