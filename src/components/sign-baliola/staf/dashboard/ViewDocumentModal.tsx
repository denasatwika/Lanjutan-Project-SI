"use client";

import { useState, useEffect, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ArrowLeft, LoaderCircle, AlertTriangle, X } from "lucide-react";
import Cookies from "js-cookie";

// Sesuaikan path ini dengan lokasi file API Anda
import { API_ENDPOINTS } from "@/lib/api/documents";

// Import Hook Custom (Pastikan file ini sudah dibuat, lihat di bawah)
import { usePDFJS } from "@/hooks/usePDFJS";

interface ViewDocumentModalProps {
  documentId: number | null;
  onClose: () => void;
  // Opsional: Jika ingin melempar userId dari parent component
  currentUserId?: number;
}

export default function ViewDocumentModal({
  documentId,
  onClose,
  currentUserId,
}: ViewDocumentModalProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State baru untuk memastikan Worker siap sebelum render
  const [isPdfWorkerReady, setIsPdfWorkerReady] = useState(false);

  // --- INTEGRASI HOOK usePDFJS ---
  // Hook ini akan meload worker dari local (node_modules) via Webpack
  usePDFJS(async (pdfjsLib) => {
    try {
      // Sinkronisasi worker react-pdf dengan worker yang di-load hook
      pdfjs.GlobalWorkerOptions.workerSrc =
        pdfjsLib.GlobalWorkerOptions.workerSrc;
      setIsPdfWorkerReady(true);
    } catch (e) {
      console.error("Gagal menginisialisasi PDF Worker:", e);
      setError("Gagal memuat mesin PDF.");
    }
  });
  // -------------------------------

  const token = Cookies.get("auth_token");

  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) return;

      setLoading(true);
      setError(null);
      setPdfUrl(null);
      setDocumentTitle("");

      try {
        // TODO: Ganti logic userId ini dengan data real dari session user Anda
        const userIdToUse = currentUserId || 2;

        if (!token) {
          throw new Error("Otentikasi gagal: Token tidak ditemukan.");
        }

        // Fetch URL dokumen dari API
        const response = await fetch(
          API_ENDPOINTS.GET_DOCUMENT_TO_SIGN(String(documentId), userIdToUse),
          {
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || "Gagal mengambil data dokumen");
        }

        const data = await response.json();

        if (data.pdfUrl) {
          // Ganti http ke https jika perlu (untuk mixed content issues)
          setPdfUrl(data.pdfUrl.replace("http://", "https://"));
        } else {
          throw new Error("URL PDF tidak ditemukan dalam respon API.");
        }

        setDocumentTitle(data.documentTitle || `Dokumen (ID: ${documentId})`);
      } catch (err: any) {
        console.error("Error fetching document:", err);
        setError(err.message || "Terjadi kesalahan saat memuat dokumen.");
      } finally {
        // Loading fetch selesai (tapi loading worker mungkin belum)
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, token, currentUserId]);

  // Memoize objek file agar tidak re-render berulang
  const fileProp = useMemo(() => {
    if (!pdfUrl) return null;
    return {
      url: pdfUrl,
      httpHeaders: {
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
      },
    };
  }, [pdfUrl, token]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Jika tidak ada ID, jangan render apa-apa
  if (!documentId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 text-center relative bg-gray-50">
          <h2 className="text-lg font-bold text-blue-950 truncate px-8">
            {documentTitle || "Pratinjau Dokumen"}
          </h2>
          <button
            onClick={onClose}
            className="absolute top-1/2 right-4 -translate-y-1/2 p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition"
            aria-label="Tutup"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body (PDF Viewer) */}
        <div className="flex-grow overflow-y-auto p-2 sm:p-6 bg-gray-100/50">
          <div className="w-full flex justify-center min-h-[300px]">
            {/* Logic Loading Gabungan (API Fetching OR Worker Preparing) */}
            {(loading || !isPdfWorkerReady) && !error && (
              <div className="flex flex-col items-center justify-center h-full p-10 space-y-4">
                <LoaderCircle className="animate-spin h-10 w-10 text-blue-950" />
                <div className="text-center">
                  <p className="font-medium text-gray-700">
                    {loading
                      ? "Mengunduh dokumen..."
                      : "Menyiapkan tampilan PDF..."}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Mohon tunggu sebentar
                  </p>
                </div>
              </div>
            )}

            {/* Tampilan Error */}
            {error && (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Gagal Memuat
                </h3>
                <p className="mt-2 text-red-600 max-w-md">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-6 text-sm text-gray-500 hover:text-gray-800 underline"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Tampilan PDF (Hanya jika URL ada, tidak loading, dan Worker Siap) */}
            {pdfUrl && !loading && !error && isPdfWorkerReady && (
              <Document
                file={fileProp}
                onLoadSuccess={onDocumentLoadSuccess}
                className="shadow-xl rounded-lg overflow-hidden border border-gray-200"
                loading={
                  <div className="flex items-center gap-2 p-10 text-gray-500">
                    <LoaderCircle className="animate-spin h-5 w-5" />
                    <span>Merender halaman...</span>
                  </div>
                }
                error={
                  <div className="p-10 text-red-500 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>File PDF rusak atau tidak dapat dibuka.</span>
                  </div>
                }
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <div key={`page_${index + 1}`} className="mb-6 last:mb-0">
                    <Page
                      pageNumber={index + 1}
                      className="max-w-full h-auto"
                      renderTextLayer={false} // Matikan jika ingin performa lebih cepat
                      renderAnnotationLayer={false}
                      width={Math.min(window.innerWidth * 0.8, 800)} // Responsif sederhana
                    />
                    <p className="text-center text-xs text-gray-400 mt-2">
                      Halaman {index + 1} dari {numPages}
                    </p>
                  </div>
                ))}
              </Document>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200 flex justify-center">
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-950 px-8 py-3 text-white font-bold hover:bg-blue-900 transition shadow-md hover:shadow-lg active:scale-95 transform duration-100"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Kembali</span>
          </button>
        </div>
      </div>
    </div>
  );
}
