// lib/state/requests.ts
'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { LeaveRequest, OvertimeRequest, Request, RequestStatus } from '../types'
import { uid } from '../utils/id'
import {
  listRequests,
  type RequestListQuery,
  type RequestResponse,
  type RequestStatus as RequestStatusApi,
  type RequestType as RequestTypeApi,
} from '../api/requests'

interface RequestState {
  items: Request[]

  // server sync
  load: (filter?: RequestFilter) => Promise<Request[]>
  upsertFromApi: (input: RequestResponse) => Request

  // mutations
  create: (input: NewRequestInput) => Request
  update: (id: string, patch: Partial<Request>) => void
  updateStatus: (id: string, status: RequestStatus) => void
  /** alias (kept for backward compatibility) */
  setStatus: (id: string, status: RequestStatus) => void

  // selectors
  byId: (id: string) => Request | undefined
  forEmployee: (employeeId: string) => Request[]
  all: () => Request[]                 // always call as s.all()
  allSorted: () => Request[]           // convenience: newest first
}

type NewRequestInput = LeaveRequest | OvertimeRequest
type RequestFilter = {
  type?: Request['type']
  status?: RequestStatus
  requesterId?: string
}

const statusToClient: Record<RequestStatusApi, RequestStatus> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'rejected',
  DRAFT: 'draft',
}

const typeToClient: Record<RequestTypeApi, Request['type']> = {
  LEAVE: 'leave',
  OVERTIME: 'overtime',
}

const statusToApi: Partial<Record<RequestStatus, RequestStatusApi>> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  draft: 'DRAFT',
}

const typeToApi: Record<Request['type'], RequestTypeApi> = {
  leave: 'LEAVE',
  overtime: 'OVERTIME',
}

function normalizeFromApi(input: RequestResponse): Request {
  const type = typeToClient[input.type] ?? 'leave'
  const attachment = input.attachment ?? input.attachments?.[0] ?? null
  const attachmentId = input.attachmentId ?? input.attachmentIds?.[0] ?? attachment?.id
  const base = {
    id: input.id,
    employeeId: input.requesterId,
    status: statusToClient[input.status] ?? 'pending',
    attachmentId: attachmentId ?? undefined,
    attachmentName: attachment?.name ?? undefined,
    attachmentMimeType: attachment?.mimeType ?? undefined,
    attachmentSize: attachment?.size ?? undefined,
    attachmentDownloadPath: attachment?.downloadPath ?? undefined,
    attachmentCid: attachment?.cid ?? undefined,
    attachmentUrl: attachment?.url ?? undefined,
    reason: input.leaveReason ?? input.overtimeReason ?? undefined,
    notes: input.notes ?? undefined,
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: input.updatedAt ?? input.createdAt ?? new Date().toISOString(),
    employeeName: undefined,
    employeeDepartment: undefined,
    leaveTypeName: undefined,
  }

  if (type === 'leave') {
    const leave: LeaveRequest = {
      ...base,
      type: 'leave',
      leaveTypeId: input.leaveType ?? '',
      startDate: input.leaveStartDate ?? '',
      endDate: input.leaveEndDate ?? '',
      days: input.leaveDays ?? 0,
    }
    return leave
  }

  const overtime: OvertimeRequest = {
    ...base,
    type: 'overtime',
    workDate: input.overtimeDate ?? '',
    startTime: input.overtimeStartTime ?? '',
    endTime: input.overtimeEndTime ?? '',
    hours: input.overtimeHours ?? 0,
  }
  return overtime
}

async function fetchRequests(filter?: RequestFilter): Promise<Request[]> {
  const query: RequestListQuery = {}
  if (filter?.type) query.type = typeToApi[filter.type]
  if (filter?.status) {
    const mapped = statusToApi[filter.status]
    if (mapped) query.status = mapped
  }
  const responses = await listRequests(Object.keys(query).length ? query : undefined)
  const filtered = filter?.requesterId
    ? responses.filter((r) => r.requesterId === filter.requesterId)
    : responses
  return filtered.map(normalizeFromApi)
}

function normalizeRequest(input: NewRequestInput): Request {
  const now = new Date().toISOString()
  const withMeta = {
    ...input,
    id: input.id ?? uid('req'),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    status: input.status ?? 'pending',
  }

  return withMeta.type === 'leave'
    ? (withMeta as LeaveRequest)
    : (withMeta as OvertimeRequest)
}

export const useRequests = create<RequestState>()(
  persist(
    (set, get) => ({
      items: [],

      load: async (filter) => {
        const normalized = await fetchRequests(filter)
        set({ items: normalized })
        return normalized
      },

      upsertFromApi: (input) => {
        const request = normalizeFromApi(input)
        set((state) => {
          const idx = state.items.findIndex((item) => item.id === request.id)
          if (idx === -1) return { items: [request, ...state.items] as Request[] }
          const items = [...state.items] as Request[]
          items[idx] = request
          return { items }
        })
        return request
      },

      // create a new pending request
      create: (input) => {
        const request = normalizeRequest(input)
        set((state) => ({ items: [request, ...state.items] as Request[] }))
        return request
      },

      // generic update (safe merge + touch updatedAt)
      update: (id, patch) =>
        set((state) => ({
          items: state.items.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
          ) as Request[],
        })),

      // status update (preferred API)
      updateStatus: (id, status) =>
        set((state) => ({
          items: state.items.map((r) =>
            r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
          ) as Request[],
        })),

      // backward-compat alias
      setStatus: (id, status) => get().updateStatus(id, status),

      // selectors
      byId: (id) => get().items.find((r) => r.id === id),
      forEmployee: (employeeId) => get().items.filter((r) => r.employeeId === employeeId),
      all: () => get().items,
      allSorted: () =>
        [...get().items].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt)
        ),
    }),
    {
      name: 'hrapp_v1_requests',
      version: 4, // bump to reflect new schema
      migrate: (persistedState, version) => {
        if (version >= 4 || !persistedState) return persistedState as RequestState
        const items = Array.isArray((persistedState as any).items)
          ? (persistedState as any).items.map((item: any) => {
              if (!item || typeof item !== 'object') return item
              const {
                attachmentUrl: legacyAttachmentUrl,
                attachmentCid: legacyAttachmentCid,
                ...rest
              } = item
              return {
                ...rest,
                attachmentId: undefined,
                attachmentName: undefined,
                attachmentMimeType: undefined,
                attachmentSize: undefined,
                attachmentDownloadPath: undefined,
                attachmentCid: legacyAttachmentCid ?? undefined,
                attachmentUrl: legacyAttachmentUrl ?? undefined,
              }
            })
          : []
        return { ...(persistedState as any), items } as RequestState
      },
    }
  )
)
