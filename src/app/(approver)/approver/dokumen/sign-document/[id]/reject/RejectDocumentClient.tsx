"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, LoaderCircle, AlertTriangle } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api/documents";
import Cookies from "js-cookie";

interface RejectDocumentClientProps {
  id: string;
}

export default function RejectDocumentClient({ id }: RejectDocumentClientProps) {
  const router = useRouter();
  const [rejectionNote, setRejectionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReject = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const token = Cookies.get("auth_token");
      const userString = localStorage.getItem("user");

      if (!token || !userString) {
        throw new Error("Sesi otentikasi tidak ditemukan. Silakan login kembali.");
      }

      const user = JSON.parse(userString);
      const userId = user.id;

      const response = await fetch(API_ENDPOINTS.REJECT_DOCUMENT(id), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          userId: userId,
          reason: rejectionNote,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Gagal menolak dokumen.");
      }

      alert("Dokumen telah ditolak dan catatan telah dikirim.");
      router.push("/chief");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-blue-950 mb-4">Tolak Dokumen</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label
            htmlFor="rejectionNote"
            className="font-semibold text-gray-700"
          >
            Catatan Penolakan
          </label>
          <textarea
            id="rejectionNote"
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            className="w-full h-32 p-3 mt-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Berikan alasan mengapa dokumen ini ditolak..."
            disabled={isSubmitting}
          ></textarea>
        </div>

        <div className="flex justify-between items-center mt-8">
          <Link
            href={`/chief/sign-document/${id}`}
            className={`inline-flex items-center gap-2 text-blue-950 font-bold hover:text-blue-700 transition ${isSubmitting ? "pointer-events-none opacity-50" : ""
              }`}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Kembali</span>
          </Link>
          <button
            onClick={handleReject}
            disabled={!rejectionNote.trim() || isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-950 px-6 py-3 text-white font-bold hover:bg-blue-800 transition disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <LoaderCircle className="animate-spin h-5 w-5" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            <span>{isSubmitting ? "Mengirim..." : "Kirim"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
