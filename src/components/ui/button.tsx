import { cn } from '@/lib/utils/cn'
export function Button({ className, ...props }:{ className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>){
  return <button className={cn('btn', className)} {...props} />
}