'use client'

import { encodeFunctionData, type Address, type Hex } from 'viem'

// LeaveCore ABI - only the functions we need
const LEAVE_CORE_ABI = [
  {
    type: 'function',
    name: 'createRequest',
    inputs: [
      { name: 'requestId', type: 'bytes32' },
      { name: 'docHash', type: 'bytes32' },
      { name: 'leaveType', type: 'uint8' },
      { name: 'leaveDays', type: 'uint32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

// CompanyMultisig ABI - only the functions we need
const COMPANY_MULTISIG_ABI = [
  {
    type: 'function',
    name: 'collectApproval',
    inputs: [
      { name: 'requestId', type: 'bytes32' },
      { name: 'signer', type: 'address' },
      { name: 'role', type: 'uint8' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

export type EncodeCreateRequestInput = {
  requestId: Hex
  docHash: Hex
  leaveType: 1 | 2 | 3 // CUTI = 1, SAKIT = 2, IZIN = 3
  leaveDays: number
}

export type EncodeCollectApprovalInput = {
  requestId: Hex
  signer: Address
  role: 1 | 2 | 3 // SUPERVISOR = 1, CHIEF = 2, HR = 3
}

/**
 * Encodes a createRequest function call for LeaveCore
 */
export function encodeCreateRequest(input: EncodeCreateRequestInput): Hex {
  return encodeFunctionData({
    abi: LEAVE_CORE_ABI,
    functionName: 'createRequest',
    args: [input.requestId, input.docHash, input.leaveType, input.leaveDays],
  })
}

/**
 * Encodes a collectApproval function call for CompanyMultisig
 */
export function encodeCollectApproval(input: EncodeCollectApprovalInput): Hex {
  return encodeFunctionData({
    abi: COMPANY_MULTISIG_ABI,
    functionName: 'collectApproval',
    args: [input.requestId, input.signer, input.role],
  })
}

/**
 * Converts MultisigRole string to enum number
 */
export function multisigRoleToNumber(role: 'SUPERVISOR' | 'CHIEF' | 'HR'): 1 | 2 | 3 {
  switch (role) {
    case 'SUPERVISOR':
      return 1
    case 'CHIEF':
      return 2
    case 'HR':
      return 3
    default:
      throw new Error(`Invalid role: ${role}`)
  }
}

/**
 * Converts leave type string to enum number
 */
export function leaveTypeToNumber(leaveType: string): 1 | 2 | 3 {
  const normalized = leaveType.toLowerCase()
  switch (normalized) {
    case 'cuti':
      return 1
    case 'sakit':
      return 2
    case 'izin':
      return 3
    default:
      throw new Error(`Invalid leave type: ${leaveType}`)
  }
}

/**
 * Calculates the number of days between two dates (inclusive)
 */
export function calculateLeaveDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Reset time to start of day for accurate date comparison
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  // Calculate difference in milliseconds and convert to days
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // Add 1 to include both start and end dates
  return diffDays + 1
}
