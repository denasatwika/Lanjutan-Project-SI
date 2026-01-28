"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { LoaderCircle, AlertCircle } from "lucide-react";
import Cookies from "js-cookie";
import { API_ENDPOINTS } from "@/lib/api/documents";
import DrawCanvas, { DrawCanvasRef } from "@/components/sign-baliola/chief/DrawCanvas";
import UploadSignature, {
    UploadSignatureRef,
} from "@/components/sign-baliola/chief/UploadSignature";

interface SignatureData {
    id: number;
    signatureImageUrl: string;
}

// --- MAIN PAGE COMPONENT ---
export default function UploadSignaturePage() {
    const [activeTab, setActiveTab] = useState("draw");
    const [signatureData, setSignatureData] = useState<SignatureData | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const drawCanvasRef = useRef<DrawCanvasRef>(null);
    const uploadSignatureRef = useRef<UploadSignatureRef>(null);

    const userId = 2; // Hardcoded user ID

    // Check for existing signature on mount
    useEffect(() => {
        const checkSignature = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const token = Cookies.get("auth_token");

                const response = await fetch(API_ENDPOINTS.GET_USER_SIGNATURE(userId), {
                    headers: {
                        "ngrok-skip-browser-warning": "true",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        setSignatureData(null); // No signature found, which is a valid state
                        return;
                    }
                    throw new Error("Gagal memeriksa tanda tangan");
                }

                const result = await response.json();
                if (result.data && result.data.length > 0) {
                    setSignatureData(result.data[0]);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        checkSignature();
    }, []);

    const handleSave = async () => {
        setIsUploading(true);
        setError(null);
        const token = Cookies.get("auth_token");

        try {
            let response;
            if (activeTab === "draw") {
                // Handle canvas saving
                const dataUrl = drawCanvasRef.current?.getSignatureDataURL();
                if (!dataUrl) {
                    throw new Error(
                        "Tanda tangan belum digambar. Silakan gambar terlebih dahulu."
                    );
                }

                // The server expects the full Data URL with the key `signatureBase64`.
                response = await fetch(API_ENDPOINTS.SAVE_CANVAS_SIGNATURE, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "ngrok-skip-browser-warning": "true",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ userId, signatureBase64: dataUrl }),
                });
            } else {
                // Handle file upload saving
                const signatureFile = uploadSignatureRef.current?.getSignatureFile();
                if (!signatureFile) {
                    throw new Error(
                        "File tanda tangan belum diunggah. Silakan unggah file terlebih dahulu."
                    );
                }

                const formData = new FormData();
                formData.append("userId", String(userId));
                formData.append("signatureFile", signatureFile, signatureFile.name);

                response = await fetch(API_ENDPOINTS.UPLOAD_SIGNATURE, {
                    method: "POST",
                    body: formData,
                    headers: {
                        "ngrok-skip-browser-warning": "true",
                        Authorization: `Bearer ${token}`,
                    },
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Gagal mengunggah tanda tangan");
            }

            const newSignature = await response.json();
            setSignatureData({
                id: newSignature.id,
                signatureImageUrl:
                    newSignature.signatureImageUrl ||
                    `${API_ENDPOINTS.API_BASE_URL}/api/signatures/view/${newSignature.signatureImagePath}`,
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    // --- RENDER LOGIC ---
    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-20">
                <LoaderCircle className="animate-spin h-10 w-10 text-blue-950" />
            </div>
        );
    }

    if (signatureData) {
        return (
            <div className="max-w-md mx-auto text-center">
                <h1 className="text-2xl font-bold text-gray-900">Tanda Tangan Anda</h1>
                <p className="text-gray-500 mt-1 mb-6">
                    Tanda tangan ini sudah tersimpan di dalam sistem.
                </p>
                <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
                    <Image
                        src={signatureData.signatureImageUrl}
                        alt="Tanda Tangan Tersimpan"
                        width={200}
                        height={50}
                        className="mx-auto object-contain"
                        unoptimized // Required for ngrok/external images without domain config
                    />
                </div>
                <button
                    onClick={() => setSignatureData(null)} // Allow user to replace signature
                    className="mt-6 w-full rounded-lg bg-gray-200 py-3 text-gray-800 font-bold hover:bg-gray-300 transition"
                >
                    Ganti Tanda Tangan
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">
                    Masukan Tanda Tangan
                </h1>
                <p className="text-gray-500 mt-1">
                    Anda belum memiliki tanda tangan di dalam sistem.
                </p>
            </div>

            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab("draw")}
                    className={`px-6 py-3 font-semibold transition-colors ${activeTab === "draw"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Gambar
                </button>
                <button
                    onClick={() => setActiveTab("upload")}
                    className={`px-6 py-3 font-semibold transition-colors ${activeTab === "upload"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Unggah
                </button>
            </div>

            <div className="mb-6">
                {activeTab === "draw" && <DrawCanvas ref={drawCanvasRef} />}
                {activeTab === "upload" && <UploadSignature ref={uploadSignatureRef} />}
            </div>

            <div className="text-center">
                {error && (
                    <div className="flex items-center justify-center gap-2 text-red-600 mb-4 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                    </div>
                )}
                <p className="text-xs text-gray-400 max-w-md mx-auto mb-6">
                    Tanda tangan Anda akan diunggah dan disimpan secara aman.
                </p>
                <button
                    onClick={handleSave}
                    disabled={isUploading}
                    className="w-full max-w-xs mx-auto rounded-lg bg-blue-950 py-3 text-white font-bold hover:bg-blue-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isUploading && (
                        <LoaderCircle className="animate-spin h-5 w-5 mr-2" />
                    )}
                    {isUploading ? "Menyimpan..." : "Simpan"}
                </button>
            </div>
        </div>
    );
}
