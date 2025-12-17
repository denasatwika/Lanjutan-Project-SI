// src/lib/hooks/useLeaveRequest.ts
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserRejectedRequestError } from "viem";
import type { Address } from "viem";
import { useSignTypedData } from "wagmi";
import {
  LeaveRequestService,
  type LeaveFormData,
  type SubmitStep,
  InsufficientBalanceError,
} from "../services/leaveRequestService";
import { EthereumProviderUnavailableError } from "../services/web3Service";
import { HttpError } from "../types/errors";
import type { ChainConfig } from "../api/chain";
import { useRequests } from "../state/requests";

export type UseLeaveRequestResult = {
  submitting: boolean;
  submitStep: SubmitStep;
  insufficientBalance: {
    open: boolean;
    balance: number;
    required: number;
  } | null;
  submit: (params: {
    formData: LeaveFormData;
    userId: string;
    userWalletAddress: Address;
    days: number;
    chainConfig: ChainConfig;
  }) => Promise<void>;
  closeInsufficientBalanceModal: () => void;
};

/**
 * Custom hook for leave request submission
 * Handles all state management and side effects
 */
export function useLeaveRequest(): UseLeaveRequestResult {
  const router = useRouter();
  const upsertRequest = useRequests((state) => state.upsertFromApi);
  
  // Use wagmi's signTypedData hook (same pattern as login uses signMessage)
  const { signTypedDataAsync } = useSignTypedData();

  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<SubmitStep>(null);
  const [insufficientBalance, setInsufficientBalance] = useState<{
    open: boolean;
    balance: number;
    required: number;
  } | null>(null);

  const submit = useCallback(
    async (params: {
      formData: LeaveFormData;
      userId: string;
      userWalletAddress: Address;
      days: number;
      chainConfig: ChainConfig;
    }) => {
      setSubmitting(true);
      setInsufficientBalance(null);

      const service = new LeaveRequestService((progress) => {
        setSubmitStep(progress.step);
      });

      try {
        // Pass wagmi's signTypedDataAsync to the service
        const result = await service.submit({
          ...params,
          signTypedDataFn: signTypedDataAsync,
        });

        // Update local state with properly typed RequestResponse
        const created: import("../api/requests").RequestResponse = {
          id: result.requestId,
          type: "LEAVE",
          requesterId: params.userId,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          leaveType: params.formData.leaveType,
          leaveStartDate: params.formData.startDate,
          leaveEndDate: params.formData.endDate,
          leaveDays: params.days,
          leaveReason: params.formData.reason.trim(),
          overtimeDate: null,
          overtimeStartTime: null,
          overtimeEndTime: null,
          overtimeHours: null,
          overtimeReason: null,
          notes: null,
          attachmentId: result.uploadedAttachment?.id ?? null,
          requesterName: null,
          requesterDepartment: null,
        };

        upsertRequest(created);

        // Success toast
        toast.success("Leave request created on-chain", {
          description: result.txHash
            ? `Transaction: ${result.txHash.slice(0, 10)}... - Awaiting approvals`
            : "Awaiting approvals from Supervisor, Chief, and HR",
        });

        // Navigate to detail page
        router.push(`/user/inbox/${result.requestId}`);
      } catch (error) {
        handleError(error, submitStep, setInsufficientBalance);
        throw error; // Re-throw so form can handle it
      } finally {
        setSubmitting(false);
        setSubmitStep(null);
      }
    },
    [router, upsertRequest, submitStep, signTypedDataAsync],
  );

  const closeInsufficientBalanceModal = useCallback(() => {
    setInsufficientBalance(null);
  }, []);

  return {
    submitting,
    submitStep,
    insufficientBalance,
    submit,
    closeInsufficientBalanceModal,
  };
}

/**
 * Handle errors with user-friendly messages
 */
function handleError(
  error: unknown,
  currentStep: SubmitStep,
  setInsufficientBalance?: (
    value: { open: boolean; balance: number; required: number } | null,
  ) => void,
) {
  // Check for insufficient balance first
  if (error instanceof InsufficientBalanceError) {
    if (setInsufficientBalance) {
      setInsufficientBalance({
        open: true,
        balance: error.balance,
        required: error.required,
      });
    } else {
      toast.error(
        `Insufficient CutiToken balance. You have ${error.balance}, but need ${error.required} tokens.`,
      );
    }
    return;
  }

  // Check for backend insufficient balance error (DomainError)
  const errorMessage = error instanceof Error ? error.message : String(error);
  const balanceMatch = errorMessage.match(
    /memiliki (\d+) hari.*meminta (\d+) hari/,
  );
  if (balanceMatch && setInsufficientBalance) {
    const balance = parseInt(balanceMatch[1], 10);
    const required = parseInt(balanceMatch[2], 10);
    setInsufficientBalance({
      open: true,
      balance,
      required,
    });
    return;
  }

  // User rejected signature
  if (error instanceof UserRejectedRequestError) {
    toast.error("Signature request was rejected.");
    return;
  }

  // No provider
  if (error instanceof EthereumProviderUnavailableError) {
    toast.error(
      "No Ethereum provider detected. Please install MetaMask or a compatible wallet.",
    );
    return;
  }

  // HTTP errors
  const status = HttpError.getStatus(error);
  const detail = HttpError.isHttpError(error)
    ? (error as HttpError).details?.details
    : undefined;
  let message =
    error instanceof Error ? error.message : "Failed to submit leave request";

  if (typeof detail === "string" && detail) {
    message = detail;
  }

  const isRelayError = currentStep === "relay";
  const isPrepareError = currentStep === "prepare";

  // Customize message based on HTTP status
  if (status === 400) {
    message = isRelayError
      ? "Signature validation failed. Please retry the signing step."
      : "Attachment is too large or a required field is missing.";
  } else if (status === 404) {
    message = "Requester not found. Please sign in again.";
  } else if (status === 403) {
    message = isPrepareError
      ? "Please use your verified company wallet to submit this request."
      : "Attachment could not be linked. Please re-upload and try again.";
  } else if (status === 409) {
    message = "Attachment could not be linked. Please re-upload and try again.";
  } else if (status === 415) {
    message = "File type not supported. Please upload a PDF or image.";
  }

  toast.error(message);
}
