"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

export default function DokBerhasil() {
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-col gap-3 rounded-xl border-2 border-violet-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3 items-center">
          <FileText size={36} />
          <div>
            <h3 className="text-md font-medium text-gray-900">
              Dokumen Pengumuman
            </h3>
            <p className="text-sm text-green-600">Upload Berhasil</p>
          </div>
        </div>
        <Link href="/edit">
          <button className="flex items-center gap-1 rounded-xl border bg-blue-950 text-white px-20 py-3 text-sm hover:bg-blue-600 transition-colors">
            Pilih
          </button>
        </Link>
      </div>
    </div>
  );
}
