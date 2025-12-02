'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { signForwardRequest } from '@/lib/web3/signing'
import { getAllApprovers, getApprovalState, recordApproval, recordRejection, type ApprovalState, type MultisigRole } from '@/lib/api/multisig'
import { listLeaveRequests, type LeaveRequestResponse } from '@/lib/api/leaveRequests'
import { getChainConfig } from '@/lib/api/chain'
import { prepareForwardRequest, submitForwardRequest } from '@/lib/api/forwarder'
import { encodeCollectApproval, encodeCollectRejection, multisigRoleToNumber } from '@/lib/web3/contracts'
import { ApprovalStatus } from '@/components/ApprovalStatus'

export default function ApprovalsPage() {
  const { address: connectedAddress } = useAccount()
  const [myRole, setMyRole] = useState<MultisigRole>('NONE')
  const [pendingRequests, setPendingRequests] = useState<LeaveRequestResponse[]>([])
  const [approvalStates, setApprovalStates] = useState<Map<string, ApprovalState>>(new Map())
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [chainConfig, setChainConfig] = useState<any>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingRequest, setRejectingRequest] = useState<LeaveRequestResponse | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

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
          // Use onChainRequestId from backend if available, otherwise skip
          if (!req.onChainRequestId) {
            console.warn(`Request ${req.id} has no onChainRequestId, skipping approval state`)
            continue
          }
          const state = await getApprovalState(req.onChainRequestId as `0x${string}`)
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

      // Use onChainRequestId from backend
      if (!request.onChainRequestId) {
        toast.error('Request has no on-chain ID')
        return
      }
      const requestId = request.onChainRequestId as `0x${string}`

      // Check if already approved
      const state = approvalStates.get(request.id)
      if (state?.approvals.some((a) => a.approverAddress.toLowerCase() === connectedAddress.toLowerCase())) {
        toast.error('You have already approved this request')
        return
      }

      // Check if user is the requester (prevent self-approval UI)
      if (request.requesterWalletAddress?.toLowerCase() === connectedAddress.toLowerCase()) {
        toast.error('You cannot approve your own request')
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

  function openRejectDialog(request: LeaveRequestResponse) {
    if (!connectedAddress || myRole === 'NONE') {
      toast.error('You are not authorized to reject requests')
      return
    }

    const state = approvalStates.get(request.id)
    if (state?.approvals.some((a) => a.approverAddress.toLowerCase() === connectedAddress.toLowerCase())) {
      toast.error('You have already approved this request')
      return
    }

      // Prevent self-rejection
      if (request.requesterWalletAddress?.toLowerCase() === connectedAddress.toLowerCase()) {
        toast.error('You cannot reject your own request')
        return
      }

    setRejectingRequest(request)
    setRejectionReason('')
    setRejectDialogOpen(true)
  }

  async function handleReject() {
    if (!rejectingRequest || !connectedAddress || myRole === 'NONE') {
      return
    }

    if (!chainConfig?.companyMultisigAddress) {
      toast.error('Multisig contract address not configured')
      return
    }

    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    if (rejectionReason.length > 500) {
      toast.error('Rejection reason too long (max 500 characters)')
      return
    }

    try {
      setProcessingId(rejectingRequest.id)

      // Use onChainRequestId from backend
      if (!rejectingRequest.onChainRequestId) {
        toast.error('Request has no on-chain ID')
        return
      }
      const requestId = rejectingRequest.onChainRequestId as `0x${string}`

      // Encode collectRejection function call
      const roleNumber = multisigRoleToNumber(myRole as 'SUPERVISOR' | 'CHIEF' | 'HR')
      const data = encodeCollectRejection({
        requestId,
        signer: connectedAddress,
        role: roleNumber,
        reason: rejectionReason.trim(),
      })

      // Prepare ForwardRequest
      toast.info('Preparing rejection transaction...')
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
      toast.info('Please sign the rejection in your wallet...')
      const signature = await signForwardRequest(connectedAddress, prepared)

      // Record rejection in database BEFORE blockchain transaction
      await recordRejection({
        requestId,
        rejectorAddress: connectedAddress,
        rejectorRole: myRole,
        reason: rejectionReason.trim(),
        signature,
        leaveRequestId: rejectingRequest.id,
      })

      // Submit to blockchain via relayer
      toast.info('Submitting rejection...')
      const result = await submitForwardRequest({
        request: prepared.request,
        signature,
      })

      toast.success('Rejection submitted successfully', {
        description: `Tx: ${result.txHash}`,
      })

      // Close dialog and reload data
      setRejectDialogOpen(false)
      setRejectingRequest(null)
      setRejectionReason('')
      await loadData()
    } catch (error) {
      console.error('Failed to reject request', error)
      toast.error(error instanceof Error ? error.message : 'Failed to reject request')
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

                <div className="flex gap-2">
                    {request.requesterWalletAddress?.toLowerCase() !== connectedAddress?.toLowerCase() ? (
                    <>
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
                      <button
                        onClick={() => openRejectDialog(request)}
                        disabled={hasApproved || processingId === request.id}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      You cannot approve your own request
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rejection Dialog */}
      {rejectDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Reject Leave Request</h2>

            {rejectingRequest && (
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm font-semibold">{rejectingRequest.leaveType}</p>
                <p className="text-xs text-gray-600">
                  {rejectingRequest.leaveStartDate} to {rejectingRequest.leaveEndDate}
                </p>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="rejectionReason" className="block text-sm font-medium mb-2">
                Rejection Reason <span className="text-red-600">*</span>
              </label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please explain why you are rejecting this request..."
                className="w-full border rounded p-2 text-sm min-h-[100px]"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {rejectionReason.length}/500 characters
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setRejectDialogOpen(false)
                  setRejectingRequest(null)
                  setRejectionReason('')
                }}
                disabled={processingId !== null}
                className="px-4 py-2 border rounded hover:bg-gray-50 disabled:cursor-not-allowed text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingId !== null}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {processingId ? 'Processing...' : 'Submit Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
