import { Request } from '@/lib/types'

type EmployeeMeta = {
  id: string
  name: string
  department: string
}

type LeaveTypeMeta = {
  id: string
  code: 'cuti' | 'izin' | 'sakit' | 'lembur'
  label: string
}

export const mockEmployees: Record<string, EmployeeMeta> = {
  'u-emp': { id: 'u-emp', name: 'Alex Employee', department: 'Engineering' },
  'emp-nadia': { id: 'emp-nadia', name: 'Nadia Putri', department: 'Technology' },
  'emp-ardi': { id: 'emp-ardi', name: 'Ardi Saputra', department: 'Business' },
  'emp-maya': { id: 'emp-maya', name: 'Maya Cahyani', department: 'Human Resources' },
  'emp-raka': { id: 'emp-raka', name: 'Raka Mahesa', department: 'Technology' },
}

export const mockLeaveTypes: Record<string, LeaveTypeMeta> = {
  'leave-type-cuti': { id: 'leave-type-cuti', code: 'cuti', label: 'Cuti Tahunan' },
  'leave-type-izin': { id: 'leave-type-izin', code: 'izin', label: 'Izin Khusus' },
  'leave-type-sakit': { id: 'leave-type-sakit', code: 'sakit', label: 'Sakit / Medis' },
  'leave-type-lembur': { id: 'leave-type-lembur', code: 'lembur', label: 'Lembur' },
}

export const mockRequests: Request[] = [
  {
    id: 'REQ-OT-1023',
    type: 'overtime',
    employeeId: 'emp-nadia',
    workDate: '2025-08-28',
    startTime: '19:00',
    endTime: '22:00',
    hours: 3,
    reason: 'Release hotfix',
    attachmentUrl: '/mock/req-ot-1023.jpg',
    status: 'pending',
    createdAt: '2025-08-28T08:25:00Z',
    updatedAt: '2025-08-28T08:25:00Z',
  },
  {
    id: 'REQ-LV-1018',
    type: 'leave',
    employeeId: 'emp-ardi',
    leaveTypeId: 'leave-type-cuti',
    startDate: '2025-08-29',
    endDate: '2025-08-30',
    days: 2,
    reason: 'Urusan keluarga',
    attachmentUrl: '/mock/req-lv-1018.pdf',
    status: 'pending',
    createdAt: '2025-08-27T14:05:00Z',
    updatedAt: '2025-08-27T14:05:00Z',
  },
  {
    id: 'REQ-LV-1002',
    type: 'leave',
    employeeId: 'emp-maya',
    leaveTypeId: 'leave-type-sakit',
    startDate: '2025-09-02',
    endDate: '2025-09-03',
    days: 2,
    reason: 'Kontrol kesehatan',
    attachmentUrl: '/mock/req-lv-1002.pdf',
    status: 'approved',
    createdAt: '2025-08-25T03:11:00Z',
    updatedAt: '2025-08-26T02:40:00Z',
  },
  {
    id: 'REQ-OT-1008',
    type: 'overtime',
    employeeId: 'emp-raka',
    workDate: '2025-08-19',
    startTime: '18:30',
    endTime: '21:00',
    hours: 3,
    reason: 'Support deployment',
    attachmentUrl: '/mock/req-ot-1008.jpg',
    status: 'approved',
    createdAt: '2025-08-20T10:10:00Z',
    updatedAt: '2025-08-20T12:20:00Z',
  },
  {
    id: 'REQ-LV-1001',
    type: 'leave',
    employeeId: 'u-emp',
    leaveTypeId: 'leave-type-izin',
    startDate: '2025-08-31',
    endDate: '2025-09-01',
    days: 2,
    reason: 'Acara keluarga',
    attachmentUrl: '/mock/req-lv-1001.pdf',
    status: 'pending',
    createdAt: '2025-08-24T05:12:00Z',
    updatedAt: '2025-08-24T05:40:00Z',
  },
]

export function getEmployeeMeta(employeeId: string): EmployeeMeta {
  return mockEmployees[employeeId] ?? { id: employeeId, name: 'Unknown Employee', department: '—' }
}

export function getLeaveTypeMeta(leaveTypeId?: string) {
  if (!leaveTypeId) return undefined
  return mockLeaveTypes[leaveTypeId]
}
