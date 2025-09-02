'use client'

import { useMemo, useRef, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { toast } from 'sonner'

export default function Page() {
  const [form, setForm] = useState<{
    tanggal: string
    mulai: string
    selesai: string
    alasan: string
    lampiran: File | null
  }>({
    tanggal: '',
    mulai: '',
    selesai: '',
    alasan: '',
    lampiran: null,
  })

  const fileRef = useRef<HTMLInputElement | null>(null)

  // Durasi otomatis (dukung lewat tengah malam)
  const durasiJam = useMemo(() => {
    const { tanggal, mulai, selesai } = form
    if (!tanggal || !mulai || !selesai) return 0
    const s = new Date(`${tanggal}T${mulai}:00`)
    let e = new Date(`${tanggal}T${selesai}:00`)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0
    if (e.getTime() < s.getTime()) e = new Date(e.getTime() + 86400000) // +1 hari
    const h = (e.getTime() - s.getTime()) / 3.6e6
    return Math.round(h * 100) / 100
  }, [form.tanggal, form.mulai, form.selesai])

  const durasiLabel = useMemo(() => {
    const totalMin = Math.round(durasiJam * 60)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    if (!h && !m) return '0 jam'
    if (!m) return `${h} jam`
    if (!h) return `${m} menit`
    return `${h} jam ${m} menit`
  }, [durasiJam])

  const valid =
    !!form.tanggal &&
    !!form.mulai &&
    !!form.selesai &&
    form.alasan.trim().length > 0 &&
    durasiJam > 0 &&
    durasiJam <= 24

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
      fd.append('tanggal', form.tanggal)
      fd.append('jamMulai', form.mulai)
      fd.append('jamSelesai', form.selesai)
      fd.append('durasiJam', String(durasiJam))
      fd.append('alasan', form.alasan)
      if (form.lampiran) fd.append('lampiran', form.lampiran)

      // TODO: sambungkan ke API kamu
      // await fetch('/api/lembur', { method: 'POST', body: fd })

      toast.success('Pengajuan lembur terkirim')
      setForm({ tanggal: '', mulai: '', selesai: '', alasan: '', lampiran: null })
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      toast.error('Gagal mengajukan lembur')
    }
  }

  const isImg = form.lampiran?.type.startsWith('image/')
  const previewUrl = form.lampiran && isImg ? URL.createObjectURL(form.lampiran) : null

  return (
    <div className="pb-24">
      <PageHeader
        title="Pengajuan Lembur"
        backHref="/employee/dashboard"
        fullBleed
        bleedMobileOnly
        pullUpPx={24}
      />

      {/* CONTENT */}
      <div className="mx-auto max-w-screen-sm px-4 mt-3 md:max-w-2xl">
        <div className="rounded-2xl bg-white shadow-md border p-4">
          <div className="grid gap-4 text-[15px]">
            {/* Tanggal */}
            <label className="block">
              <span className="text-sm text-gray-700">Tanggal lembur</span>
              <input
                type="date"
                value={form.tanggal}
                onChange={e => setForm(s => ({ ...s, tanggal: e.target.value }))}
                className="w-full mt-1 rounded-xl border px-3 py-3"
              />
            </label>

            {/* Jam mulai & selesai */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-gray-700">Jam mulai</span>
                <input
                  type="time"
                  value={form.mulai}
                  onChange={e => setForm(s => ({ ...s, mulai: e.target.value }))}
                  className="w-full mt-1 rounded-xl border px-3 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700">Jam selesai</span>
                <input
                  type="time"
                  value={form.selesai}
                  onChange={e => setForm(s => ({ ...s, selesai: e.target.value }))}
                  className="w-full mt-1 rounded-xl border px-3 py-3"
                />
              </label>
            </div>

            {/* Durasi otomatis */}
            <div className="rounded-xl border px-3 py-2 text-gray-600">
              Total durasi: <span className="font-semibold text-gray-800">{durasiJam.toFixed(2)} jam</span>
              <div className="text-xs text-gray-500">{durasiLabel}</div>
            </div>

            {/* Alasan */}
            <label className="block">
              <span className="text-sm text-gray-700">Alasan lembur</span>
              <textarea
                rows={5}
                value={form.alasan}
                onChange={e => setForm(s => ({ ...s, alasan: e.target.value }))}
                className="w-full mt-1 rounded-xl border px-3 py-3"
                placeholder="Contoh: penyelesaian fitur, perbaikan bug produksi, dsb."
              />
            </label>

            {/* Lampiran */}
            <div>
              <span className="text-sm text-gray-700">Dokumen bukti (opsional)</span>
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
                Ajukan Lembur
            </button>
          </div>
        </div>
      </div>

      {/* spacer supaya konten tidak ketutup bar di mobile */}
      <div className="h-24 md:hidden" />
    </div>
  )
}
