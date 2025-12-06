import { parseAbi } from 'viem'

export const leaveCoreAbi = parseAbi([
  'function createRequest(bytes32 requestId, bytes32 docHash, uint8 leaveType, uint32 leaveDays)',
])
