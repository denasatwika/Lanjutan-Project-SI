"use client";
import { CameraCapture } from "@/components/CameraCapture";
import { useAuth } from "@/lib/state/auth";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import * as attendanceApi from "@/lib/api/attendance";

export default function Page() {
  const user = useAuth((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    hasCheckedIn: boolean;
    hasCheckedOut: boolean;
  } | null>(null);
  const [checking, setChecking] = useState(true);

  // Check today's status on mount
  useEffect(() => {
    if (!user?.id) return;
    setChecking(true);
    attendanceApi
      .getTodayStatus(user.id)
      .then((data) => {
        setStatus({
          hasCheckedIn: data.hasCheckedIn,
          hasCheckedOut: data.hasCheckedOut,
        });
      })
      .catch((err) => {
        console.error("Failed to get today status:", err);
      })
      .finally(() => setChecking(false));
  }, [user]);

  const handleCheckIn = async (photoData?: string) => {
    console.log("=== handleCheckIn CALLED ===");
    console.log("User:", user);
    console.log("Photo data length:", photoData?.length);

    if (!user?.id) {
      toast.error("Silakan login terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      console.log("Calling attendanceApi.checkIn...");
      const result = await attendanceApi.checkIn(user.id, photoData);
      console.log("Check-in API result:", result);
      toast.success("Check-in berhasil!");
      setStatus({ hasCheckedIn: true, hasCheckedOut: false });
    } catch (error) {
      console.error("Check-in error:", error);
      const message = error instanceof Error ? error.message : "Check-in gagal";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (photoData?: string) => {
    if (!user) {
      toast.error("Silakan login terlebih dahulu");
      return;
    }

    if (!user?.id) {
      toast.error("Silakan login terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      await attendanceApi.checkOut(user.id, photoData);
      toast.success("Check-out berhasil!");
      setStatus({ hasCheckedIn: true, hasCheckedOut: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Check-out gagal";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Check-in / Check-out</h1>
        <div className="card p-4 text-sm text-gray-600">
          Silakan login untuk melakukan check-in.
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Check-in / Check-out</h1>
        <div className="card p-4 text-sm text-gray-600">Memuat status...</div>
      </div>
    );
  }

  // Determine what action to show
  const shouldShowCheckIn = !status?.hasCheckedIn;
  const shouldShowCheckOut = status?.hasCheckedIn && !status?.hasCheckedOut;
  const alreadyDone = status?.hasCheckedIn && status?.hasCheckedOut;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">
        {shouldShowCheckIn && "Check-in"}
        {shouldShowCheckOut && "Check-out"}
        {alreadyDone && "Selesai Hari Ini"}
      </h1>

      {/* DEBUG INFO */}
      <div className="rounded border bg-yellow-50 p-3 text-xs">
        <div>User ID: {user?.id || "NOT LOGGED IN"}</div>
        <div>User Name: {user?.name || "N/A"}</div>
        <div>
          Status: hasCheckedIn={String(status?.hasCheckedIn)}, hasCheckedOut=
          {String(status?.hasCheckedOut)}
        </div>
        <div>Loading: {String(loading)}</div>
      </div>

      {alreadyDone ? (
        <div className="rounded-2xl border bg-white p-6 text-center">
          <p className="text-gray-600">
            Anda sudah check-in dan check-out hari ini.
          </p>
        </div>
      ) : (
        <CameraCapture
          onCapture={shouldShowCheckIn ? handleCheckIn : handleCheckOut}
          disabled={loading}
        />
      )}
    </div>
  );
}
