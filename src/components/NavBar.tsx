// components/NavBar.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/state/auth'
import { cn } from '@/lib/utils/cn'
import { useDisconnect } from 'wagmi'
import {
  LayoutGrid, CalendarCheck2, FileText, ClipboardCheck, ClipboardList,
  History as HistoryIcon, Home, Inbox, User, LogOut, X,
  Menu, LayoutGrid as LayoutDashboard, ChevronDown, History as FileClock, ClipboardCheck as FileCheck,
} from 'lucide-react'

type Role = 'user' | 'approver' | 'admin'

const NAVY = '#00156B'
const RED = '#BD0016'

/** ----------------------- MOBILE items (unchanged) ----------------------- */
const mobileItemsByRole: Record<Role, { href: string; label: string; icon: any }[]> = {
  user: [
    { href: '/user/dashboard', label: 'Home', icon: Home },
    { href: '/user/history', label: 'History', icon: HistoryIcon },
    { href: '/user/requests', label: 'Request', icon: ClipboardList },
    { href: '/user/inbox', label: 'Inbox', icon: Inbox },
    { href: '/user/profile', label: 'Profile', icon: User },
  ],
  approver: [
    { href: '/approver/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/approver/approval', label: 'Approval', icon: ClipboardCheck },
    { href: '/approver/history', label: 'History', icon: HistoryIcon },
    { href: '/approver/profile', label: 'Profile', icon: User },
  ],
  admin: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/admin/approval', label: 'Approval', icon: ClipboardCheck },
    { href: '/admin/dokumen', label: 'Dokumen', icon: FileText },
    { href: '/admin/history', label: 'History', icon: HistoryIcon },
    { href: '/admin/karyawan', label: 'User', icon: User },
  ],
}

/** ========================================================================
 *  ADMIN SIDEBAR (INLINE)
 *  - Static on md+ (like your existing desktop HR sidebar style)
 *  - Drawer on <md with overlay and Escape-to-close
 *  - Uses your original Sidebar behavior & styles, adapted to HR routes
 * ======================================================================= */
function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const [openMenu, setOpenMenu] = useState('Dashboard')
  const logout = useAuth((state) => state.logout)
  const { disconnect } = useDisconnect()
  const router = useRouter()

  const NAV_ITEMS = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      sub: [
        { name: 'Kehadiran', href: '/admin/dashboard/kehadiran', icon: CalendarCheck2 },
        { name: 'Dokumen', href: '/admin/dashboard/dokumen', icon: FileText },
      ],
    },
    { name: 'Approval', icon: FileCheck, href: '/admin/approval' },
    { name: 'Dokumen', icon: FileText, href: '/admin/dokumen' },
    { name: 'History', icon: FileClock, href: '/admin/history' },
    { name: 'Karyawan', icon: User, href: '/admin/karyawan' },
  ]

  const handleLogout = async () => {
    disconnect()
    try {
      await logout()
    } finally {
      router.push('/login')
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 md:hidden ${open ? 'block' : 'hidden'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="navigation"
        aria-label="Admin Sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-30 bg-white p-4 transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:static md:translate-x-0 md:inset-auto md:min-h-screen flex flex-col`}
      >
        {/* Mobile header */}
        <div className="mb-4 flex items-center justify-between md:hidden">
          <span className="font-semibold">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-2 px-2 pb-4 border-b">
        <div className="size-8 rounded-full grid place-items-center font-bold text-white" style={{ background: NAVY }}>
          B
        </div>
        <div className="text-lg font-extrabold">
          <span style={{ color: RED }}>My</span>
          <span style={{ color: NAVY }}>Baliola</span>
        </div>
      </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-grow">
          {NAV_ITEMS.map((item) => {
            const isMenuOpen = openMenu === item.name

            if ('sub' in item && item.sub) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() => setOpenMenu(isMenuOpen ? '' : item.name)}
                    className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-blue-950 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-red-600 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isMenuOpen && (
                    <div className="mt-1 space-y-1 pl-6">
                      {item.sub.map((sub) => {
                        const isActive = pathname === sub.href
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={onClose}
                            className={`flex items-center gap-2 rounded-r-full p-2.5 pl-4 text-sm transition-colors ${
                              isActive ? 'bg-blue-950 text-white' : 'text-blue-950 hover:bg-gray-100'
                            }`}
                          >
                            {sub.icon ? <sub.icon className="h-4 w-4" /> : null}
                            {sub.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const isActive = pathname === (item as any).href
            return (
              <Link
                key={(item as any).href}
                href={(item as any).href!}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-blue-950 text-white' : 'text-blue-950 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="pt-100">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}

/** =============================== NAV BAR ================================ */
export function NavBar({ role }: { role: Role }) {
  const pathname = usePathname()
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false)

  // HR: sidebar UI (drawer on mobile; static on md+)
  if (role === 'admin') {
    return (
      <nav className="z-50">
        {/* Top bar (mobile) with hamburger */}
        <div className="md:hidden sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              aria-label="Open menu"
              onClick={() => setAdminSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="font-extrabold">
              My<span className="text-[#00156B]">Baliola</span>
            </div>
          </div>
        </div>

        {/* Static sidebar on md+ */}
        <div className="hidden md:block">
          <AdminSidebar open={true} onClose={() => {}} />
        </div>

        {/* Drawer on mobile */}
        <div className="md:hidden">
          <AdminSidebar open={adminSidebarOpen} onClose={() => setAdminSidebarOpen(false)} />
        </div>
      </nav>
    )
  }

  // Non-admin roles: keep your existing mobile pill
  return (
    <nav className="z-50">
      <div className="fixed inset-x-0 bottom-4 md:hidden">
        <MobilePill items={mobileItemsByRole[role] ?? []} pathname={pathname} />
      </div>
      {/* You can optionally keep / add a desktop sidebar for these roles later */}
    </nav>
  )
}

/** ------------------------------ Mobile pill ----------------------------- */
function MobilePill({
  items,
  pathname,
}: {
  items: { href: string; label: string; icon: any }[]
  pathname: string
}) {
  const isActive = (path: string, href: string) =>
    href === '/' ? path === '/' : path === href || path.startsWith(href + '/')

  return (
    <div className="mx-auto max-w-md px-4">
      <div className="rounded-2xl bg-[#06286E] shadow-xl ring-1 ring-black/5">
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0,1fr))` }}
        >
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <li key={href} className="py-3">
                <Link href={href} className="flex flex-col items-center gap-2">
                  <span
                    className={cn(
                      'grid place-items-center h-9 w-9 rounded-xl transition',
                      active ? 'bg-[#FF4E58] text-white shadow' : 'text-white',
                    )}
                  >
                    <Icon className={cn(active ? 'h-5 w-5' : 'h-6 w-6')} />
                  </span>
                  <span
                    className={cn('text-xs font-medium', active ? 'text-[#FF4E58]' : 'text-white')}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
