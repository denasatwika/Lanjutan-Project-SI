'use client'

import Image from 'next/image'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'
import { PageHeader } from '@/components/PageHeader'
import {
  buildAttachmentDownloadUrl,
  formatAttachmentSize,
  normalizeAttachmentUrl,
} from '@/lib/api/attachments'
import {
  getRequest,
  listApprovals,
  prepareApprovalMeta,
  submitApprovalMeta,
  type ApprovalResponse,
} from '@/lib/api/requests'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import { formatWhen } from '@/lib/utils/date'
import { resolveLeaveTypeLabel } from '@/lib/utils/requestDisplay'
import type { LeaveRequest, OvertimeRequest } from '@/lib/types'
import { useChainConfig, isChainConfigReady } from '@/lib/state/chain'
import { usePrimaryWalletAddress } from '@/lib/hooks/usePrimaryWalletAddress'
import {
  ensureCompanyMultisigAddress,
  ensureForwarderAddress,
  DEFAULT_FORWARD_GAS,
} from '@/lib/web3/metaTx'
import { ensureChain } from '@/lib/web3/network'
import {
  EthereumProviderUnavailableError,
  UserRejectedRequestError,
  signForwardRequest,
} from '@/lib/web3/signing'
type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: any[]) => void) => void
  removeListener?: (event: string, handler: (...args: any[]) => void) => void
}

function getEthereumProvider(): EthereumProvider | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as typeof window & { ethereum?: EthereumProvider }).ethereum
}

