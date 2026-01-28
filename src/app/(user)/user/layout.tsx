// app/(user)/user/layout.tsx
import AppShell from '@/components/AppShell'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell role="user">{children}</AppShell>
}
