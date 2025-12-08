'use client'

import { useEffect, useState } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseAbi, maxUint256 } from 'viem'
import { toast } from 'sonner'
import { useChainConfig } from '@/lib/state/chain'
import { Coins, CheckCircle2, AlertCircle } from 'lucide-react'

const CUTI_TOKEN_ABI = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
])

type ApprovalStatus = 'checking' | 'needed' | 'approved' | 'approving' | 'error'

export function CutiTokenApproval() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainConfigState = useChainConfig()

  const [status, setStatus] = useState<ApprovalStatus>('checking')
  const [balance, setBalance] = useState<string>('0')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const cutiTokenAddress = chainConfigState.config?.cutiTokenAddress
  const leaveCoreAddress = chainConfigState.config?.leaveCoreAddress

  // Check current allowance
  useEffect(() => {
    console.log('[CutiTokenApproval] Config check:', {
      hasAddress: !!address,
      cutiTokenAddress,
      leaveCoreAddress,
      hasPublicClient: !!publicClient,
      configState: chainConfigState,
    })

    if (!address || !cutiTokenAddress || !leaveCoreAddress || !publicClient) {
      setStatus('checking')
      return
    }

    const checkAllowance = async () => {
      try {
        console.log('[CutiTokenApproval] Starting allowance check...')
        setStatus('checking')

        // Check allowance
        console.log('[CutiTokenApproval] Checking allowance...', { cutiTokenAddress, address, leaveCoreAddress })
        const allowance = await publicClient.readContract({
          address: cutiTokenAddress,
          abi: CUTI_TOKEN_ABI,
          functionName: 'allowance',
          args: [address, leaveCoreAddress],
        })
        console.log('[CutiTokenApproval] Allowance:', allowance.toString())

        // Check balance
        console.log('[CutiTokenApproval] Checking balance...')
        const bal = await publicClient.readContract({
          address: cutiTokenAddress,
          abi: CUTI_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [address],
        })
        console.log('[CutiTokenApproval] Balance:', bal.toString())

        setBalance(bal.toString())

        // If allowance is sufficient (we use a high threshold)
        if (allowance >= BigInt(1000000)) {
          console.log('[CutiTokenApproval] Approved!')
          setStatus('approved')
        } else {
          console.log('[CutiTokenApproval] Needs approval')
          setStatus('needed')
        }
      } catch (error) {
        console.error('[CutiTokenApproval] Check failed:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Failed to check approval status')
      }
    }

    checkAllowance()
  }, [address, cutiTokenAddress, leaveCoreAddress, publicClient, chainConfigState.config])

  const handleApprove = async () => {
    if (!walletClient || !address || !cutiTokenAddress || !leaveCoreAddress) {
      toast.error('Wallet not connected')
      return
    }

    try {
      setStatus('approving')
      setErrorMessage('')

      // Request approval for unlimited amount (standard practice)
      const hash = await walletClient.writeContract({
        address: cutiTokenAddress,
        abi: CUTI_TOKEN_ABI,
        functionName: 'approve',
        args: [leaveCoreAddress, maxUint256],
        account: address,
      })

      toast.info('Approval transaction sent. Waiting for confirmation...')

      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }

      setStatus('approved')
      toast.success('CutiToken approved! You can now submit leave requests.')
    } catch (error) {
      console.error('[CutiTokenApproval] Approval failed:', error)
      setStatus('needed')

      const message = error instanceof Error ? error.message : 'Approval failed'
      setErrorMessage(message)

      if (message.includes('User rejected')) {
        toast.error('You rejected the approval request')
      } else {
        toast.error('Failed to approve CutiToken')
      }
    }
  }

  if (status === 'checking') {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0 size-10 rounded-lg bg-blue-50 text-blue-600 grid place-items-center">
            <Coins size={20} />
          </div>
          <div>
            <h3 className="font-bold">CutiToken Setup</h3>
            <p className="text-sm text-gray-500">Checking approval status...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'approved') {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0 size-10 rounded-lg bg-green-50 text-green-600 grid place-items-center">
            <CheckCircle2 size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-green-700">CutiToken Approved</h3>
            <p className="text-sm text-gray-600">
              {balance} token(s) available • All leave requests are gasless
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'needed' || status === 'error') {
    return (
      <div className="card p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 size-10 rounded-lg bg-yellow-50 text-yellow-600 grid place-items-center">
            <AlertCircle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">One-Time Setup Required</h3>
            <p className="text-sm text-gray-600 mt-1">
              Approve the system to use your CutiTokens. This requires a small gas fee (~$0.01-$0.10).
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Available: <span className="font-semibold">{balance} CutiToken(s)</span>
            </p>
            {errorMessage && (
              <p className="text-sm text-red-600 mt-2">{errorMessage}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleApprove}
            disabled={status === 'approving'}
            className="btn btn-primary"
          >
            {status === 'approving' ? 'Approving...' : 'Approve CutiToken'}
          </button>
          <span className="text-xs text-gray-500">
            After approval, all leave requests will be 100% gasless
          </span>
        </div>
      </div>
    )
  }

  return null
}
