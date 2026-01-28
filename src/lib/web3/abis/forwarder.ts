import { parseAbi } from 'viem'

export const forwarderAbi = parseAbi([
  'function getNonce(address from) view returns (uint256)',
])
