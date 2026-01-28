"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ArrowLeft, LoaderCircle, AlertTriangle } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/config";
import Cookies from "js-cookie";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface ViewDocumentClientProps {
  id: string;
}

export default function ViewDocumentClient({ id }: ViewDocumentClientProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = Cookies.get("auth_token");

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) return;

      setLoading(true);
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

        if (!token) {
          throw new Error("Otentikasi gagal: Token tidak ditemukan.");
        }

        // Using the same endpoint as the sign page to get document details
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

        const data = await response.json();
        if (data.pdfUrl) {
          setPdfUrl(data.pdfUrl.replace("http://", "https://"));
        }
        setDocumentTitle(data.documentTitle || `Dokumen (ID: ${id})`);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, token]);

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] rounded-2xl shadow-2xl flex flex-col">
        <div className="flex-shrink-0 p-4 border-b border-gray-200 text-center relative">
          <h2 className="text-lg font-bold text-blue-950">{documentTitle}</h2>
        </div>

        <div className="flex-grow overflow-y-auto p-2 sm:p-4 bg-gray-100">
          <div className="w-full flex justify-center">
            {loading && (
              <div className="flex flex-col items-center justify-center h-full p-10">
                <LoaderCircle className="animate-spin h-8 w-8 text-blue-950" />
                <p className="mt-4 text-gray-600">Memuat dokumen...</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center h-full p-10">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <p className="mt-4 text-red-600">{error}</p>
              </div>
            )}
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

        <div className="flex-shrink-0 p-4 bg-gray-50 border-t border-gray-200 text-center">
          <Link
            href={`/chief`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-950 px-6 py-3 text-white font-bold hover:bg-blue-800 transition"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Kembali</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
