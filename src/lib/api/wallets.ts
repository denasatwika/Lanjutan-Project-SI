import { HttpError } from '../types/errors'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

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

export type EmployeeWallet = {
  id: string
  employeeId: string
  address: `0x${string}`
  isPrimary: boolean
  isVerified: boolean
  nickname?: string | null
  walletType: string
  lastUsedAt?: string | null
  createdAt: string
  updatedAt: string
}

type GetWalletsOptions = {
  signal?: AbortSignal
  employeeId?: string
}

function buildWalletsUrl(options?: GetWalletsOptions) {
  if (!options?.employeeId) return `${API_BASE}/wallets`
  const url = new URL(`${API_BASE}/wallets`)
  url.searchParams.set('employeeId', options.employeeId)
  return url.toString()
}

export async function getWallets(options?: GetWalletsOptions): Promise<EmployeeWallet[]> {
  const response = await fetch(buildWalletsUrl(options), {
    method: 'GET',
    credentials: 'include',
    signal: options?.signal,
  })

  return parseJson<EmployeeWallet[]>(response)
}

export type WalletCreatePayload = {
  employeeId: string
  address: string
  isPrimary?: boolean
  isVerified?: boolean
  nickname?: string
  walletType?: string
}

export type WalletUpdatePayload = {
  isPrimary?: boolean
  isVerified?: boolean
  nickname?: string
  walletType?: string
}

export type WalletBalanceResponse = {
  address: string
  value: string
  decimals: number
  symbol: string
  formatted: string
}

export async function createWallet(payload: WalletCreatePayload): Promise<EmployeeWallet> {
  const response = await fetch(`${API_BASE}/wallets`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJson<EmployeeWallet>(response)
}

export async function updateWallet(id: string, payload: WalletUpdatePayload): Promise<EmployeeWallet> {
  const response = await fetch(`${API_BASE}/wallets/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJson<EmployeeWallet>(response)
}

export async function deleteWallet(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/wallets/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok && response.status !== 204) {
    const text = await response.text()
    const data = text ? safeParseJSON(text) : undefined
    const message = (data as ErrorPayload | undefined)?.error ?? response.statusText ?? 'Failed to delete wallet'
    throw new HttpError(message, response.status)
  }
}

export async function getWalletBalance(address: string): Promise<WalletBalanceResponse> {
  const response = await fetch(`${API_BASE}/wallet/balance?address=${encodeURIComponent(address)}`, {
    method: 'GET',
    credentials: 'include',
  })

  return parseJson<WalletBalanceResponse>(response)
}
