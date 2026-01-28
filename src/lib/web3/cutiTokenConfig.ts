import type { Address } from 'viem'

// CUTI Token Contract Address (deployed on Anvil)
// Update this after deployment
export const CUTI_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_CUTI_TOKEN_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as Address

// LeaveCore Contract Address (for approval checks)
export const LEAVE_CORE_ADDRESS = (process.env.NEXT_PUBLIC_LEAVE_CORE_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as Address

export const CUTI_TOKEN_CONFIG = {
  address: CUTI_TOKEN_ADDRESS,
  symbol: 'CUTI',
  name: 'Cuti Leave Token',
  decimals: 0, // 1 token = 1 day
} as const

// Validate addresses at runtime
if (
  CUTI_TOKEN_ADDRESS === '0x0000000000000000000000000000000000000000' &&
  process.env.NODE_ENV === 'production'
) {
  console.error(
    '❌ CUTI_TOKEN_ADDRESS is not configured. Set NEXT_PUBLIC_CUTI_TOKEN_ADDRESS in your environment.'
  )
}
