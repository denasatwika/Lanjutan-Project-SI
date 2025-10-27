'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ReadState = {
  read: Record<string, true>
  markRead: (id: string) => void
  markAll: (ids: string[]) => void
  clear: () => void
}

export const useInboxRead = create<ReadState>()(
  persist(
    (set) => ({
      read: {},
      markRead: (id) => set((state) => ({ read: { ...state.read, [id]: true } })),
      markAll: (ids) =>
        set((state) => ({
          read: { ...state.read, ...Object.fromEntries(ids.map((value) => [value, true])) },
        })),
      clear: () => set({ read: {} }),
    }),
    { name: 'inbox-read-v1' }
  )
)
