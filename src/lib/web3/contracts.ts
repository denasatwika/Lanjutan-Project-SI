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
    args: [input.requestId, input.docHash],
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
