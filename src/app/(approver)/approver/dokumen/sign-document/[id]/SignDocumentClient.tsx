"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { X, Edit, LoaderCircle, CheckCircle } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api/documents";
import Cookies from "js-cookie";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentSessionData {
  id: string;
  title: string;
  pdfUrl: string;
  fields: any[];
}

interface UserSignature {
  id: number;
  signatureImagePath: string;
}

// The component no longer receives initialDocumentData
interface SignDocumentClientProps {
  id: string;
}

export default function SignDocumentClient({ id }: SignDocumentClientProps) {
  const router = useRouter();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [documentData, setDocumentData] = useState<DocumentSessionData | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [mySignature, setMySignature] = useState<UserSignature | null>(null);

  const isAllSigned = useMemo(() => {
    if (!documentData?.fields || documentData.fields.length === 0) return false;
    return documentData.fields.every((f) => f.signed);
  }, [documentData?.fields]);

  const fileProp = useMemo(() => {
    if (!documentData?.pdfUrl) return null;

    console.log("Request PDF ke:", documentData.pdfUrl);

    return {   
      url: documentData.pdfUrl,
      withCredentials: true,
      httpHeaders: {
        // "ngrok-skip-browser-warning": "true",
      },
    };
  }, [documentData?.pdfUrl]);

  // This useEffect is now the primary data fetching logic
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(API_ENDPOINTS.GET_DOCUMENT_TO_SIGN(id), {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Gagal memuat dokumen.");
        const docData = await response.json();
        
        setDocumentData({
          id: docData.documentId || docData.data?.documentId,
          title: docData.documentTitle || docData.data?.documentTitle,
          pdfUrl: docData.pdfUrl || docData.data?.pdfUrl, 
          fields: docData.fields || docData.data?.fields || []
        });

      } catch (err: any) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
    };
    if (id) initData();
  }, [id]);

  const goToConfirmPage = () => {
      router.push(`/chief/sign-document/${id}/confirm`);
  };

  const handleFieldClick = (field: any) => {
      if (field.signed) return;
      goToConfirmPage();
  };

  const handleFooterButton = () => {
      if (isAllSigned) {
          router.push('/chief');
      } else {
          goToConfirmPage();
      }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPdfError(null);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 sm:p-6 z-50">
      <div className="bg-white w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] rounded-2xl shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 text-center relative">
          <h2 className="text-lg font-bold">
            {documentData?.title || `Review Dokumen`}
          </h2>
          <Link href="/chief" className="absolute top-1/2 right-4 -translate-y-1/2">
            <X className="h-6 w-6 text-gray-500 hover:text-gray-800" />
          </Link>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-4 bg-gray-200 min-h-[300px]">
          <div className="w-full flex justify-center relative">
            {(loading) && <LoaderCircle className="animate-spin h-10 w-10 text-blue-900 mt-10" />}
            {error && <div className="text-red-500 mt-10">{error}</div>}

            {!loading && !error && fileProp && (
              <Document
                file={fileProp}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                className="shadow-lg"
              >
                {Array.from(new Array(numPages), (el, index) => {
                  const pageNumber = index + 1;
                  const fieldsOnPage = documentData?.fields?.filter(f => f.page === pageNumber);

                  return (
                    <div key={`page_${pageNumber}`} className="mb-4 relative">
                      <Page pageNumber={pageNumber} className="block" renderTextLayer={false} renderAnnotationLayer={false} />

                      {fieldsOnPage?.map((field) => (
                        <div
                          key={field.id}
                          onClick={() => handleFieldClick(field)}
                          style={{
                            position: "absolute",
                            top: `${field.y}px`, left: `${field.x}px`,
                            width: `${field.width}px`, height: `${field.height}px`,
                            zIndex: 10,
                          }}
                          className={`
                            flex items-center justify-center transition-all duration-200
                            ${field.signed 
                                ? "border-transparent cursor-default"
                                : "border-2 border-dashed border-blue-600 bg-blue-100/30 cursor-pointer hover:bg-blue-100/50 hover:scale-105 shadow-sm"
                            }
                          `}
                        >
                           {/* Jika sudah signed */}
                           {field.signed && (
                              <div className="w-full h-full relative group">
                                  <img 
                                      src={field.signatureImageUrl} 
                                      alt="Signed" 
                                      className="w-full h-full object-contain" 
                                  />
                                  <div className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow">
                                      <CheckCircle className="h-4 w-4 text-green-600 fill-white" />
                                  </div>
                              </div>
                           )}

                           {/* Jika belum signed */}
                           {!field.signed && (
                              <div className="text-center opacity-70">
                                  <span className="text-blue-800 font-semibold text-xs bg-white/70 px-2 py-1 rounded shadow-sm">
                                      Klik untuk TTD
                                  </span>
                              </div>
                           )}
                        </div>
                      ))}
                    </div>
                  );
                })}
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

