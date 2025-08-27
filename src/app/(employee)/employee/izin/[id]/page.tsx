'use client'
import { useParams } from 'next/navigation'
import { useRequests } from '@/lib/state/requests'
import { formatWhen } from '@/lib/utils/date'

export default function Page(){
  const { id } = useParams<{id:string}>()
  const r = useRequests(s=>s.byId(id))
  if(!r) return <div className="text-sm text-gray-600">Request not found</div>
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Request Detail</h1>
      <div className="card p-4 grid gap-2">
        <div><span className="text-gray-500">Type:</span> <span className="capitalize font-medium">{r.type}</span></div>
        <div><span className="text-gray-500">Status:</span> <span className="font-medium">{r.status}</span></div>
        <div><span className="text-gray-500">Created:</span> {formatWhen(r.createdAt)}</div>
        <pre className="bg-gray-50 rounded-xl p-3 text-sm overflow-auto">{JSON.stringify(r.payload,null,2)}</pre>
      </div>
    </div>
  )
}