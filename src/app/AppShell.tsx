// app/(app)/AppShell.tsx
'use client'

import { NavBar } from '@/components/NavBar'

export default function AppShell({
  role,
  children,
}: {
  role: 'requester' | 'approver'
  children: React.ReactNode
}) {
  return (
    // app/(app)/AppShell.tsx
<div className="mx-auto max-w-7xl px-4 md:px-6 pt-6">
  <div className="md:grid md:grid-cols-[260px_minmax(0,1fr)] md:gap-6">
    <aside className="md:sticky md:top-6 md:self-start md:z-20">
      <NavBar role={role} />
    </aside>

    <main className="pb-24 md:pb-0 min-w-0">{children}</main>
  </div>
</div>

  )
}
