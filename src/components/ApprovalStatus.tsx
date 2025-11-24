'use client'

import { type ApprovalState } from '@/lib/api/multisig'
import { CheckCircle2, Circle, Clock, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

type ApprovalStatusProps = {
  state: ApprovalState | null
  loading?: boolean
  compact?: boolean
}

export function ApprovalStatus({ state, loading, compact = false }: ApprovalStatusProps) {
  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading approval status...
      </div>
    )
  }

  if (!state) {
    return (
      <div className="text-sm text-muted-foreground">
        No approval data available
      </div>
    )
  }

  const progress = state.approvalCount / state.threshold
  const progressPercent = Math.round(progress * 100)
  const isComplete = state.thresholdReached

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTxHash = (txHash: string, long = false) => {
    if (long) {
      return `${txHash.slice(0, 10)}...${txHash.slice(-8)}`
    }
    return `${txHash.slice(0, 6)}...${txHash.slice(-4)}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <Clock className="w-4 h-4 text-yellow-600" />
          )}
          <span className="text-sm font-medium">
            {state.approvalCount} / {state.threshold} approvals
          </span>
          {isComplete && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
              Approved
            </span>
          )}
        </div>

        {state.approvals.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            {state.approvals.map((approval, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                <span className="font-medium">{approval.approverRole}</span>
                {approval.txHash && (
                  <div className="flex items-center gap-1">
                    <span className="text-blue-600 font-mono text-xs">
                      {formatTxHash(approval.txHash)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(approval.txHash!)}
                      className="hover:text-blue-800"
                      title="Copy transaction hash"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Approval Status</h3>
          <p className="text-sm text-muted-foreground">
            {isComplete ? 'All approvals received' : `Waiting for ${state.threshold - state.approvalCount} more approval(s)`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {state.approvalCount} / {state.threshold}
          </div>
          <div className="text-xs text-muted-foreground">
            {progressPercent}% complete
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isComplete ? 'bg-green-600' : 'bg-blue-600'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Required Approvers */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Required Approvals:</h4>
        <div className="space-y-3">
          {['SUPERVISOR', 'CHIEF', 'HR'].map((role) => {
            const approval = state.approvals.find((a) => a.approverRole === role)
            const hasApproved = !!approval

            return (
              <div key={role} className="flex items-start gap-3">
                {hasApproved ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{role}</span>
                    {hasApproved && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        Approved
                      </span>
                    )}
                  </div>

                  {hasApproved && approval && (
                    <div className="mt-1 space-y-1">
                      {approval.txHash && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Transaction:</span>
                          <code className="text-blue-600 font-mono text-sm font-semibold">{formatTxHash(approval.txHash, true)}</code>
                          <button
                            onClick={() => copyToClipboard(approval.txHash!)}
                            className="hover:text-blue-800 transition-colors"
                            title="Copy transaction hash"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <a
                            href={`http://localhost:8545/tx/${approval.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-800 transition-colors"
                            title="View on block explorer"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        {formatDate(approval.approvedAt)}
                      </div>

                      {approval.onChainConfirmed && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Confirmed on-chain</span>
                        </div>
                      )}
                    </div>
                  )}

                  {!hasApproved && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Waiting for approval...
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Executed Status */}
      {state.executed && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Request Executed</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            This request has been executed on-chain.
          </p>
        </div>
      )}
    </div>
  )
}
