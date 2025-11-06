import { parseAbi } from 'viem'

export const companyMultisigAbi = parseAbi([
  'function collectApproval(uint256 requestId, address approver, uint32 stage, bool decision, string comments, bytes signature)',
])
