export function TokenMeter({ used, total }:{ used:number; total:number }){
  const pct = Math.min(100, Math.round((used/Math.max(1,total))*100))
  return (
    <div className="card p-4">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Leave Tokens</span><span>{total-used} left / {total}</span>
      </div>
      <div className="h-3 mt-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-[--accent]" style={{ width: pct+'%' }} />
      </div>
    </div>
  )
}