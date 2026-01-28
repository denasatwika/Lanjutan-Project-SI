"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
// import Cookies from "js-cookie";
import { Loader2, AlertTriangle, LoaderCircle } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Import API (Sesuaikan path ini dengan file api/signing.ts yang Anda buat)
import {
  API_ENDPOINTS,
  getDocumentById,
  updateDocument,
} from "@/lib/api/documents";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SignaturePosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DocumentData {
  id: string;
  batchId: string;
  title: string;
  filename: string;
  filePath?: string;
  documentUrl?: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
  updatedAt: string | null;
  uploadedByUserId: string;
  signatories: any[];
}

interface Signatory {
  userId: string;
  name: string;
  role: string;
}

interface PdfSignerProps {
  documentId: string;
  batchId: string;
}

export default function PdfSigner({ documentId, batchId }: PdfSignerProps) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [position, setPosition] = useState<SignaturePosition | null>(null);
  const [signer, setSigner] = useState("");
  const [document, setDocument] = useState<DocumentData | null>(null);

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfWorkerReady, setIsPdfWorkerReady] = useState(true); // State baru

  const [error, setError] = useState<string | null>(null);

  const signers: Signatory[] = [
    {
      userId: "96e386e0-6b37-4689-9f81-18a1ecb71f29",
      name: "Chief",
      role: "Chief",
    },
  ];

  // Options for PDF fetching
  const options = useMemo(
    () => ({
      withCredentials: true,
    }),
    [],
  );

  useEffect(() => {
    if (!documentId) {
      setError("Document ID tidak ditemukan.");
      setIsLoading(false);
      return;
    }

    const fetchDocument = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const documentData = await getDocumentById(documentId);
        setDocument(documentData as unknown as DocumentData);
      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError(err.message || "Gagal mengambil dokumen.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function handlePageClick(
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    pageNumber: number,
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const width = 192;
    const height = 96;

    setPosition({
      page: pageNumber,
      x: Math.round(x),
      y: Math.round(y),
      width,
      height,
    });
  }

  async function handleNext() {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!position || !signer) {
        alert("Harap tentukan posisi tanda tangan dan pilih penanda tangan.");
        return;
      }

      const selectedSigner = signers.find((s) => s.name === signer);
      if (!selectedSigner) {
        alert("Penanda tangan yang dipilih tidak valid.");
        return;
      }

      setIsSaving(true);

      try {
        // --- BAGIAN INI YANG DIGANTI ---
        // Kita panggil fungsi dari document.ts
        await updateDocument(documentId, {
          title: document?.title || "Dokumen Tanpa Judul",
          // PENTING: Key ini harus 'signers' agar Backend tidak Error 500
          signers: [
            {
              userId: selectedSigner.userId,
              position: { ...position },
            },
          ],
        });

        if (batchId) {
          router.push(
            `/admin/dashboard/dokumen/upload/draf?batchId=${batchId}`,
          );
        } else {
          router.push("/admin/dashboard/dokumen");
        }
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      } finally {
        setIsSaving(false);
      }
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
    } else {
      if (batchId) {
        router.push(`/admin/dashboard/dokumen/upload/draf?batchId=${batchId}`);
      } else {
        router.push("/admin/dashboard/dokumen/upload");
      }
    }
  }

  if (isLoading) {
    return (
      <div className="text-center p-10">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-950" />
        <p className="mt-4 text-gray-600">Memuat data dokumen...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-center">
        <AlertTriangle className="h-6 w-6 mr-3" />
        <div>
          <p className="font-bold">Terjadi Kesalahan</p>
          <p>{error || "Dokumen tidak ditemukan."}</p>
        </div>
      </div>
    );
  }

  // Gunakan endpoint VIEW_DOCUMENT yang benar dari API config baru
  const fileUrl =
    document.documentUrl ??
    API_ENDPOINTS.VIEW_DOCUMENT(document.filePath || "");

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500">
        <span>Beranda</span> / <span>Upload</span> /{" "}
        <span className="text-gray-800 font-medium">Signed</span>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        {/* STEP 1: PREVIEW */}
        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold text-blue-950">
              Langkah 1 dari 2: Pratinjau Dokumen
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Pastikan dokumen sudah benar sebelum melanjutkan.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
              <div className="lg:col-span-2 border rounded-xl bg-gray-50/50 overflow-auto h-[calc(100vh-20rem)] relative flex justify-center">
                {/* Fallback Loading Worker */}
                {!isPdfWorkerReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LoaderCircle className="animate-spin h-8 w-8 text-blue-950/50" />
                  </div>
                )}

                {/* Render PDF (Only if Worker Ready) */}
                {isPdfWorkerReady && (
                  <Document
                    file={fileUrl}
                    options={options}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(error) => {
                      console.error("PDF Load Error:", error);
                      alert("Gagal memuat PDF: " + error.message);
                    }}
                    className="shadow-sm"
                    loading={
                      <div className="flex items-center gap-2 mt-10 text-gray-400">
                        <LoaderCircle className="animate-spin h-5 w-5" />
                        <span>Memuat PDF...</span>
                      </div>
                    }
                  >
                    {Array.from(new Array(numPages), (el, index) => (
                      <div
                        key={`page_${index + 1}`}
                        className="border-b last:border-b-0 mb-4"
                      >
                        <Page pageNumber={index + 1} />
                      </div>
                    ))}
                  </Document>
                )}
              </div>

              <div className="lg:col-span-1 space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h3 className="font-semibold text-blue-950 mb-3">
                    Detail Dokumen
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">
                        Nama File
                      </label>
                      <p className="text-sm font-medium text-gray-800 break-all">
                        {document.filename}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">
                        Judul
                      </label>
                      <p className="text-sm font-medium text-gray-800">
                        {document.title}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">
                          Halaman
                        </label>
                        <p className="text-sm font-medium text-gray-800">
                          {numPages || "-"}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">
                          Ukuran
                        </label>
                        <p className="text-sm font-medium text-gray-800">
                          {(document.sizeBytes / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PLACEMENT */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h1 className="text-xl font-bold text-blue-950">
                Langkah 2 dari 2: Letakkan Tanda Tangan
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Klik area pada dokumen di bawah untuk menempatkan kotak tanda
                tangan.
              </p>

              <div className="border rounded-xl bg-gray-50/50 overflow-auto h-[calc(100vh-20rem)] mt-4 relative flex justify-center">
                {!isPdfWorkerReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LoaderCircle className="animate-spin h-8 w-8 text-blue-950/50" />
                  </div>
                )}

                {isPdfWorkerReady && (
                  <Document
                    file={fileUrl}
                    options={options}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="shadow-sm"
                  >
                    {Array.from(new Array(numPages), (el, index) => (
                      <div
                        key={`page_${index + 1}`}
                        onClick={(e) => handlePageClick(e, index + 1)}
                        className="relative cursor-crosshair border-b last:border-b-0 mb-4 group"
                      >
                        {/* Hover Hint */}
                        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors pointer-events-none z-10" />

                        <Page pageNumber={index + 1} />

                        {position && position.page === index + 1 && (
                          <div
                            className="absolute bg-blue-100/50 border-2 border-blue-600 shadow-lg z-20 flex items-center justify-center"
                            style={{
                              left: `${position.x - position.width / 2}px`,
                              top: `${position.y - position.height / 2}px`,
                              width: position.width,
                              height: position.height,
                            }}
                            title="Posisi Tanda Tangan"
                          >
                            <span className="text-blue-800 font-bold text-xs bg-white/80 px-2 py-1 rounded">
                              TTD di Sini
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </Document>
                )}
              </div>
            </div>

            <div className="lg:col-span-1 self-start space-y-6">
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                <h3 className="font-bold text-blue-950 mb-4">
                  Konfigurasi TTD
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      Koordinat
                    </label>
                    {position ? (
                      <div className="text-sm text-gray-700 bg-white p-2 rounded border">
                        <div className="flex justify-between">
                          <span>Halaman:</span> <b>{position.page}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>X:</span> <span>{position.x}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Y:</span> <span>{position.y}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic bg-white p-2 rounded border border-dashed">
                        Belum ada posisi dipilih.
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="signer"
                      className="text-xs font-semibold text-gray-500 uppercase block mb-1"
                    >
                      Pilih Penanda Tangan
                    </label>
                    <select
                      id="signer"
                      value={signer}
                      onChange={(e) => setSigner(e.target.value)}
                      className="w-full p-2.5 bg-white rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    >
                      <option value="" disabled>
                        -- Pilih User --
                      </option>
                      {signers.map((s) => (
                        <option key={s.userId} value={s.name}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-8 mt-4 border-t border-gray-100">
          <button
            onClick={handleBack}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 rounded-lg bg-white border border-gray-300 py-3 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition"
          >
            Kembali
          </button>
          <button
            onClick={handleNext}
            disabled={
              isSaving ||
              !isPdfWorkerReady ||
              (step === 2 && (!position || !signer))
            }
            className="w-full sm:w-auto flex-1 rounded-lg bg-blue-950 py-3 text-white font-medium hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/20"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {step === 1
              ? "Lanjutkan ke Penempatan"
              : isSaving
                ? "Menyimpan Perubahan..."
                : "Simpan & Selesai"}
          </button>
        </div>
      </div>
    </div>
  );
}
