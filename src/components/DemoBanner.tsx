'use client'
import { useAuth } from '@/lib/state/auth'

export function DemoBanner({ compact }: { compact?: boolean }){
  const reset = useAuth(s=>s.resetDemo)
  return (
    <div className={`rounded-xl border ${compact? 'p-2 text-xs':'p-3'} bg-surface`}>
      <div>Demo data lives in your browser (localStorage). You can reset anytime.</div>
      <div className="mt-2">
        <button className="btn" onClick={reset}>Reset data</button>
      </div>
    </div>
  )
}