const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

// export type EmployeeUpdatePayload = {
//   name?: string
//   email?: string
//   phone?: string
//   departmentId?: string
//   avatarUrl?: string | null
// }

// export const requests = pgTable('requests', {
//     id: uuid('id').primaryKey().defaultRandom(),
//     requesterId: uuid('requester_id')
//         .references(() => employees.id, { onDelete: 'restrict' })
//         .notNull(),
//     type: requestTypeEnum('type').notNull(),
//     status: requestStatusEnum('status').notNull().default('PENDING'),

//     // OVERTIME
//     overtimeDate: date('overtime_date'),
//     overtimeStartTime: time('overtime_start_time'), // HH:MM:ss
//     overtimeEndTime: time('overtime_end_time'),
//     overtimeHours: integer('overtime_hours'),
//     overtimeReason: text('overtime_reason'),

//     // LEAVE
//     leaveType: leaveTypeEnum('leave_type'),
//     leaveStartDate: date('leave_start_date'),
//     leaveEndDate: date('leave_end_date'),
//     leaveDays: integer('leave_days'),
//     leaveReason: text('leave_reason'),

//     // Common
//     notes: text('notes'),
//     attachmentUrl: varchar('attachment_url', { length: 500 }),

//     createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
//     updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
// }, (t) => [
//     index('ix_requests_requester').on(t.requesterId),
//     index('ix_requests_type').on(t.type),

//     // if both times present then end > start
//     check('chk_overtime_time',
//         sql`(${t.overtimeStartTime} IS NULL OR ${t.overtimeEndTime} IS NULL)
//         OR (${t.overtimeEndTime} > ${t.overtimeStartTime})`
//     ),

//     // if both dates present then end >= start
//     check('chk_leave_dates',
//         sql`(${t.leaveStartDate} IS NULL OR ${t.leaveEndDate} IS NULL)
//         OR (${t.leaveEndDate} >= ${t.leaveStartDate})`
//     ),
// ])

export type RequestResponse = {
    id: string
    requesterId: string
    type: string
    status: string
    overtimeDate?: string | null,
    overtimeStartTime?: string | null,
    overtimeEndTime?: string | null,
    overtimeHours?: string | null,
    overtimeReason?: string | null,
    leaveType?: string | null,
    leaveStartDate?: string | null,
    leaveEndDate?: string | null,
    leaveDays?: string | null,
    leaveReason?: string | null,
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

export async function getRequest(id: string): Promise<RequestResponse> {
    const response = await fetch(`${API_BASE}/employees/${id}`, {
        method: 'GET',
        credentials: 'include',
    })

    return parseJson<RequestResponse>(response)
}

export async function createRequest(id: string): Promise<RequestResponse> {
    const response = await fetch(`${API_BASE}/employees/${id}`, {
        method: 'POST',
        credentials: 'include',
    })

    return parseJson<RequestResponse>(response)
}