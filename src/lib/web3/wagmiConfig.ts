import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { cookieStorage, createStorage } from 'wagmi'
import { defineChain, http } from 'viem'
import { mainnet, polygon, sepolia } from 'wagmi/chains'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  const message =
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Create a WalletConnect project and expose the ID via NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.'
  if (process.env.NODE_ENV === 'production') {
    throw new Error(message)
  }
  console.warn(message)
}

const mandalaTestnet = defineChain({
  id: 4_818,
  name: 'Mandala Testnet',
  nativeCurrency: {
    name: 'Kepeng Token',
    symbol: 'KPGT',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc1.paseo.mandalachain.io'] },
    public: { http: ['https://rpc1.paseo.mandalachain.io'] },
  },
  testnet: true,
})

export const wagmiConfig = getDefaultConfig({
  appName: 'MyBaliola',
  projectId: projectId ?? '00000000000000000000000000000000',
  ssr: true,
  chains: [mandalaTestnet, sepolia, polygon, mainnet],
  transports: {
    [mandalaTestnet.id]: http('https://rpc1.paseo.mandalachain.io'),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [mainnet.id]: http(),
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
})
