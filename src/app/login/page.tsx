"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";
import { toast } from "sonner";
import { postLogin } from "@/lib/api/auth";
import { useAuth } from "@/lib/state/auth";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function LoginPage() {
  const router = useRouter();
  const fetchSession = useAuth((state) => state.fetchSession);
  const { address, isConnected, isConnecting } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();
  const [authorising, setAuthorising] = useState(false);
  const [awaitingConnection, setAwaitingConnection] = useState(false);
  const [needsSignature, setNeedsSignature] = useState(false);
  const shouldAutoLoginRef = useRef(false);
  const hasTriedAutoLoginRef = useRef(false);

  const runLogin = useCallback(
    async (walletAddress: string) => {
      const normalisedAddress = walletAddress.trim().toLowerCase();

      try {
        setAuthorising(true);
        const challenge = await postLogin({ address: normalisedAddress });
        if (challenge.stage !== "CHALLENGE") {
          throw new Error("Login sudah divalidasi. Silakan coba lagi.");
        }

        const signature = await signMessageAsync({
          message: challenge.message,
        });

        const sessionResponse = await postLogin({
          address: normalisedAddress,
          nonce: challenge.nonce,
          signature,
        });

        if (sessionResponse.stage !== "SESSION") {
          throw new Error("Login gagal diproses. Silakan coba lagi.");
        }

        const session = await fetchSession();
        if (!session) {
          throw new Error("Session belum tersedia. Silakan coba lagi.");
        }

        const destinationMap: Record<"user" | "approver" | "admin", string> = {
          user: "/user/dashboard",
          approver: "/approver/dashboard",
          admin: "/admin/dashboard",
        };
        const destination =
          destinationMap[session.primaryRole] ?? "/user/dashboard";
        toast.success("Login berhasil");
        router.replace(destination);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to complete login.";
        if (message.toLowerCase().includes("user rejected")) {
          toast.info("Signature dibatalkan.");
        } else {
          toast.error(message);
        }
      } finally {
        setAuthorising(false);
      }
    },
    [fetchSession, router, signMessageAsync],
  );

  const handlePrimaryAction = async () => {
    if (authorising) return;

    if (!isConnected || !address) {
      if (!openConnectModal) {
        toast.error(
          "Wallet connection unavailable. Refresh the page and try again.",
        );
        return;
      }

      console.log(
        "[Login] Opening connect modal, setting shouldAutoLogin=true",
      );
      shouldAutoLoginRef.current = true;
      hasTriedAutoLoginRef.current = false;
      setAwaitingConnection(true);
      openConnectModal();
      return;
    }

    console.log("[Login] Already connected, running login directly");
    setAwaitingConnection(false);
    await runLogin(address);
  };

  // Auto-login after wallet connection (for mobile)
  useEffect(() => {
    console.log("[Login useEffect]", {
      isConnected,
      address,
      shouldAutoLogin: shouldAutoLoginRef.current,
      hasTriedAutoLogin: hasTriedAutoLoginRef.current,
      authorising,
    });

    if (!isConnected || !address) return;
    if (!shouldAutoLoginRef.current) return;
    if (hasTriedAutoLoginRef.current) return;
    if (authorising) return;

    console.log("[Login] Wallet connected, showing sign button");
    hasTriedAutoLoginRef.current = true;
    shouldAutoLoginRef.current = false;
    setAwaitingConnection(false);
    setNeedsSignature(true);
  }, [address, isConnected, authorising, runLogin]);

  // Handle visibility change (when user returns from MetaMask app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[Login] Page became visible", {
          isConnected,
          address,
          shouldAutoLogin: shouldAutoLoginRef.current,
          hasTriedAutoLogin: hasTriedAutoLoginRef.current,
        });

        // Trigger login check when page becomes visible again
        if (
          isConnected &&
          address &&
          shouldAutoLoginRef.current &&
          !hasTriedAutoLoginRef.current &&
          !authorising
        ) {
          console.log("[Login] Triggering login after visibility change");
          hasTriedAutoLoginRef.current = true;
          shouldAutoLoginRef.current = false;
          setAwaitingConnection(false);
          setNeedsSignature(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isConnected, address, authorising, runLogin]);

  const handleSignMessage = async () => {
    if (!address || authorising) return;
    setNeedsSignature(false);
    await runLogin(address);
  };

  const buttonLabel = (() => {
    if (authorising) return "Signing…";
    if (isConnecting || awaitingConnection) return "Connecting…";
    if (!isConnected) return "Log In";
    if (needsSignature) return "Sign Message";
    return "Sign & Login";
  })();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto grid min-h-screen max-w-md place-items-center p-6">
        <div className="w-full space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <Image
              src="/logo.png"
              width={256}
              height={256}
              alt="Company Logo"
              className="h-128 w-128 object-contain"
              priority
            />
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome to MyBaliola
            </h1>
            <p className="text-sm text-gray-600 text-center">
              Use your wallet to login to this app.
            </p>
            {isConnected && address ? (
              <p className="mt-2 text-xs text-gray-600">
                Connected as{" "}
                <span className="font-mono font-semibold text-gray-800">
                  {shortenAddress(address)}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-500"></p>
            )}
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={authorising || isConnecting}
              className={`w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition ${
                authorising || isConnecting
                  ? "cursor-not-allowed"
                  : "bg-[#00156B]"
              }`}
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
