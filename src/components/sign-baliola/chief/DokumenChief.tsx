"use client";
import { FileText, Clock, Eye, Pencil } from "lucide-react";
import Link from "next/link";

const StatusBadge = ({ status }: { status: string }) => {
  const styles: { [key: string]: string } = {
    Pending: "bg-yellow-100 text-yellow-800",
    Tertandatangani: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`px-3 py-1 text-xs font-medium rounded-full ${styles[status]}`}
    >
      {status}
    </span>
  );
};

const DokumenChief = ({ doc }: { doc: any }) => (
  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
    <div className="flex flex-col sm:flex-row justify-between items-start">
      <div className="flex items-center gap-4 w-full">
        <div className="bg-blue-50 p-3 rounded-lg">
          <FileText className="h-6 w-6 text-blue-800" />
        </div>
        <div className="flex-grow">
          <h3 className="font-bold text-gray-800 text-lg">{doc.title}</h3>
          <p className="text-sm text-gray-500">Oleh: {doc.author}</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
            <Clock className="h-3 w-3" />
            <span>{doc.date}</span>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 mt-4 sm:mt-0 sm:ml-4">
        <StatusBadge status={doc.status} />
      </div>
    </div>
    <div className="flex justify-end items-center mt-4 pt-4 border-t border-gray-100">
      <div className="flex gap-2">
        <Link href={`/approver/dokumen/view/${doc.id}`} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg font-semibold">
          <Eye className="h-4 w-4" />
          <span>Lihat</span>
        </Link>
        {doc.status === "Pending" && (
          <Link
            href={`/approver/dokumen/sign-document/${doc.id}`}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-950 hover:bg-blue-800 rounded-lg font-semibold"
          >
            <Pencil className="h-4 w-4" />
            <span>Tanda Tangan</span>
          </Link>
        )}
      </div>
    </div>
  </div>
);

export default DokumenChief;
