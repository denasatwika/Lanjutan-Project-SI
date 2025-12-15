import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { cookieStorage, createStorage } from "wagmi";
import { http } from "viem";
import { baliolaTestnet } from "./baliolaChain";
export { baliolaTestnet } from "./baliolaChain";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  const message =
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Create a WalletConnect project and expose the ID via NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.";
  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  }
  console.warn(message);
}

export const wagmiConfig = getDefaultConfig({
  appName: "MyBaliola",
  projectId: projectId ?? "00000000000000000000000000000000",
  ssr: true,
  chains: [baliolaTestnet],
  transports: {
    [baliolaTestnet.id]: http("https://collator1.baliola.dev"),
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
});
