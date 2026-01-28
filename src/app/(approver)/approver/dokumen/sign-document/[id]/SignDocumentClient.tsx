"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { X, Edit, LoaderCircle } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api/documents";
import Cookies from "js-cookie";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface DocumentData {
  documentId: number;
  documentTitle: string;
  pdfUrl: string;
  fields: any[];
}

interface User {
  id: number;
}

// The component no longer receives initialDocumentData
interface SignDocumentClientProps {
  id: string;
}

export default function SignDocumentClient({ id }: SignDocumentClientProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string>("");
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);

  const token = Cookies.get("auth_token");

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

  // This useEffect is now the primary data fetching logic
  useEffect(() => {
    const fetchDocument = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get user ID from localStorage, which is consistent with other pages
        const userString = localStorage.getItem("user");
        if (!userString) {
          throw new Error(
            "Sesi pengguna tidak ditemukan. Silakan login kembali."
          );
        }
        const user: User = JSON.parse(userString);
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
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || "Gagal mengambil data dokumen");
        }

        const data: DocumentData = await response.json();
        if (data.pdfUrl) {
          setPdfUrl(data.pdfUrl.replace("http://", "https://"));
        }
        setDocumentTitle(data.documentTitle);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
    // The dependency array is simplified
  }, [id, token]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <div className="fixed inset-0 bg-black/25 bg-opacity-60 flex items-center justify-center p-4 sm:p-6 z-50">
      <div className="bg-white w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 text-center relative">
          <h2 className="text-lg font-bold">
            {documentTitle || `Review Dokumen (ID: ${id})`}
          </h2>
          <Link
            href="/chief"
            className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-500 hover:text-gray-800"
          >
            <X className="h-6 w-6" />
          </Link>
        </div>

        {/* Document Preview */}
        <div className="flex-grow overflow-y-auto p-2 sm:p-4 bg-gray-200">
          <div className="w-full flex justify-center">
            {loading && (
              <div className="flex items-center justify-center h-full p-10">
                <LoaderCircle className="animate-spin h-8 w-8 text-blue-950" />
                <p className="ml-2">Memuat dokumen...</p>
              </div>
            )}
            {error && <p className="text-red-500 p-10">{error}</p>}
            {pdfUrl && !loading && !error && (
              <Document
                file={fileProp}
                onLoadSuccess={onDocumentLoadSuccess}
                className="shadow-lg"
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <div key={`page_${index + 1}`} className="mb-4">
                    <Page pageNumber={index + 1} />
                  </div>
                ))}
              </Document>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <Link
              href={`/chief/sign-document/${id}/reject`}
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-red-600 py-3 text-white font-bold hover:bg-red-700 transition"
            >
              <X className="h-5 w-5" />
              <span>Tolak Dokumen</span>
            </Link>
            <Link
              href={`/chief/sign-document/${id}/confirm`}
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-950 py-3 text-white font-bold hover:bg-blue-800 transition"
            >
              <Edit className="h-5 w-5" />
              <span>Tanda Tangani</span>
            </Link>
          </div>
          <div className="text-center mt-4">
            <Link
              href="/chief"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Kembali
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
