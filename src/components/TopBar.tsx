'use client'
import { useAuth } from '@/lib/state/auth'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDisconnect } from 'wagmi'

export function TopBar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { disconnect } = useDisconnect()

  const handleLogout = () => {
    disconnect()
    logout()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.name} · {user?.role?.toUpperCase()}</span>
          <button className="btn" onClick={handleLogout}>
            <LogOut className="size-4" /> Logout
          </button>
        </div>
      </div>
    </header>
  )
}
