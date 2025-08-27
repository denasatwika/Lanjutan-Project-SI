// app/(employee)/employee/izin/new/page.tsx
'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/lib/state/auth'
import { useRequests } from '@/lib/state/requests'
import { useRouter } from 'next/navigation'

const schema = z.object({
  kind: z.enum(['izin','cuti','lembur']),       // izin/cuti = leave, lembur = overtime
  // leave fields
  start: z.string().optional(),
  end: z.string().optional(),
  // overtime fields
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().min(3, 'Masukkan alasan'),
})

type Form = z.infer<typeof schema>

export default function CreateRequestPage() {
  const { user } = useAuth()
  const create = useRequests(s => s.create)
  const router = useRouter()
  const { register, handleSubmit, watch, formState:{ errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { kind:'izin' }})

  const kind = watch('kind')

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((v)=>{
        if(v.kind === 'lembur'){
          const r = create(user!.id, 'overtime', {
            date: v.date, startTime: v.startTime, endTime: v.endTime, reason: v.reason,
          })
          router.push(`/employee/izin`)   // back to Izin page
        } else {
          const r = create(user!.id, 'leave', {
            kind: v.kind, start: v.start, end: v.end, reason: v.reason,
          })
          router.push(`/employee/izin`)
        }
      })}
    >
      <h1 className="text-xl font-bold">Pengajuan Baru</h1>

      <label className="grid gap-1 text-sm">
        <span className="text-gray-700">Jenis</span>
        <select className="h-10 rounded-xl border px-3 bg-white focus:ring-2 ring-[--accent]" {...register('kind')}>
          <option value="izin">Izin</option>
          <option value="cuti">Cuti</option>
          <option value="lembur">Lembur (Overtime)</option>
        </select>
      </label>

      {kind !== 'lembur' && (
        <>
          <label className="grid gap-1 text-sm">
            <span className="text-gray-700">Awal Izin/Cuti</span>
            <input type="date" className="h-10 rounded-xl border px-3" {...register('start')}/>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-gray-700">Akhir Izin/Cuti</span>
            <input type="date" className="h-10 rounded-xl border px-3" {...register('end')}/>
          </label>
        </>
      )}

      {kind === 'lembur' && (
        <>
          <label className="grid gap-1 text-sm">
            <span className="text-gray-700">Tanggal Lembur</span>
            <input type="date" className="h-10 rounded-xl border px-3" {...register('date')}/>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-gray-700">Mulai</span>
              <input type="time" className="h-10 rounded-xl border px-3" {...register('startTime')}/>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-gray-700">Selesai</span>
              <input type="time" className="h-10 rounded-xl border px-3" {...register('endTime')}/>
            </label>
          </div>
        </>
      )}

      <label className="grid gap-1 text-sm">
        <span className="text-gray-700">Alasan</span>
        <textarea className="min-h-[120px] rounded-xl border px-3 py-2" placeholder="Tulis alasan..." {...register('reason')}/>
        {errors.reason && <span className="text-sm text-red-600">{errors.reason.message}</span>}
      </label>

      <button className="btn btn-primary">Kirim Pengajuan</button>
    </form>
  )
}
