'use client'

import '@rainbow-me/rainbowkit/styles.css'

import { ReactNode, useEffect } from 'react'
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from '@/lib/web3/wagmiConfig'
import { useAuth } from '@/lib/state/auth'

const queryClient = new QueryClient()

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          appInfo={{ appName: 'MyBaliola' }}
          theme={lightTheme({ accentColor: '#00156B', borderRadius: 'medium' })}
        >
          <AuthHydrator />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function AuthHydrator() {
  const hydrated = useAuth((state) => state.hydrated)
  const fetchSession = useAuth((state) => state.fetchSession)

  useEffect(() => {
    if (!hydrated) {
      fetchSession().catch(() => undefined)
    }
  }, [hydrated, fetchSession])

  return null
}
