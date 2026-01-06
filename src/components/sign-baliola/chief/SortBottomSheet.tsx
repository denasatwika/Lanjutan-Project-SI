"use client";

import { X } from "lucide-react";

interface SortBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sortOrder: string;
  setSortOrder: (order: "newest" | "oldest" | "modified") => void;
}

const SortBottomSheet = ({
  isOpen,
  onClose,
  sortOrder,
  setSortOrder,
}: SortBottomSheetProps) => {
  if (!isOpen) return null;

  const options = [
    { key: "newest", label: "Terbaru" },
    { key: "oldest", label: "Terlama" },
    { key: "modified", label: "Terakhir diubah" },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/25 z-40 flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-t-2xl p-4 pt-5 shadow-lg animate-slide-up"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the sheet
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-gray-800">Urutkan Dokumen</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {options.map((option) => (
            <button
              key={option.key}
              onClick={() => {
                setSortOrder(option.key as "newest" | "oldest" | "modified");
                onClose();
              }}
              className={`w-full text-left p-3 rounded-lg font-semibold transition-colors ${
                sortOrder === option.key
                  ? "bg-blue-100 text-blue-800"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SortBottomSheet;
