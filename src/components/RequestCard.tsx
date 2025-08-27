import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatWhen } from '@/lib/utils/date'
import { Request } from '@/lib/types'

const statusColor: Record<Request['status'], string> = {
  draft: 'bg-gray-200 text-gray-800',
  pending: 'bg-yellow-200 text-yellow-900',
  approved: 'bg-green-200 text-green-900',
  rejected: 'bg-red-200 text-red-900',
}

export function RequestCard({ r, href }:{ r: Request; href: string }){
  return (
    <Link href={href} className="card p-4 flex items-center justify-between hover:shadow">
      <div>
        <div className="font-medium capitalize">{r.type}</div>
        <div className="text-xs text-gray-500">{formatWhen(r.createdAt)}</div>
      </div>
      <Badge className={statusColor[r.status]}>{r.status}</Badge>
    </Link>
  )
}