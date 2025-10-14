const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

export type LeaveRequestPayload = {
    requesterId: string,
    leaveType: string, // YYYY-MM-DD
    leaveStartDate: string, // HH:MM
    leaveEndDate: string, // HH:MM
    leaveDays: number,
    leaveReason: string,
    notes?: string | null,
    attachmentUrl?: string,
}

export type LeaveRequestResponse = {
    id: string,
    requesterId: string,
    type: string,
    status: string,
    leaveType: string,
    leaveStartDate: string,
    leaveEndDate: string,
    leaveDays: number,
    leaveReason: string,
    notes?: string | null
    attachmentUrl?: string | null
}

async function parseJson<T>(response: Response): Promise<T> {
    const text = await response.text()
    const data = text ? safeParseJSON(text) : undefined

    if (!response.ok) {
        const message = (data as ErrorPayload | undefined)?.error ?? response.statusText ?? 'Request failed'
        const error = new Error(message)
            ; (error as any).status = response.status
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

export async function getLeaveRequest(id: string): Promise<LeaveRequestResponse> {
    const response = await fetch(`${API_BASE}/leave-requests/${id}`, {
        method: 'GET',
        credentials: 'include',
    })

    return parseJson<LeaveRequestResponse>(response)
}

export async function createLeaveRequest(payload: LeaveRequestPayload): Promise<LeaveRequestResponse> {
    const response = await fetch(`${API_BASE}/leave-requests`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    return parseJson<LeaveRequestResponse>(response)
}