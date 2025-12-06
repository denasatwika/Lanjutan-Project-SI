'use client'

import { useEffect, useState } from 'react'
import { getWallets } from '../api/wallets'

type Options = {
  employeeId?: string
  fallbackAddress?: `0x${string}` | string | null
}

type WalletState = {
  address: `0x${string}` | string | null
  loading: boolean
  error: string | null
}

export function usePrimaryWalletAddress({ employeeId, fallbackAddress }: Options): WalletState {
  const [state, setState] = useState<WalletState>({
    address: fallbackAddress ?? null,
    loading: Boolean(!fallbackAddress && employeeId),
    error: null,
  })

  useEffect(() => {
    if (!employeeId) {
      setState((current) => ({ ...current, address: fallbackAddress ?? null, loading: false }))
      return
    }

    if (fallbackAddress) {
      setState({ address: fallbackAddress, loading: false, error: null })
      return
    }

    let cancelled = false
    async function load() {
      setState((current) => ({ ...current, loading: true, error: null }))
      try {
        const wallets = await getWallets({ employeeId })
        if (cancelled) return
        const primary = wallets.find((wallet) => wallet.employeeId === employeeId && wallet.isPrimary && wallet.isVerified)
          ?? wallets.find((wallet) => wallet.employeeId === employeeId)
        if (!primary) {
          setState({
            address: null,
            loading: false,
            error: 'No verified company wallet found for this account. Please contact the administrator.',
          })
          return
        }
        setState({ address: primary.address, loading: false, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          address: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load wallet',
        })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [employeeId, fallbackAddress])

  return state
}
