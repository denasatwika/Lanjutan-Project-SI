'use client'
import { create } from 'zustand'
import { User } from '../types'
import { getSession, postLogout } from '../api/auth'

interface AuthState {
  user?: User
  hydrated: boolean
  setUser: (user?: User) => void
  fetchSession: () => Promise<User | undefined>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>()((set) => ({
  user: undefined,
  hydrated: false,
  setUser: (user) => set({ user, hydrated: true }),
  fetchSession: async () => {
    try {
      const session = await getSession()
      if (!session) {
        set({ user: undefined, hydrated: true })
        return undefined
      }

      const address = session.user.address as `0x${string}`
      const fallbackName = `${address.slice(0, 6)}...${address.slice(-4)}`

      const user: User = {
        id: session.user.id,
        role: session.user.role,
        address,
        name: fallbackName,
      }

      set({ user, hydrated: true })
      return user
    } catch (error) {
      set({ user: undefined, hydrated: true })
      throw error
    }
  },
  logout: async () => {
    try {
      await postLogout()
    } finally {
      set({ user: undefined, hydrated: true })
    }
  },
}))
