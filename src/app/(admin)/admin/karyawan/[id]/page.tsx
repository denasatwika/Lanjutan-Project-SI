"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Wallet,
  Plus,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import {
  getEmployee,
  type EmployeeResponse,
  updateEmployee,
  type EmployeeUpdatePayload,
} from "@/lib/api/employees";
import {
  listDepartments,
  type DepartmentResponse,
} from "@/lib/api/departments";
import {
  getWallets,
  createWallet,
  deleteWallet,
  getWalletBalance,
  type EmployeeWallet,
  type WalletCreatePayload,
  type WalletBalanceResponse,
} from "@/lib/api/wallets";
import {
  listLeaveRequests,
  type LeaveRequestResponse,
} from "@/lib/api/leaveRequests";
import { HttpError } from "@/lib/types/errors";
import { Modal } from "@/components/ui/modal";

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [wallets, setWallets] = useState<EmployeeWallet[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestResponse[]>(
    [],
  );
  const [balances, setBalances] = useState<Map<string, WalletBalanceResponse>>(
    new Map(),
  );

  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addWalletModalOpen, setAddWalletModalOpen] = useState(false);
  const [deleteWalletModal, setDeleteWalletModal] = useState<{
    open: boolean;
    wallet: EmployeeWallet | null;
  }>({
    open: false,
    wallet: null,
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch employee data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [empData, deptData, walletsData, requestsData] =
          await Promise.all([
            getEmployee(employeeId),
            listDepartments(),
            getWallets({ employeeId }),
            listLeaveRequests({ requesterId: employeeId }),
          ]);

        setEmployee(empData);
        setDepartments(deptData);
        setWallets(walletsData);
        setLeaveRequests(requestsData);

        // Fetch balances for all wallets
        const balancePromises = walletsData.map(async (wallet) => {
          try {
            const balance = await getWalletBalance(wallet.address);
            return { address: wallet.address, balance };
          } catch {
            return { address: wallet.address, balance: null };
          }
        });

        const balanceResults = await Promise.all(balancePromises);
        const balanceMap = new Map<string, WalletBalanceResponse>();
        balanceResults.forEach((result) => {
          if (result.balance) {
            balanceMap.set(result.address, result.balance);
          }
        });
        setBalances(balanceMap);
      } catch (error) {
        const message =
          error instanceof HttpError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to load employee data";
        toast.error(message);
        router.push("/admin/karyawan");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [employeeId, router]);

  // Helper to get department name from local state
  const getDepartmentName = (departmentId: string): string => {
    const dept = departments.find((d) => d.id === departmentId);
    return dept?.name ?? "Unknown";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Employee not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/admin/karyawan")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Employees</span>
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              {employee.fullName}
            </h1>
            <button
              onClick={() => setEditModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition"
              style={{ backgroundColor: "#00156B" }}
            >
              <Edit size={18} />
              <span>Edit Employee</span>
            </button>
          </div>
        </div>

        {/* Employee Information Section */}
        <EmployeeInformationSection
          employee={employee}
          departmentName={getDepartmentName(employee.departmentId)}
        />

        {/* Wallet Management Section */}
        <WalletManagementSection
          wallets={wallets}
          balances={balances}
          onAddWallet={() => setAddWalletModalOpen(true)}
          onDeleteWallet={(wallet) =>
            setDeleteWalletModal({ open: true, wallet })
          }
        />

        {/* Leave Request History Section */}
        <LeaveRequestHistorySection leaveRequests={leaveRequests} />
      </div>

      {/* Edit Employee Modal */}
      {editModalOpen && (
        <EditEmployeeModal
          employee={employee}
          departments={departments}
          onClose={() => setEditModalOpen(false)}
          onSave={(updated) => {
            setEmployee(updated);
            setEditModalOpen(false);
          }}
        />
      )}

      {/* Add Wallet Modal */}
      {addWalletModalOpen && (
        <AddWalletModal
          employeeId={employeeId}
          onClose={() => setAddWalletModalOpen(false)}
          onSave={async (newWallet) => {
            setWallets((prev) => [...prev, newWallet]);
            setAddWalletModalOpen(false);
            // Fetch balance for new wallet
            try {
              const balance = await getWalletBalance(newWallet.address);
              setBalances((prev) =>
                new Map(prev).set(newWallet.address, balance),
              );
            } catch {
              // Ignore balance fetch errors
            }
          }}
        />
      )}

      {/* Delete Wallet Confirmation Modal */}
      {deleteWalletModal.open && deleteWalletModal.wallet && (
        <DeleteWalletModal
          wallet={deleteWalletModal.wallet}
          onClose={() => setDeleteWalletModal({ open: false, wallet: null })}
          onConfirm={async () => {
            if (!deleteWalletModal.wallet) return;
            try {
              setSubmitting(true);
              await deleteWallet(deleteWalletModal.wallet.id);
              setWallets((prev) =>
                prev.filter((w) => w.id !== deleteWalletModal.wallet!.id),
              );
              setBalances((prev) => {
                const newMap = new Map(prev);
                newMap.delete(deleteWalletModal.wallet!.address);
                return newMap;
              });
              toast.success("Wallet removed successfully");
              setDeleteWalletModal({ open: false, wallet: null });
            } catch (error) {
              const message =
                error instanceof HttpError
                  ? error.message
                  : error instanceof Error
                    ? error.message
                    : "Failed to remove wallet";
              toast.error(message);
            } finally {
              setSubmitting(false);
            }
          }}
          submitting={submitting}
        />
      )}
    </div>
  );
}

function EmployeeInformationSection({
  employee,
  departmentName,
}: {
  employee: EmployeeResponse;
  departmentName: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Employee Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-600">Full Name</label>
          <p className="text-gray-900 font-medium">{employee.fullName}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Email</label>
          <p className="text-gray-900">{employee.email}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Phone</label>
          <p className="text-gray-900">{employee.phone}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">
            Department
          </label>
          <p className="text-gray-900">{departmentName}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Level</label>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {employee.level}
          </span>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Role</label>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {employee.role}
          </span>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">
            Employment Type
          </label>
          <p className="text-gray-900">{employee.employmentType}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Status</label>
          {employee.isActive ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Inactive
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function WalletManagementSection({
  wallets,
  balances,
  onAddWallet,
  onDeleteWallet,
}: {
  wallets: EmployeeWallet[];
  balances: Map<string, WalletBalanceResponse>;
  onAddWallet: () => void;
  onDeleteWallet: (wallet: EmployeeWallet) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Wallet Management
        </h2>
        <button
          onClick={onAddWallet}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition"
          style={{ backgroundColor: "#00156B" }}
        >
          <Plus size={18} />
          <span>Link Wallet</span>
        </button>
      </div>

      {wallets.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Wallet size={48} className="mx-auto mb-3 text-gray-400" />
          <p>No wallets linked to this employee</p>
          <button
            onClick={onAddWallet}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Link your first wallet
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {wallets.map((wallet) => {
            const balance = balances.get(wallet.address);
            return (
              <div
                key={wallet.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet size={18} className="text-gray-600" />
                      <span className="font-mono text-sm text-gray-900">
                        {wallet.address}
                      </span>
                      {wallet.isPrimary && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Primary
                        </span>
                      )}
                      {wallet.isVerified && (
                        <CheckCircle size={16} className="text-green-600" />
                      )}
                    </div>
                    {wallet.nickname && (
                      <p className="text-sm text-gray-600 mb-1">
                        Nickname: {wallet.nickname}
                      </p>
                    )}
                    {balance && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          CUTI Balance:
                        </span>
                        <span className="text-lg font-semibold text-green-600">
                          {balance.formatted} {balance.symbol}
                        </span>
                      </div>
                    )}
                    {wallet.lastUsedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last used:{" "}
                        {new Date(wallet.lastUsedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`http://localhost:8545/address/${wallet.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-600 hover:text-blue-600 transition"
                      title="View on explorer"
                    >
                      <ExternalLink size={18} />
                    </a>
                    <button
                      onClick={() => onDeleteWallet(wallet)}
                      className="p-2 text-gray-600 hover:text-red-600 transition"
                      title="Remove wallet"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeaveRequestHistorySection({
  leaveRequests,
}: {
  leaveRequests: LeaveRequestResponse[];
}) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle size={16} className="text-green-600" />;
      case "REJECTED":
        return <XCircle size={16} className="text-red-600" />;
      case "PENDING":
        return <Clock size={16} className="text-yellow-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses =
      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "APPROVED":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "REJECTED":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "PENDING":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Leave Request History
      </h2>

      {leaveRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No leave requests found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leave Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Range
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {request.leaveType}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {new Date(request.leaveStartDate).toLocaleDateString()} -{" "}
                      {new Date(request.leaveEndDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {request.leaveDays}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600 line-clamp-2">
                      {request.leaveReason}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(request.status)}>
                      {getStatusIcon(request.status)}
                      {request.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleDateString()
                        : "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EditEmployeeModal({
  employee,
  departments,
  onClose,
  onSave,
}: {
  employee: EmployeeResponse;
  departments: DepartmentResponse[];
  onClose: () => void;
  onSave: (updated: EmployeeResponse) => void;
}) {
  const [formData, setFormData] = useState<EmployeeUpdatePayload>({
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    employmentType: employee.employmentType,
    level: employee.level,
    role: employee.role,
    departmentId: employee.departmentId,
    isActive: employee.isActive,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    try {
      setSubmitting(true);
      const updated = await updateEmployee(employee.id, formData);
      toast.success("Employee updated successfully");
      onSave(updated);
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to update employee";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={true} onClose={onClose}>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Edit Employee
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fullName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={formData.departmentId}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  departmentId: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#00156B" }}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddWalletModal({
  employeeId,
  onClose,
  onSave,
}: {
  employeeId: string;
  onClose: () => void;
  onSave: (wallet: EmployeeWallet) => void;
}) {
  const [address, setAddress] = useState("");
  const [nickname, setNickname] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!address.trim()) {
      setError("Wallet address is required");
      return;
    }

    if (!address.startsWith("0x") || address.length !== 42) {
      setError("Invalid Ethereum address format");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload: WalletCreatePayload = {
        employeeId,
        address: address.trim(),
        nickname: nickname.trim() || undefined,
        isPrimary,
        isVerified: false,
        walletType: "MetaMask",
      };

      const created = await createWallet(payload);
      toast.success("Wallet linked successfully");
      onSave(created);
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to link wallet";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={true} onClose={onClose}>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Link Wallet
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wallet Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nickname (Optional)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g., Work Wallet"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">
                Set as primary wallet
              </span>
            </label>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#00156B" }}
          >
            {submitting ? "Linking..." : "Link Wallet"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteWalletModal({
  wallet,
  onClose,
  onConfirm,
  submitting,
}: {
  wallet: EmployeeWallet;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <Modal open={true} onClose={onClose}>
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="rounded-full p-3"
            style={{ backgroundColor: "#FFA50020" }}
          >
            <AlertCircle size={24} style={{ color: "#FFA500" }} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Remove Wallet</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Are you sure you want to remove this wallet? This action cannot be
          undone.
        </p>
        <div className="bg-gray-50 p-3 rounded-lg mb-6">
          <p className="font-mono text-sm text-gray-900">{wallet.address}</p>
          {wallet.nickname && (
            <p className="text-sm text-gray-600 mt-1">{wallet.nickname}</p>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? "Removing..." : "Remove Wallet"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
