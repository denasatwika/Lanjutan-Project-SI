import { parseAbi } from 'viem'

export const companyMultisigAbi = parseAbi([
  'function collectApproval(bytes32 requestId, address signer, uint8 role)',
])
