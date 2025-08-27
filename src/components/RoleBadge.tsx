export function RoleBadge({ role }:{ role:'employee'|'supervisor'|'hr'|'chief' }){
  const map = { employee:'bg-[--B-500]', supervisor:'bg-[--R-650a]', hr:'bg-[--B-950]', chief:'bg-[--S-800]' }
  return <span className={`badge text-white ${map[role]}`}>{role.toUpperCase()}</span>
}