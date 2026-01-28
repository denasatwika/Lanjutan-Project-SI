import { createPublicClient, defineChain, http, type PublicClient } from 'viem'
import type { ChainConfig } from '../api/chain'

const clientCache = new Map<string, PublicClient>()

export function getPublicClient(config: ChainConfig): PublicClient {
  if (!config.rpcUrl) {
    throw new Error('RPC URL missing from chain configuration.')
  }
  if (!config.chainId) {
    throw new Error('Chain ID missing from chain configuration.')
  }

  const cacheKey = `${config.chainId}:${config.rpcUrl}`
  const existing = clientCache.get(cacheKey)
  if (existing) return existing

  const chain = defineChain({
    id: config.chainId,
    name: 'Configured Chain',
    nativeCurrency: { name: 'Token', symbol: 'TOK', decimals: 18 },
    rpcUrls: {
      default: { http: [config.rpcUrl] },
      public: { http: [config.rpcUrl] },
    },
  })

  const client = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  })

  clientCache.set(cacheKey, client)
  return client
}
