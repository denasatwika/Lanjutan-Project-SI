// components/NavBar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import {
  LayoutGrid,
  CalendarCheck2,
  FileText,
  ClipboardCheck,
  ClipboardList,
  History as HistoryIcon,
  Home,
  Inbox,
  User,
} from 'lucide-react'

type Role = 'employee' | 'supervisor' | 'chief' | 'hr'

const NAVY = '#00156B'
const RED = '#BD0016'

/** ---- MOBILE: exactly your map (per-role pages can differ) ---- */
const mobileItemsByRole: Record<
  Exclude<Role, 'hr'> | 'hr',
  { href: string; label: string; icon: any }[]
> = {
  employee: [
    { href: '/employee/dashboard', label: 'Beranda', icon: Home },
    { href: '/employee/riwayat', label: 'Riwayat', icon: HistoryIcon },
    { href: '/employee/izin', label: 'Izin', icon: ClipboardList },
    { href: '/employee/inbox', label: 'Inbox', icon: Inbox },
    { href: '/employee/profile', label: 'Profil', icon: User },
  ],
  supervisor: [
    { href: '/supervisor/dashboard', label: 'Dashboard', icon: Home },
    { href: '/supervisor/approval', label: 'Approval', icon: ClipboardCheck },
    { href: '/supervisor/history', label: 'History', icon: HistoryIcon }
  ],
  chief: [
    { href: '/chief/dashboard', label: 'Dashboard', icon: Home },
    { href: '/chief/approval', label: 'Approval', icon: ClipboardCheck },
    { href: '/chief/history', label: 'History', icon: HistoryIcon }
  ],
  // keep hr minimal; add/trim as you like
  hr: [
    { href: '/hr/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/hr/approval', label: 'Approval', icon: ClipboardCheck },
    { href: '/hr/dokumen', label: 'Dokumen', icon: FileText },
    { href: '/hr/history', label: 'History', icon: HistoryIcon },
  ],
}

/** ---- DESKTOP/TABLET: HR-sidebar style for all roles ---- */
type SidebarItem =
  | { kind: 'link'; href: string; label: string; icon?: any }
  | {
      kind: 'group'
      href: string
      label: string
      icon?: any
      children: { href: string; label: string; icon?: any }[]
    }

const sidebarByRole: Record<Role, SidebarItem[]> = {
  hr: [
    {
      kind: 'group',
      href: '/hr/dashboard',
      label: 'Dashboard',
      icon: LayoutGrid,
      children: [
        { href: '/hr/dashboard/kehadiran', label: 'Kehadiran', icon: CalendarCheck2 },
        { href: '/hr/dashboard/dokumen', label: 'Dokumen', icon: FileText },
      ],
    },
    { kind: 'link', href: '/hr/approval', label: 'Approval', icon: ClipboardCheck },
    { kind: 'link', href: '/hr/dokumen', label: 'Dokumen', icon: FileText },
    { kind: 'link', href: '/hr/history', label: 'History', icon: HistoryIcon },
  ],
  employee: [
    { kind: 'link', href: '/employee/dashboard', label: 'Beranda', icon: Home },
    { kind: 'link', href: '/employee/riwayat', label: 'Riwayat', icon: HistoryIcon },
    { kind: 'link', href: '/employee/izin', label: 'Izin', icon: ClipboardList },
    { kind: 'link', href: '/employee/inbox', label: 'Inbox', icon: Inbox },
    { kind: 'link', href: '/employee/profile', label: 'Profil', icon: User },
  ],
  supervisor: [
    { kind: 'link', href: '/supervisor/dashboard', label: 'Dashboard', icon: Home },
    { kind: 'link', href: '/supervisor/approval', label: 'Approval', icon: ClipboardCheck },
    { kind: 'link', href: '/supervisor/history', label: 'History', icon: HistoryIcon }
  ],
  chief: [
    { kind: 'link', href: '/chief/dashboard', label: 'Dashboard', icon: Home },
    { kind: 'link', href: '/chief/approval', label: 'Approval', icon: ClipboardCheck },
    { kind: 'link', href: '/chief/history', label: 'History', icon: HistoryIcon }
  ],
}

export function NavBar({ role }: { role: Role }) {
  const pathname = usePathname()
  const mobileItems = mobileItemsByRole[role] ?? []
  const sidebarItems = sidebarByRole[role] ?? []

  return (
    <nav className="z-50">
      {/* Mobile floating pill (exactly your role map). */}
      <div className="fixed inset-x-0 bottom-4 md:hidden">
        <MobilePill items={mobileItems} pathname={pathname} />
      </div>

      {/* Desktop / tablet: clean HRSidebar style. */}
      <div className="hidden md:block">
        <Sidebar items={sidebarItems} pathname={pathname} />
      </div>
    </nav>
  )
}

