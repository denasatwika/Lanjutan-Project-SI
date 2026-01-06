"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const PdfSigner = dynamic(() => import("@/components/sign-baliola/PdfSigner"), {
  ssr: false,
  loading: () => (
    <div className="text-center p-10">
      <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-950" />
      <p className="mt-4 text-gray-600">Memuat komponen PDF...</p>
    </div>
  ),
});

function SignedPageContent() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("documentId");
  const batchId = searchParams.get("batchId");

  if (!documentId || !batchId) {
    return (
      <div className="text-center p-10 text-red-600">
        Error: ID Dokumen atau ID Batch tidak ditemukan di URL.
      </div>
    );
  }

  return <PdfSigner documentId={documentId} batchId={batchId} />;
}

export default function SignedPdfPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center p-10">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-950" />
          <p className="mt-4 text-gray-600">Memuat halaman...</p>
        </div>
      }
    >
      <SignedPageContent />
    </Suspense>
  );
}
