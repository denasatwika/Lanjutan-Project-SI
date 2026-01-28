import { cn } from '@/lib/utils/cn'
export function Badge({ className, ...props }:{ className?:string } & React.HTMLAttributes<HTMLSpanElement>){
  return <span className={cn('badge bg-gray-200 text-gray-900', className)} {...props} />
}