'use client'

import clsx from 'clsx'
import type { ReactNode } from 'react'

function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={clsx('inline-block size-2 rounded-full', className)}
      style={{ backgroundColor: color }}
    />
  )
}

function Pill({ bg, fg, children }: { bg: string; fg: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: bg, color: fg }}
    >
      {children}
    </span>
  )
}

/** Specific badges (match the mock) */
export function BadgePending() {
  return (
    <Pill bg="#FEF3C7" fg="#B45309">
      <Dot color="#F59E0B" /> Menunggu
    </Pill>
  )
}

export function BadgeSigned() {
  return (
    <Pill bg="#E0F2FE" fg="#0369A1">
      <Dot color="#0EA5E9" /> Signed
    </Pill>
  )
}

export function BadgeRejected() {
  return (
    <Pill bg="#FEE2E2" fg="#B91C1C">
      <Dot color="#EF4444" /> Ditolak
    </Pill>
  )
}

/** Optional: one-component version */
export function StatusBadge({ status }: { status: 'pending' | 'signed' | 'rejected' }) {
  if (status === 'pending') return <BadgePending />
  if (status === 'signed') return <BadgeSigned />
  return <BadgeRejected />
}
