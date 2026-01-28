'use client'

import {
  verifyTypedData,
  type TypedData,
  type TypedDataDomain,
  type TypedDataParameter,
  type WalletClient,
  createWalletClient,
  custom,
  type Hex,
} from 'viem'
import { mainnet } from 'viem/chains'

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

export type SignTypedDataParams<
  PrimaryType extends string = string,
  Message extends Record<string, unknown> = Record<string, unknown>,
> = {
  account: `0x${string}`
  domain: TypedDataDomain
  types: Record<string, readonly TypedDataParameter[]>
  message: Message
  primaryType?: PrimaryType
}

export class UserRejectedRequestError extends Error {
  constructor(message = 'User rejected the signing request.') {
    super(message)
    this.name = 'UserRejectedRequestError'
  }
}

export class EthereumProviderUnavailableError extends Error {
  constructor(message = 'No Ethereum provider detected.') {
    super(message)
    this.name = 'EthereumProviderUnavailableError'
  }
}

/**
 * Sign typed data using viem's wallet client instead of MetaMask's eth_signTypedData_v4
 * This ensures we use the same signing logic that works in tests
 */
export async function signTypedDataV4<
  PrimaryType extends string = string,
  Message extends Record<string, unknown> = Record<string, unknown>,
>({
  account,
  domain,
  types,
  message,
  primaryType,
}: SignTypedDataParams<PrimaryType, Message>): Promise<`0x${string}`> {
  const provider = typeof window !== 'undefined' ? window.ethereum : undefined
  if (!provider) {
    throw new EthereumProviderUnavailableError()
  }

  console.log('[frontend:signing] Using viem wallet client for signing')
  console.log('[frontend:signing] Account:', account)
  console.log('[frontend:signing] Domain:', JSON.stringify(domain, null, 2))
  console.log('[frontend:signing] Types:', JSON.stringify(types, null, 2))
  console.log('[frontend:signing] Message:', JSON.stringify(message, null, 2))
  console.log('[frontend:signing] Primary Type:', primaryType ?? inferPrimaryType(types))

  try {
    // Create wallet client with the browser provider
    const walletClient = createWalletClient({
      account,
      chain: mainnet, // Chain doesn't matter for signing
      transport: custom(provider),
    })

    // Convert string values to appropriate types for viem
    const viemMessage = convertMessageTypes(message, types[primaryType ?? inferPrimaryType(types) ?? ''] ?? [])

    console.log('[frontend:signing] Converted message for viem:', JSON.stringify(viemMessage, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2))

    // Use viem's signTypedData which we KNOW works
    const signature = await walletClient.signTypedData({
      account,
      domain,
      types: types as any,
      primaryType: (primaryType ?? inferPrimaryType(types)) as string,
      message: viemMessage as any,
    })

    console.log('[frontend:signing] Signature:', signature)
    return signature as Hex
  } catch (error) {
    console.error('[frontend:signing] Error:', error)
    if (isUserRejectedError(error)) {
      throw new UserRejectedRequestError()
    }
    throw resolveProviderError(error)
  }
}

/**
 * Convert string message values to proper types for viem
 */
function convertMessageTypes(
  message: Record<string, unknown>,
  typeDefinitions: readonly TypedDataParameter[]
): Record<string, unknown> {
  const converted: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(message)) {
    const typeDef = typeDefinitions.find(t => t.name === key)
    if (!typeDef) {
      converted[key] = value
      continue
    }

    // Convert based on type
    if (typeDef.type.startsWith('uint') || typeDef.type.startsWith('int')) {
      converted[key] = typeof value === 'string' ? BigInt(value) : value
    } else {
      converted[key] = value
    }
  }

  return converted
}

function inferPrimaryType(types: Record<string, readonly TypedDataParameter[]>): string | undefined {
  const entries = Object.entries(types)
  if (entries.length === 0) return undefined
  const [primary] = entries.find(([_, params]) => Array.isArray(params) && params.length > 0) ?? entries[0]
  return primary
}

export type TypedDataPayload<
  PrimaryType extends string = string,
  Message extends TypedData = TypedData,
> = {
  domain: TypedDataDomain
  types: Record<string, readonly TypedDataParameter[]>
  message: Message
  primaryType?: PrimaryType
}

export async function signForwardRequest<
  PrimaryType extends string = string,
  Message extends TypedData = TypedData,
>(
  account: `0x${string}`,
  payload: TypedDataPayload<PrimaryType, Message>,
) {
  return signTypedDataV4({
    account,
    domain: payload.domain,
    types: payload.types,
    primaryType: payload.primaryType ?? 'ForwardRequest',
    message: payload.message,
  })
}

export async function verifyForwardRequestSignature<
  PrimaryType extends string = string,
  Message extends TypedData = TypedData,
>(
  account: `0x${string}`,
  payload: TypedDataPayload<PrimaryType, Message>,
  signature: `0x${string}`,
): Promise<boolean> {
  try {
    return await verifyTypedData({
      address: account,
      domain: payload.domain,
      types: payload.types,
      primaryType: payload.primaryType ?? 'ForwardRequest',
      message: payload.message,
      signature,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to verify forward request signature', error)
    }
    return false
  }
}

function isUserRejectedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: unknown }).code
  if (code === 4001 || code === '4001') return true
  const message = String((error as { message?: unknown }).message ?? '').toLowerCase()
  return message.includes('user denied') || message.includes('user rejected')
}

function resolveProviderError(error: unknown): Error {
  if (error instanceof Error) return error
  if (!error) return new Error('Unknown provider error')
  if (typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message: unknown }).message))
  }
  return new Error(String(error))
}
