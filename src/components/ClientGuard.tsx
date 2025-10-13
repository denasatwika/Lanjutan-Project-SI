'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/state/auth'

export function ClientGuard({ role, children }: { role: 'requester' | 'approver'; children: React.ReactNode }) {
  const router = useRouter()
  const { user, hydrated } = useAuth()

  useEffect(() => {
    document.documentElement.setAttribute('data-role', role)
  }, [role])

  useEffect(() => {
    if (!hydrated) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (user.role !== role) {
      const fallback = user.role === 'requester' ? '/employee/dashboard' : '/hr/dashboard'
      router.replace(fallback)
    }
  }, [hydrated, user, role, router])

  if (!hydrated) return null
  if (!user || user.role !== role) return null

  return <>{children}</>
}
