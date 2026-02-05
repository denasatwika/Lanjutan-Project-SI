"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ArrowLeft, LoaderCircle, AlertTriangle } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api/documents";
import Cookies from "js-cookie";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
        // Using the same endpoint as the sign page to get document details
          const response = await fetch(API_ENDPOINTS.GET_DOCUMENT_TO_SIGN(id), {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          });

        if (!response.ok) {
            if (response.status === 401) throw new Error("Sesi berakhir.");
            if (response.status === 404) throw new Error("Dokumen tidak ditemukan.");
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || "Gagal mengambil data dokumen");
        }

        const data = await response.json();

        const finalPdfUrl = data.pdfUrl || data.data?.pdfUrl;
        const finalTitle = data.documentTitle || data.data?.documentTitle;

        if (finalPdfUrl) {
          setPdfUrl(finalPdfUrl.replace("http://", "https://"));
        }
        setDocumentTitle(finalTitle || `Dokumen (ID: ${id})`);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  const fileProp = useMemo(() => {
    if (!pdfUrl) return null;
    return {
      url: pdfUrl,
      withCredentials: true,
      httpHeaders: {
        // "ngrok-skip-browser-warning": "true",
      },
    };
  }, [pdfUrl]);

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
