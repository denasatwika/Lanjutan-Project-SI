'use client'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/state/auth'
import { roles } from '@/lib/types'
import { RoleBadge } from '@/components/RoleBadge'
import { DemoBanner } from '@/components/DemoBanner'

export default function LoginPage(){
  const router = useRouter()
  const login = useAuth(s=>s.login)

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="card max-w-md w-full p-6 space-y-6">
        <h1 className="text-2xl font-bold">Sign in (Demo)</h1>
        <p className="text-sm text-gray-600">Pick a role to simulate the experience. Data is local to your browser.</p>
        <div className="grid grid-cols-2 gap-3">
          {roles.map(r => (
            <button key={r} className="btn btn-primary" onClick={()=>{ login({ id: r, name: r.toUpperCase(), role: r as any }); router.push(`/${r}/dashboard`)} }>
              <RoleBadge role={r as any} /> <span className="ml-2 capitalize">{r}</span>
            </button>
          ))}
        </div>
        <DemoBanner compact />
      </div>
    </main>
  )
}