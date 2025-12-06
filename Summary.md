# MyBaliola Frontend

Next.js frontend application for the MyBaliola blockchain leave management system. Features wallet connection via RainbowKit, gasless meta-transaction signing, and real-time approval tracking.

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Environment Variables](#environment-variables)
4. [Installation](#installation)
5. [Running the Application](#running-the-application)
6. [Project Structure](#project-structure)
7. [Key Pages](#key-pages)
8. [Wallet Connection](#wallet-connection)
9. [Meta-Transaction Signing](#meta-transaction-signing)
10. [Testing](#testing)
11. [Building for Production](#building-for-production)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The frontend provides a user interface for employees and approvers to interact with the MyBaliola leave management system. Key features:

- **Wallet Connection**: Connect Ethereum wallets via RainbowKit (MetaMask, WalletConnect, Coinbase Wallet)
- **Gasless Transactions**: Users sign messages instead of sending transactions (no gas fees)
- **Leave Request Submission**: Create leave requests with IPFS document uploads
- **Approval Dashboard**: Approvers review and approve/reject requests
- **Real-Time Updates**: WebSocket notifications for approval status changes
- **Responsive Design**: TailwindCSS for mobile-friendly UI

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14 | React framework with App Router |
| **TypeScript** | Latest | Type-safe JavaScript |
| **RainbowKit** | Latest | Wallet connection UI components |
| **Wagmi** | Latest | React hooks for Ethereum |
| **viem** | Latest | Ethereum library (signing, encoding, contract calls) |
| **TailwindCSS** | Latest | Utility-first CSS framework |
| **Zustand** | Latest | Lightweight state management |
| **Sonner** | Latest | Toast notifications |

---

## Environment Variables

Create a `.env.local` file in the `my-baliola` directory:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8787
```

### Variable Descriptions

- **NEXT_PUBLIC_API_BASE**: Backend API base URL
  - Local: `http://localhost:8787`
  - Production: Your deployed backend URL

**Note**: All environment variables used in the browser must be prefixed with `NEXT_PUBLIC_`.

---

## Installation

```bash
# Install dependencies
npm install

# Or using yarn
yarn install

# Or using pnpm
pnpm install
```

---

## Running the Application

### Development Mode

```bash
npm run dev
```

Application starts on `http://localhost:3000`

### Other Commands

```bash
# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Type checking
npx tsc --noEmit
```

---

## Project Structure

```
my-baliola/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (approver)/               # Approver routes (role-based)
│   │   │   └── approver/
│   │   │       └── approval/
│   │   │           ├── page.tsx      # Approval list page
│   │   │           └── [id]/
│   │   │               └── page.tsx  # Approval detail page
│   │   ├── (user)/                   # User routes
│   │   │   └── user/
│   │   │       ├── requests/         # Leave request pages
│   │   │       │   ├── page.tsx      # Request list
│   │   │       │   └── forms/
│   │   │       │       └── LeaveRequestForm.tsx
│   │   │       └── approvals/        # User approval dashboard
│   │   │           └── page.tsx
│   │   ├── api/                      # API routes (if any)
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Home page
│   ├── components/                   # Reusable components
│   │   ├── ApprovalStatus.tsx        # Approval progress component
│   │   └── ...
│   ├── lib/                          # Utilities and helpers
│   │   ├── api/                      # API client functions
│   │   │   ├── forwarder.ts          # Gasless forwarder API
│   │   │   ├── multisig.ts           # Multisig approval API
│   │   │   ├── leaveRequests.ts      # Leave request API
│   │   │   └── chain.ts              # Chain config API
│   │   └── web3/                     # Web3 utilities
│   │       ├── contracts.ts          # ABI definitions & encoding
│   │       └── signing.ts            # EIP-712 signing with viem
│   ├── providers.tsx                 # Context providers (RainbowKit, Wagmi)
│   └── ...
├── public/                           # Static files
├── .env.local                        # Environment variables
├── next.config.js                    # Next.js configuration
├── tailwind.config.ts                # TailwindCSS configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json
```

---

## Key Pages

### 1. Leave Request Submission

**Path**: `/user/requests`

**Purpose**: Employees submit leave requests.

**Key Features:**
- Form for leave details (type, dates, reason)
- File upload to IPFS (Pinata)
- Gasless transaction signing
- Real-time submission status

**Flow:**
1. Employee fills form
2. Frontend generates `requestId = keccak256(db_id + user_address)`
3. Document uploaded to IPFS
4. Frontend encodes `createRequest()` call
5. Backend prepares ForwardRequest (EIP-712 payload)
6. User signs in MetaMask (no gas needed)
7. Backend forwards to blockchain
8. Request created with status `CREATED`

**Code Reference**: `src/app/(user)/user/requests/forms/LeaveRequestForm.tsx:6`

### 2. Approver Dashboard

**Path**: `/approver/approval`

**Purpose**: Approvers review and approve/reject requests.

**Key Features:**
- List of pending leave requests
- Filter by status (PENDING, APPROVED, REJECTED)
- Approve/reject buttons with gasless signing
- Rejection reason input (required)
- Real-time approval count updates

**Flow (Approval):**
1. Approver opens approval list
2. Clicks "Approve request"
3. Frontend encodes `collectApproval(requestId, signer, role)` call
4. User signs ForwardRequest (gasless)
5. Backend forwards to CompanyMultisig contract
6. Approval recorded on-chain
7. Approval count updates

**Flow (Rejection):**
1. Approver clicks "Reject request"
2. Enters rejection reason (1-500 characters)
3. Frontend encodes `collectRejection(requestId, signer, role, reason)` call
4. User signs ForwardRequest
5. Backend forwards to CompanyMultisig contract
6. Request rejected on-chain
7. Tokens refunded (if CUTI type)

**Code Reference**: `src/app/(approver)/approver/approval/page.tsx:14`

### 3. User Approval Dashboard

**Path**: `/user/approvals`

**Purpose**: Alternative approver dashboard (newer multisig system).

**Key Features:**
- Displays pending requests
- Shows approval progress (X/3 approvals)
- Approve/reject buttons
- Live approval state from blockchain

**Code Reference**: `src/app/(user)/user/approvals/page.tsx:14`

---

## Wallet Connection

### RainbowKit Integration

The app uses RainbowKit for wallet connection, providing a user-friendly UI for connecting various Ethereum wallets.

**Supported Wallets:**
- MetaMask
- WalletConnect
- Coinbase Wallet
- Rainbow
- And more...

### Setup Code

**`src/providers.tsx`:**
```typescript
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit'
import { configureChains, createConfig, WagmiConfig } from 'wagmi'
import { localhost } from 'wagmi/chains'

const { chains, publicClient } = configureChains(
  [localhost],
  [publicProvider()]
)

const { connectors } = getDefaultWallets({
  appName: 'MyBaliola',
  projectId: 'YOUR_PROJECT_ID',
  chains
})

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient
})

export function Providers({ children }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  )
}
```

### Using Wallet Connection

```typescript
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export default function Component() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div>
        <p>Connected: {address}</p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    )
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button key={connector.id} onClick={() => connect({ connector })}>
          Connect {connector.name}
        </button>
      ))}
    </div>
  )
}
```

### Network Configuration

**MetaMask Setup for Anvil:**
- **Network Name**: Anvil Local
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337`
- **Currency Symbol**: ETH

---

## Meta-Transaction Signing

### Why viem Instead of MetaMask Directly?

The app uses viem's `walletClient.signTypedData()` instead of MetaMask's `eth_signTypedData_v4` to ensure signature verification works correctly on-chain.

**Problem with MetaMask Direct:**
- Different EIP-712 encoding between MetaMask and Solidity
- Signature verification fails due to encoding inconsistencies

**Solution with viem:**
- viem guarantees consistent EIP-712 encoding
- Works perfectly with on-chain verification
- Same encoding as used by the smart contracts

### Signing Implementation

**`src/lib/web3/signing.ts`:**
```typescript
import { createWalletClient, custom } from 'viem'
import { localhost } from 'viem/chains'

export async function signForwardRequest(
  userAddress: string,
  preparedRequest: {
    request: ForwardRequest
    domain: EIP712Domain
    types: TypedDataTypes
  }
) {
  // Create wallet client
  const walletClient = createWalletClient({
    account: userAddress as `0x${string}`,
    chain: localhost,
    transport: custom(window.ethereum)
  })

  // Sign typed data using viem (NOT MetaMask directly)
  const signature = await walletClient.signTypedData({
    domain: preparedRequest.domain,
    types: preparedRequest.types,
    primaryType: 'ForwardRequest',
    message: preparedRequest.request
  })

  return signature
}
```

### Complete Meta-Transaction Flow

**1. Encode Function Call:**
```typescript
import { encodeCollectApproval } from '@/lib/web3/contracts'

const data = encodeCollectApproval({
  requestId: '0x9b9d5d...',
  signer: connectedAddress,
  role: 1 // SUPERVISOR
})
```

**2. Prepare ForwardRequest:**
```typescript
import { prepareForwardRequest } from '@/lib/api/forwarder'

const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600) // 1 hour

const prepared = await prepareForwardRequest({
  from: connectedAddress,
  to: companyMultisigAddress,
  gas: 500000n,
  value: 0n,
  data,
  deadline
})
```

**3. Sign ForwardRequest:**
```typescript
import { signForwardRequest } from '@/lib/web3/signing'

const signature = await signForwardRequest(connectedAddress, prepared)
```

**4. Submit to Backend:**
```typescript
import { submitForwardRequest } from '@/lib/api/forwarder'

const result = await submitForwardRequest({
  request: prepared.request,
  signature
})

console.log('Transaction hash:', result.txHash)
```

---

## Contract Encoding

### ABI Definitions

**`src/lib/web3/contracts.ts`:**
```typescript
import { encodeFunctionData } from 'viem'

// CompanyMultisig ABI (partial)
const companyMultisigAbi = [
  {
    name: 'collectApproval',
    type: 'function',
    inputs: [
      { name: 'requestId', type: 'bytes32' },
      { name: 'signer', type: 'address' },
      { name: 'role', type: 'uint8' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'collectRejection',
    type: 'function',
    inputs: [
      { name: 'requestId', type: 'bytes32' },
      { name: 'signer', type: 'address' },
      { name: 'role', type: 'uint8' },
      { name: 'reason', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const

// LeaveCore ABI (partial)
const leaveCoreAbi = [
  {
    name: 'createRequest',
    type: 'function',
    inputs: [
      { name: 'requestId', type: 'bytes32' },
      { name: 'docHash', type: 'bytes32' },
      { name: 'leaveType', type: 'uint8' },
      { name: 'leaveDays', type: 'uint32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const

// Encoding functions
export function encodeCreateRequest(params: {
  requestId: `0x${string}`
  docHash: `0x${string}`
  leaveType: number
  leaveDays: number
}) {
  return encodeFunctionData({
    abi: leaveCoreAbi,
    functionName: 'createRequest',
    args: [
      params.requestId,
      params.docHash,
      params.leaveType,
      params.leaveDays
    ]
  })
}

export function encodeCollectApproval(params: {
  requestId: `0x${string}`
  signer: `0x${string}`
  role: number
}) {
  return encodeFunctionData({
    abi: companyMultisigAbi,
    functionName: 'collectApproval',
    args: [params.requestId, params.signer, params.role]
  })
}

export function encodeCollectRejection(params: {
  requestId: `0x${string}`
  signer: `0x${string}`
  role: number
  reason: string
}) {
  return encodeFunctionData({
    abi: companyMultisigAbi,
    functionName: 'collectRejection',
    args: [params.requestId, params.signer, params.role, params.reason]
  })
}

// Role conversion
export function multisigRoleToNumber(role: 'SUPERVISOR' | 'CHIEF' | 'HR'): number {
  switch (role) {
    case 'SUPERVISOR': return 1
    case 'CHIEF': return 2
    case 'HR': return 3
  }
}
```

---

## Testing

### Manual Testing

**1. Connect Wallet:**
- Open `http://localhost:3000`
- Click "Connect Wallet"
- Select MetaMask
- Approve connection

**2. Submit Leave Request:**
- Navigate to `/user/requests`
- Fill form:
  - Leave Type: CUTI
  - Start Date: Future date
  - End Date: Future date
  - Leave Days: Calculated automatically
  - Reason: "Testing leave request"
  - Attachment: Upload test file
- Click "Submit"
- Sign in MetaMask
- Wait for confirmation

**3. Approve Request (as SUPERVISOR):**
- Switch MetaMask to SUPERVISOR account
- Navigate to `/approver/approval`
- Find pending request
- Click "Approve request"
- Sign in MetaMask
- Check approval count: 1/3

**4. Continue Approvals:**
- Repeat for CHIEF (2/3) and HR (3/3)
- Request should show "APPROVED" status

**5. Test Rejection:**
- Submit new request
- As any approver, click "Reject request"
- Enter reason: "Insufficient notice"
- Sign in MetaMask
- Request should show "REJECTED" status

### Browser Console Debugging

```javascript
// Check connected account
window.ethereum.selectedAddress

// Check network
await window.ethereum.request({ method: 'net_version' })

// Switch to Anvil network
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x7A69' }] // 31337 in hex
})
```

---

## Building for Production

### Build Command

```bash
npm run build
```

This creates an optimized production build in the `.next` directory.

### Environment Variables

For production, update `.env.local`:

```env
NEXT_PUBLIC_API_BASE=https://your-backend-api.com
```

### Deployment Options

**Vercel (Recommended):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Docker:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Static Export (if no server features):**
```bash
# Add to next.config.js
module.exports = {
  output: 'export'
}

# Build
npm run build

# Output in `out/` directory
```

---

## Troubleshooting

### Wallet Won't Connect

**Problem**: MetaMask connection fails or doesn't appear.

**Solutions:**
1. **Check MetaMask installed**: Install MetaMask browser extension
2. **Unlock MetaMask**: Open MetaMask and unlock it
3. **Clear browser cache**: Hard refresh with `Ctrl+Shift+R`
4. **Check network**: Ensure MetaMask is on Anvil network (Chain ID 31337)

### Signature Verification Failed

**Problem**: Backend returns "Invalid signature" error.

**Solutions:**
1. **Ensure using viem signing**: Check `src/lib/web3/signing.ts` uses `walletClient.signTypedData()`
2. **Rebuild frontend**:
   ```bash
   rm -rf .next
   npm run build
   npm run dev
   ```
3. **Check signer address**: Ensure `userAddress` parameter matches connected wallet

### Transaction Not Appearing

**Problem**: Signed transaction doesn't show up on-chain.

**Solutions:**
1. **Check backend logs**: Look for errors in backend console
2. **Verify contract addresses**: Check `.env.local` NEXT_PUBLIC variables match backend
3. **Check Anvil running**: Ensure Anvil is running on `http://127.0.0.1:8545`
4. **Inspect network tab**: Check browser DevTools Network tab for API errors

### Wrong Network

**Problem**: MetaMask on wrong network.

**Solutions:**
1. **Switch network**: Open MetaMask → Networks → Select "Anvil Local"
2. **Add network manually**:
   ```javascript
   await window.ethereum.request({
     method: 'wallet_addEthereumChain',
     params: [{
       chainId: '0x7A69', // 31337 in hex
       chainName: 'Anvil Local',
       rpcUrls: ['http://127.0.0.1:8545'],
       nativeCurrency: {
         name: 'Ether',
         symbol: 'ETH',
         decimals: 18
       }
     }]
   })
   ```

### Build Errors

**Problem**: TypeScript or build errors.

**Solutions:**
1. **Clear cache**:
   ```bash
   rm -rf .next node_modules
   npm install
   npm run build
   ```

2. **Check TypeScript**:
   ```bash
   npx tsc --noEmit
   ```

3. **Fix ESLint errors**:
   ```bash
   npm run lint -- --fix
   ```

### Styling Issues

**Problem**: TailwindCSS classes not working.

**Solutions:**
1. **Check tailwind.config.ts** includes all content paths:
   ```typescript
   module.exports = {
     content: [
       './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
       './src/components/**/*.{js,ts,jsx,tsx,mdx}',
       './src/app/**/*.{js,ts,jsx,tsx,mdx}',
     ],
     // ...
   }
   ```

2. **Restart dev server**:
   ```bash
   # Kill server (Ctrl+C)
   npm run dev
   ```

---

## API Client Functions

### Forwarder API

**`src/lib/api/forwarder.ts`:**
```typescript
export async function prepareForwardRequest(params: {
  from: string
  to: string
  gas: bigint
  value: bigint
  data: string
  deadline: bigint
}) {
  const response = await fetch(`${API_BASE}/meta/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      gas: Number(params.gas),
      value: Number(params.value),
      data: params.data,
      deadline: Number(params.deadline)
    })
  })

  const data = await response.json()
  return data
}

export async function submitForwardRequest(params: {
  request: ForwardRequest
  signature: string
}) {
  const response = await fetch(`${API_BASE}/meta/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })

  const data = await response.json()
  return data
}
```

### Multisig API

**`src/lib/api/multisig.ts`:**
```typescript
export async function getAllApprovers() {
  const response = await fetch(`${API_BASE}/multisig/approvers`)
  const data = await response.json()
  return data
}

export async function getApprovalState(requestId: string) {
  const response = await fetch(`${API_BASE}/multisig/approvals/${requestId}`)
  const data = await response.json()
  return data
}

export async function recordApproval(params: {
  requestId: string
  approverAddress: string
  approverRole: string
  signature: string
  leaveRequestId: string
  txHash: string
}) {
  const response = await fetch(`${API_BASE}/multisig/approvals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })

  const data = await response.json()
  return data
}

export async function recordRejection(params: {
  requestId: string
  rejectorAddress: string
  rejectorRole: string
  reason: string
  signature: string
  leaveRequestId: string
  txHash?: string
}) {
  const response = await fetch(`${API_BASE}/multisig/rejections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })

  const data = await response.json()
  return data
}
```

---

## Additional Resources

- [Main README](../../../README.md) - Project overview
- [Backend README](../../../login-wallet-backend/README.md) - Backend documentation
- [Smart Contracts README](../../../test-foundry/README.md) - Contract documentation
- [Next.js Docs](https://nextjs.org/docs) - Next.js reference
- [RainbowKit Docs](https://rainbowkit.com) - Wallet connection reference
- [Wagmi Docs](https://wagmi.sh) - React hooks reference
- [viem Docs](https://viem.sh) - Ethereum library reference
- [TailwindCSS Docs](https://tailwindcss.com/docs) - CSS framework reference
