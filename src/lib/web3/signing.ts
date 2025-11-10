'use client'

import { verifyTypedData, type TypedData, type TypedDataDomain, type TypedDataParameter } from 'viem'

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
  Message extends TypedData = TypedData,
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

export async function signTypedDataV4<
  PrimaryType extends string = string,
  Message extends TypedData = TypedData,
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

  const payload = JSON.stringify({
    domain,
    types,
    primaryType: primaryType ?? inferPrimaryType(types),
    message,
  })

  try {
    const result = await provider.request({
      method: 'eth_signTypedData_v4',
      params: [account, payload],
    })

    if (typeof result === 'string') {
      return result as `0x${string}`
    }

    throw new Error('Unexpected signature result from provider.')
  } catch (error) {
    if (isUserRejectedError(error)) {
      throw new UserRejectedRequestError()
    }
    throw resolveProviderError(error)
  }
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
