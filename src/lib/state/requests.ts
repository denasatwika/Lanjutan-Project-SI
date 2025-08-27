// lib/state/requests.ts
'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Request, RequestStatus, RequestType } from '../types'
import { seedRequests } from '../seed'
import { uid } from '../utils/id'

interface RequestState {
  items: Request[]

  // mutations
  create: (userId: string, type: RequestType, payload: any) => Request
  update: (id: string, patch: Partial<Request>) => void
  updateStatus: (id: string, status: RequestStatus) => void
  /** alias (kept for backward compatibility) */
  setStatus: (id: string, status: RequestStatus) => void

  // selectors
  byId: (id: string) => Request | undefined
  forUser: (userId: string) => Request[]
  all: () => Request[]                 // always call as s.all()
  allSorted: () => Request[]           // convenience: newest first
}

export const useRequests = create<RequestState>()(
  persist(
    (set, get) => ({
      items: seedRequests,

      // create a new pending request
      create: (userId, type, payload) => {
        const now = new Date().toISOString()
        const r: Request = {
          id: uid('req'),
          userId,
          type,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
          payload,
        }
        set((s) => ({ items: [r, ...s.items] }))
        return r
      },

      // generic update (safe merge + touch updatedAt)
      update: (id, patch) =>
        set((s) => ({
          items: s.items.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
          ),
        })),

      // status update (preferred API)
      updateStatus: (id, status) =>
        set((s) => ({
          items: s.items.map((r) =>
            r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
          ),
        })),

      // backward-compat alias
      setStatus: (id, status) => get().updateStatus(id, status),

      // selectors
      byId: (id) => get().items.find((r) => r.id === id),
      forUser: (userId) => get().items.filter((r) => r.userId === userId),
      all: () => get().items,
      allSorted: () =>
        [...get().items].sort((a, b) =>
          (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)
        ),
    }),
    {
      name: 'hrapp_v1_requests',
      version: 2, // in case you need to evolve data later
    }
  )
)
