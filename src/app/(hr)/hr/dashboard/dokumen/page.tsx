"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import StatCards from "@/components/sign-baliola/StatCards";
import DokumenCard, { Document } from "@/components/sign-baliola/DokumenCard";
import Pagination from "@/components/sign-baliola/Pagination";

/**
 * Dummy data generator
 * You can tweak the count, titles, and fields freely.
 */
const STATUSES = ["draft", "pending", "signed", "rejected"] as const;

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function makeDoc(
  id: number,
  title: string,
  status: (typeof STATUSES)[number],
  daysOld: number,
  extra?: Partial<Document>
): Document {
  // Provide common fields often used by a DokumenCard component.
  // If your DokumenCard expects additional fields, you can add them here.
  const base = {
    id: String(id),
    title,
    status,
    createdAt: daysAgo(daysOld),
    // Common optional fields (adjust freely)
    description:
      "Dokumen internal untuk keperluan administrasi. Silakan ditinjau sesuai alur kerja.",
    ownerName: ["Ayu", "Budi", "Citra", "Dewi", "Eka"][id % 5],
    fileUrl: "#",
    // Add anything else your DokumenCard uses:
    updatedAt: daysAgo(Math.max(0, daysOld - 1)),
    tags: ["Internal", "HR", status.toUpperCase()],
  };

  // Cast to Document to satisfy TypeScript even if your exported type is stricter.
  return { ...base, ...(extra ?? {}) } as unknown as Document;
}

const DUMMY_DOCUMENTS: Document[] = [
  makeDoc(1, "Surat Keterangan Kerja", "signed", 1),
  makeDoc(2, "Kontrak Kerja – Perpanjangan", "pending", 3),
  makeDoc(3, "Form Cuti Tahunan – Budi", "draft", 5),
  makeDoc(4, "Laporan Kehadiran Q3", "rejected", 8),
  makeDoc(5, "Perjanjian Kerahasiaan (NDA)", "signed", 10),
  makeDoc(6, "Form Lembur – Tim Operasional", "pending", 12),
  makeDoc(7, "SOP Onboarding Karyawan", "draft", 13),
  makeDoc(8, "Revisi Struktur Gaji 2025", "pending", 14),
  makeDoc(9, "SK Pengangkatan Sementara", "signed", 15),
  makeDoc(10, "Notulen Rapat HR Bulanan", "draft", 16),
  makeDoc(11, "Form Perubahan Data Karyawan", "rejected", 18),
  makeDoc(12, "Daftar Hadir Pelatihan", "signed", 20),
  makeDoc(13, "Template Evaluasi Kinerja", "draft", 22),
  makeDoc(14, "Form Cuti Melahirkan – Citra", "pending", 24),
  makeDoc(15, "Surat Peringatan Tahap I", "rejected", 25),
  makeDoc(16, "Pakta Integritas", "signed", 27),
  makeDoc(17, "Daftar Pengajuan Izin", "pending", 28),
  makeDoc(18, "Form Reimbursement Kesehatan", "draft", 29),
  makeDoc(19, "Serah Terima Aset", "signed", 30),
  makeDoc(20, "Form Mutasi Internal", "pending", 32),
  makeDoc(21, "Memo Kebijakan WFH", "draft", 35),
  makeDoc(22, "Checklist Exit Interview", "signed", 36),
  makeDoc(23, "Kontrak Vendor Rekrutmen", "rejected", 40),
];

export default function StaffDashboard() {
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const docsPerPage = 5;

  // On mount: simulate fetching with dummy data
  useEffect(() => {
    setIsLoading(true);

    // Simulate latency (optional). You can remove setTimeout for instant load.
    const t = setTimeout(() => {
      // Sort newest first (based on createdAt) — same behavior you had
      const sorted = [...DUMMY_DOCUMENTS].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAllDocuments(sorted);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(t);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (status: string | null) => {
    setActiveFilter(activeFilter === status ? null : status);
    setCurrentPage(1);
  };

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allDocuments
      .filter((doc) => (q ? doc.title.toLowerCase().includes(q) : true))
      .filter((doc) =>
        activeFilter ? doc.status.toLowerCase() === activeFilter : true
      );
  }, [allDocuments, searchQuery, activeFilter]);

  // Pagination
  const indexOfLastDoc = currentPage * docsPerPage;
  const indexOfFirstDoc = indexOfLastDoc - docsPerPage;
  const currentDocs = filteredDocuments.slice(indexOfFirstDoc, indexOfLastDoc);

  const FilterButton = ({
    status,
    label,
  }: {
    status: string;
    label: string;
  }) => (
    <button
      onClick={() => handleFilterChange(status)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        activeFilter === status
          ? "bg-blue-950 text-white"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="bg-blue-950 text-white rounded-2xl p-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <FileText className="w-16 h-16 opacity-20" />
          <div>
            <h1 className="text-3xl font-bold">Manajemen Dokumen</h1>
            <p className="text-blue-200 mt-1">
              Kelola dokumen internal Anda dan tinjau alur kerja.
            </p>
          </div>
        </div>
        <Link href="/staff/upload">
          <button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-5 rounded-lg transition-colors">
            <Plus className="h-5 w-5" />
            <span>Unggah Dokumen</span>
          </button>
        </Link>
      </div>

      {/* StatCards still receives the whole list */}
      <StatCards documents={allDocuments} />

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan judul dokumen..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full p-3 pl-10 bg-gray-50 rounded-lg border border-gray-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <FilterButton status="draft" label="Draft" />
            <FilterButton status="pending" label="Pending" />
            <FilterButton status="signed" label="Signed" />
            <FilterButton status="rejected" label="Reject" />
          </div>
        </div>
      </div>

      <div className="space-y-4 min-h-[500px]">
        {isLoading && <p className="text-center py-10">Memuat dokumen...</p>}
        {error && <p className="text-center text-red-500 py-10">{error}</p>}
        {!isLoading && !error && (
          <>
            {currentDocs.length > 0 ? (
              currentDocs.map((doc) => <DokumenCard key={doc.id} doc={doc} />)
            ) : (
              <p className="text-center text-gray-500 py-10">
                Tidak ada dokumen yang cocok dengan kriteria Anda.
              </p>
            )}
          </>
        )}
      </div>

      <Pagination
        docsPerPage={docsPerPage}
        totalDocs={filteredDocuments.length}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}