import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { cookieStorage, createStorage } from 'wagmi'
import { http } from 'viem'
import { mainnet, polygon, sepolia } from 'wagmi/chains'
import { mandalaTestnet } from './mandalaChain'
import { anvilLocal } from './anvilChain'
export { mandalaTestnet } from './mandalaChain'
export { anvilLocal } from './anvilChain'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  const message =
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Create a WalletConnect project and expose the ID via NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.'
  if (process.env.NODE_ENV === 'production') {
    throw new Error(message)
  }
  console.warn(message)
}

export const wagmiConfig = getDefaultConfig({
  appName: 'MyBaliola',
  projectId: projectId ?? '00000000000000000000000000000000',
  ssr: true,
  chains: [anvilLocal, mandalaTestnet, sepolia, polygon, mainnet],
  transports: {
    [anvilLocal.id]: http('http://127.0.0.1:8545'),
    [mandalaTestnet.id]: http('https://rpc1.paseo.mandalachain.io'),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [mainnet.id]: http(),
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
})
