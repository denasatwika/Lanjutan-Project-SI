'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { isAddress } from 'viem'
import { getAllApprovers, setApproverRole, type ApproverRole, type MultisigRole } from '@/lib/api/multisig'

const ROLE_OPTIONS: { value: MultisigRole; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'CHIEF', label: 'Chief' },
  { value: 'HR', label: 'HR' },
]

export default function ApproversAdminPage() {
  const [approvers, setApprovers] = useState<ApproverRole[]>([])
  const [loading, setLoading] = useState(true)
  const [newWallet, setNewWallet] = useState('')
  const [newRole, setNewRole] = useState<MultisigRole>('SUPERVISOR')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadApprovers()
  }, [])

  async function loadApprovers() {
    try {
      setLoading(true)
      const data = await getAllApprovers()
      setApprovers(data)
    } catch (error) {
      console.error('Failed to load approvers', error)
      toast.error('Failed to load approvers')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!newWallet.trim()) {
      toast.error('Wallet address is required')
      return
    }

    if (!isAddress(newWallet)) {
      toast.error('Invalid wallet address')
      return
    }

    try {
      setSubmitting(true)
      await setApproverRole({
        walletAddress: newWallet as `0x${string}`,
        role: newRole,
      })
      toast.success('Approver role set successfully')
      setNewWallet('')
      setNewRole('SUPERVISOR')
      await loadApprovers()
    } catch (error) {
      console.error('Failed to set approver role', error)
      toast.error(error instanceof Error ? error.message : 'Failed to set approver role')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-8">
        <p>Loading approvers...</p>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Approvers</h1>

      {/* Add New Approver Form */}
      <div className="border rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add/Update Approver</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Wallet Address</label>
            <input
              type="text"
              value={newWallet}
              onChange={(e) => setNewWallet(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border rounded"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as MultisigRole)}
              className="w-full px-3 py-2 border rounded"
              disabled={submitting}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? 'Setting Role...' : 'Set Role'}
          </button>
        </form>
      </div>

      {/* Existing Approvers List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Current Approvers</h2>
        {approvers.length === 0 ? (
          <p className="text-muted-foreground">No approvers configured.</p>
        ) : (
          <div className="space-y-2">
            {approvers.map((approver) => (
              <div
                key={approver.id}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-mono text-sm">{approver.walletAddress}</p>
                  {approver.employeeId && (
                    <p className="text-xs text-muted-foreground">Employee ID: {approver.employeeId}</p>
                  )}
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {approver.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
