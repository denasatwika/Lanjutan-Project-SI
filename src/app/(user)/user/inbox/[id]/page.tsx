"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Paperclip,
  Download,
  ChevronRight,
  Link as LinkIcon,
} from "lucide-react";
import clsx from "clsx";

import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/state/auth";
import { useRequests } from "@/lib/state/requests";
import type { LeaveRequest, OvertimeRequest, Request } from "@/lib/types";
import { resolveLeaveTypeLabel } from "@/lib/utils/requestDisplay";
import {
  buildAttachmentDownloadUrl,
  formatAttachmentSize,
  normalizeAttachmentUrl,
} from "@/lib/api/attachments";
import {
  getRequest,
  listApprovals,
  type ApprovalResponse,
} from "@/lib/api/requests";
import { useInboxRead } from "../useInboxRead";
import { formatDateOnly, formatDateTime } from "../utils";

// Types
type ApprovalItem = {
  key: string;
  stage: number;
  approverLevel: string | null;
  status: "APPROVED" | "REJECTED" | "PENDING";
  decidedAt: string | null;
  comments: string | null;
  blockchainTxHash: string | null;
};

// Main Component
export default function InboxDetailPage() {
  const params = useParams<{ id: string }>();
  const requestId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const user = useAuth((state) => state.user);
  const byId = useRequests((state) => state.byId);
  const upsertFromApi = useRequests((state) => state.upsertFromApi);
  const markRead = useInboxRead((state) => state.markRead);

  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<ApprovalResponse[]>([]);

  // Fetch request and approvals
  useEffect(() => {
    if (!requestId) return;

    let cancelled = false;
    setLoading(true);

    const cached = byId(requestId);
    setRequest(cached ?? null);
    markRead(requestId);

    async function loadData() {
      try {
        const [requestResult, approvalsResult] = await Promise.allSettled([
          getRequest(requestId),
          listApprovals({ requestId }),
        ]);

        if (cancelled) return;

        if (requestResult.status === "fulfilled") {
          const normalized = upsertFromApi(requestResult.value);
          setRequest(normalized);
        } else {
          toast.error(
            requestResult.reason instanceof Error
              ? requestResult.reason.message
              : "Failed to load request",
          );
        }

        if (approvalsResult.status === "fulfilled") {
          setApprovals(approvalsResult.value);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [requestId, byId, upsertFromApi, markRead]);

  // Derived data
  const isLeave = request?.type === "leave";
  const leaveDetails = isLeave ? (request as LeaveRequest) : null;
  const overtimeDetails =
    request?.type === "overtime" ? (request as OvertimeRequest) : null;

  const requestTypeLabel = getRequestTypeLabel(request, leaveDetails);
  const attachmentUrl = normalizeAttachmentUrl(
    request?.attachmentUrl,
    request?.attachmentCid,
  );
  const isImageAttachment = request?.attachmentMimeType?.startsWith("image/");
  const downloadUrl = getDownloadUrl(attachmentUrl, request);

  // Approval calculations
  const totalApprovals = approvals.length || 0;
  const approvedCount = approvals.filter((a) => a.status === "APPROVED").length;
  const approvalProgress =
    totalApprovals > 0 ? Math.round((approvedCount / totalApprovals) * 100) : 0;

  const approvalItems = transformApprovals(approvals);

  // Loading state
  if (loading && !request) {
    return (
      <main className="mx-auto w-full max-w-2xl p-4 pb-20">
        <PageHeader
          title="Request Detail"
          backHref="/user/inbox"
          fullBleed
          bleedMobileOnly
          pullUpPx={32}
        />
        <div className="mt-12 text-center text-sm text-slate-400">
          Loading details...
        </div>
      </main>
    );
  }

  // Auth check
  if (!user && !loading) {
    return (
      <main className="mx-auto w-full max-w-2xl p-4 pb-20">
        <PageHeader
          title="Request Detail"
          backHref="/user/inbox"
          fullBleed
          bleedMobileOnly
          pullUpPx={32}
        />
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-600">
          Please Login
        </div>
      </main>
    );
  }

  // No request found
  if (!request) {
    return (
      <main className="mx-auto w-full max-w-2xl p-4 pb-20">
        <PageHeader
          title="Request Detail"
          backHref="/user/inbox"
          fullBleed
          bleedMobileOnly
          pullUpPx={32}
        />
        <div className="mt-12 text-center text-sm text-slate-400">
          Request not found
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-20">
      <PageHeader
        title="Request Detail"
        backHref="/user/inbox"
        fullBleed
        bleedMobileOnly
        pullUpPx={32}
      />

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <RequestHeader
          typeLabel={requestTypeLabel}
          createdAt={request.createdAt}
          status={request.status}
        />

        {/* Metrics */}
        <RequestMetrics
          request={request}
          leaveDetails={leaveDetails}
          overtimeDetails={overtimeDetails}
        />

        {/* Reason & Notes */}
        <RequestDescription reason={request.reason} notes={request.notes} />

        {/* Attachment */}
        {(request.attachmentId || request.attachmentUrl) && (
          <AttachmentSection
            attachmentUrl={attachmentUrl}
            isImageAttachment={isImageAttachment}
            downloadUrl={downloadUrl}
            attachmentName={request.attachmentName}
            attachmentSize={request.attachmentSize}
          />
        )}

        {/* Approval Timeline */}
        <ApprovalTimeline
          approvedCount={approvedCount}
          totalApprovals={totalApprovals}
          approvalProgress={approvalProgress}
          approvalItems={approvalItems}
        />
      </div>
    </main>
  );
}

// Helper Functions
function getRequestTypeLabel(
  request: Request | null,
  leaveDetails: LeaveRequest | null,
): string {
  if (!request) return "Request";
  if (request.type === "leave")
    return resolveLeaveTypeLabel(leaveDetails?.leaveTypeId) ?? "Leave Request";
  if (request.type === "overtime") return "Overtime Request";
  return "Request";
}

function getDownloadUrl(
  attachmentUrl: string | null,
  request: Request | null,
): string | null {
  if (attachmentUrl) return attachmentUrl;
  if (request?.attachmentId) {
    return buildAttachmentDownloadUrl(
      request.attachmentId,
      request.attachmentDownloadPath,
    );
  }
  return null;
}

function transformApprovals(approvals: ApprovalResponse[]): ApprovalItem[] {
  return approvals.map((approval) => ({
    key: approval.id,
    stage: approval.stage,
    approverLevel: approval.approverLevel ?? null,
    status: approval.status as "APPROVED" | "REJECTED" | "PENDING",
    decidedAt: approval.decidedAt ?? null,
    comments: approval.comments ?? null,
    blockchainTxHash: approval.blockchainTxHash ?? null,
  }));
}

function formatSignaturePreview(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

// Sub Components
function RequestHeader({
  typeLabel,
  createdAt,
  status,
}: {
  typeLabel: string;
  createdAt: string;
  status: string;
}) {
  return (
    <div className="flex items-start justify-between border-b border-slate-100 p-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{typeLabel}</h1>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="h-3 w-3" />
          <span>Created {formatDateTime(createdAt)}</span>
        </div>
      </div>
      <StatusPill status={status} />
    </div>
  );
}

function RequestMetrics({
  request,
  leaveDetails,
  overtimeDetails,
}: {
  request: Request;
  leaveDetails: LeaveRequest | null;
  overtimeDetails: OvertimeRequest | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-y-6 border-b border-slate-100 p-6 sm:grid-cols-4">
      <Metric
        label="Type"
        value={<span className="capitalize">{request.type}</span>}
      />

      {leaveDetails && (
        <>
          <Metric label="Duration" value={`${leaveDetails.days} Days`} />
          <Metric
            label="Start"
            value={formatDateOnly(leaveDetails.startDate)}
          />
          <Metric label="End" value={formatDateOnly(leaveDetails.endDate)} />
        </>
      )}

      {overtimeDetails && (
        <>
          <Metric
            label="Work Date"
            value={formatDateOnly(overtimeDetails.workDate)}
          />
          <Metric
            label="Time"
            value={`${overtimeDetails.startTime} - ${overtimeDetails.endTime}`}
          />
          <Metric label="Total" value={`${overtimeDetails.hours} hrs`} />
        </>
      )}

      {request.updatedAt && request.updatedAt !== request.createdAt && (
        <Metric label="Updated" value={formatDateTime(request.updatedAt)} />
      )}
    </div>
  );
}

function RequestDescription({
  reason,
  notes,
}: {
  reason?: string | null;
  notes?: string | null;
}) {
  if (!reason && !notes) return null;

  return (
    <div className="space-y-6 p-6">
      {reason && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Reason
          </h3>
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
            {reason}
          </p>
        </div>
      )}
      {notes && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Notes
          </h3>
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
            {notes}
          </p>
        </div>
      )}
    </div>
  );
}

function AttachmentSection({
  attachmentUrl,
  isImageAttachment,
  downloadUrl,
  attachmentName,
  attachmentSize,
}: {
  attachmentUrl: string | null;
  isImageAttachment: boolean | undefined;
  downloadUrl: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
}) {
  return (
    <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400">
          {isImageAttachment && attachmentUrl ? (
            <div className="relative h-full w-full overflow-hidden rounded">
              <Image
                src={attachmentUrl}
                alt="Preview"
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-700">
            {attachmentName || "Attachment"}
          </p>
          <p className="text-xs text-slate-400">
            {attachmentSize ? formatAttachmentSize(attachmentSize) : "File"}
          </p>
        </div>
        <a
          href={downloadUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-blue-600"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>

      {isImageAttachment && attachmentUrl && (
        <details className="group mt-2">
          <summary className="flex cursor-pointer items-center text-xs font-medium text-slate-500 hover:text-slate-700">
            <ChevronRight className="mr-1 h-3 w-3 transition-transform group-open:rotate-90" />
            View Full Image
          </summary>
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
            <Image
              src={attachmentUrl}
              alt="Full"
              width={600}
              height={400}
              className="w-full bg-slate-100 object-contain"
            />
          </div>
        </details>
      )}
    </div>
  );
}

function ApprovalTimeline({
  approvedCount,
  totalApprovals,
  approvalProgress,
  approvalItems,
}: {
  approvedCount: number;
  totalApprovals: number;
  approvalProgress: number;
  approvalItems: ApprovalItem[];
}) {
  return (
    <div className="border-t border-slate-100 p-6">
      <div className="mb-4 flex items-end justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Approval History
        </h3>
        <span className="text-xs font-medium text-slate-500">
          {approvedCount}/{totalApprovals} Approved
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-slate-800 transition-all duration-500"
          style={{ width: `${approvalProgress}%` }}
        />
      </div>

      <div className="relative space-y-6">
        {/* Vertical connector line */}
        {approvalItems.length > 1 && (
          <div
            className="absolute left-3.5 top-2 bottom-2 w-px -translate-x-1/2 bg-slate-200"
            aria-hidden="true"
          />
        )}

        {approvalItems.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            No approval history yet.
          </p>
        ) : (
          approvalItems.map((item) => (
            <ApprovalTimelineItem key={item.key} item={item} />
          ))
        )}
      </div>
    </div>
  );
}

function ApprovalTimelineItem({ item }: { item: ApprovalItem }) {
  const isApproved = item.status === "APPROVED";
  const isRejected = item.status === "REJECTED";

  return (
    <div className="relative z-10 flex gap-4">
      {/* Status Icon */}
      <div
        className={clsx(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ring-4 ring-white",
          isApproved && "border-emerald-200 bg-emerald-50 text-emerald-600",
          isRejected && "border-rose-200 bg-rose-50 text-rose-600",
          !isApproved &&
            !isRejected &&
            "border-slate-200 bg-white text-slate-400",
        )}
      >
        {isApproved ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : isRejected ? (
          <XCircle className="h-3.5 w-3.5" />
        ) : (
          <Clock className="h-3.5 w-3.5" />
        )}
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <p className="text-sm font-medium text-slate-900">
            Step {item.stage}{" "}
            <span className="font-normal text-slate-500">
              • {item.approverLevel || "Approver"}
            </span>
          </p>
          {item.decidedAt && (
            <span className="text-xs text-slate-400">
              {formatDateTime(item.decidedAt)}
            </span>
          )}
        </div>

        {/* Comments */}
        {item.comments && (
          <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
            "{item.comments}"
          </div>
        )}

        {/* Blockchain transaction */}
        {item.blockchainTxHash && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-[10px] text-blue-700">
            <LinkIcon className="h-3 w-3" />
            <span className="font-mono">
              {formatSignaturePreview(item.blockchainTxHash)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
        {label}
      </span>
      <span className="text-sm font-medium text-slate-900 truncate">
        {value}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: string | undefined | null }) {
  const normalizedStatus = status?.toLowerCase() || "unknown";

  const styles: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
    pending: "bg-amber-100 text-amber-800",
    draft: "bg-slate-100 text-slate-600",
    unknown: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        styles[normalizedStatus] || styles.unknown,
      )}
    >
      {normalizedStatus}
    </span>
  );
}
