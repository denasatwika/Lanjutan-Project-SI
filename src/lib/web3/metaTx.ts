import {
  bytesToHex,
  encodeFunctionData,
  isHex,
  keccak256,
  padHex,
  stringToBytes,
  type Address,
  type Hex,
} from 'viem'
import type { ChainConfig } from '../api/chain'
import {
  buildMetaPreparePayload,
  type MetaTransactionPreparePayload,
} from '../api/leaveRequests'
import { companyMultisigAbi, leaveCoreAbi } from './abis'

export const DEFAULT_FORWARD_GAS = BigInt(500_000)

export type LeaveRequestCalldataParams = {
  requestId: string
  docHash?: string | null
}

export type CollectApprovalCalldataParams = {
  requestId: string
  signer: Address
  role: number
}

export type ForwardRequestInit = {
  from: Address
  to: Address
  data: Hex
  gas?: bigint | number | string
  value?: bigint | number | string
  nonce: bigint | number | string
  deadline: bigint | number | string
  metadata?: Record<string, unknown>
}

export function buildLeaveCoreCalldata({
  requestId,
  docHash,
}: LeaveRequestCalldataParams): Hex {
  const normalizedRequestId = toBytes32(requestId)
  const normalizedDocHash = toBytes32(docHash ?? requestId)

  return encodeFunctionData({
    abi: leaveCoreAbi,
    functionName: 'createRequest',
    args: [normalizedRequestId, normalizedDocHash],
  })
}

export function buildCollectApprovalCalldata({
  requestId,
  signer,
  role,
}: CollectApprovalCalldataParams): Hex {
  const normalizedRequestId = toBytes32(requestId)

  return encodeFunctionData({
    abi: companyMultisigAbi,
    functionName: 'collectApproval',
    args: [normalizedRequestId, signer, role],
  })
}

export function buildForwardRequestPayload(init: ForwardRequestInit): MetaTransactionPreparePayload {
  return buildMetaPreparePayload({
    from: init.from,
    to: init.to,
    gas: init.gas ?? DEFAULT_FORWARD_GAS,
    value: init.value ?? BigInt(0),
    nonce: init.nonce,
    deadline: init.deadline,
    data: init.data,
    metadata: init.metadata,
  })
}

export function ensureLeaveCoreAddress(config: ChainConfig | undefined): Address {
  const address = config?.leaveCoreAddress
  if (!address) {
    throw new Error('LeaveCore contract address unavailable in chain configuration.')
  }
  return address
}

export function ensureCompanyMultisigAddress(config: ChainConfig | undefined): Address {
  const address = config?.companyMultisigAddress
  if (!address) {
    throw new Error('CompanyMultisig contract address unavailable in chain configuration.')
  }
  return address
}

export function ensureForwarderAddress(config: ChainConfig | undefined): Address {
  const address = config?.forwarderAddress
  if (!address) {
    throw new Error('Forwarder contract address unavailable in chain configuration.')
  }
  return address
}

export function toBytes32(value: string): Hex {
  if (!value) {
    throw new Error('Value cannot be empty when converting to bytes32.')
  }

  if (isHex(value, { strict: false })) {
    const prefixed = value.startsWith('0x') || value.startsWith('0X') ? value : `0x${value}`
    return padHex(prefixed as Hex, { size: 32 })
  }

  const bytes = stringToBytes(value)
  if (bytes.length === 32) {
    return bytesToHex(bytes) as Hex
  }
  if (bytes.length > 32) {
    return keccak256(bytes)
  }

  const hexValue = bytesToHex(bytes) as Hex
  return padHex(hexValue, { size: 32 })
}

export function deriveDocHash(options: {
  docHash?: string | null
  attachmentCid?: string | null
  fallback: string
}): Hex {
  if (options.docHash) {
    try {
      return toBytes32(options.docHash)
    } catch {
      // ignore and fall through to next source
    }
  }

  if (options.attachmentCid) {
    return toBytes32(options.attachmentCid)
  }

  return toBytes32(options.fallback)
}
