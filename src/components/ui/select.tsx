import { cn } from '@/lib/utils/cn'
export function Select({ className, ...props }:{ className?:string } & React.SelectHTMLAttributes<HTMLSelectElement>){
  return <select className={cn('h-10 rounded-xl border px-3 bg-white focus:ring-2 ring-[--accent]', className)} {...props} />
}