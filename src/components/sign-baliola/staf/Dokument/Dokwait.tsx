"use client";

import { Pencil, Send, Clock } from "lucide-react";

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
    pending: "bg-yellow-100 text-yellow-800",
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

export default function Dokwait({ documents }: { documents: Document[] }) {
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
                <div className="flex gap-2">
                  {doc.status.toLowerCase() === "pending" && (
                    <>
                      <button className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium p-2 rounded-lg hover:bg-gray-100">
                        <Pencil className="h-4 w-4" />
                        Ubah
                      </button>
                      <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium p-2 rounded-lg bg-green-50">
                        <Send className="h-4 w-4" />
                        Terkirim
                      </span>
                    </>
                  )}
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
          Tidak ada dokumen yang sedang menunggu.
        </p>
      )}
    </div>
  );
}
