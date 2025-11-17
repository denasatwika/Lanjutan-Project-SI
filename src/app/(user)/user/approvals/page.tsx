'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { keccak256, stringToBytes } from 'viem'
import { signForwardRequest } from '@/lib/web3/signing'
import { getAllApprovers, getApprovalState, recordApproval, type ApprovalState, type MultisigRole } from '@/lib/api/multisig'
import { listLeaveRequests, type LeaveRequestResponse } from '@/lib/api/leaveRequests'
import { getChainConfig } from '@/lib/api/chain'
import { prepareForwardRequest, submitForwardRequest } from '@/lib/api/forwarder'
import { encodeCollectApproval, multisigRoleToNumber } from '@/lib/web3/contracts'
import { ApprovalStatus } from '@/components/ApprovalStatus'

export default function ApprovalsPage() {
  const { address: connectedAddress } = useAccount()
  const [myRole, setMyRole] = useState<MultisigRole>('NONE')
  const [pendingRequests, setPendingRequests] = useState<LeaveRequestResponse[]>([])
  const [approvalStates, setApprovalStates] = useState<Map<string, ApprovalState>>(new Map())
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [chainConfig, setChainConfig] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [connectedAddress])

  async function loadData() {
    try {
      setLoading(true)

      // Load chain config
      const config = await getChainConfig()
      setChainConfig(config)

      // Check if user is an approver
      if (connectedAddress) {
        const approvers = await getAllApprovers()
        const myApprover = approvers.find(
          (a) => a.walletAddress.toLowerCase() === connectedAddress.toLowerCase()
        )
        setMyRole(myApprover?.role ?? 'NONE')
      }

      // Load pending leave requests
      const requests = await listLeaveRequests({ status: 'PENDING' })
      setPendingRequests(requests)

      // Load approval states for each request
      const states = new Map<string, ApprovalState>()
      for (const req of requests) {
        try {
          const requestId = keccak256(stringToBytes(`${req.id}:${req.requesterId}`)) as `0x${string}`
          const state = await getApprovalState(requestId)
          states.set(req.id, state)
        } catch (err) {
          console.error(`Failed to load approval state for ${req.id}`, err)
        }
      }
      setApprovalStates(states)
    } catch (error) {
      console.error('Failed to load approvals data', error)
      toast.error('Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(request: LeaveRequestResponse) {
    if (!connectedAddress || myRole === 'NONE') {
      toast.error('You are not authorized to approve requests')
      return
    }

    if (!chainConfig?.companyMultisigAddress) {
      toast.error('Multisig contract address not configured')
      return
    }

    try {
      setProcessingId(request.id)

      // Generate requestId
      const requestId = keccak256(stringToBytes(`${request.id}:${request.requesterId}`)) as `0x${string}`

      // Check if already approved
      const state = approvalStates.get(request.id)
      if (state?.approvals.some((a) => a.approverAddress.toLowerCase() === connectedAddress.toLowerCase())) {
        toast.error('You have already approved this request')
        return
      }

      // Encode collectApproval function call
      const roleNumber = multisigRoleToNumber(myRole as 'SUPERVISOR' | 'CHIEF' | 'HR')
      const data = encodeCollectApproval({
        requestId,
        signer: connectedAddress,
        role: roleNumber,
      })

      // Prepare ForwardRequest
      toast.info('Preparing approval transaction...')
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60) // 1 hour
      const prepared = await prepareForwardRequest({
        from: connectedAddress,
        to: chainConfig.companyMultisigAddress,
        gas: 500000n,
        value: 0n,
        data,
        deadline,
      })

      // Sign ForwardRequest
      toast.info('Please sign the approval in your wallet...')
      const signature = await signForwardRequest(connectedAddress, prepared)

      // Submit to blockchain via relayer
      toast.info('Submitting approval...')
      const result = await submitForwardRequest({
        request: prepared.request,
        signature,
      })

      // Record approval in database with transaction hash
      await recordApproval({
        requestId,
        approverAddress: connectedAddress,
        approverRole: myRole,
        signature,
        leaveRequestId: request.id,
        txHash: result.txHash,
      })

      toast.success('Approval submitted successfully', {
        description: `Tx: ${result.txHash}`,
      })

      // Reload data
      await loadData()
    } catch (error) {
      console.error('Failed to approve request', error)
      toast.error(error instanceof Error ? error.message : 'Failed to approve request')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="container py-8">
        <p>Loading approvals...</p>
      </div>
    )
  }

  if (myRole === 'NONE') {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-4">Approvals</h1>
        <p className="text-muted-foreground">You are not assigned as an approver.</p>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Approvals</h1>
        <p className="text-muted-foreground">Your role: {myRole}</p>
      </div>

      {pendingRequests.length === 0 ? (
        <p className="text-muted-foreground">No pending requests to approve.</p>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((request) => {
            const state = approvalStates.get(request.id)
            const hasApproved = state?.approvals.some(
              (a) => a.approverAddress.toLowerCase() === connectedAddress?.toLowerCase()
            )

            return (
              <div key={request.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{request.leaveType}</h3>
                    <p className="text-sm text-muted-foreground">
                      {request.leaveStartDate} to {request.leaveEndDate} ({request.leaveDays} days)
                    </p>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    {request.status}
                  </span>
                </div>

                <p className="text-sm mb-3">{request.leaveReason}</p>

                <div className="mb-3">
                  <ApprovalStatus state={state ?? null} compact />
                </div>

                <button
                  onClick={() => handleApprove(request)}
                  disabled={hasApproved || processingId === request.id}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                >
                  {processingId === request.id
                    ? 'Processing...'
                    : hasApproved
                    ? 'Already Approved'
                    : 'Approve'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
