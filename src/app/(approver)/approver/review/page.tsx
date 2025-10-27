'use client'
import Link from 'next/link'
import { useRequests } from '@/lib/state/requests'
import { RequestCard } from '@/components/RequestCard'

export default function Page(){
  const pending = useRequests(s=>s.all()).filter(r=>r.status==='pending')
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Review Requests</h1>
      <div className="space-y-3">
        {pending.map(r=> <RequestCard key={r.id} r={r} href={`/approver/requests/${r.id}`} />)}
      </div>
    </div>
  )
}
