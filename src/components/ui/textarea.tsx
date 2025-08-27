import { cn } from '@/lib/utils/cn'
export function Textarea({ className, ...props }:{ className?:string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>){
  return <textarea className={cn('min-h-[120px] rounded-xl border px-3 py-2 bg-white focus:ring-2 ring-[--accent]', className)} {...props} />
}