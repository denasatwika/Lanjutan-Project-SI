// src/lib/services/leaveRequestService.ts
import type { Address } from "viem";
import {
  createLeaveRequest,
  prepareLeaveRequestMeta,
  submitLeaveRequestMeta,
} from "../api/leaveRequests";
import { uploadAttachment, type AttachmentInfo } from "../api/attachments";
import type { ChainConfig } from "../api/chain";
import {
  checkCutiTokenBalance,
} from "./web3Service";

export class InsufficientBalanceError extends Error {
  constructor(
    public balance: number,
    public required: number,
  ) {
    super(
      `Insufficient CutiToken balance. Have: ${balance}, Need: ${required}`,
    );
    this.name = "InsufficientBalanceError";
  }
}

export type LeaveFormData = {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachment: File | null;
};

export type SubmitLeaveRequestParams = {
  formData: LeaveFormData;
  userId: string;
  userWalletAddress: Address;
  days: number;
  chainConfig: ChainConfig;
  signTypedDataFn: (args: any) => Promise<`0x${string}`>;
};

export type SubmitLeaveRequestResult = {
  requestId: string;
  txHash: string | null;
  uploadedAttachment: AttachmentInfo | null;
};

export type SubmitStep =
  | "upload"
  | "create"
  | "balance"
  | "prepare"
  | "sign"
  | "relay"
  | null;

export type SubmitProgress = {
  step: SubmitStep;
  message: string;
};

/**
 * Service for handling leave request submission
 * Pure business logic - no React dependencies
 */
export class LeaveRequestService {
  private onProgress?: (progress: SubmitProgress) => void;

  constructor(onProgress?: (progress: SubmitProgress) => void) {
    this.onProgress = onProgress;
  }

  private progress(step: SubmitStep, message: string) {
    this.onProgress?.({ step, message });
  }

  /**
   * Submit a leave request with all steps
   */
  async submit(
    params: SubmitLeaveRequestParams,
  ): Promise<SubmitLeaveRequestResult> {
    const { formData, userId, userWalletAddress, days, chainConfig, signTypedDataFn } = params;

    let uploadedAttachment: AttachmentInfo | null = null;

    // Step 1: Upload attachment (if provided)
    if (formData.attachment) {
      this.progress("upload", "Uploading attachment...");
      uploadedAttachment = await uploadAttachment(formData.attachment, userId, {
        requesterId: userId,
        requestType: "LEAVE",
      });
    }

    // Step 2: Check CutiToken balance
    if (chainConfig.cutiTokenAddress && chainConfig.rpcUrl) {
      this.progress("balance", "Checking CutiToken balance...");

      try {
        const balanceCheck = await checkCutiTokenBalance(
          userWalletAddress,
          days,
          chainConfig,
        );

        if (!balanceCheck.sufficient) {
          throw new InsufficientBalanceError(balanceCheck.balance, days);
        }
      } catch (error) {
        console.error("[LeaveRequestService] Failed to check balance:", error);
        // Continue anyway - let blockchain validation handle it
      }
    }

    // Step 3: Create leave request in database
    this.progress("create", "Creating leave request...");
    const created = await createLeaveRequest({
      type: "LEAVE",
      requesterId: userId,
      leaveType: formData.leaveType,
      leaveStartDate: formData.startDate,
      leaveEndDate: formData.endDate,
      leaveDays: days,
      leaveReason: formData.reason.trim(),
      attachmentIds: uploadedAttachment ? [uploadedAttachment.id] : [],
      approvals: [],
    });

    // Step 4: Prepare meta-transaction
    this.progress("prepare", "Preparing transaction...");
    const prepareResponse = await prepareLeaveRequestMeta({
      leaveRequestId: created.id,
    });

    // Step 5: Sign typed data using wagmi's signTypedDataAsync
    // This triggers MetaMask mobile deep linking properly
    this.progress("sign", "Waiting for signature...");
    const signature = await signTypedDataFn({
      domain: prepareResponse.domain,
      types: prepareResponse.types,
      primaryType: prepareResponse.primaryType ?? "ForwardRequest",
      message: prepareResponse.message,
    });

    // Step 6: Submit to relayer
    this.progress("relay", "Submitting to blockchain...");
    const relayResponse = await submitLeaveRequestMeta({
      request: prepareResponse.request,
      signature,
    });

    return {
      requestId: created.id,
      txHash: relayResponse.txHash || null,
      uploadedAttachment,
    };
  }
}

/**
 * Calculate days between two dates
 */
export function calculateDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(0, diff + 1);
}
