import { defineChain } from 'viem'

export const mandalaTestnet = defineChain({
  id: 4818,
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
