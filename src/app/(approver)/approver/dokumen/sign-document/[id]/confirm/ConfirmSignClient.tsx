"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Edit,
  ArrowLeft,
  X,
  LoaderCircle,
} from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api/documents";
import Cookies from "js-cookie";
import SignedDocumentView from "@/components/sign-baliola/chief/SignedDocumentView";

type ViewState = "confirm" | "signed" | "error";

interface ConfirmSignClientProps {
  id: string;
}

export default function ConfirmSignClient({ id }: ConfirmSignClientProps) {
  const router = useRouter();
  const [viewState, setViewState] = useState<ViewState>("confirm");
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [signedUrlStatus, setSignedUrlStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const token = Cookies.get("auth_token");

  const handleSign = async () => {
    setIsSigning(true);
    setError(null);

    try {
      const userString = localStorage.getItem("user");
      if (!userString) {
        throw new Error(
          "Sesi pengguna tidak ditemukan. Silakan login kembali."
        );
      }
      const user = JSON.parse(userString);
      const userId = user.id;
      const documentId = id;

      if (!token) {
        throw new Error("Otentikasi gagal: Token tidak ditemukan.");
      }

      // 1. Fetch the user's signature ID first
      const sigResponse = await fetch(
        API_ENDPOINTS.GET_USER_SIGNATURE(userId),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );

      if (!sigResponse.ok) {
        if (sigResponse.status === 404) {
          throw new Error(
            "Tanda tangan tidak ditemukan. Silakan unggah tanda tangan Anda terlebih dahulu melalui halaman profil."
          );
        }
        throw new Error("Gagal mengambil data tanda tangan pengguna.");
      }

      const sigResult = await sigResponse.json();
      if (!sigResult.data || sigResult.data.length === 0) {
        throw new Error(
          "Data tanda tangan tidak valid. Silakan unggah ulang tanda tangan Anda."
        );
      }
      const signatureId = sigResult.data[0].id;

      // 2. Now, sign the document.
      const baseUrl = API_ENDPOINTS.GET_DOCUMENT_TO_SIGN(
        documentId,
        userId
      ).split("?")[0];

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ userId, signatureId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Gagal menandatangani dokumen.");
      }

      const result = await response.json();

      // DEBUG: Log the entire result to see the actual API response structure
      console.log("API Response Result:", result);

      if (result.pdfUrl) {
        setSignedPdfUrl(result.pdfUrl.replace("http://", "https://"));
      }

      setViewState("signed");
      setShowBanner(true);
    } catch (err: any) {
      setError(err.message);
      setViewState("error");
    } finally {
      setIsSigning(false);
    }
  };

  useEffect(() => {
    if (viewState === "signed") {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [viewState]);

  useEffect(() => {
    if (viewState === "signed") {
      // If the URL was already provided by the POST response, we are done.
      if (signedPdfUrl) {
        setSignedUrlStatus("success");
        return;
      }

      // If not, fetch it again using a GET request.
      const fetchSignedDocument = async () => {
        setSignedUrlStatus("loading");
        try {
          const userString = localStorage.getItem("user");
          if (!userString) throw new Error("Sesi pengguna tidak ditemukan.");
          const user = JSON.parse(userString);
          const userId = user.id;

          if (!token) {
            throw new Error("Otentikasi gagal: Token tidak ditemukan.");
          }

          const response = await fetch(
            API_ENDPOINTS.GET_DOCUMENT_TO_SIGN(id, userId),
            {
              headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(
              "Gagal mengambil data dokumen yang sudah ditandatangani."
            );
          }

          const data = await response.json();
          if (data.pdfUrl) {
            setSignedPdfUrl(data.pdfUrl.replace("http://", "https://"));
            setSignedUrlStatus("success");
          } else {
            throw new Error(
              "URL PDF tidak ditemukan dalam respons data dokumen."
            );
          }
        } catch (err: any) {
          setError(err.message); // Reuse the existing error state
          setSignedUrlStatus("error");
        }
      };

      fetchSignedDocument();
    }
  }, [viewState, signedPdfUrl, token, id]);

  if (viewState === "signed") {
    if (signedUrlStatus === "loading") {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-8 text-center">
            <LoaderCircle className="h-16 w-16 text-blue-950 mx-auto animate-spin" />
            <h1 className="text-3xl font-bold text-blue-950 mt-6">
              Mengambil Dokumen
            </h1>
            <p className="text-gray-700 mt-4 text-base">
              Dokumen berhasil ditandatangani. Sedang memuat pratinjau...
            </p>
          </div>
        </div>
      );
    }

    if (signedUrlStatus === "error" || !signedPdfUrl) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-8 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
            <h1 className="text-3xl font-bold text-red-600 mt-6">
              Gagal Menampilkan PDF
            </h1>
            <p className="text-gray-700 mt-4 text-base">
              {error ||
                "Dokumen berhasil ditandatangani, tetapi URL PDF tidak dapat dimuat."}
            </p>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => router.push("/chief")}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-gray-200 px-4 py-3 text-gray-800 font-semibold hover:bg-gray-300 transition"
              >
                <X className="h-5 w-5" />
                <span>Tutup</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // This part is reached only when signedUrlStatus is 'success'
    return (
      <SignedDocumentView
        signedPdfUrl={signedPdfUrl}
        token={token}
        onClose={() => router.push("/chief")}
        showBanner={showBanner}
      />
    );
  }

  // This is the main confirmation pop-up
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-8 text-center">
        {viewState === "error" ? (
          <>
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
            <h1 className="text-3xl font-bold text-red-600 mt-6">Gagal</h1>
            <p className="text-gray-700 mt-4 text-base">
              {error || "Terjadi kesalahan yang tidak diketahui."}
            </p>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => router.push("/chief")}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-gray-200 px-4 py-3 text-gray-800 font-semibold hover:bg-gray-300 transition"
              >
                <X className="h-5 w-5" />
                <span>Tutup</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
            <h1 className="text-3xl font-bold text-blue-950 mt-6">
              Konfirmasi
            </h1>
            <p className="text-blue-900/70 mt-4 text-base">
              Dengan melanjutkan, Anda akan menandatangani dokumen ini secara
              digital.
            </p>
            <p className="text-red-600 font-semibold mt-2">
              Tindakan ini bersifat final dan tidak dapat diubah.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link
                href={`/chief/sign-document/${id}`}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-white border border-gray-300 px-4 py-3 text-gray-800 font-semibold hover:bg-gray-100 transition"
              >
                <Edit className="h-5 w-5" />
                <span>Review Lagi</span>
              </Link>
              <button
                onClick={handleSign}
                disabled={isSigning}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-950 py-3 text-white font-bold hover:bg-blue-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSigning ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                <span>{isSigning ? "Memproses..." : "Selesaikan"}</span>
              </button>
            </div>
            <div className="text-center mt-6">
              <Link
                href={`/chief/sign-document/${id}`}
                className="text-sm text-blue-950 hover:text-blue-700 font-medium inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
