const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

export type OvertimeRequestPayload = {
    requesterId: string,
    overtimeDate: string, // YYYY-MM-DD
    overtimeStartTime: string, // HH:MM
    overtimeEndTime: string, // HH:MM
    overtimeHours: number,
    overtimeReason: string,
    notes?: string | null,
    attachmentUrl?: string,
}

export type OvertimeRequestResponse = {
    id: string,
    requesterId: string,
    type: string,
    status: string,
    overtimeDate: string,
    overtimeStartTime: string,
    overtimeEndTime: string,
    overtimeHours: number,
    overtimeReason: string,
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

export async function getOvertimeRequest(id: string): Promise<OvertimeRequestResponse> {
    const response = await fetch(`${API_BASE}/overtime-requests/${id}`, {
        method: 'GET',
        credentials: 'include',
    })

    return parseJson<OvertimeRequestResponse>(response)
}

export async function createOvertimeRequest(payload: OvertimeRequestPayload): Promise<OvertimeRequestResponse> {
    const response = await fetch(`${API_BASE}/overtime-requests`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    return parseJson<OvertimeRequestResponse>(response)
}