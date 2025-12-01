'use client'

import '@rainbow-me/rainbowkit/styles.css'

import { ReactNode, useEffect } from 'react'
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from '@/lib/web3/wagmiConfig'
import { useAuth } from '@/lib/state/auth'
import { useChainConfig } from '@/lib/state/chain'

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
          <ChainConfigHydrator />
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

function ChainConfigHydrator() {
  const hydrated = useChainConfig((state) => state.hydrated)
  const load = useChainConfig((state) => state.load)

  useEffect(() => {
    if (!hydrated) {
      load().catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to hydrate chain config', error)
        }
      })
    }
  }, [hydrated, load])

  return null
}
