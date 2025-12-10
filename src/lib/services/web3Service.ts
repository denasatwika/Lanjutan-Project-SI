// src/lib/services/web3Service.ts
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
} from "viem";
import type { ChainConfig } from "../api/chain";

const CUTI_TOKEN_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
};

export class EthereumProviderUnavailableError extends Error {
  constructor() {
    super(
      "No Ethereum provider detected. Please install MetaMask or a compatible wallet.",
    );
    this.name = "EthereumProviderUnavailableError";
  }
}

/**
 * Get Ethereum provider (MetaMask, etc.)
 */
export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
}

/**
 * Check CutiToken balance for an address
 */
export async function checkCutiTokenBalance(
  userAddress: Address,
  requiredAmount: number,
  chainConfig: ChainConfig,
): Promise<{ balance: number; sufficient: boolean }> {
  if (!chainConfig.cutiTokenAddress || !chainConfig.rpcUrl) {
    throw new Error("CutiToken configuration missing");
  }

  const publicClient = createPublicClient({
    transport: http(chainConfig.rpcUrl),
  });

  const balance = await publicClient.readContract({
    address: chainConfig.cutiTokenAddress,
    abi: CUTI_TOKEN_ABI,
    functionName: "balanceOf",
    args: [userAddress],
  });

  const balanceNumber = Number(balance);

  return {
    balance: balanceNumber,
    sufficient: balanceNumber >= requiredAmount,
  };
}

/**
 * Sign EIP-712 typed data
 */
export async function signTypedData(params: {
  signerAddress: Address;
  domain: any;
  types: any;
  primaryType: string;
  message: any;
}): Promise<`0x${string}`> {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new EthereumProviderUnavailableError();
  }

  const walletClient = createWalletClient({
    account: params.signerAddress,
    transport: custom(provider),
  });

  const signature = await walletClient.signTypedData({
    account: params.signerAddress,
    domain: params.domain,
    types: params.types,
    primaryType: params.primaryType,
    message: params.message,
  });

  return signature;
}

/**
 * Ensure user is on the correct chain
 */
export async function ensureChain(
  chainConfig: ChainConfig,
  options: {
    allowAdd?: boolean;
    chainName?: string;
    nativeCurrency?: { name: string; symbol: string; decimals: number };
  } = {},
): Promise<void> {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new EthereumProviderUnavailableError();
  }

  if (!chainConfig.chainId) {
    throw new Error("Chain ID is not configured");
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainConfig.chainId.toString(16)}` }],
    });
  } catch (switchError: any) {
    // Chain not added yet
    if (switchError.code === 4902 && options.allowAdd) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${chainConfig.chainId.toString(16)}`,
            chainName: options.chainName || `Chain ${chainConfig.chainId}`,
            nativeCurrency: options.nativeCurrency || {
              name: "ETH",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: [chainConfig.rpcUrl],
          },
        ],
      });
    } else {
      throw new Error("Please switch your wallet to the configured network.");
    }
  }
}
