import clsx from 'clsx'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale/id'
import type { Request } from '@/lib/types'

export function formatDateTime(iso: string | undefined) {
  if (!iso) return '-'
  return format(new Date(iso), 'd MMM yyyy • HH:mm', { locale: idLocale })
}

export function formatDateOnly(iso?: string | null) {
  if (!iso) return '-'
  return format(new Date(iso), 'd MMM yyyy', { locale: idLocale })
}

export function StatusPill({ status }: { status: Request['status'] }) {
  const map: Record<Request['status'], string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-rose-100 text-rose-700',
  }
  const label =
    status === 'pending'
      ? 'Menunggu'
      : status === 'approved'
      ? 'Approved'
      : status === 'rejected'
      ? 'Rejected'
      : 'Draft'

  return (
    <span className={clsx('px-3 py-1 rounded-full text-xs font-semibold', map[status])}>
      {label}
    </span>
  )
}
