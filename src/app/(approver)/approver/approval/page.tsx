"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock3, Filter, Search, User2 } from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import {
  getPendingRequestsForMe,
  type PendingRequest,
} from "@/lib/api/approver";
import { useAuth } from "@/lib/state/auth";

type TypeFilter = "all" | "leave" | "overtime";
const PAGE_SIZE = 5;

export default function ApproverApprovalsPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [type, setType] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Load pending requests
  useEffect(() => {
    if (!user?.id) {
      setRequests([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await getPendingRequestsForMe(user!.id, "all");
        if (!cancelled) {
          setRequests(data.requests);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load requests:", error);
          toast.error(
            error instanceof Error ? error.message : "Failed to load requests",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Filter and search
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests
      .filter((r) => r && r.id) // Filter out null/invalid requests
      .filter((r) => type === "all" || r.type === type)
      .filter((r) => {
        if (!query) return true;
        const searchableText = [
          r.id,
          r.requesterName,
          r.requesterDepartment,
          r.reason,
          r.notes,
          r.approvalLevel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchableText.includes(query);
      })
      .sort((a, b) => {
        const aTime = a.createdAt || "";
        const bTime = b.createdAt || "";
        return bTime.localeCompare(aTime);
      });
  }, [requests, type, search]);

  // Pagination
  useEffect(() => {
    setCurrentPage(1);
  }, [type, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function handleReview(request: PendingRequest) {
    if (!request.id) return;
    router.push(
      `/approver/approval/${request.id}?approval=${request.approvalId}`,
    );
  }

  return (
    <main className="mx-auto w-full max-w-[640px] p-3 pb-28">
      <div className="sticky top-0 z-10 -mx-3 border-b border-slate-200 bg-white/95 px-3 pb-3 pt-2 backdrop-blur">
        <PageHeader
          title="Approvals"
          backHref="/approver/dashboard"
          fullBleed
          bleedMobileOnly
          pullUpPx={34}
        />

        {/* Type Filter */}
        <div className="mt-3 mb-3 flex items-center gap-2 overflow-x-auto">
          <Chip active={type === "all"} onClick={() => setType("all")}>
            <Filter className="size-4" /> All
          </Chip>
          <Chip active={type === "leave"} onClick={() => setType("leave")}>
            <Calendar className="size-4" /> Leave
          </Chip>
          <Chip
            active={type === "overtime"}
            onClick={() => setType("overtime")}
          >
            <Clock3 className="size-4" /> Overtime
          </Chip>
        </div>

        {/* Search */}
        <div className="relative ml-auto min-w-[160px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, reason..."
            className="w-full rounded-xl border px-3 py-2 pl-9 text-sm outline-none focus:ring-2 focus:ring-[rgba(0,21,107,0.25)]"
          />
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        </div>

        {!loading && (
          <p className="mt-2 text-xs text-slate-500">
            Showing <span className="font-semibold">{filtered.length}</span>{" "}
            pending request{filtered.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <p className="mt-6 text-center text-sm text-slate-500">Loading...</p>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <p className="mt-6 text-center text-sm text-slate-500">
          {search || type !== "all"
            ? "No requests match your filters."
            : "No pending approvals assigned to you."}
        </p>
      )}

      {/* Request list */}
      <ul className="mt-3 space-y-2">
        {pageItems.map((request) => (
          <RequestCard
            key={request.approvalId}
            request={request}
            onReview={handleReview}
          />
        ))}
      </ul>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="mt-4 flex justify-center">
          <Pagination
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            currentPage={safePage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </main>
  );
}

// Components
function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition",
        active
          ? "bg-[#00156B] text-white"
          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

function RequestCard({
  request,
  onReview,
}: {
  request: PendingRequest;
  onReview: (r: PendingRequest) => void;
}) {
  // Safety check
  if (!request.id) return null;

  const typeLabel = request.type === "leave" ? "Leave" : "Overtime";
  const displayReason = request.reason || request.notes || "No reason provided";
  const displayStatus = request.status || "PENDING";

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-[rgba(0,21,107,0.4)] hover:shadow">
      <div className="flex items-start gap-3">
        <div className="grid size-10 flex-none place-items-center rounded-xl bg-slate-50">
          <User2 className="size-5 text-slate-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {request.requesterName || "Unknown Employee"}
              </p>
              <p className="text-xs text-slate-500">
                {request.requesterDepartment || "—"} • {request.id}
              </p>
            </div>
            <StatusBadge status={displayStatus} />
          </div>

          <div className="mt-2 text-xs text-slate-600 space-y-1">
            <p>
              {typeLabel} • Stage {request.approvalStage}{" "}
              {request.approvalLevel && `(${request.approvalLevel})`}
            </p>
            {request.createdAt && (
              <p>Submitted {formatDateTime(request.createdAt)}</p>
            )}

            {request.type === "leave" &&
              request.startDate &&
              request.endDate && (
                <p>
                  {formatDate(request.startDate)} -{" "}
                  {formatDate(request.endDate)}
                  {request.days && ` (${request.days} days)`}
                </p>
              )}

            {request.type === "overtime" && request.workDate && (
              <p>
                {formatDate(request.workDate)}
                {request.startTime &&
                  request.endTime &&
                  ` • ${request.startTime} - ${request.endTime}`}
                {request.hours && ` (${request.hours}h)`}
              </p>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-600 line-clamp-2">
            {displayReason}
          </p>

          <div className="mt-3 flex justify-end">
            <button
              onClick={() => onReview(request)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00156B] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Review
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    approved: "bg-green-50 text-green-700 ring-1 ring-green-200",
    rejected: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  };

  return (
    <span
      className={clsx(
        "rounded-full px-2 py-1 text-[11px] font-medium",
        styles[normalized] || styles.pending,
      )}
    >
      {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
    </span>
  );
}

function formatDateTime(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy HH:mm", { locale: idLocale });
  } catch {
    return iso;
  }
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "d MMM yyyy", { locale: idLocale });
  } catch {
    return dateStr;
  }
}