/* ------------------------------ Mobile pill ------------------------------- */

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
                      active ? 'bg-[#FF4E58] text-white shadow' : 'text-white'
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

/* --------------------------- Desktop/Tablet side --------------------------- */

function Sidebar({ items, pathname }: { items: SidebarItem[]; pathname: string }) {
  return (
    <div className="rounded-2xl bg-white shadow-md border p-4 overflow-visible">
      {/* Brand */}
      <div className="flex items-center gap-2 px-2 pb-4 border-b">
        <div className="size-8 rounded-full grid place-items-center font-bold text-white" style={{ background: NAVY }}>
          B
        </div>
        <div className="text-lg font-extrabold">
          <span className="text-gray-900">My</span>
          <span style={{ color: NAVY }}>Baliola</span>
        </div>
      </div>

      {/* Menu */}
      <nav className="mt-4 space-y-1">
        {items.map((it) =>
          it.kind === 'link' ? (
            <SidebarMainLink key={it.href} item={it} pathname={pathname} />
          ) : (
            <SidebarGroup key={it.href} item={it} pathname={pathname} />
          ),
        )}
      </nav>
    </div>
  )
}

function SidebarMainLink({
  item,
  pathname,
}: {
  item: Extract<SidebarItem, { kind: 'link' }>
  pathname: string
}) {
  const active = pathname === item.href || pathname.startsWith(item.href + '/')
  const Icon = item.icon
  const base =
    'relative overflow-visible flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors'
  return (
    <Link href={item.href} className={cn(base, active ? `text-[${NAVY}]` : 'text-gray-700 hover:bg-gray-50')}>
      {active && (
        <span
          aria-hidden
          className="absolute left-[-8px] top-1/2 -translate-y-1/2 h-8 w-1.5 rounded-r-md"
          style={{ background: RED }}
        />
      )}
      {Icon ? <Icon size={18} className="text-current" /> : null}
      <span>{item.label}</span>
    </Link>
  )
}

function SidebarGroup({
  item,
  pathname,
}: {
  item: Extract<SidebarItem, { kind: 'group' }>
  pathname: string
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const [open, setOpen] = useState(isActive)

  const base =
    'relative overflow-visible flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors'
  const activeCls = `text-[${NAVY}] bg-white`
  const inactiveCls = 'text-gray-700 hover:bg-gray-50'
  const Icon = item.icon

  return (
    <div className="group relative">
      <button onClick={() => setOpen((v) => !v)} className={cn(base, isActive ? activeCls : inactiveCls, 'w-full text-left')}>
        {isActive && (
          <span
            aria-hidden
            className="absolute left-[-8px] top-1/2 -translate-y-1/2 h-8 w-1.5 rounded-r-md"
            style={{ background: RED }}
          />
        )}
        {Icon ? <Icon size={18} style={{ color: isActive ? NAVY : undefined }} /> : null}
        <span>{item.label}</span>
        <span className="ml-auto md:hidden">{open ? '▾' : '▸'}</span>
      </button>

      {/* Mobile accordion (kept for completeness if ever rendered ≤ md) */}
      <div className={cn('mt-1 space-y-1 md:hidden', open ? 'block' : 'hidden')}>
        {item.children.map((c) => (
          <SubLink key={c.href} href={c.href} pathname={pathname} icon={c.icon} label={c.label} />
        ))}
      </div>

      {/* Desktop hover submenu */}
      <div className="hidden md:block">
        <div className="absolute left-2 right-2 top-[calc(100%+4px)] z-30 hidden group-hover:block">
          <div className="rounded-xl border bg-white shadow-lg p-2 space-y-1">
            {item.children.map((c) => (
              <SubLink key={c.href} href={c.href} pathname={pathname} icon={c.icon} label={c.label} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SubLink({
  href,
  pathname,
  icon: Icon,
  label,
}: {
  href: string
  pathname: string
  icon?: any
  label: string
}) {
  const active = pathname === href
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold',
        active ? `text-[${NAVY}] bg-gray-50` : 'text-gray-700 hover:bg-gray-50',
      )}
      style={active ? { color: NAVY } : undefined}
    >
      {Icon ? <Icon size={18} /> : null}
      {label}
    </Link>
  )
}
