// app/(hr)/hr/layout.tsx
import AppShell from '@/app/AppShell'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell role="requester">{children}</AppShell>
}
