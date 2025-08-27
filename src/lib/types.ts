export type Role = 'employee'|'supervisor'|'hr'|'chief'
export const roles: Role[] = ['employee','supervisor','hr','chief']

export type User = { id: string; name: string; role: Role }
export type Attendance = { id: string; userId: string; checkInAt: string; photoDataUrl?: string }
export type RequestType = 'leave'|'overtime'
export type RequestStatus = 'draft'|'pending'|'approved'|'rejected'
export type Request = { id: string; userId: string; type: RequestType; status: RequestStatus; createdAt: string; updatedAt: string; payload: any }