"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2, AlertTriangle } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api/documents";
import Cookies from "js-cookie";

interface Document {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string | null;
  uploaderName: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const baseClasses = "px-3 py-1 text-xs font-medium rounded-full";
  const styles = {
    rejected: "bg-red-100 text-red-800",
  };
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`${baseClasses} ${
        styles[status.toLowerCase()] || "bg-gray-100 text-gray-800"
      }`}
    >
      {statusText}
    </span>
  );
};

export default function Dokreject({
  documents: initialDocuments,
}: {
  documents?: Document[];
}) {
  const [documents, setDocuments] = useState<Document[]>(
    initialDocuments || []
  );
  const [isLoading, setIsLoading] = useState(!initialDocuments);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch if documents are not provided as props
    if (initialDocuments) return;

    const fetchDocuments = async () => {
      setIsLoading(true);
      setError(null);
      const token = Cookies.get("auth_token");

      try {
        const response = await fetch(API_ENDPOINTS.GET_ALL_DOCUMENTS, {
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (!response.ok) {
          throw new Error("Gagal mengambil data dokumen.");
        }

        const allDocuments: Document[] = await response.json();
        const rejectedDocs = allDocuments.filter(
          (doc) => doc.status.toLowerCase() === "rejected"
        );
        setDocuments(rejectedDocs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [initialDocuments]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-blue-950" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-center">
        <AlertTriangle className="h-6 w-6 mr-3" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.length > 0 ? (
        documents.map((doc) => {
          const displayDate = doc.updatedAt || doc.createdAt;
          const dateLabel = doc.updatedAt ? "Diperbarui" : "Dibuat";

          return (
            <div
              key={doc.id}
              className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800">{doc.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Oleh: {doc.uploaderName}
                  </p>
                </div>
                <StatusBadge status={doc.status} />
              </div>
              <div className="flex justify-between items-end mt-4">
                <div className="flex gap-2 items-center">
                  <p className="text-sm text-red-600 font-medium">Ditolak</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>
                    {dateLabel}:{" "}
                    {new Date(displayDate).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-center text-gray-500 py-6">
          Tidak ada dokumen yang ditolak.
        </p>
      )}
    </div>
  );
}
