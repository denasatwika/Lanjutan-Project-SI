'use client'
import { create } from 'zustand'

export type DocStatus = 'pending' | 'signed' | 'rejected'
export type Doc = {
  id: string
  title: string
  owner: string
  status: DocStatus
  updatedAt: string // ISO
}

type State = {
  docs: Doc[]
  add: (d: Doc) => void
}

export const useDocuments = create<State>((set) => ({
  docs: [
    { id: '1', title: 'Surat Kontrak Karyawan', owner: 'Kak Tata', status: 'pending',  updatedAt: '2025-01-06T08:13:00Z' },
    { id: '2', title: 'Surat Kontrak Karyawan', owner: 'Kak Tata', status: 'pending',  updatedAt: '2025-01-06T07:55:00Z' },
    { id: '3', title: 'Surat Kontrak Karyawan', owner: 'Kak Tata', status: 'signed',   updatedAt: '2025-01-06T07:40:00Z' },
    { id: '4', title: 'SOP Keamanan Server',    owner: 'DevOps',   status: 'rejected', updatedAt: '2025-01-05T10:20:00Z' },
  ],
  add: (d) => set((s) => ({ docs: [d, ...s.docs] })),
}))
