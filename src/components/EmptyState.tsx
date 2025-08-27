export function EmptyState({ title, hint }:{ title:string; hint?:string }){
  return (
    <div className="text-center text-gray-600 py-12">
      <div className="text-lg font-semibold">{title}</div>
      {hint && <div className="text-sm text-gray-500 mt-1">{hint}</div>}
    </div>
  )
}