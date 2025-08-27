'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/state/auth'

export function ClientGuard({ role, children }:{ role: 'employee'|'supervisor'|'hr'|'chief', children: React.ReactNode }){
  const router = useRouter()
  const { user } = useAuth()

  useEffect(()=>{
    document.documentElement.setAttribute('data-role', role)
  },[role])

  useEffect(()=>{
    if(!user) router.replace('/login')
    else if(user.role !== role) router.replace(`/${user.role}/dashboard`)
  },[user, role, router])

  if(!user || user.role !== role) return null
  return <>{children}</>
}