export function formatWhen(iso: string){
  const d = new Date(iso)
  return d.toLocaleString()
}