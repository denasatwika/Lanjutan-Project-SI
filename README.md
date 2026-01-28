# MyBaliola Frontend

**Blockchain-Based Leave Management System**

Built with **Next.js 14**, featuring gasless meta-transactions and multi-signature approval workflows.

![Next.js](https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) ![Shadcn UI](https://img.shields.io/badge/Shadcn_UI-000000?style=for-the-badge&logo=shadcnui&logoColor=white) ![RainbowKit](https://img.shields.io/badge/RainbowKit-0052FF?style=for-the-badge&logo=walletconnect&logoColor=white) ![Wagmi](https://img.shields.io/badge/Wagmi_v2-grey?style=for-the-badge&logo=ethereum&logoColor=white) ![Viem](https://img.shields.io/badge/Viem-1E1E1E?style=for-the-badge&logo=ethereum&logoColor=yellow) ![Zustand](https://img.shields.io/badge/Zustand-orange?style=for-the-badge&logo=react&logoColor=white)

---

## ⚡ Project Overview

**MyBaliola Frontend** is the user interface for a decentralized leave management system leveraging Ethereum blockchain technology. Users can submit leave and overtime requests without paying gas fees (fully gasless after initial CutiToken approval), and requests flow through a three-tier approval system before being executed on-chain.

### 🌟 Key Features
* 🔐 **Wallet Connection:** Seamless integration with RainbowKit (MetaMask, WalletConnect).
* ⛽ **Gasless Transactions:** EIP-2771 meta-transactions for leave & overtime requests.
* ✍️ **Multi-Sig Workflow:** 3-Tier approval (Supervisor → Chief → HR).
* 🎫 **CutiToken:** One-time approval mechanism for gasless operations.
* 📱 **Mobile First:** Responsive design with PWA support for offline access.
* 🔄 **Real-time:** WebSocket integration for approval status tracking.

---

## 🛠️ Prerequisites

Ensure you have the following installed before starting:

* **Node.js:** `v18.0+`
* **Package Manager:** `npm v9.0+` or `bun v1.0+`
* **Wallet:** MetaMask (Extension or Mobile App)
* **Backend:** Running locally on `http://localhost:8787`
* **Network:** MAC Testnet / Local Anvil Node

---

## 🚀 Installation

1.  **Clone & Navigate**
    ```bash
    git clone [your-repo-url]
    cd frontend
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    # or
    bun install
    ```

3.  **Environment Setup**
    Create a `.env.local` file in the root directory:

    ```env
    # Backend API & WebSocket
    NEXT_PUBLIC_API_BASE=[http://192.168.](http://192.168.)X.X:8787
    NEXT_PUBLIC_WS_URL=ws://192.168.X.X:8787

    # Web3 Config
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
    NEXT_PUBLIC_CUTI_TOKEN_ADDRESS=0x...
    NEXT_PUBLIC_LEAVE_CORE_ADDRESS=0x...
    ```
4.  **Running the Project**
    On the terminal, run this command:
    ```bash
    npm run dev
    # or
    bun dev
    ```

> [!IMPORTANT]
> **Mobile Testing Configuration:**
> If testing on mobile, replace `localhost` or `127.0.0.1` with your machine's generic IP address (e.g., `192.168.1.10`) in `.env.local` and `next.config.mjs`.

---

## 💻 Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts dev server on port `3000` (accessible via network) |
| `npm run build` | Creates optimized production build |
| `npm start` | Runs the production build locally |
| `npm run lint` | Runs ESLint check |

---

## 📱 Mobile Testing Guide

To test on a physical mobile device, follow these steps strictly:

1.  **Find your Local IP:**
    * Mac/Linux: `ipconfig getifaddr en0`
    * Windows: `ipconfig` (Look for IPv4 Address)
2.  **Update Configs:**
    * Update `.env.local` with the IP.
    * Add the IP to `allowedDevOrigins` in `next.config.mjs`.
3.  **Connect:**
    * Ensure mobile is on the **same WiFi**.
    * Open mobile browser: `http://YOUR_IP:3000`.
    * Use MetaMask Mobile app for wallet interaction.

---

## 📂 Project Structure

```bash
frontend/
├── src/
│   ├── app/                 # Next.js App Router (Pages)
│   ├── lib/
│   │   ├── api/             # API & Forwarder Logic
│   │   ├── web3/            # Viem & Contract Interaction
│   │   └── state/           # Zustand Stores
│   ├── components/          # Reusable UI (shadcn/ui)
│   └── ...
├── next.config.mjs          # Next.js Config
└── tailwind.config.ts       # Tailwind Config