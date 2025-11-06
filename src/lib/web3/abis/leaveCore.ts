import { parseAbi } from 'viem'

export const leaveCoreAbi = parseAbi([
  'function createRequest(uint256 requestId, address requester, string leaveType, uint64 leaveStartDate, uint64 leaveEndDate, uint32 leaveDays, string leaveReason, string attachmentId)',
])
