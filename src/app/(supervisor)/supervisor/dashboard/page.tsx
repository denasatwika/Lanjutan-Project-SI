'use client'
import { useRequests } from '@/lib/state/requests'
import { StatCard } from '@/components/StatCard'

export default function Page(){
  const all = useRequests(s=>s.all())
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Team Overview</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Pending" value={all.filter(r=>r.status==='pending').length} />
        <StatCard label="Approved" value={all.filter(r=>r.status==='approved').length} />
        <StatCard label="Rejected" value={all.filter(r=>r.status==='rejected').length} />
      </div>
    </div>
  )
}