'use client'
import { useRequests } from '@/lib/state/requests'
import { RequestCard } from '@/components/RequestCard'

export default function Page(){
  const all = useRequests(s=>s.all())
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">All Requests</h1>
      <div className="space-y-3">
        {all.map(r=> <RequestCard key={r.id} r={r} href={`/approver/requests/${r.id}`} />)}
      </div>
    </div>
  )
}
