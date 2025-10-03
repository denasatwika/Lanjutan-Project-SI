'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSignMessage } from 'wagmi'
import { toast } from 'sonner'
import { requestNonce, postLogin } from '@/lib/api/auth'
import { useAuth } from '@/lib/state/auth'

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function LoginPage() {
  const router = useRouter()
  const fetchSession = useAuth((state) => state.fetchSession)
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [authorising, setAuthorising] = useState(false)

  const handleLogin = async () => {
    if (!address) {
      toast.error('Connect your wallet first.')
      return
    }

    const normalisedAddress = address.trim().toLowerCase()

    try {
      setAuthorising(true)
      const { nonce } = await requestNonce(normalisedAddress)
      const signature = await signMessageAsync({ message: nonce })

      await postLogin(normalisedAddress, signature)

      const session = await fetchSession()
      if (!session) {
        throw new Error('Session belum tersedia. Silakan coba lagi.')
      }

      const destination = session.role === 'requester' ? '/employee/dashboard' : '/hr/dashboard'
      toast.success('Login berhasil')
      router.replace(destination)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete login.'
      if (message.toLowerCase().includes('user rejected')) {
        toast.info('Signature dibatalkan.')
      } else {
        toast.error(message)
      }
    } finally {
      setAuthorising(false)
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="card max-w-md w-full p-6 space-y-6">
        <h1 className="text-2xl font-bold">Sign in with Wallet</h1>
        <p className="text-sm text-gray-600">
          Connect your Web3 wallet, then sign the secure message to continue. The backend verifies your wallet
          and assigns the correct workspace automatically.
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

        <button
          type="button"
          onClick={handleLogin}
          disabled={!isConnected || authorising}
          className={`btn btn-primary w-full ${!isConnected || authorising ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {authorising ? 'Signing...' : 'Sign message & login'}
        </button>
      </div>
    </main>
  )
}
