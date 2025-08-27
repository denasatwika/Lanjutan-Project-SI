import { ReactNode } from 'react'
export function FormField({ label, children }:{ label:string; children:ReactNode }){
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-gray-700">{label}</span>
      {children}
    </label>
  )
}