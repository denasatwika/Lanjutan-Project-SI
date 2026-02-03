"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import {
    Search,
    Bell,
    SlidersHorizontal,
    LoaderCircle,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import MenungguAksi from "@/components/sign-baliola/chief/MenungguAksi";
import SortBottomSheet from "@/components/sign-baliola/chief/SortBottomSheet";
import { API_ENDPOINTS } from "@/lib/api/documents";
import { useAuth } from "@/lib/state/auth";

// Helper to format date
const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
};

// Helper to map status
const mapStatus = (status: string) => {
    switch (status.toLowerCase()) {
        case "signed":
            return "Tertandatangani";
        case "pending":
            return "Pending";
        case "rejected":
            return "Rejected";
        default:
            return status;
    }
};

// --- INTERFACE FOR DOCUMENT ---
interface Document {
    id: string;
    title: string;
    author: string;
    date: string;
    status: string;
    updatedAt: string | null;
}

const ITEMS_PER_PAGE = 5;

// --- MAIN PAGE COMPONENT ---
export default function ChiefHomePage() {
    const { user } = useAuth();
    const [activeFilter, setActiveFilter] = useState("menunggu");
    const [allDocuments, setAllDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "modified">(
        "newest"
    );
    const [isSortSheetOpen, setSortSheetOpen] = useState(false);

    useEffect(() => {
        if (!user?.id) return;

        const fetchDocuments = async () => {
            try {
                setLoading(true);
                setError(null);

                // --- PERUBAHAN 1: Ganti Endpoint ---
                const endpoint = API_ENDPOINTS.GET_CHIEF_DOCUMENTS_2;

                const response = await fetch(endpoint, {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        // "ngrok-skip-browser-warning": "true",
                    },
                });

                if (!response.ok) {
                    throw new Error("Gagal mengambil data dokumen dari server");
                }

                const data = await response.json();

                let documentsArray = [];
                // Menangani kemungkinan format response { data: [...] } atau [...]
                if (data && Array.isArray(data.data)) {
                    documentsArray = data.data;
                } else if (Array.isArray(data)) {
                    documentsArray = data;
                } else {
                    console.error("Format data dari API tidak terduga:", data);
                    documentsArray = []; // Fallback agar tidak crash
                }

                // --- PERUBAHAN 2: Sesuaikan Mapping Data ---
                // Endpoint /documents biasanya menggunakan 'id', sedangkan /signers mungkin 'documentId'
                // Kita pakai logika OR (||) untuk jaga-jaga.
                const formattedDocuments = documentsArray.map((doc: any) => ({
                    id: doc.id || doc.documentId,
                    title: doc.title,
                    // Note: Endpoint /documents mungkin tidak punya field 'uploaderName'.
                    // Jika kosong, kita isi default string atau ambil dari field lain jika ada.
                    author: doc.uploaderName || doc.author || "Pengguna",
                    date: formatDate(doc.createdAt),
                    status: mapStatus(doc.status),
                    updatedAt: doc.updatedAt || null,
                    documentUrl: doc.documentUrl || null,
                }));

                setAllDocuments(formattedDocuments);
            } catch (err: any) {
                console.error("Error fetching:", err); // Debugging
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, [user?.id]);

    // Memoized processed documents (filter, search, sort)
    const processedDocuments = useMemo(() => {
        let docs = [...allDocuments];

        // 1. Filter by active tab
        docs = docs.filter((doc) => {
            if (activeFilter === "menunggu") return doc.status === "Pending";
            if (activeFilter === "ditandatangani")
                return doc.status === "Tertandatangani";
            if (activeFilter === "ditolak") return doc.status === "Rejected";
            return false;
        });

        // 2. Filter by search query
        if (searchQuery) {
            docs = docs.filter(
                (doc) =>
                    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    doc.author.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // 3. Sort the documents
        docs.sort((a, b) => {
            if (sortOrder === "modified") {
                const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                return dateB - dateA; // Newest modified first
            }
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
        });

        return docs;
    }, [allDocuments, activeFilter, searchQuery, sortOrder]);

    // Pagination logic
    const totalPages = Math.ceil(processedDocuments.length / ITEMS_PER_PAGE);
    const currentDocuments = processedDocuments.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Reset to page 1 when filter or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter, searchQuery]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center p-10">
                    <LoaderCircle className="animate-spin h-8 w-8 text-blue-950" />
                </div>
            );
        }

        if (error) {
            return <div className="text-center text-red-500 p-10">{error}</div>;
        }

        if (currentDocuments.length === 0) {
            let message = "Tidak ada dokumen yang cocok dengan kriteria Anda.";
            if (!searchQuery) {
                if (activeFilter === "menunggu")
                    message = "Tidak ada dokumen yang menunggu aksi.";
                if (activeFilter === "ditandatangani")
                    message = "Tidak ada dokumen yang telah ditandatangani.";
                if (activeFilter === "ditolak")
                    message = "Tidak ada dokumen yang ditolak.";
            }
            return <p className="text-center text-gray-500 py-8">{message}</p>;
        }

        return <MenungguAksi documents={currentDocuments} />;
    };

    return (
        <div className="space-y-4">
            {/* Search and Action Buttons */}
            <div className="flex items-center justify-between gap-2">
                <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari dokumen atau pengirim..."
                        className="w-full bg-white border border-gray-200 rounded-full py-3 pl-11 pr-4 text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Link href="/approver/dokumen/notifications">
                    <div className="p-3 bg-white border border-gray-200 rounded-full hover:bg-gray-100">
                        <Bell className="h-5 w-5 text-gray-600" />
                    </div>
                </Link>
                <button
                    onClick={() => setSortSheetOpen(true)}
                    className={`p-3 rounded-full border transition-colors ${sortOrder !== "newest"
                        ? "bg-blue-100 border-blue-200"
                        : "bg-white border-gray-200 hover:bg-gray-100"
                        }`}
                >
                    <SlidersHorizontal
                        className={`h-5 w-5 ${sortOrder !== "newest" ? "text-blue-800" : "text-gray-600"
                            }`}
                    />
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 items-center gap-2">
                <button
                    onClick={() => setActiveFilter("menunggu")}
                    className={`px-4 py-2 text-sm font-semibold rounded-full shadow-sm transition-colors w-full ${activeFilter === "menunggu"
                        ? "text-white bg-blue-950"
                        : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-100"
                        }`}
                >
                    Menunggu
                </button>
                <button
                    onClick={() => setActiveFilter("ditandatangani")}
                    className={`px-4 py-2 text-sm font-semibold rounded-full shadow-sm transition-colors w-full ${activeFilter === "ditandatangani"
                        ? "text-white bg-blue-950"
                        : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-100"
                        }`}
                >
                    Selesai
                </button>
                <button
                    onClick={() => setActiveFilter("ditolak")}
                    className={`px-4 py-2 text-sm font-semibold rounded-full shadow-sm transition-colors w-full ${activeFilter === "ditolak"
                        ? "text-white bg-blue-950"
                        : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-100"
                        }`}
                >
                    Ditolak
                </button>
            </div>

            {/* Main Content */}
            <div className="space-y-3">{renderContent()}</div>

            {/* Pagination */}
            {!loading && !error && totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-4 pb-8">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-3 rounded-full bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="h-6 w-6 text-gray-700" />
                    </button>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-3 rounded-full bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="h-6 w-6 text-gray-700" />
                    </button>
                </div>
            )}

            <SortBottomSheet
                isOpen={isSortSheetOpen}
                onClose={() => setSortSheetOpen(false)}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
            />
        </div>
    );
}
