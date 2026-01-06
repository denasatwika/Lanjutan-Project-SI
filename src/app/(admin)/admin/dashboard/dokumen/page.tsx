"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Settings,
  Calendar,
  X,
  Filter,
  Check,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import StatCards from "@/components/sign-baliola/staf/dashboard/StatCards";
import DokumenCard, {
  Document,
} from "@/components/sign-baliola/staf/dashboard/DokumenCard";
import Pagination from "@/components/sign-baliola/staf/dashboard/Pagination";
import { API_ENDPOINTS } from "@/lib/api/documents";
import Cookies from "js-cookie";
import dynamic from "next/dynamic";

const ViewDocumentModal = dynamic(
  () => import("@/components/sign-baliola/staf/dashboard/ViewDocumentModal"),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="flex flex-col items-center justify-center h-full p-10">
          <LoaderCircle className="animate-spin h-8 w-8 text-white" />
          <p className="mt-4 text-gray-300">Memuat pratinjau dokumen...</p>
        </div>
      </div>
    ),
  }
);

export default function StaffDashboard() {
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [viewingDocId, setViewingDocId] = useState<number | null>(null);
  const [appliedActiveFilter, setAppliedActiveFilter] = useState<string | null>(
    null
  );
  const docsPerPage = 5;

  useEffect(() => {
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

        const data: Document[] = await response.json();
        const sortedData = data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setAllDocuments(sortedData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleApplyFilters = () => {
    setAppliedSearchQuery(searchQuery);
    setAppliedActiveFilter(activeFilter);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setActiveFilter(null);
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    setAppliedSearchQuery("");
    setAppliedActiveFilter(null);
    setAppliedStartDate("");
    setAppliedEndDate("");
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (status: string | null) => {
    setActiveFilter(activeFilter === status ? null : status);
  };

  const filteredDocuments = allDocuments
    .filter((doc) =>
      doc.title.toLowerCase().includes(appliedSearchQuery.toLowerCase())
    )
    .filter((doc) =>
      appliedActiveFilter
        ? doc.status.toLowerCase() === appliedActiveFilter
        : true
    )
    .filter((doc) => {
      if (!appliedStartDate || !appliedEndDate) return true;
      const docDate = new Date(doc.createdAt);
      const start = new Date(appliedStartDate);
      const end = new Date(appliedEndDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return docDate >= start && docDate <= end;
    });

  // Pagination logic
  const indexOfLastDoc = currentPage * docsPerPage;
  const indexOfFirstDoc = indexOfLastDoc - docsPerPage;
  const currentDocs = filteredDocuments.slice(indexOfFirstDoc, indexOfLastDoc);

  const filterOptions = [
    {
      status: "draft",
      label: "Draft",
      color: "bg-gray-100 text-gray-700 border-gray-300",
      activeColor: "bg-gray-700 text-white border-gray-700",
    },
    {
      status: "pending",
      label: "Pending",
      color: "bg-yellow-50 text-yellow-700 border-yellow-300",
      activeColor: "bg-yellow-600 text-white border-yellow-600",
    },
    {
      status: "signed",
      label: "Signed",
      color: "bg-green-50 text-green-700 border-green-300",
      activeColor: "bg-green-600 text-white border-green-600",
    },
    {
      status: "rejected",
      label: "Rejected",
      color: "bg-red-50 text-red-700 border-red-300",
      activeColor: "bg-red-600 text-white border-red-600",
    },
  ];

  const hasActiveFilters = activeFilter || startDate || endDate;

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
        <Link href="/admin/dashboard/dokumen/upload">
          <button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-5 rounded-lg transition-colors">
            <Plus className="h-5 w-5" />
            <span>Unggah Dokumen</span>
          </button>
        </Link>
      </div>

      <StatCards documents={allDocuments} />

      {/* Modern Filter Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Search Bar */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan judul dokumen..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full py-3 pl-12 pr-4 bg-gray-50 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none transition-all duration-200"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 px-6 font-semibold transition-all duration-200 ${
                showFilters
                  ? "bg-blue-950 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Filter className="h-5 w-5" />
              <span className="hidden sm:inline">Filter</span>
              {hasActiveFilters && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {[activeFilter, startDate, endDate].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            showFilters ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
            {/* Status Filters */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-950 rounded-full"></div>
                  Status Dokumen
                </label>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Clear All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filterOptions.map((option) => (
                  <button
                    key={option.status}
                    onClick={() => handleFilterChange(option.status)}
                    className={`relative px-4 py-3 text-sm font-semibold rounded-xl border-2 transition-all duration-200 ${
                      activeFilter === option.status
                        ? option.activeColor + " shadow-md scale-105"
                        : option.color + " hover:scale-105 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {activeFilter === option.status && (
                        <Check className="h-4 w-4" />
                      )}
                      <span>{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="mb-6">
              <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-950 rounded-full"></div>
                Rentang Tanggal
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    className="w-full py-3 pl-12 pr-4 bg-white rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-all duration-200"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Tanggal Awal"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    className="w-full py-3 pl-12 pr-4 bg-white rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-all duration-200"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Tanggal Akhir"
                  />
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApplyFilters}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-950 to-blue-800 py-3.5 px-6 text-white font-semibold hover:from-blue-900 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Search className="h-5 w-5" />
              <span>Terapkan Filter</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 min-h-[500px]">
        {isLoading && <p className="text-center py-10">Memuat dokumen...</p>}
        {error && <p className="text-center text-red-500 py-10">{error}</p>}
        {!isLoading && !error && (
          <>
            {currentDocs.length > 0 ? (
              currentDocs.map((doc) => (
                <DokumenCard key={doc.id} doc={doc} onView={setViewingDocId} />
              ))
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

      <ViewDocumentModal
        documentId={viewingDocId}
        onClose={() => setViewingDocId(null)}
      />
    </div>
  );
}
