import { cn } from '@/lib/utils/cn'
export function StatCard({label, value, hint, className}:{label:string; value:string|number; hint?:string; className?:string}){
  return (
    <div className={cn('card p-4', className)}>
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </div>
  )
}