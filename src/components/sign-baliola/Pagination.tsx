"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  docsPerPage: number;
  totalDocs: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

export default function Pagination({
  docsPerPage,
  totalDocs,
  currentPage,
  setCurrentPage,
}: PaginationProps) {
  const pageNumbers = [];
  const totalPages = Math.ceil(totalDocs / docsPerPage);

  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  if (totalPages <= 1) {
    return null; // Don't render pagination if there's only one page
  }

  const handlePrev = () => {
    setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    setCurrentPage(currentPage + 1);
  };

  return (
    <nav className="flex justify-center items-center gap-4 mt-8">
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Previous</span>
      </button>

      <div className="flex items-center gap-2">
        {pageNumbers.map((number) => (
          <button
            key={number}
            onClick={() => setCurrentPage(number)}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              currentPage === number
                ? "bg-blue-950 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
            }`}
          >
            {number}
          </button>
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
