'use client'

import { useMemo } from 'react'
import { useDocuments } from '../../../../../lib/state/documents'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import { FileText, Plus, TrendingUp } from 'lucide-react'
import Link from 'next/link'

function fDate(iso: string){ return format(new Date(iso), 'yyyy-MM-dd', { locale: idLocale }) }

export default function DashboardDokumen(){
  const docs = useDocuments(s => s.docs)

  // KPI
  const totalAll = docs.length
  const totalRejected = docs.filter(d=> d.status==='rejected').length
  const totalSigned   = docs.filter(d=> d.status==='signed').length
  const totalDocsDup  = totalAll // per instruksi kamu: kartu ke-4 gunakan total dokumen juga

  const latest = useMemo(() => [...docs].sort((a,b)=> b.updatedAt.localeCompare(a.updatedAt)).slice(0,3), [docs])

  return (
    <div className="space-y-4">
      {/* HERO */}
      <section className="rounded-2xl overflow-hidden">
        <div className="relative p-5 md:p-6 text-white" style={{ backgroundColor: '#00156B' }}>
          {/* ilustrasi placeholder kiri */}
          <div className="absolute left-0 top-0 h-full w-48 md:w-64 opacity-20 pointer-events-none bg-gradient-to-br from-white/30 to-white/0" />
          <div className="relative flex items-center gap-4">
            <div className="hidden md:block size-14 rounded-xl bg-white/10 grid place-items-center">
              <FileText />
            </div>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-extrabold">Manajemen Dokumen</h1>
              <p className="text-white/80 text-sm">Kelola dokumen internal Anda dan tinjau alur kerja</p>
            </div>
            <Link
              href="/hr/documents/upload"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold shadow-md"
              style={{ backgroundColor: '#FE0000' }}
            >
              <Plus size={18} /> Unggah Dokumen
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Dokumen" value={totalAll} delta="+10 sejak bulan lalu" deltaColor="green" />
        <StatCard title="Ditolak"        value={totalRejected} delta="+14 sejak minggu lalu" deltaColor="red"  mini="red" />
        <StatCard title="Ditandatangani" value={totalSigned}   delta="+30 sejak minggu lalu" deltaColor="green" mini="green" />
        <StatCard title="Total Dokumen"  value={totalDocsDup}  delta="+10 sejak bulan lalu" deltaColor="green" />
      </section>

      {/* LIST TERBARU */}
      <section className="rounded-2xl bg-white shadow-md border">
        <div className="px-5 py-4 text-lg font-bold">Dokumen Terbaru</div>
        <div className="px-3 pb-3 space-y-3">
          {latest.map((d)=> (
            <DocRow key={d.id} doc={d} />
          ))}
        </div>
      </section>
    </div>
  )
}

/* ===== UI Bits ===== */

function StatCard({
  title, value, delta, deltaColor, mini,
}: {
  title: string
  value: number
  delta: string
  deltaColor: 'green'|'red'
  mini?: 'green'|'red'
}){
  const deltaCls = deltaColor === 'green' ? 'text-green-600' : 'text-rose-600'
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="font-semibold text-gray-700">{title}</div>
        {/* icon placeholder */}
        <div className="size-8 rounded-lg bg-gray-50 grid place-items-center text-gray-400">≡</div>
      </div>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>

      {/* mini bars */}
      {mini && (
        <div className="mt-2 h-16 flex items-end gap-2">
          {[30, 50, 40, 70, 45].map((h,i)=>(
            <div key={i}
              className={mini==='green' ? 'bg-green-200' : 'bg-rose-200'}
              style={{ width: 10, height: h }}
            />
          ))}
        </div>
      )}

      <div className={`mt-2 text-sm ${deltaCls}`}>↑ {delta}</div>
    </div>
  )
}

import type { Doc } from '../../../../../lib/state/documents'
import { BadgePending, BadgeSigned, BadgeRejected } from '../../../../../components/ui/StatusBadges'
import { ArrowRight } from 'lucide-react'

function DocRow({ doc }: { doc: Doc }){
  const Status = doc.status === 'pending' ? <BadgePending/> : doc.status === 'signed' ? <BadgeSigned/> : <BadgeRejected/>

  return (
    <div className="rounded-xl border px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-lg bg-[var(--B-50)] text-[var(--B-800)] grid place-items-center">
            <FileText size={18}/>
          </div>
          <div>
            <div className="font-semibold">Surat Kontrak Karyawan</div>
            <div className="text-sm text-gray-500">{doc.owner}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {Status}
          <div className="hidden sm:flex items-center gap-2">
            {doc.status === 'pending' && (
              <>
                <button className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">Ubah</button>
                <button className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">Terkirim</button>
              </>
            )}
            {doc.status === 'signed' && (
              <>
                <button className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">Lihat</button>
                <button className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">Cetak</button>
              </>
            )}
          </div>
          <button className="sm:hidden rounded-lg border p-2 text-gray-600"><ArrowRight size={16}/></button>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500">Diperbarui: {fDate(doc.updatedAt)}</div>
    </div>
  )
}
