"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { getDocumentsByBatchId, Document } from "@/lib/api/documents";

function DraftPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const batchId = searchParams.get("batchId");

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) {
      setError("Batch ID tidak ditemukan di URL.");
      setIsLoading(false);
      return;
    }

    const fetchDocuments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data: any = await getDocumentsByBatchId(batchId);

        if (data && Array.isArray(data.documents)) {
          const draftDocuments = data.documents.filter(
            (doc: Document) => doc.status.toLowerCase() === "draft",
          );

          // 🔁 REDIRECT JIKA TIDAK ADA DOKUMEN
          if (draftDocuments.length === 0) {
            router.replace("/admin/dashboard/dokumen");
            return;
          }

          setDocuments(draftDocuments);
        } else {
          throw new Error(
            "Respons dari server tidak memiliki format yang diharapkan.",
          );
        }
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan saat memuat dokumen.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [batchId, router]);

  if (isLoading) {
    return (
      <div className="text-center p-10">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-950" />
        <p className="mt-4 text-gray-600">Memuat dokumen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-center">
        <AlertTriangle className="h-6 w-6 mr-3" />
        <div>
          <p className="font-bold">Terjadi Kesalahan</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500">
        <span>Beranda</span> / <span>Upload</span> /{" "}
        <span className="text-gray-800 font-medium">Draft</span>
      </div>

      <div className="bg-white rounded-2xl p-8">
        <div className="text-center border-b pb-6 mb-6">
          <CheckCircle size={60} className="inline-block text-green-500" />
          <h1 className="text-2xl font-bold mt-4">Upload Berhasil!</h1>
          <p className="text-gray-600 mt-2">
            Pilih dokumen di bawah ini untuk melanjutkan ke proses penentuan
            posisi tanda tangan.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Dokumen dalam Batch Ini:
          </h2>

          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex gap-3 items-center">
                <FileText size={36} className="text-blue-950" />
                <div>
                  <h3 className="text-md font-medium text-gray-900">
                    {doc.title || doc.filename}
                  </h3>
                  <p className="text-sm font-semibold text-orange-500">
                    Status: {doc.status}
                  </p>
                </div>
              </div>

              <Link
                href={`/admin/dashboard/dokumen/upload/signed?documentId=${doc.id}&batchId=${batchId}`}
              >
                <button className="flex items-center gap-1 rounded-lg bg-blue-950 text-white px-6 py-2.5 text-sm font-semibold hover:bg-blue-800 transition-colors w-full sm:w-auto justify-center">
                  Pilih Dokumen
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Suspense wrapper (WAJIB untuk useSearchParams)
export default function DraftPage() {
  return (
    <Suspense
      fallback={<div className="text-center p-10">Memuat halaman...</div>}
    >
      <DraftPageContent />
    </Suspense>
  );
}
