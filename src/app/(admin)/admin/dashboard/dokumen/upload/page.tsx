"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Loader2, Upload, File as FileIcon, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { uploadDocuments } from "@/lib/api/documents";
import { toast } from "sonner";
import { useAuth } from "@/lib/state/auth";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const onDrop = (acceptedFiles: File[]) => {
    if (isUploading) return;

    const validatedFiles = acceptedFiles.filter((file) => {
      if (file.type !== "application/pdf") {
        toast.error("Hanya file PDF yang didukung.");
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} terlalu besar. Maksimal 10 MB.`);
        return false;
      }
      return true;
    });

    setFiles((prev) => {
      const newFiles = [...prev, ...validatedFiles];
      if (newFiles.length > 5) {
        toast.warning("Maksimal hanya 5 file PDF.");
        return newFiles.slice(0, 5);
      }
      return newFiles;
    });
  };

  const removeFile = (fileToRemove: File) => {
    if (isUploading) return;
    setFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.info("Silakan pilih file terlebih dahulu.");
      return;
    }

    if (!user?.id) {
      toast.error("Sesi pengguna tidak ditemukan. Silakan login ulang.");
      router.push("/login");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("documentFiles", file);
    });
    formData.append("uploadedByUserId", user.id);

    try {
      const [result] = await Promise.all([
        uploadDocuments(formData),
        delay(1000),
      ]);

      toast.success("Dokumen berhasil diunggah!");

      if (result.batchId) {
        router.push(
          `/admin/dashboard/dokumen/upload/draf?batchId=${result.batchId}`,
        );
      } else {
        router.push("/admin/dashboard/dokumen");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat upload.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { "application/pdf": [".pdf"] },
    disabled: isUploading,
  });

  return (
    <div className="pb-8 relative">
      <PageHeader
        title="Unggah Dokumen"
        subtitle="Tambahkan dokumen baru untuk diproses dalam alur kerja."
        backHref="/admin/dashboard/dokumen"
        bg="var(--B-950)"
      />

      <div className="max-w-4xl mx-auto px-5 mt-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-md border p-8">
          <div
            {...getRootProps()}
            className={`w-full rounded-lg border-2 border-dashed p-12 text-center transition ${
              isUploading
                ? "opacity-50 cursor-not-allowed"
                : isDragActive
                  ? "border-blue-600 bg-blue-50 cursor-pointer"
                  : "border-gray-300 bg-white hover:border-gray-400 cursor-pointer"
            }`}
          >
            <input {...getInputProps()} />
            <Upload size={50} className="mx-auto text-blue-950 opacity-80" />
            <p className="text-gray-700 font-semibold mt-2">
              Seret file ke sini atau klik untuk pilih
            </p>
            <p className="text-sm text-gray-500">
              PDF | Maksimal 5 file, 10 MB / file
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-800 mb-3">
                File yang akan diunggah:
              </h3>
              <ul className="space-y-3">
                {files.map((file, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-5 w-5 text-blue-950" />
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                      <button
                        onClick={() => removeFile(file)}
                        disabled={isUploading}
                        className="p-1 rounded-full hover:bg-red-100 disabled:opacity-50"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0}
            className="mt-6 w-full rounded-lg bg-blue-950 py-3 text-white font-semibold hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Mengunggah...
              </>
            ) : (
              "Unggah dan Proses"
            )}
          </button>
        </div>
      </div>

      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl px-6 py-5 flex flex-col items-center gap-3 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-blue-950" />
            <p className="text-sm font-medium text-gray-700">
              Mengunggah dan memproses dokumen...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}