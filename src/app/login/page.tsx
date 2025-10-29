'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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

      const destinationMap: Record<'user' | 'approver' | 'admin', string> = {
        user: '/user/dashboard',
        approver: '/approver/dashboard',
        admin: '/admin/dashboard',
      }
      const destination = destinationMap[session.primaryRole] ?? '/user/dashboard'
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
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto grid min-h-screen max-w-md place-items-center p-6">
        <div className="w-full space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <Image
              src="/logo.png"
              width={256}
              height={256}
              alt="Company Logo"
              className="h-128 w-128 object-contain"
              priority
            />
            <h1 className="text-2xl font-bold text-gray-900">Welcome to MyBaliola</h1>
            <p className="text-sm text-gray-600 text-center">
              Use your Mandala Wallet to login to this app.
            </p>
            <ConnectButton
              accountStatus="address"
              chainStatus="icon"
              showBalance={false}
            />
            {isConnected && address ? (
              <p className="mt-2 text-xs text-gray-600">
                Connected as{' '}
                <span className="font-mono font-semibold text-gray-800">
                  {shortenAddress(address)}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-500"></p>
            )}
            <button
              type="button"
              onClick={handleLogin}
              disabled={!isConnected || authorising}
              className={`w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition ${!isConnected || authorising
                  ? 'cursor-not-allowed bg-gray-300'
                  : 'bg-gray-900 hover:bg-black'
                }`}
            >
              {authorising ? 'Signing…' : 'Sign & Login'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
