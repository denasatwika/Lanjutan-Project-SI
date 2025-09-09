// Place this file at: app/(employee)/employee/izin/page.tsx
// If your repo uses /src, path is: src/app/(employee)/employee/izin/page.tsx

'use client'
import Link from 'next/link'
import { useMemo } from 'react'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import { ChevronLeft, FileText, Clock3, Check, CircleAlert, ChevronRight } from 'lucide-react'
import type { Request } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'

const TOKENS = { cuti: 12, izin: 3, lembur: 6 }

function StatusPill({ s }:{ s: Request['status'] }){
  const map: Record<Request['status'], string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  return <span className={`px-3 py-1 rounded-full text-xs font-medium ${map[s]}`}>{s[0].toUpperCase()+s.slice(1)}</span>
}

function prettyDate(iso?: string){
  if(!iso) return '-'
  return format(new Date(iso), 'd MMMM yyyy', { locale: idLocale })
}

export default function IzinPage(){
  const user = useAuth(s=>s.user)!
  const all = useRequests(s=>s.forUser(user.id))

  const { cutiLeft, izinLeft, lemburLeft } = useMemo(()=>{
    // NOTE: We try to read payload.kind for leave category; fallback to counting as 'izin'.
    const usedCuti = all.filter(r=> r.type==='leave' && ['approved','pending'].includes(r.status) && (r.payload?.kind==='cuti')).length
    const usedIzin = all.filter(r=> r.type==='leave' && ['approved','pending'].includes(r.status) && (r.payload?.kind!=='cuti')).length
    const usedLembur = all.filter(r=> r.type==='overtime' && ['approved','pending'].includes(r.status)).length
    return {
      cutiLeft: Math.max(0, TOKENS.cuti - usedCuti),
      izinLeft: Math.max(0, TOKENS.izin - usedIzin),
      lemburLeft: Math.max(0, TOKENS.lembur - usedLembur)
    }
  },[all])

  const history = useMemo(()=> [...all].sort((a,b)=> b.createdAt.localeCompare(a.createdAt)), [all])

  return (
    <div className="space-y-6">
      {/* Top curved header */}
      <PageHeader
        title="Izin"
        backHref="/employee/dashboard"
        fullBleed
        bleedMobileOnly    // <-- key line
        pullUpPx={24}      // cancels AppShell pt-6
      />

      <div className="max-w-6xl mx-auto px-5">
        {/* Dompet Token */}
        <h2 className="text-2xl font-extrabold mb-3">Dompet Token</h2>
        <div className="rounded-2xl p-4 text-white shadow-md" style={{ 
          background: 'linear-gradient(135deg, var(--S-800) 0%, var(--R-500a) 100%)'
        }}>
          <div className="grid grid-cols-3 gap-3">
            <TokenTile label="Cuti" value={cutiLeft} color="var(--B-500)"/>
            <TokenTile label="Izin" value={izinLeft} color="#F59E0B"/>
            <TokenTile label="Lembur" value={lemburLeft} color="#22C55E"/>
          </div>
        </div>

        {/* Pengajuan */}
        <h3 className="text-2xl font-extrabold mt-6 mb-3">Pengajuan</h3>
        <div className="grid grid-cols-2 gap-4">
          <ActionCard
            icon={<FileText className="size-5 text-amber-600" />}
            title="Ajukan Izin"
            desc="Pakai token izinmu."
            href="/employee/izin/new/leave"
            bgColor="bg-[#F7DDB7]"   // izin → soft yellow
          />
          <ActionCard
            icon={<Clock3 className="size-5 text-green-600" />}
            title="Ajukan Lembur"
            desc="Klaim token lembur."
            href="/employee/izin/new/overtime"
            bgColor="bg-[#DCFCE7]"   // lembur → soft green
          />
        </div>

        {/* Riwayat */}
        <h3 className="text-2xl font-extrabold mt-6 mb-3">Riwayat</h3>
        <div className="space-y-3">
          {history.map(r=> (
            <div key={r.id} className="card p-4 flex gap-3 items-start">
              <div className="shrink-0 size-10 rounded-full grid place-items-center" style={{ background: r.type==='leave' ? 'rgba(245, 158, 11, .15)' : 'rgba(34,197,94,.15)' }}>
                {r.type==='leave' ? <CircleAlert className="size-5 text-amber-500"/> : <Check className="size-5 text-green-600"/>}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold">Pengajuan {r.type==='leave'? 'Izin' : 'Lembur'}</h4>
                  <StatusPill s={r.status} />
                </div>
                <div className="text-sm text-gray-500">{prettyDate(r.createdAt)}</div>
                <div className="mt-2 text-sm text-gray-700 space-y-1">
                  {r.type==='leave' ? (
                    <>
                      {r.payload?.start && <div>Awal Izin : {prettyDate(r.payload.start)}</div>}
                      {r.payload?.end && <div>Akhir Izin : {prettyDate(r.payload.end)}</div>}
                      {r.payload?.reason && <div>Alasan Izin : {r.payload.reason}</div>}
                    </>
                  ) : (
                    <>
                      {r.payload?.date && <div>Tanggal Lembur : {prettyDate(r.payload.date)}</div>}
                      {(r.payload?.startTime || r.payload?.endTime) && <div>Jam Lembur : {r.payload.startTime ?? '--:--'} - {r.payload.endTime ?? '--:--'}</div>}
                      {r.payload?.reason && <div>Alasan Lembur : {r.payload.reason}</div>}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TokenTile({ label, value, color }:{ label:string; value:number; color:string }){
  return (
    <div className="rounded-xl bg-white/10 p-4 border border-white/20 backdrop-blur">
      <div className="w-8 h-8 grid place-items-center rounded-full text-sm font-bold" style={{ color, background:'white' }}>{value}</div>
      <div className="mt-3 font-semibold">{label}</div>
    </div>
  )
}

type ActionCardProps = {
  icon: React.ReactNode
  title: string
  desc: string
  href: string
  className?: string
  bgColor?: string
}

function ActionCard({ icon, title, desc, href, bgColor = 'bg-gray-50', className }: ActionCardProps) {
  return (
    <Link
      href={href}
      aria-label={title}
      className="group relative block rounded-2xl p-4 bg-white border border-[#00156B] shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className={`size-10 rounded-full grid place-items-center shrink-0 ${bgColor}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-extrabold leading-tight">{title}</div>
          <div className="text-xs text-gray-500 leading-snug">{desc}</div>
        </div>

        <ChevronRight
          aria-hidden
          className="ml-auto mt-1 size-4 text-[#00156B] opacity-90 transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  )
}
