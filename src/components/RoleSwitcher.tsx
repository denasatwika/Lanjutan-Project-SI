'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/state/auth'

type RoleKey = 'user' | 'approver' | 'admin'

const ROLE_TO_SEGMENT: Record<RoleKey, string> = {
    user: 'user',
    approver: 'approver',
    admin: 'admin',
}

export function RoleSwitcher({
  storageKey,
  onChange,
  fallbackRole,
  className,
}: {
  storageKey: string
  onChange?: (role: RoleKey) => void
  fallbackRole?: RoleKey
  className?: string
}) {
    const router = useRouter()
    const user = useAuth((state) => state.user)

  const availableRoles = useMemo<RoleKey[]>(() => {
        if (!user) return fallbackRole ? [fallbackRole] : ['user']
        const roles = user.roles.filter((role): role is RoleKey => role === 'user' || role === 'approver' || role === 'admin')
        return roles.length > 0 ? roles : fallbackRole ? [fallbackRole] : [user.primaryRole]
    }, [user, fallbackRole])

  const effectiveFallback = fallbackRole ?? user?.primaryRole ?? availableRoles[0]
  const [role, setRole] = useState<RoleKey>(effectiveFallback)

    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey) as RoleKey | null
            if (saved && availableRoles.includes(saved)) {
                setRole(saved)
            } else {
                setRole(effectiveFallback)
            }
        } catch {
            setRole(effectiveFallback)
        }
    }, [availableRoles, effectiveFallback, storageKey])

    const handleChange = (next: RoleKey) => {
        setRole(next)
        try {
            localStorage.setItem(storageKey, next)
        } catch { }
        onChange?.(next)
        router.push(`/${ROLE_TO_SEGMENT[next]}/dashboard`)
    }

  if (availableRoles.length <= 1) {
    return (
      <span className={`inline-flex items-center gap-2 text-sm text-gray-500 ${className ?? ''}`}>
        <span className="hidden sm:inline">Role</span>
        <span className="font-medium capitalize">{availableRoles[0]}</span>
      </span>
    )
  }

  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className ?? ''}`}>
            <span className="text-gray-600 hidden sm:inline">Role</span>
            <div className="relative">
                <select
                    value={role}
                    onChange={(event) => handleChange(event.target.value as RoleKey)}
                    className="appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-[#0b1535] font-medium shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-[--S-800]/30"
                    aria-label="Change role"
                >
                    {availableRoles.map((r) => (
                        <option key={r} value={r}>
                            {r}
                        </option>
                    ))}
                </select>
                <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </div>
        </label>
    )
}
