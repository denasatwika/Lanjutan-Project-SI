import { HttpError } from '../types/errors'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

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

export type AttendanceRecord = {
  id: string
  employeeId: string
  checkInAt: string
  checkInPhoto: string | null
  checkOutAt: string | null
  checkOutPhoto: string | null
  date: string
  createdAt: string
  updatedAt: string
}

export type TodayStatus = {
  hasCheckedIn: boolean
  hasCheckedOut: boolean
  attendance: AttendanceRecord | null
}

export async function checkIn(employeeId: string, photo?: string): Promise<AttendanceRecord> {
  console.log('[checkIn] Calling API:', `${API_BASE}/attendance/check-in`)
  console.log('[checkIn] EmployeeId:', employeeId)
  console.log('[checkIn] Photo data length:', photo?.length || 0)

  const response = await fetch(`${API_BASE}/attendance/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ employeeId, photo }),
  })

  console.log('[checkIn] Response status:', response.status)
  console.log('[checkIn] Response ok:', response.ok)

  const result = await parseJson<AttendanceRecord>(response)
  console.log('[checkIn] Success:', result)
  return result
}

export async function checkOut(employeeId: string, photo?: string): Promise<AttendanceRecord> {
  const response = await fetch(`${API_BASE}/attendance/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ employeeId, photo }),
  })

  return parseJson<AttendanceRecord>(response)
}

export async function getTodayStatus(employeeId: string): Promise<TodayStatus> {
  console.log('[getTodayStatus] Calling API:', `${API_BASE}/attendance/today/${employeeId}`)

  const response = await fetch(`${API_BASE}/attendance/today/${employeeId}`, {
    method: 'GET',
    credentials: 'include',
  })

  console.log('[getTodayStatus] Response status:', response.status)

  const result = await parseJson<TodayStatus>(response)
  console.log('[getTodayStatus] Result:', result)
  return result
}

export async function getAttendanceHistory(employeeId: string): Promise<AttendanceRecord[]> {
  const response = await fetch(`${API_BASE}/attendance/${employeeId}`, {
    method: 'GET',
    credentials: 'include',
  })

  return parseJson<AttendanceRecord[]>(response)
}
