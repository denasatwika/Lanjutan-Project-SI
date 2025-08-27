import { cn } from '@/lib/utils/cn'
export function Input({ className, ...props }:{ className?:string } & React.InputHTMLAttributes<HTMLInputElement>){
  return <input className={cn('h-10 rounded-xl border px-3 outline-none focus:ring-2 ring-[--accent] bg-white', className)} {...props}/>
}