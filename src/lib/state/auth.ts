'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Role, User } from '../types'
import { seedUsers } from '../seed'

interface AuthState {
  user?: User
  login: (u: User)=>void
  logout: ()=>void
  resetDemo: ()=>void
}

export const useAuth = create<AuthState>()(persist((set)=>({
  user: undefined,
  login: (u)=> set({ user: u }),
  logout: ()=> set({ user: undefined }),
  resetDemo: ()=>{ localStorage.clear(); location.reload() }
}),{ name:'hrapp_v1_auth' }))

export function getDemoUserByRole(role: Role){
  return seedUsers.find(u=>u.role===role)!
}