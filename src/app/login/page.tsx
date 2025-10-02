'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSignMessage } from 'wagmi'
import { toast } from 'sonner'
import { useAuth, getDemoUserByRole } from '@/lib/state/auth'
import { roles, Role } from '@/lib/types'
import { RoleBadge } from '@/components/RoleBadge'
import { DemoBanner } from '@/components/DemoBanner'

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function LoginPage() {
  const router = useRouter()
  const login = useAuth((state) => state.login)
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [authorisingRole, setAuthorisingRole] = useState<Role | null>(null)

  const handleLogin = async (role: Role) => {
    if (!address) {
      toast.error('Connect your wallet first.')
      return
    }

    try {
      setAuthorisingRole(role)
      const signatureMessage = `Sign-in request for MyBaliola\nRole: ${role}\nAddress: ${address}\nTimestamp: ${Date.now()}`

      await signMessageAsync({ message: signatureMessage })

      const baseProfile = getDemoUserByRole(role)
      login({
        id: address,
        name: baseProfile?.name ?? shortenAddress(address),
        role,
        department: baseProfile?.department,
        address,
      })

      router.push(`/${role}/dashboard`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete signature.'
      if (!message.toLowerCase().includes('user rejected')) {
        toast.error(message)
      }
    } finally {
      setAuthorisingRole(null)
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="card max-w-md w-full p-6 space-y-6">
        <h1 className="text-2xl font-bold">Sign in with Wallet</h1>
        <p className="text-sm text-gray-600">
          Connect your Web3 wallet, then choose the role you want to explore in this demo. Data remains in
          your browser.
        </p>

        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <span className="text-xs font-semibold uppercase text-gray-500">Wallet</span>
          <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
          {isConnected && address ? (
            <p className="text-xs text-gray-500">
              Connected as <span className="font-mono font-semibold text-gray-700">{shortenAddress(address)}</span>
            </p>
          ) : (
            <p className="text-xs text-gray-500">No wallet linked yet.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {roles.map((role) => {
            const isDisabled = !isConnected || authorisingRole !== null
            const isLoading = authorisingRole === role

            return (
              <button
                key={role}
                type="button"
                onClick={() => handleLogin(role)}
                disabled={isDisabled}
                className={`btn btn-primary flex items-center justify-center gap-2 ${
                  isDisabled ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <RoleBadge role={role} />
                <span className="ml-1 capitalize">{role}</span>
                {isLoading ? <span className="text-xs">Signing...</span> : null}
              </button>
            )
          })}
        </div>

        <DemoBanner compact />
      </div>
    </main>
  )
}
