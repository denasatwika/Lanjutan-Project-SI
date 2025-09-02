'use client'

import { useMemo, useRef, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { toast } from 'sonner'

type Jenis = 'Cuti' | 'Sakit' | 'Lembur' | 'Lainnya'

export default function Page() {
  const [form, setForm] = useState<{
    jenis: Jenis
    dari: string
    sampai: string
    alasan: string
    lampiran: File | null
  }>({
    jenis: 'Cuti',
    dari: '',
    sampai: '',
    alasan: '',
    lampiran: null,
  })

  const fileRef = useRef<HTMLInputElement | null>(null)

  const hari = useMemo(() => {
    if (!form.dari || !form.sampai) return 0
    const a = new Date(form.dari)
    const b = new Date(form.sampai)
    const diff = Math.ceil((b.getTime() - a.getTime()) / 86400000) + 1
    return isNaN(diff) || diff < 0 ? 0 : diff
  }, [form.dari, form.sampai])

  const valid =
    !!form.dari &&
    !!form.sampai &&
    new Date(form.dari) <= new Date(form.sampai) &&
    form.alasan.trim().length > 0

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setForm(s => ({ ...s, lampiran: f }))
  }
  function clearFile() {
    setForm(s => ({ ...s, lampiran: null }))
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit() {
    if (!valid) return
    try {
      const fd = new FormData()
      fd.append('jenis', form.jenis)
      fd.append('tanggalMulai', form.dari)
      fd.append('tanggalSelesai', form.sampai)
      fd.append('alasan', form.alasan)
      if (form.lampiran) fd.append('lampiran', form.lampiran)

      // TODO: sambungkan ke API kamu
      // await fetch('/api/izin', { method: 'POST', body: fd })

      toast.success('Pengajuan izin terkirim')
      setForm({ jenis: 'Cuti', dari: '', sampai: '', alasan: '', lampiran: null })
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      toast.error('Gagal mengajukan izin')
    }
  }

  const isImg = form.lampiran?.type.startsWith('image/')
  const previewUrl = form.lampiran && isImg ? URL.createObjectURL(form.lampiran) : null

  return (
    <div className="pb-24">
      <PageHeader
        title="Pengajuan Izin"
        backHref="/employee/dashboard"
        fullBleed
        bleedMobileOnly
        pullUpPx={24}
      />

      {/* CONTENT */}
      <div className="mx-auto max-w-screen-sm px-4 mt-3 md:max-w-2xl">
        <div className="rounded-2xl bg-white shadow-md border p-4">
          <div className="grid gap-4 text-[15px]">
            {/* Jenis */}
            <label className="block">
              <span className="text-sm text-gray-700">Jenis izin</span>
              <select
                value={form.jenis}
                onChange={e => setForm(s => ({ ...s, jenis: e.target.value as Jenis }))}
                className="w-full mt-1 rounded-xl border px-3 py-3"
              >
                <option value="Cuti">Cuti</option>
                <option value="Sakit">Sakit</option>
                <option value="Lembur">Lembur</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </label>

            {/* Rentang tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-gray-700">Tanggal mulai</span>
                <input
                  type="date"
                  value={form.dari}
                  onChange={e => setForm(s => ({ ...s, dari: e.target.value }))}
                  className="w-full mt-1 rounded-xl border px-3 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700">Tanggal selesai</span>
                <input
                  type="date"
                  value={form.sampai}
                  onChange={e => setForm(s => ({ ...s, sampai: e.target.value }))}
                  className="w-full mt-1 rounded-xl border px-3 py-3"
                />
              </label>
            </div>
            {form.dari && form.sampai && new Date(form.dari) > new Date(form.sampai) && (
              <div className="text-sm text-rose-600 -mt-2">
                Tanggal selesai tidak boleh lebih awal dari tanggal mulai.
              </div>
            )}

            {/* Ringkasan hari */}
            <div className="rounded-xl border px-3 py-2 text-gray-600">
              Total: <span className="font-semibold text-gray-800">{hari}</span> hari
            </div>

            {/* Alasan */}
            <label className="block">
              <span className="text-sm text-gray-700">Alasan izin</span>
              <textarea
                rows={5}
                value={form.alasan}
                onChange={e => setForm(s => ({ ...s, alasan: e.target.value }))}
                className="w-full mt-1 rounded-xl border px-3 py-3"
                placeholder="Contoh: acara keluarga, kontrol dokter, dll."
              />
            </label>

            {/* Lampiran */}
            <div>
              <span className="text-sm text-gray-700">Lampiran (opsional)</span>
              <div className="mt-1 flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={onPickFile}
                  className="rounded-xl border px-3 py-2"
                />
                {form.lampiran && (
                  <button onClick={clearFile} type="button" className="rounded-xl border px-3 py-2 text-sm">
                    Hapus
                  </button>
                )}
              </div>
              {form.lampiran && (
                <div className="mt-3">
                  {isImg ? (
                    <img src={previewUrl || ''} alt="Preview" className="max-h-40 rounded-xl border" />
                  ) : (
                    <div className="text-sm text-gray-600">
                      {form.lampiran.name} ({Math.round((form.lampiran.size || 0) / 1024)} KB)
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
                onClick={submit}
                disabled={!valid}
                className="w-full inline-flex items-center justify-center rounded-xl px-4 py-3 text-white font-semibold shadow-md disabled:opacity-60"
                style={{ background: '#16A34A' }}
            >
                Ajukan Izin
            </button>
          </div>
        </div>
      </div>

      {/* spacer supaya konten tidak ketutup bar di mobile */}
      <div className="h-24 md:hidden" />
    </div>
  )
}
