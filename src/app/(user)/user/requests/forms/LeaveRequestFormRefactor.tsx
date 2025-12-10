// 🎯 REFACTORED VERSION - Clean Code Principles Applied
// Business logic extracted to services and hooks
"use client";

import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import { ChevronDown, AlertCircle } from "lucide-react";
import { useAccount } from "wagmi";
import DateRangePicker from "@/components/DateRangePicker";
import type { DateRange } from "react-day-picker";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/lib/state/auth";
import { useChainConfig, isChainConfigReady } from "@/lib/state/chain";
import { useLeaveRequest } from "@/lib/hooks/useLeaveRequest";
import {
  calculateDays,
  type LeaveFormData,
} from "@/lib/services/leaveRequestService";
import {
  formatAttachmentSize,
  isSupportedAttachmentType,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/api/attachments";
import { useExpectedWallet } from "@/lib/hooks/useExpectedWallet";

const LEAVE_TYPE_OPTIONS = [
  { value: "Cuti", label: "Cuti" },
  { value: "Sakit", label: "Sakit" },
  { value: "Izin", label: "Izin" },
] as const;

type Props = {
  onSubmitted?: () => void;
};

export function LeaveRequestFormRefactor({ onSubmitted }: Props) {
  const user = useAuth((s) => s.user);
  const { address: connectedAddress } = useAccount();
  const chainConfigState = useChainConfig();
  const chainConfig = chainConfigState.config;

  const {
    expectedWalletAddress,
    loading: expectedWalletLoading,
    error: expectedWalletError,
  } = useExpectedWallet();
  const walletMismatch = useMemo(
    () =>
      Boolean(
        expectedWalletAddress &&
          connectedAddress &&
          expectedWalletAddress.toLowerCase() !==
            connectedAddress.toLowerCase(),
      ),
    [expectedWalletAddress, connectedAddress],
  );

  // Use custom hook for submission logic
  const {
    submitting,
    submitStep,
    insufficientBalance,
    submit,
    closeInsufficientBalanceModal,
  } = useLeaveRequest();

  // Form state
  const [form, setForm] = useState<LeaveFormData>({
    leaveType: LEAVE_TYPE_OPTIONS[0].value,
    startDate: "",
    endDate: "",
    reason: "",
    attachment: null,
  });

  const fileRef = useRef<HTMLInputElement>(null);

  // Derived state
  const dateRange: DateRange | undefined = useMemo(() => {
    if (!form.startDate || !form.endDate) return undefined;
    return {
      from: new Date(form.startDate),
      to: new Date(form.endDate),
    };
  }, [form.startDate, form.endDate]);

  const days = calculateDays(form.startDate, form.endDate);
  const hasDateOrderIssue =
    form.startDate && form.endDate && form.startDate > form.endDate;

  // Form validation
  const valid = useMemo(() => {
    return (
      form.leaveType.trim().length > 0 &&
      form.startDate.trim().length > 0 &&
      form.endDate.trim().length > 0 &&
      form.reason.trim().length > 0 &&
      !hasDateOrderIssue
    );
  }, [form, hasDateOrderIssue]);

  // Handlers
  function handleDateRangeChange(range: DateRange | undefined) {
    if (!range) {
      setForm((prev) => ({ ...prev, startDate: "", endDate: "" }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      startDate: range.from ? toISODate(range.from) : "",
      endDate: range.to ? toISODate(range.to) : "",
    }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSupportedAttachmentType(file.type)) {
      toast.error("Unsupported file type. Please upload a PDF or image.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(
        `File is too large. Maximum size is ${formatAttachmentSize(MAX_ATTACHMENT_BYTES)}.`,
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setForm((prev) => ({ ...prev, attachment: file }));
  }

  function clearFile() {
    setForm((prev) => ({ ...prev, attachment: null }));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!valid) {
      toast.error("Please fill out all required fields.");
      return;
    }

    if (!user?.id) {
      toast.error("Unable to determine the requester. Please sign in again.");
      return;
    }

    if (!expectedWalletAddress) {
      toast.error(
        "No registered wallet found for this account. Please contact the administrator.",
      );
      return;
    }

    if (!connectedAddress) {
      toast.error("Connect a wallet before submitting the request.");
      return;
    }

    if (walletMismatch) {
      toast.error(
        "Connected wallet does not match your registered company wallet. Please switch accounts.",
      );
      return;
    }

    if (!chainConfig || !isChainConfigReady(chainConfig)) {
      toast.error(
        "Chain configuration is incomplete. Please contact the administrator.",
      );
      return;
    }

    try {
      await submit({
        formData: form,
        userId: user.id,
        userWalletAddress: expectedWalletAddress as `0x${string}`,
        days,
        chainConfig,
      });

      // Reset form on success
      setForm({
        leaveType: LEAVE_TYPE_OPTIONS[0].value,
        startDate: "",
        endDate: "",
        reason: "",
        attachment: null,
      });
      if (fileRef.current) fileRef.current.value = "";
      onSubmitted?.();
    } catch (error) {
      // Error already handled in hook
    }
  }

  // Submit button label
  const submitLabel = submitting
    ? submitStep === "upload"
      ? "Uploading..."
      : submitStep === "balance"
        ? "Checking balance..."
        : submitStep === "create"
          ? "Creating request..."
          : submitStep === "prepare"
            ? "Preparing..."
            : submitStep === "sign"
              ? "Waiting for signature..."
              : submitStep === "relay"
                ? "Submitting..."
                : "Processing..."
    : "Submit Leave Request";

  const previewUrl = form.attachment
    ? URL.createObjectURL(form.attachment)
    : null;
  const isImg = form.attachment?.type.startsWith("image/");

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Leave Type */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Leave Type <span className="text-rose-500">*</span>
          </label>
          <select
            value={form.leaveType}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, leaveType: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={submitting}
          >
            {LEAVE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Date Range <span className="text-rose-500">*</span>
          </label>
          <DateRangePicker
            range={dateRange ?? { from: undefined, to: undefined }}
            onChange={handleDateRangeChange}
            disabled={submitting}
          />
          {hasDateOrderIssue && (
            <p className="mt-1 text-xs text-rose-600">
              Start date must be before end date
            </p>
          )}
          {days > 0 && !hasDateOrderIssue && (
            <p className="mt-1 text-xs text-slate-500">
              {days} day{days !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={form.reason}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, reason: e.target.value }))
            }
            placeholder="Provide a reason for your leave request..."
            rows={4}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={submitting}
          />
        </div>

        {/* Attachment */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Attachment (optional)
          </label>
          <input
            ref={fileRef}
            type="file"
            onChange={handleFileChange}
            accept="image/*,application/pdf"
            className="w-full text-sm"
            disabled={submitting}
          />
          {form.attachment && (
            <div className="mt-2">
              <p className="text-xs text-slate-600">
                {form.attachment.name} (
                {formatAttachmentSize(form.attachment.size)})
              </p>
              {isImg && previewUrl && (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="mt-2 max-h-40 rounded-lg"
                />
              )}
              <button
                type="button"
                onClick={clearFile}
                className="mt-2 text-xs text-rose-600 hover:underline"
                disabled={submitting}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Wallet Warnings */}
        {walletMismatch && (
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle className="inline size-4 mr-1" />
            Connected wallet does not match your registered wallet
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!valid || submitting || walletMismatch}
          className="w-full rounded-xl bg-[#00156B] px-6 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </form>

      {/* Insufficient Balance Modal */}
      <Modal
        open={insufficientBalance?.open ?? false}
        onClose={closeInsufficientBalanceModal}
      >
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Insufficient CutiToken Balance
          </h2>
          <p className="text-sm text-slate-700">
            You have {insufficientBalance?.balance ?? 0} CutiTokens, but{" "}
            {insufficientBalance?.required ?? 0} are required for this leave
            request.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Please contact your administrator to request additional tokens.
          </p>
          <button
            onClick={closeInsufficientBalanceModal}
            className="mt-4 w-full rounded-xl bg-[#00156B] px-4 py-2 font-semibold text-white"
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
}

// Helper
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
