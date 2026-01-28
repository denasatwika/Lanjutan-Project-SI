import { defineChain } from "viem";

export const baliolaTestnet = defineChain({
  id: 20017,
  name: "MAC Testnet",
  nativeCurrency: {
    name: "MAC Testnet Token",
    symbol: "KPGBT",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://collator1.baliola.dev"] },
    public: { http: ["https://collator1.baliola.dev"] },
  },
  blockExplorers: {
    default: { 
      name: "Blockscout", 
      url: "https://explorer.baliola.dev" 
    },
  },
  testnet: true,
});
