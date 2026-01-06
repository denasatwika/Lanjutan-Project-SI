"use client";

import { useState, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { X, LoaderCircle, Check, AlertTriangle } from "lucide-react";

// Import Hook Custom
import { usePDFJS } from "@/hooks/usePDFJS";

interface SignedDocumentViewProps {
  signedPdfUrl: string;
  token: string | undefined;
  onClose: () => void;
  showBanner: boolean;
}

export default function SignedDocumentView({
  signedPdfUrl,
  token,
  onClose,
  showBanner,
}: SignedDocumentViewProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State untuk memastikan Worker sudah siap sebelum render
  const [isPdfWorkerReady, setIsPdfWorkerReady] = useState(false);

  // --- INTEGRASI HOOK ---
  usePDFJS(async (pdfjsLib) => {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc =
        pdfjsLib.GlobalWorkerOptions.workerSrc;
      setIsPdfWorkerReady(true);
    } catch (e) {
      console.error("Gagal load PDF Worker", e);
      setError("Gagal memuat komponen PDF.");
    }
  });
  // ---------------------

  const fileProp = useMemo(() => {
    return {
      url: signedPdfUrl,
      httpHeaders: {
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
      },
    };
  }, [signedPdfUrl, token]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Render Tampilan Error
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center p-4 z-50 backdrop-blur-sm">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-200">
          <div className="bg-red-100 p-3 rounded-full mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Gagal Menampilkan PDF
          </h3>
          <p className="text-gray-600 mb-6 text-sm">{error}</p>

          <button
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-950 px-6 py-2.5 text-white font-semibold hover:bg-blue-900 transition shadow-md"
          >
            <X className="h-4 w-4" />
            <span>Tutup</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl h-full sm:h-auto sm:max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header Modal */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-blue-950 text-lg">
            Dokumen Ditandatangani
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-grow overflow-y-auto p-4 bg-gray-100 flex justify-center min-h-[300px]">
          {/* Logic: Tampilkan Loader jika Worker belum siap */}
          {!isPdfWorkerReady ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <LoaderCircle className="h-10 w-10 animate-spin text-blue-950/50" />
              <p className="text-gray-500 text-sm font-medium">
                Menyiapkan PDF Viewer...
              </p>
            </div>
          ) : (
            /* Render Document hanya jika Worker sudah siap */
            <Document
              file={fileProp}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(err) => {
                console.error("Error loading PDF:", err);
                setError(`Gagal memuat PDF: ${err.message}`);
              }}
              className="shadow-lg"
              loading={
                <div className="flex flex-col items-center justify-center p-10 space-y-3">
                  <LoaderCircle className="h-8 w-8 animate-spin text-blue-950" />
                  <span className="text-gray-500 text-sm">
                    Mengunduh dokumen...
                  </span>
                </div>
              }
            >
              {Array.from(new Array(numPages), (el, index) => (
                <div key={`page_${index + 1}`} className="mb-4 last:mb-0">
                  <Page
                    pageNumber={index + 1}
                    className="max-w-full h-auto"
                    // Optional: Matikan render text layer agar lebih cepat jika hanya preview
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </div>
              ))}
            </Document>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 bg-white border-t border-gray-100 text-center">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-950 px-8 py-3 text-white font-bold hover:bg-blue-900 transition shadow-lg hover:shadow-xl transform active:scale-95 duration-100"
          >
            <Check className="h-5 w-5" />
            <span>Selesai & Tutup</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-auto max-w-md transition-all duration-500 ease-in-out z-[60] ${
          showBanner
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-10 scale-95 pointer-events-none"
        }`}
      >
        <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl flex items-center gap-4 shadow-2xl ring-4 ring-green-100">
          <div className="bg-green-100 p-2 rounded-full">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="font-bold text-sm">Berhasil!</p>
            <p className="text-sm text-green-700">
              Dokumen telah berhasil ditandatangani.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
