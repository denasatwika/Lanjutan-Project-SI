"use client";

import { Signature, Clock, Pencil, Send, Eye, Printer } from "lucide-react";
import Link from "next/link";

// Document interface
export interface Document {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string | null;
  uploaderName: string;
  batchId: string;
}

interface DokumenCardProps {
  doc: Document;
  onView: (id: number) => void;
}

const StatusBadge = ({ status }: { status: string }) => {
  const baseClasses = "px-3 py-1 text-xs font-medium rounded-full";
  const styles: { [key: string]: string } = {
    draft: "bg-orange-100 text-orange-800",
    pending: "bg-yellow-100 text-yellow-800",
    signed: "bg-blue-100 text-blue-800",
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

export default function DokumenCard({ doc, onView }: DokumenCardProps) {
  const displayDate = doc.updatedAt || doc.createdAt;
  const dateLabel = doc.updatedAt ? "Diperbarui" : "Dibuat";

  const renderActions = () => {
    switch (doc.status.toLowerCase()) {
      case "draft":
        return (
          <Link
            href={`/staff/upload/signed?documentId=${doc.id}&batchId=${doc.batchId}`}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium p-2 rounded-lg hover:bg-gray-100"
          >
            <Signature className="h-4 w-4" />
            Atur Tanda Tangan
          </Link>
        );
      case "pending":
        return (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium p-2 rounded-lg bg-green-50">
            <Send className="h-4 w-4" />
            Terkirim
          </span>
        );
      case "signed":
        return (
          <>
            <button
              onClick={() => onView(doc.id)}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium p-2 rounded-lg hover:bg-blue-50"
            >
              <Eye className="h-4 w-4" />
              Lihat
            </button>
            <button className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium p-2 rounded-lg hover:bg-gray-100">
              <Printer className="h-4 w-4" />
              Cetak
            </button>
          </>
        );
      case "rejected":
        return <p className="text-sm text-red-600 font-medium">Ditolak</p>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-800">{doc.title}</h3>
          <p className="text-sm text-gray-500 mt-1">Oleh: {doc.uploaderName}</p>
        </div>
        <StatusBadge status={doc.status} />
      </div>
      <div className="flex justify-between items-end mt-4">
        <div className="flex gap-2 items-center">{renderActions()}</div>
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
}
