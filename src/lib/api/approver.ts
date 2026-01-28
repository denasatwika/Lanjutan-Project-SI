// src/lib/api/approver.ts
import { HttpError } from "../types/errors";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8787";

export type PendingRequestType = "all" | "leave" | "overtime";

// Backend response structure - matches what the endpoint actually returns
export type PendingRequest = {
  id: string | null;
  type: "leave" | "overtime";
  status: string | null | undefined;
  createdAt: string | null | undefined;
  requesterId: string | null | undefined;
  requesterName: string;
  requesterDepartment: string | null | undefined;
  reason: string | null | undefined;
  notes: string | null | undefined;
  approvalId: string;
  approvalStage: number;
  approvalLevel: string | null;

  // Leave-specific
  leaveTypeId: string | null | undefined;
  startDate: string | null | undefined;
  endDate: string | null | undefined;
  days: number | null | undefined;

  // Overtime-specific
  workDate: string | null | undefined;
  startTime: string | null | undefined;
  endTime: string | null | undefined;
  hours: number | null | undefined;
};

export type GetPendingRequestsResponse = {
  requests: PendingRequest[];
  total: number;
};

/**
 * Get all pending requests assigned to the authenticated approver
 * This is a single optimized API call - no N+1 queries!
 *
 * @param approverId - The employee ID of the approver (from auth context)
 * @param type - Filter by request type (all, leave, or overtime)
 */
export async function getPendingRequestsForMe(
  approverId: string,
  type: PendingRequestType = "all",
): Promise<GetPendingRequestsResponse> {
  if (!approverId) {
    throw new HttpError("Approver ID is required", 400);
  }

  const url = new URL(`${API_BASE}/approvals/pending-for-me`);
  url.searchParams.set("approverId", approverId);
  url.searchParams.set("type", type);

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new HttpError(
      errorData.error ||
        `Failed to fetch pending requests: ${response.statusText}`,
      response.status,
    );
  }

  const data = await response.json();

  // Filter out any null/invalid requests
  const validRequests = data.requests.filter((r: PendingRequest) => r && r.id);

  return {
    requests: validRequests,
    total: validRequests.length,
  };
}
