"use client";

import { useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Trash2, FileImage } from "lucide-react";

export interface UploadSignatureRef {
  getSignatureFile: () => File | null;
}

const UploadSignature = forwardRef<UploadSignatureRef>((props, ref) => {
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSignatureFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
    },
    maxFiles: 1,
  });

  useImperativeHandle(ref, () => ({
    getSignatureFile: () => {
      return signatureFile;
    },
  }));

  const handleRemove = () => {
    setSignatureFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
  };

  if (signatureFile && preview) {
    return (
      <div className="space-y-4">
        <div className="w-full h-56 bg-gray-100 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center p-4 relative">
          <img
            src={preview}
            alt="Pratinjau Tanda Tangan"
            className="max-w-full max-h-full object-contain"
          />
        </div>
        <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <FileImage className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-800 truncate">
              {signatureFile.name}
            </span>
          </div>
          <button
            onClick={handleRemove}
            className="p-2 rounded-full hover:bg-gray-200 flex-shrink-0"
          >
            <Trash2 className="h-5 w-5 text-red-500" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`w-full h-56 bg-gray-100 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center p-4 cursor-pointer transition ${
        isDragActive
          ? "border-blue-500 bg-blue-50"
          : "hover:bg-gray-200 hover:border-gray-400"
      }`}
    >
      <input {...getInputProps()} />
      <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
      <p className="text-lg font-semibold text-gray-700">Unggah Tanda Tangan</p>
      <p className="text-sm text-gray-500">
        {isDragActive
          ? "Lepaskan file di sini"
          : "Seret & lepas file PNG atau klik di sini"}
      </p>
    </div>
  );
});

UploadSignature.displayName = "UploadSignature";
export default UploadSignature;
