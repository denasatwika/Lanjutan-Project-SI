"use client";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";

type Izin = { id: number; jenis: "Cuti" | "Sakit" | "Lembur"; tanggal: string; status: "Menunggu" | "Disetujui" | "Ditolak"; alasan?: string; };

export default function Page() {
  const [list, setList] = useState<Izin[]>([
    { id: 1, jenis: "Cuti",  tanggal: "2025-08-12", status: "Disetujui", alasan: "Liburan" },
    { id: 2, jenis: "Sakit", tanggal: "2025-08-06", status: "Menunggu",  alasan: "Demam" },
  ]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ jenis: "Cuti", tanggal: "", alasan: "" });

  const submit = () => {
    const id = Math.max(0, ...list.map(l => l.id)) + 1;
    setList([{ id, jenis: form.jenis as any, tanggal: form.tanggal, status: "Menunggu", alasan: form.alasan }, ...list]);
    setFormOpen(false);
  };

  return (
    <div className="container pb-24 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Izin</h1>
        <button onClick={() => setFormOpen(true)} className="btn btn-primary">Buat Izin</button>
      </div>

      <div className="card p-0 mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr><th className="p-3">Jenis</th><th className="p-3">Tanggal</th><th className="p-3">Status</th><th className="p-3">Alasan</th></tr>
          </thead>
          <tbody>
            {list.map(item => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="p-3">{item.jenis}</td>
                <td className="p-3">{item.tanggal}</td>
                <td className="p-3">
                  <span className={
                    item.status === "Disetujui" ? "badge badge-green" :
                    item.status === "Menunggu"  ? "badge badge-amber" : "badge badge-slate"
                  }>{item.status}</span>
                </td>
                <td className="p-3">{item.alasan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center p-4 z-30">
          <div className="card w-full max-w-md p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Buat Izin</h3>
              <button onClick={() => setFormOpen(false)} className="text-slate-500">✕</button>
            </div>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-sm">Jenis</span>
                <select value={form.jenis} onChange={e => setForm(s => ({...s, jenis: e.target.value}))} className="w-full mt-1 rounded-xl border-slate-200">
                  <option>Cuti</option><option>Sakit</option><option>Lembur</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm">Tanggal</span>
                <input type="date" value={form.tanggal} onChange={e => setForm(s => ({...s, tanggal: e.target.value}))} className="w-full mt-1 rounded-xl border-slate-200" />
              </label>
              <label className="block">
                <span className="text-sm">Alasan</span>
                <textarea value={form.alasan} onChange={e => setForm(s => ({...s, alasan: e.target.value}))} className="w-full mt-1 rounded-xl border-slate-200" rows={3} />
              </label>
              <button onClick={submit} className="btn btn-primary w-full">Ajukan</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
