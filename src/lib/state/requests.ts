// lib/state/requests.ts
'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { LeaveRequest, OvertimeRequest, Request, RequestStatus } from '../types'
import { uid } from '../utils/id'

interface RequestState {
  items: Request[]

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
      version: 3, // bump to reflect new schema
    }
  )
)
