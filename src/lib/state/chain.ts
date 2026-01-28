'use client'

import { create } from 'zustand'
import { ChainConfig, getChainConfig } from '../api/chain'

export type ChainEnvironmentStatus = 'idle' | 'loading' | 'success' | 'error'

type ChainConfigState = {
  config?: ChainConfig
  status: ChainEnvironmentStatus
  hydrated: boolean
  error?: string
  lastFetchedAt?: number
  load: (options?: { force?: boolean }) => Promise<ChainConfig | undefined>
  setConfig: (config?: ChainConfig) => void
  setError: (message?: string) => void
}

export const REQUIRED_CHAIN_KEYS = ['chainId', 'forwarderAddress', 'leaveCoreAddress'] as const

export type RequiredChainKey = (typeof REQUIRED_CHAIN_KEYS)[number]

export const useChainConfig = create<ChainConfigState>()((set, get) => ({
  config: undefined,
  status: 'idle',
  hydrated: false,
  error: undefined,
  lastFetchedAt: undefined,

  load: async (options) => {
    const { hydrated, status } = get()
    if (!options?.force && (status === 'loading' || hydrated)) {
      return get().config
    }

    set({ status: 'loading', error: undefined })
    try {
      const config = await getChainConfig()
      set({
        config,
        status: 'success',
        hydrated: true,
        error: undefined,
        lastFetchedAt: Date.now(),
      })
      return config
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load chain configuration'
      set({ status: 'error', error: message, hydrated: true })
      throw error
    }
  },

  setConfig: (config) =>
    set({
      config,
      status: config ? 'success' : 'idle',
      hydrated: true,
      error: undefined,
      lastFetchedAt: config ? Date.now() : undefined,
    }),

  setError: (message) =>
    set({
      status: 'error',
      error: message,
      hydrated: true,
    }),
}))

export function isChainConfigReady(config: ChainConfig | undefined | null): boolean {
  if (!config) return false
  return REQUIRED_CHAIN_KEYS.every((key) => {
    const value = config[key]
    return typeof value === 'number'
      ? Number.isFinite(value) && value > 0
      : typeof value === 'string' && value.length > 0
  })
}

export function findMissingChainConfigKeys(config: ChainConfig | undefined | null): RequiredChainKey[] {
  if (!config) return [...REQUIRED_CHAIN_KEYS]
  return REQUIRED_CHAIN_KEYS.filter((key) => {
    const value = config[key]
    if (typeof value === 'number') return !Number.isFinite(value) || value <= 0
    if (typeof value === 'string') return value.trim().length === 0
    return true
  })
}
