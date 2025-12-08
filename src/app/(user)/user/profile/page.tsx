// app/(employee)/employee/profile/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/state/auth";
import { PageHeader } from "@/components/PageHeader";
import { CutiTokenApproval } from "@/components/CutiTokenApproval";
import {
  Camera,
  Mail,
  Phone,
  Wallet,
  Building2,
  Moon,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { useDisconnect } from "wagmi";
import { getEmployee, updateEmployee } from "@/lib/api/employees";
import { getDepartmentName } from "@/lib/api/departments";
import { getWallets } from "@/lib/api/wallets";
import type {
  EmployeeResponse,
  EmployeeUpdatePayload,
} from "@/lib/api/employees";

type ProfileFormState = {
  fullName: string;
  email: string;
  phone: string;
  departmentName: string;
  departmentId: string;
  wallet: string;
};

export default function ProfilePage() {
  const auth = useAuth();
  const user = auth.user;
  const { disconnect } = useDisconnect();
  const firstName = useMemo(
    () => user?.name?.split(" ")[0] ?? "User",
    [user?.name],
  );
  const initial = firstName.charAt(0).toUpperCase();

  const [profile, setProfile] = useState<EmployeeResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [departmentName, setDepartmentName] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string>("");

  const initialForm = useMemo<ProfileFormState>(() => {
    return {
      fullName: profile?.fullName ?? user?.name ?? "",
      email: profile?.email ?? user?.email ?? "",
      phone: profile?.phone ?? user?.phone ?? "",
      departmentName: departmentName,
      departmentId: profile?.departmentId ?? user?.departmentId ?? "",
      wallet: walletAddress || user?.address || "",
    };
  }, [profile, user, departmentName, walletAddress]);

  const [form, setForm] = useState<ProfileFormState>(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  // Fetch employee profile and related data
  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    setLoadingProfile(true);

    Promise.all([getEmployee(user.id), getWallets({ employeeId: user.id })])
      .then(async ([employeeData, walletsData]) => {
        if (cancelled) return;

        setProfile(employeeData);

        // Get department name
        if (employeeData.departmentId) {
          try {
            const deptName = await getDepartmentName(employeeData.departmentId);
            if (!cancelled) setDepartmentName(deptName);
          } catch {
            // Ignore error, use empty string
          }
        }

        // Get primary wallet address
        const primaryWallet =
          walletsData.find((w) => w.isPrimary) || walletsData[0];
        if (primaryWallet && !cancelled) {
          setWalletAddress(primaryWallet.address);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Failed to load profile";
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // theme toggle (darkMode: 'class')
  const [dark, setDark] = useState<boolean>(() =>
    typeof window === "undefined"
      ? false
      : document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    if (typeof localStorage !== "undefined")
      localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  async function saveProfile() {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    const payload: EmployeeUpdatePayload = {};

    const nextName = form.fullName.trim();
    const previousName = initialForm.fullName.trim();
    if (nextName !== previousName) {
      payload.fullName = nextName;
    }

    const nextEmail = form.email.trim();
    const previousEmail = initialForm.email.trim();
    if (nextEmail !== previousEmail) {
      payload.email = nextEmail;
    }

    const nextPhone = form.phone.trim();
    const previousPhone = initialForm.phone.trim();
    if (nextPhone !== previousPhone) {
      payload.phone = nextPhone;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("Nothing to update");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateEmployee(user.id, payload);
      setProfile(updated);

      // Update auth state with new values
      auth.setUser({
        ...user,
        name: updated.fullName,
        email: updated.email,
        phone: updated.phone,
      });

      toast.success("Profile updated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    disconnect();
    try {
      await auth.logout();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to logout";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Profile"
        backHref="/user/dashboard"
        fullBleed
        bleedMobileOnly
        pullUpPx={24}
      />

      {!user ? (
        <section className="card p-4 text-sm text-gray-500">
          Silakan login untuk melihat dan mengubah profil karyawan.
        </section>
      ) : (
        <>
          {/* Identity card */}
          <section className="card p-4">
            <div className="flex items-center gap-4">
              <div
                className="relative shrink-0 w-16 h-16 rounded-full grid place-items-center text-white"
                style={{ backgroundColor: "#00156B" }}
              >
                <span className="font-semibold text-lg">{initial}</span>
              </div>

              <div className="flex-1">
                <div className="w-full text-xl md:text-2xl font-extrabold">
                  {form.fullName}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {profile?.level}
                </div>
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setDark((v) => !v)}
                className="rounded-xl px-3 py-2 border text-sm inline-flex items-center gap-2"
                title="Tema"
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}{" "}
                {dark ? "Light" : "Dark"}
              </button>
            </div>
          </section>

          {/* CutiToken Approval */}
          <CutiTokenApproval />

          {/* Contact & Org */}
          <section className="grid md:grid-cols-2 gap-4">
            <div className="card p-4">
              <h3 className="font-bold mb-3">Credential</h3>
              <InfoRow icon={<Mail size={16} />} label="Email">
                <input
                  className="w-full bg-transparent outline-none"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </InfoRow>
              <InfoRow icon={<Phone size={16} />} label="Phone Number">
                <input
                  className="w-full bg-transparent outline-none"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </InfoRow>
              <InfoRow icon={<Building2 size={16} />} label="Department">
                <input
                  className="w-full bg-transparent outline-none text-gray-500"
                  value={form.departmentName}
                  readOnly
                />
              </InfoRow>
              <InfoRow icon={<Wallet size={16} />} label="Wallet">
                <input
                  className="w-full bg-transparent outline-none text-gray-500 font-mono text-sm"
                  value={form.wallet}
                  readOnly
                />
              </InfoRow>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={saveProfile}
                  disabled={saving || loadingProfile}
                  className="btn btn-primary"
                >
                  {saving ? "Saving" : loadingProfile ? "Loading..." : "Save"}
                </button>
                <button onClick={logout} className="btn">
                  Logout
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-b-0">
      <div className="shrink-0 size-8 rounded-lg bg-gray-50 text-gray-700 grid place-items-center">
        {icon}
      </div>
      <div className="w-32 text-sm text-gray-500">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
