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

export function LeaveRequestForm({ onSubmitted }: Props) {
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
      <form onSubmit={handleSubmit} className="grid gap-4 text-[15px]">
        {/* --- LEAVE TYPE --- */}
        <div className="block">
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Leave Type <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={form.leaveType}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, leaveType: e.target.value }))
              }
              // Mengembalikan style SelectBox original yang lebih clean
              className="w-full appearance-none rounded-xl border bg-white px-3 py-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              style={{ borderColor: "#00156B20" }}
              disabled={submitting}
            >
              {LEAVE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-70 pointer-events-none" />
          </div>
        </div>

        {/* --- DATE RANGE --- */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Leave Dates <span className="text-rose-500">*</span>
          </label>
          <DateRangePicker
            range={dateRange ?? { from: undefined, to: undefined }}
            onChange={handleDateRangeChange}
            disabled={submitting}
          />
          {hasDateOrderIssue && (
            <p className="mt-1 text-xs text-rose-600">
              End date cannot be earlier than the start date.
            </p>
          )}
        </div>

        {/* --- TOTAL DAYS (Restored Style) --- */}
        <div
          className="rounded-xl border px-3 py-2 text-gray-600"
          style={{ borderColor: "#00156B20" }}
        >
          Total: <span className="font-semibold text-gray-800">{days}</span>{" "}
          days
        </div>

        {/* --- REASON --- */}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">
            Reason <span className="text-rose-500">*</span>
          </span>
          <textarea
            value={form.reason}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, reason: e.target.value }))
            }
            placeholder="Example: family event, doctor appointment, etc."
            rows={5}
            className="w-full rounded-xl border px-3 py-3 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            style={{
              borderColor: "#00156B20",
              boxShadow: "0 1px 2px rgba(0,0,0,.06)",
            }}
            disabled={submitting}
          />
        </label>

        {/* --- ATTACHMENT (Restored Style) --- */}
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">
            Attachment (optional)
          </span>

          {/* Container Flex Row seperti Original */}
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              ref={fileRef}
              type="file"
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="w-full rounded-xl border px-3 py-2 shadow-sm text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:bg-[#00156B] file:text-white focus-visible:ring-2 focus-visible:ring-offset-0 sm:w-auto"
              style={{ borderColor: "#00156B20" }}
              disabled={submitting}
            />

            {/* Tombol Remove dikembalikan menjadi Button, bukan Text Link */}
            {form.attachment && (
              <button
                type="button"
                onClick={clearFile}
                className="w-full rounded-xl border px-3 py-2 text-sm shadow-sm self-start sm:w-auto sm:self-auto hover:bg-gray-50"
                style={{ borderColor: "#00156B20" }}
                disabled={submitting}
              >
                Remove
              </button>
            )}
          </div>

          {/* Preview Area */}
          {form.attachment && (
            <div className="mt-3 space-y-2">
              {isImg && previewUrl && (
                <img
                  src={previewUrl}
                  alt="Attachment preview"
                  className="max-h-40 max-w-full rounded-xl border object-contain"
                />
              )}
              <div className="text-sm text-gray-600 break-words">
                {form.attachment.name} (
                {formatAttachmentSize(form.attachment.size)})
              </div>
            </div>
          )}
        </div>

        {/* --- WALLET WARNING --- */}
        {walletMismatch && (
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 flex items-center">
            <AlertCircle className="inline size-4 mr-2" />
            Connected wallet does not match your registered wallet
          </div>
        )}

        {/* --- SUBMIT BUTTON --- */}
        <button
          type="submit"
          disabled={!valid || submitting || walletMismatch}
          className="w-full inline-flex items-center justify-center rounded-xl px-4 py-3 text-white font-semibold shadow-md transition disabled:cursor-not-allowed disabled:bg-slate-400 hover:brightness-110"
          style={{ background: "#00156B" }}
        >
          {submitLabel}
        </button>
      </form>

      {/* --- INSUFFICIENT BALANCE MODAL (Restored Style) --- */}
      <Modal
        open={insufficientBalance?.open ?? false}
        onClose={() => {
          closeInsufficientBalanceModal();
          // Opsional: Reset form jika user menutup modal (seperti logic original)
          setForm({
            leaveType: LEAVE_TYPE_OPTIONS[0].value,
            startDate: "",
            endDate: "",
            reason: "",
            attachment: null,
          });
          if (fileRef.current) fileRef.current.value = "";
        }}
      >
        <div className="flex flex-col items-center text-center">
          {/* Warning Icon (Restored) */}
          <div
            className="rounded-full p-4 mb-4"
            style={{ backgroundColor: "#FFA50020" }}
          >
            <AlertCircle size={48} style={{ color: "#FFA500" }} />
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            Insufficient CUTI Balance
          </h2>

          {/* Description */}
          <p className="text-gray-600 mb-6 leading-relaxed px-4">
            You need at least <b>{insufficientBalance?.required ?? 0}</b> days
            of CUTI balance. Currently, you have{" "}
            <b>{insufficientBalance?.balance ?? 0}</b> day
            {(insufficientBalance?.balance ?? 0) !== 1 ? "s" : ""} available.
            Please adjust your leave request.
          </p>

          {/* OK Button (Restored) */}
          <button
            onClick={() => {
              closeInsufficientBalanceModal();
              // Reset form logic
              setForm({
                leaveType: LEAVE_TYPE_OPTIONS[0].value,
                startDate: "",
                endDate: "",
                reason: "",
                attachment: null,
              });
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="w-full rounded-xl px-6 py-3 text-white font-semibold shadow-md transition hover:opacity-90"
            style={{ background: "#00156B" }}
          >
            OK
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
