import { getAddress } from 'viem'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

export type ChainConfigResponse = {
  chainId?: number | string | null
  rpcUrl?: string | null
  forwarderAddress?: string | null
  leaveCoreAddress?: string | null
  companyMultisigAddress?: string | null
  relayerAddress?: string | null
  [key: string]: unknown
}

export type ChainConfig = {
  chainId?: number
  chainHexId?: `0x${string}`
  rpcUrl?: string
  forwarderAddress?: `0x${string}`
  leaveCoreAddress?: `0x${string}`
  companyMultisigAddress?: `0x${string}`
  relayerAddress?: `0x${string}`
  raw: ChainConfigResponse
}

type GetChainConfigOptions = {
  signal?: AbortSignal
}

export async function getChainConfig(options?: GetChainConfigOptions): Promise<ChainConfig> {
  const response = await fetch(`${API_BASE}/chain/config`, {
    method: 'GET',
    credentials: 'include',
    signal: options?.signal,
  })

  const payload = await parseJson<ChainConfigResponse>(response)
  return normalizeChainConfig(payload)
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? safeParseJSON(text) : undefined

  if (!response.ok) {
    const message = (data as ErrorPayload | undefined)?.error ?? response.statusText ?? 'Request failed'
    const error = new Error(message)
    ;(error as any).status = response.status
    throw error
  }

  return data as T
}

function safeParseJSON(input: string) {
  try {
    return JSON.parse(input)
  } catch {
    return undefined
  }
}

function normalizeChainConfig(payload: ChainConfigResponse): ChainConfig {
  const chainId = normalizeChainId(payload.chainId)
  return {
    chainId: chainId ?? undefined,
    chainHexId: chainId !== null ? toHexChainId(chainId) : undefined,
    rpcUrl: normalizeUrl(payload.rpcUrl) ?? undefined,
    forwarderAddress: normalizeAddress(payload.forwarderAddress) ?? undefined,
    leaveCoreAddress: normalizeAddress(payload.leaveCoreAddress) ?? undefined,
    companyMultisigAddress: normalizeAddress(payload.companyMultisigAddress) ?? undefined,
    relayerAddress: normalizeAddress(payload.relayerAddress) ?? undefined,
    raw: payload,
  }
}

function normalizeChainId(input: unknown): number | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input <= 0) return null
    return Math.floor(input)
  }
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return null
    try {
      if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
        const numeric = Number.parseInt(trimmed, 16)
        return Number.isFinite(numeric) && numeric > 0 ? numeric : null
      }
      const numeric = Number(trimmed)
      return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : null
    } catch {
      return null
    }
  }
  return null
}

function toHexChainId(chainId: number): `0x${string}` {
  return `0x${chainId.toString(16)}` as `0x${string}`
}

function normalizeUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null
  return trimmed
}

function normalizeAddress(input: unknown): `0x${string}` | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    return getAddress(trimmed as `0x${string}`)
  } catch {
    const prefixed = trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed : `0x${trimmed}`
    try {
      return getAddress(prefixed as `0x${string}`)
    } catch {
      return null
    }
  }
}
