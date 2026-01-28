'use client'

import type { ChainConfig } from '../api/chain'
import { EthereumProviderUnavailableError } from './signing'

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

export async function getConnectedChainId(): Promise<number | null> {
  const provider = typeof window !== 'undefined' ? window.ethereum : undefined
  if (!provider) {
    throw new EthereumProviderUnavailableError()
  }

  const chainIdHex = await provider.request({ method: 'eth_chainId' })
  if (typeof chainIdHex !== 'string') return null
  return parseInt(chainIdHex, 16)
}

export async function ensureChain(
  config: ChainConfig | undefined,
  options?: {
    allowAdd?: boolean
    chainName?: string
    nativeCurrency?: { name: string; symbol: string; decimals: number }
  },
): Promise<void> {
  if (!config?.chainHexId) {
    throw new Error('Chain configuration is missing the chain identifier.')
  }

  const provider = typeof window !== 'undefined' ? window.ethereum : undefined
  if (!provider) {
    throw new EthereumProviderUnavailableError()
  }

  const current = await provider.request({ method: 'eth_chainId' })
  if (typeof current === 'string' && normalizeHex(current) === normalizeHex(config.chainHexId)) {
    return
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: config.chainHexId }],
    })
    return
  } catch (error) {
    if (!options?.allowAdd || !isUnrecognizedChainError(error)) {
      throw resolveNetworkError(error)
    }
  }

  if (!options?.chainName) {
    throw new Error('Wallet does not recognize the configured chain. Provide chain metadata to add it.')
  }

  const rpcUrls = config.rpcUrl ? [config.rpcUrl] : []
  if (rpcUrls.length === 0) {
    throw new Error('Cannot add chain without at least one RPC URL.')
  }

  await provider.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: config.chainHexId,
        chainName: options.chainName,
        rpcUrls,
        nativeCurrency: options.nativeCurrency ?? { name: 'Token', symbol: 'TOK', decimals: 18 },
      },
    ],
  })
}

function normalizeHex(input: string): string {
  return input.startsWith('0x') || input.startsWith('0X') ? input.toLowerCase() : `0x${input.toLowerCase()}`
}

function isUnrecognizedChainError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: unknown }).code
  return code === 4902 || code === '4902'
}

function resolveNetworkError(error: unknown): Error {
  if (error instanceof Error) return error
  if (!error) return new Error('Unknown network error')
  if (typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message: unknown }).message))
  }
  return new Error(String(error))
}
