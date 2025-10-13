"use client";
import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";

export default function Page() {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      });
      const json = await res.json();
      setStatus(json?.ok ? `Saved: ${json.filename}` : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container pb-24 pt-6">
      <h1 className="text-2xl font-semibold">Check-In</h1>
      <p className="text-slate-600 mt-1">Ambil foto sebagai bukti kehadiran.</p>

      <div className="mt-4 card p-4">
        <CameraCapture onCapture={setPreview} />
        {preview && (
          <div className="mt-4">
            <div className="text-sm text-slate-600 mb-2">Preview</div>
            <img src={preview} alt="preview" className="w-full rounded-2xl border border-slate-200" />
            <button onClick={submit} disabled={busy} className="btn btn-primary w-full mt-3">
              {busy ? "Menyimpan..." : "Simpan Check-In"}
            </button>
          </div>
        )}
        {status && <div className="mt-3 text-sm">{status}</div>}
      </div>

    </div>
  );
}
