'use client'
import { useParams } from 'next/navigation'
import { useRequests } from '@/lib/state/requests'
import { ApproveRejectBar } from '@/components/ApproveRejectBar'

export default function Page(){
  const { id } = useParams<{id:string}>()
  const { byId, setStatus } = useRequests()
  const r = byId(id)
  if(!r) return <div>Not found</div>
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Request #{r.id}</h1>
      <pre className="card p-4 bg-gray-50 text-sm overflow-auto">{JSON.stringify(r,null,2)}</pre>
      <ApproveRejectBar onApprove={()=>setStatus(r.id,'approved')} onReject={()=>setStatus(r.id,'rejected')} />
    </div>
  )
}