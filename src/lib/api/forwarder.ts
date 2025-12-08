import type { TypedData, TypedDataDomain, TypedDataParameter } from 'viem'
import { HttpError } from '../types/errors'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

export type ForwardRequestPayload = {
  from: `0x${string}`
  to: `0x${string}`
  value?: bigint | number | string
  gas: bigint | number | string
  data: `0x${string}`
  deadline?: bigint | number | string
}

export type ForwardRequestMessage = {
  from: `0x${string}`
  to: `0x${string}`
  value: string
  gas: string
  nonce: string
  deadline: string
  dataHash: `0x${string}`
}

export type ForwardRequest = {
  from: `0x${string}`
  to: `0x${string}`
  value: string
  gas: string
  nonce: string
  deadline: string
  data: `0x${string}`
}

export type ForwardRequestTypedDataResponse = {
  domain: TypedDataDomain
  types: Record<string, readonly TypedDataParameter[]>
  primaryType: 'ForwardRequest'
  message: ForwardRequestMessage
  request: ForwardRequest
}

export type ForwardRequestSubmitPayload = {
  request: ForwardRequest
  signature: `0x${string}`
}

export type ForwardRequestSubmitResponse = {
  txHash: `0x${string}`
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? safeParseJSON(text) : undefined

  if (!response.ok) {
    const message = (data as ErrorPayload | undefined)?.error ?? response.statusText ?? 'Request failed'
    throw new HttpError(message, response.status)
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

function normalizeQuantity(value: bigint | number | string) {
  if (typeof value === 'bigint') {
    if (value < BigInt(0)) {
      throw new Error('Numeric values must be non-negative.')
    }
    return value.toString()
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Value must be a finite non-negative number')
    }
    return value.toString()
  }
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error('Value cannot be empty')
  }
  return trimmed
}

/**
 * Prepares a ForwardRequest for signing
 * This calls the gasless forwarder endpoint to get the nonce and construct EIP-712 typed data
 */
export async function prepareForwardRequest(
  payload: ForwardRequestPayload,
): Promise<ForwardRequestTypedDataResponse> {
  const response = await fetch(`${API_BASE}/meta/prepare`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: payload.from,
      to: payload.to,
      value: payload.value !== undefined ? normalizeQuantity(payload.value) : '0',
      gas: normalizeQuantity(payload.gas),
      data: payload.data,
      deadline: payload.deadline !== undefined ? normalizeQuantity(payload.deadline) : undefined,
    }),
  })

  return parseJson<ForwardRequestTypedDataResponse>(response)
}

/**
 * Submits a signed ForwardRequest to be relayed on-chain
 */
export async function submitForwardRequest(
  payload: ForwardRequestSubmitPayload,
): Promise<ForwardRequestSubmitResponse> {
  const response = await fetch(`${API_BASE}/meta/submit`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJson<ForwardRequestSubmitResponse>(response)
}