export default function ApproverApprovalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const approvalIdFromQuery = searchParams.get('approval')
  const user = useAuth((state) => state.user)
  const { address: connectedAddress } = useAccount()
  const chainConfig = useChainConfig((state) => state.config)
  const {
    address: expectedWalletAddress,
    loading: expectedWalletLoading,
    error: expectedWalletError,
  } = usePrimaryWalletAddress({ employeeId: user?.id, fallbackAddress: user?.address ?? null })
  const walletMismatch = useMemo(() => {
    if (!expectedWalletAddress || !connectedAddress) return false
    return expectedWalletAddress.toLowerCase() !== connectedAddress.toLowerCase()
  }, [connectedAddress, expectedWalletAddress])

  const [walletSwitching, setWalletSwitching] = useState(false)
  const [accountChanged, setAccountChanged] = useState(false)
  const request = useRequests((state) => (id ? state.byId(id) : undefined))
  const upsertRequest = useRequests((state) => state.upsertFromApi)

  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<ApprovalResponse[]>([])
  const [activeApproval, setActiveApproval] = useState<ApprovalResponse | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        if (!request) {
          const fetched = await getRequest(id)
          if (cancelled) return
          upsertRequest(fetched)
        }

        const approvalList = await listApprovals({ requestId: id })
        if (cancelled) return
        setApprovals(approvalList)

        let current =
          approvalList.find((item) => item.id === approvalIdFromQuery) ??
          (user?.id ? approvalList.find((item) => item.approverId === user.id) ?? null : null)

        if (!current && approvalList.length > 0) {
          current = approvalList[0]
        }

        setActiveApproval(current ?? null)
        setNote(current?.comments ?? '')
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Failed to load approval detail'
        toast.error(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [approvalIdFromQuery, id, request, upsertRequest, user?.id])

  useEffect(() => {
    setNote(activeApproval?.comments ?? '')
  }, [activeApproval?.id])

  useEffect(() => {
    setTxHash(null)
  }, [activeApproval?.id])

  useEffect(() => {
    const provider = getEthereumProvider()
    if (!provider?.on) return
    const handler = () => {
      setAccountChanged(true)
      setSubmitting(null)
    }
    provider.on('accountsChanged', handler)
    return () => provider.removeListener?.('accountsChanged', handler)
  }, [])

  useEffect(() => {
    if (
      accountChanged &&
      expectedWalletAddress &&
      connectedAddress &&
      expectedWalletAddress.toLowerCase() === connectedAddress.toLowerCase()
    ) {
      setAccountChanged(false)
    }
  }, [accountChanged, expectedWalletAddress, connectedAddress])

  const canAct = Boolean(
    activeApproval &&
      activeApproval.status === 'PENDING' &&
      (user?.primaryRole === 'approver' || user?.primaryRole === 'admin') &&
      (!user?.id || activeApproval.approverId === user.id) &&
      expectedWalletAddress &&
      connectedAddress &&
      !walletMismatch,
  )

  const isLeave = request?.type === 'leave'
  const leaveRequest = isLeave ? (request as LeaveRequest) : undefined
  const overtimeRequest = !isLeave ? (request as OvertimeRequest) : undefined
  const leaveLabel = leaveRequest ? resolveLeaveTypeLabel(leaveRequest.leaveTypeId) : undefined

  const attachmentSize =
    typeof request?.attachmentSize === 'number' && request.attachmentSize > 0
      ? formatAttachmentSize(request.attachmentSize)
      : null
  const normalizedAttachmentUrl = normalizeAttachmentUrl(request?.attachmentUrl, request?.attachmentCid)
  const isImageAttachment = Boolean(request?.attachmentMimeType?.startsWith('image/'))
  const attachmentDownloadHref =
    normalizedAttachmentUrl ??
    (request?.attachmentId
      ? buildAttachmentDownloadUrl(request.attachmentId, request.attachmentDownloadPath)
      : null)
  const attachmentPreviewSrc =
    normalizedAttachmentUrl && isImageAttachment ? normalizedAttachmentUrl : null

  async function requestWalletAlignment() {
    const provider = getEthereumProvider()
    if (!provider) {
      toast.error('No Ethereum provider detected. Please install MetaMask or a compatible wallet.')
      return
    }
    setWalletSwitching(true)
    try {
      await provider.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      })
      await provider.request({ method: 'wallet_requestAccounts' })
      if (chainConfig?.chainHexId) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainConfig.chainHexId }],
          })
        } catch (error) {
          console.warn('wallet_switchEthereumChain failed, relying on ensureChain()', error)
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to request wallet permissions. Please switch manually.'
      toast.error(message)
    } finally {
      setWalletSwitching(false)
    }
  }

  async function handleDecision(decision: 'APPROVED' | 'REJECTED') {
    if (!id || !activeApproval) return
    if (!expectedWalletAddress) {
      toast.error('No registered wallet on file for this approver. Please contact the administrator.')
      return
    }
    if (!connectedAddress) {
      toast.error('Connect your wallet to submit a decision.')
      return
    }
    if (walletMismatch) {
      toast.error('Switch your wallet to the registered approver account before signing.')
      return
    }
    if (accountChanged) {
      toast.error('Your wallet changed recently. Please realign before submitting a decision.')
      return
    }
    if (!chainConfig || !isChainConfigReady(chainConfig)) {
      toast.error('Chain configuration is incomplete. Please contact the administrator.')
      return
    }

    const roleValue = resolveMultisigRole(activeApproval.approverLevel)
    if (roleValue === null) {
      toast.error('Unable to map your approval role to the on-chain role. Please contact support.')
      return
    }

    setSubmitting(decision)
    setErrorMessage(null)
    try {
      const forwarderAddress = ensureForwarderAddress(chainConfig)
      const multisigAddress = ensureCompanyMultisigAddress(chainConfig)

      try {
        await ensureChain(chainConfig, {
          allowAdd: true,
          chainName: chainConfig.name,
          nativeCurrency: chainConfig.nativeCurrency,
        })
      } catch (networkError) {
        throw new Error(
          networkError instanceof Error ? networkError.message : 'Please switch your wallet to the configured network.',
        )
      }

      const signerAddress = expectedWalletAddress as `0x${string}`
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24)
      const comments = note.trim()

      // Use the on-chain requestId from the backend (already calculated when request was created)
      if (!activeApproval.onChainRequestId) {
        throw new Error('On-chain request ID is missing. This request may not have been submitted to the blockchain.')
      }
      const onChainRequestId = activeApproval.onChainRequestId as `0x${string}`

      // Determine role string from roleValue
      const roleString = roleValue === 1 ? 'SUPERVISOR' : roleValue === 2 ? 'CHIEF' : roleValue === 3 ? 'HR' : null
      if (!roleString) {
        throw new Error('Invalid role value')
      }

      console.debug('[approver-meta] preparing decision for wallet', signerAddress)
      console.debug('[approver-meta] onChainRequestId:', onChainRequestId)
      console.debug('[approver-meta] role:', roleString)

      const prepareResponse = await prepareApprovalMeta({
        approver: signerAddress,
        requestId: onChainRequestId,
        role: roleString,
        multisigAddress: multisigAddress,
        gasLimit: DEFAULT_FORWARD_GAS,
        deadline: deadline.toString(),
      })
      const provider = getEthereumProvider()
      if (provider) {
        try {
          const currentAccounts = (await provider.request({ method: 'eth_accounts' })) as string[] | undefined
          console.debug('[approver-meta] eth_accounts before signing', currentAccounts)
        } catch (error) {
          console.warn('[approver-meta] Unable to read eth_accounts before signing', error)
        }
      }
      const signature = await signForwardRequest(signerAddress, prepareResponse)
      const relayResponse = await submitApprovalMeta({
        request: prepareResponse.request,
        signature,
        approvalId: activeApproval.id,
      })

      setTxHash(relayResponse.txHash ?? null)
      toast.success(decision === 'APPROVED' ? 'Approval relayed' : 'Decision relayed', {
        description: relayResponse.txHash ? `Tx: ${relayResponse.txHash}` : undefined,
      })

      const refreshedApprovals = await listApprovals({ requestId: id })
      setApprovals(refreshedApprovals)
      const updatedActive =
        refreshedApprovals.find((item) => item.id === activeApproval.id) ?? null
      setActiveApproval(updatedActive)
      setNote(updatedActive?.comments ?? '')

      const updatedRequest = await getRequest(id)
      upsertRequest(updatedRequest)

      router.push('/approver/approval')
    } catch (error) {
      const status = (error as any)?.status as number | undefined
      let message =
        error instanceof UserRejectedRequestError
          ? 'Signature request was rejected.'
          : error instanceof EthereumProviderUnavailableError
          ? 'No Ethereum provider detected. Please install MetaMask or a compatible wallet.'
          : error instanceof Error
          ? error.message
          : 'Failed to submit decision'

      if (status === 422) {
        message = 'Signature invalid or wrong account. Please reconnect with the correct wallet.'
      } else if (status === 403) {
        message = 'Please use your verified company wallet to act on this approval.'
      }

      console.error('Failed to submit approval decision', error)
      toast.error(message)
      setErrorMessage(message)
      setTxHash(null)
    } finally {
      setSubmitting(null)
    }
  }

  const primaryApproval = activeApproval ?? approvals[0] ?? null

  const employeeName =
    request?.employeeName ??
    primaryApproval?.requesterName ??
    request?.employeeId ??
    primaryApproval?.requesterId ??
    'Unknown employee'
  const department =
    request?.employeeDepartment ??
    primaryApproval?.requesterDepartment ??
    '—'

  const statusTone = request?.status === 'approved'
    ? 'bg-green-50 text-green-700 ring-green-200'
    : request?.status === 'rejected'
    ? 'bg-rose-50 text-rose-700 ring-rose-200'
    : request?.status === 'pending'
    ? 'bg-amber-50 text-amber-700 ring-amber-200'
    : 'bg-slate-100 text-slate-600 ring-slate-200'

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-28">
      <PageHeader
        title="Approval Detail"
        backHref="/approver/approval"
        fullBleed
        bleedMobileOnly
        pullUpPx={24}
      />

      {loading && <p className="mt-8 text-center text-sm text-slate-500">Loading request…</p>}

      {!loading && !request && (
        <p className="mt-8 text-center text-sm text-slate-500">
          Request data unavailable. It may have been removed.
        </p>
      )}

      {!loading && request && (
        <div className="space-y-6">
          <section className="card space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Request {request.id}</h1>
                <p className="text-sm font-semibold text-slate-900">{employeeName}</p>
                <p className="text-xs text-slate-500">{department}</p>
                <p className="text-xs text-slate-500">
                  Created {formatWhen(request.createdAt)} • Last updated {formatWhen(request.updatedAt)}
                </p>
              </div>
              <span
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-semibold ring-1',
                  statusTone,
                )}
              >
                {formatRequestStatus(request.status)}
              </span>
            </div>

            <div className="grid gap-3 text-sm">
              <InfoRow label="Type">
                <span className="capitalize font-semibold">{request.type}</span>
              </InfoRow>
              {leaveRequest ? (
                <>
                  <InfoRow label="Leave type">{leaveLabel ?? leaveRequest.leaveTypeId}</InfoRow>
                  <InfoRow label="Start">{leaveRequest.startDate}</InfoRow>
                  <InfoRow label="End">{leaveRequest.endDate}</InfoRow>
                  <InfoRow label="Duration">{leaveRequest.days} hari</InfoRow>
                </>
              ) : overtimeRequest ? (
                <>
                  <InfoRow label="Work date">{overtimeRequest.workDate}</InfoRow>
                  <InfoRow label="From">{overtimeRequest.startTime}</InfoRow>
                  <InfoRow label="To">{overtimeRequest.endTime}</InfoRow>
                  <InfoRow label="Hours">{overtimeRequest.hours}</InfoRow>
                </>
              ) : null}
              <InfoRow label="Reason">{request.reason ?? '—'}</InfoRow>
              <InfoRow label="Notes">{request.notes ?? '—'}</InfoRow>
              <InfoRow label="Attachment">
                {request?.attachmentId || request?.attachmentUrl ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-700">
                      {request.attachmentName ?? 'Attachment'}
                      {attachmentSize ? ` (${attachmentSize})` : ''}
                    </div>
                    {attachmentPreviewSrc ? (
                      <a
                        href={attachmentDownloadHref ?? attachmentPreviewSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-xl border"
                      >
                        <Image
                          src={attachmentPreviewSrc}
                          alt={request.attachmentName ?? 'Attachment preview'}
                          width={960}
                          height={600}
                          className="h-auto max-h-72 w-full object-contain bg-slate-100"
                        />
                      </a>
                    ) : attachmentDownloadHref ? (
                      <a
                        href={attachmentDownloadHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-semibold text-[#00156B] hover:underline"
                      >
                        Download attachment
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">Attachment unavailable.</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">No attachment</span>
                )}
              </InfoRow>
            </div>
          </section>

          <section className="card space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Approval chain</h2>
            </div>

            {approvals.length === 0 ? (
              <p className="text-sm text-slate-500">No approval records found for this request.</p>
            ) : (
              <ul className="space-y-2">
                {approvals.map((item) => (
                  <li
                    key={item.id}
                    className={clsx(
                      'rounded-xl border p-3 text-sm',
                      item.id === activeApproval?.id
                        ? 'border-[#00156B] bg-[#00156B]/5'
                        : 'border-slate-200 bg-white',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-slate-900">
                        Stage {item.stage}
                        {item.approverLevel ? ` • ${item.approverLevel}` : ''}
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {formatApprovalStatus(item.status)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.decidedAt ? `Decided ${formatWhen(item.decidedAt)}` : 'Awaiting decision'}
                    </div>
                    {item.comments && (
                      <p className="mt-2 text-sm text-slate-600">“{item.comments}”</p>
                    )}
                    {item.signature && (
                      <div
                        className="mt-2 text-[11px] font-mono text-slate-500 break-all"
                        title={item.signature}
                      >
                        Signature: {formatSignaturePreview(item.signature)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="text-base font-semibold text-slate-900">Decision</h2>
            {expectedWalletLoading && (
              <p className="text-xs text-slate-500">Resolving your registered signing wallet…</p>
            )}
            {expectedWalletError && (
              <p className="text-xs text-rose-600">{expectedWalletError}</p>
            )}
            {expectedWalletAddress && (
              <p className="text-xs text-slate-500">
                Registered wallet:{' '}
                <span className="font-mono">{expectedWalletAddress.slice(0, 6)}...{expectedWalletAddress.slice(-4)}</span>
              </p>
            )}
            {connectedAddress && (
              <p className="text-xs text-slate-500">
                MetaMask wallet:{' '}
                <span className="font-mono">{connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}</span>
              </p>
            )}
            {accountChanged && (
              <p className="text-xs text-amber-600">
                Wallet changed in MetaMask. Restart the decision flow after switching to the registered account.
              </p>
            )}
            {walletMismatch && (
              <p className="text-xs text-rose-600">
                Connected wallet{' '}
                <span className="font-mono">{connectedAddress?.slice(0, 6)}...{connectedAddress?.slice(-4)}</span> does not match the registered wallet. Switch accounts to continue.
                <button
                  type="button"
                  onClick={requestWalletAlignment}
                  className="ml-2 inline-flex items-center rounded-lg border border-rose-200 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  disabled={walletSwitching}
                >
                  {walletSwitching ? 'Requesting…' : 'Switch wallet'}
                </button>
              </p>
            )}
            {!activeApproval && (
              <p className="text-sm text-slate-500">
                We were unable to find an approval entry assigned to you.
              </p>
            )}

            {activeApproval && (
              <>
                <textarea
                  rows={4}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#00156B] focus:ring-2 focus:ring-[#00156B]/20 disabled:bg-slate-100"
                  placeholder="Add a note for the employee (optional)"
                  disabled={!canAct || submitting !== null}
                />
                {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => router.push('/approver/approval')}
                    disabled={submitting !== null}
                  >
                    Back to list
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleDecision('REJECTED')}
                    disabled={!canAct || submitting !== null}
                  >
                    {submitting === 'REJECTED' ? 'Submitting…' : 'Request changes'}
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl bg-[#00156B] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleDecision('APPROVED')}
                    disabled={!canAct || submitting !== null}
                  >
                    {submitting === 'APPROVED' ? 'Approving…' : 'Approve request'}
                  </button>
                </div>

                {txHash && (
                  <p className="text-xs text-slate-500">
                    Latest relay tx:{' '}
                    <span className="font-mono text-slate-600">{formatSignaturePreview(txHash)}</span>
                  </p>
                )}

                {!canAct && (
                  <p className="text-xs text-slate-500">
                    Approval is no longer pending or you are not the assigned approver for this stage.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px,1fr] items-start gap-3 text-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  )
}

function formatRequestStatus(status: string | undefined | null) {
  if (!status) return 'Unknown'
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'pending') return 'Pending'
  if (status === 'draft') return 'Draft'
  return status
}

function formatApprovalStatus(status: ApprovalResponse['status']) {
  if (status === 'APPROVED') return 'Approved'
  if (status === 'REJECTED') return 'Rejected'
  if (status === 'BLOCKED') return 'Blocked'
  if (status === 'CANCELLED') return 'Cancelled'
  if (status === 'DRAFT') return 'Draft'
  return 'Pending'
}

function formatSignaturePreview(value: string) {
  if (value.length <= 18) return value
  return `${value.slice(0, 10)}…${value.slice(-8)}`
}

function resolveMultisigRole(level?: string | null): number | null {
  if (!level) return null
  const normalized = level.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes('super')) return 1
  if (normalized.includes('chief')) return 2
  if (normalized.includes('hr')) return 3
  if (normalized.includes('none')) return 0
  return null
}
