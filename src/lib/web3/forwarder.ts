import type { Address } from 'viem'
import type { ChainConfig } from '../api/chain'
import { forwarderAbi } from './abis'
import { getPublicClient } from './client'

export async function getForwarderNonce(
  config: ChainConfig,
  forwarderAddress: Address,
  account: Address,
): Promise<bigint> {
  const client = getPublicClient(config)
  const result = await client.readContract({
    address: forwarderAddress,
    abi: forwarderAbi,
    functionName: 'getNonce',
    args: [account],
  })

  if (typeof result === 'bigint') {
    return result
  }

  if (typeof result === 'number') {
    return BigInt(result)
  }

  return BigInt(result as string)
}
