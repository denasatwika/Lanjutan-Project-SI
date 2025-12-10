import { useAccount } from 'wagmi'

/**
 * Hook to get the expected wallet address for the current user.
 * Currently simplified to use the connected wallet directly without verification.
 */
export function useExpectedWallet() {
  const { address: connectedAddress } = useAccount()

  return {
    expectedWalletAddress: connectedAddress,
    loading: false,
    error: null,
  }
}
