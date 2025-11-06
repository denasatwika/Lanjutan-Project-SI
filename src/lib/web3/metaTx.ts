import { encodeFunctionData, type Abi, type Address } from 'viem'
import { buildMetaPreparePayload, type MetaTransactionPreparePayload } from '../api/leaveRequests'
import type { ChainConfig } from '../api/chain'

export type EncodeMetaTxParams = {
  abi: Abi
  functionName: string
  args?: readonly unknown[]
  from: Address
  to?: Address
  gas?: MetaTransactionPreparePayload['gas']
  value?: MetaTransactionPreparePayload['value']
}

export function encodeMetaTransaction({
  abi,
  functionName,
  args,
  from,
  to,
  gas = '0x0',
  value,
}: EncodeMetaTxParams): MetaTransactionPreparePayload {
  if (!to) {
    throw new Error('Target contract address is required to encode meta-transaction data.')
  }

  const data = encodeFunctionData({
    abi,
    functionName,
    args: args ?? [],
  })

  return buildMetaPreparePayload({
    from,
    to,
    gas,
    value,
    data,
  })
}

export function encodeLeaveCoreMetaTransaction(
  config: ChainConfig | undefined,
  options: Omit<EncodeMetaTxParams, 'to'>,
): MetaTransactionPreparePayload {
  const address = config?.leaveCoreAddress
  if (!address) {
    throw new Error('LeaveCore contract address unavailable in chain configuration.')
  }
  return encodeMetaTransaction({
    ...options,
    to: address,
  })
}

export function encodeCompanyMultisigMetaTransaction(
  config: ChainConfig | undefined,
  options: Omit<EncodeMetaTxParams, 'to'>,
): MetaTransactionPreparePayload {
  const address = config?.companyMultisigAddress
  if (!address) {
    throw new Error('CompanyMultisig contract address unavailable in chain configuration.')
  }
  return encodeMetaTransaction({
    ...options,
    to: address,
  })
}
