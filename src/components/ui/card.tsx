import { cn } from '@/lib/utils/cn'
export function Card({ className, ...props }:{ className?:string } & React.HTMLAttributes<HTMLDivElement>){
  return <div className={cn('card', className)} {...props} />
}