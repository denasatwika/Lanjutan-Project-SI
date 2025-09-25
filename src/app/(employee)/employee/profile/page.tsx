// app/(employee)/employee/profil/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/state/auth'
import { PageHeader } from '@/components/PageHeader'
import { Camera, Mail, Phone, Wallet, Building2, Shield, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'

type PartialUser = {
  name?: string
  email?: string
  phone?: string
  department?: string
  wallet?: string
  avatarUrl?: string | null
}

export default function ProfilePage() {
  const auth = useAuth()
  const user = auth.user
  const firstName = useMemo(() => user?.name?.split(' ')[0] ?? 'User', [user?.name])
  const initial = firstName.charAt(0).toUpperCase()

  const initialForm = useMemo<PartialUser>(() => {
    const u = user as any
    return {
      name: user?.name ?? '',
      email: u?.email ?? '',
      phone: u?.phone ?? '',
      department: u?.department ?? '—',
      wallet: u?.wallet ?? '—',
      avatarUrl: u?.avatarUrl ?? null,
    }
  }, [user])

  // local editable state (front-end only)
  const [form, setForm] = useState<PartialUser>(initialForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(initialForm)
  }, [initialForm])

  // theme toggle (darkMode: 'class')
  const [dark, setDark] = useState<boolean>(() =>
    typeof window === 'undefined' ? false : document.documentElement.classList.contains('dark')
  )
  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    if (typeof localStorage !== 'undefined') localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  async function saveProfile() {
    if (!user) {
      toast.error('Silakan login terlebih dahulu')
      return
    }
    setSaving(true)
    try {
      // Try to update the auth store if it exposes a method; otherwise just toast (early validation).
      const api: any = (useAuth as any).getState?.()
      if (api?.update) api.update(form)
      else if (api?.setUser) api.setUser({ ...user, ...form })
      toast.success('Profil disimpan (front-end)')
    } catch {
      toast.error('Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setForm((f) => ({ ...f, avatarUrl: dataUrl }))
      // Try to persist to store if supported
      const api: any = (useAuth as any).getState?.()
      if (api?.update) api.update({ avatarUrl: dataUrl })
      else if (api?.setUser && user) api.setUser({ ...user, avatarUrl: dataUrl })
    }
    reader.readAsDataURL(file)
  }

  function logout() {
    const api: any = (useAuth as any).getState?.()
    if (api?.logout) api.logout()
    else toast('Simulasi logout (front-end)')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Profile"
        backHref="/employee/dashboard"
        fullBleed
        bleedMobileOnly    // <-- key line
        pullUpPx={24}      // cancels AppShell pt-6
      />

      {!user ? (
        <section className="card p-4 text-sm text-gray-500">
          Silakan login untuk melihat dan mengubah profil karyawan.
        </section>
      ) : (
      <>
      {/* Identity card */}
      <section className="card p-4">
        <div className="flex items-center gap-4">
          <div
            className="relative shrink-0 w-16 h-16 rounded-full grid place-items-center text-white"
            style={{ backgroundColor: '#00156B' }}
          >
            {form.avatarUrl ? (
              <img
                src={form.avatarUrl}
                alt="avatar"
                className="absolute inset-0 w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="font-semibold text-lg">{initial}</span>
            )}
            <label
              htmlFor="avatar"
              className="absolute -bottom-1 -right-1 size-8 rounded-full grid place-items-center bg-white text-gray-700 border shadow hover:bg-gray-50"
              title="Ganti foto"
            >
              <Camera size={16} />
            </label>
            <input id="avatar" type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
          </div>

          <div className="flex-1">
            <input
                className="w-full bg-transparent text-xl md:text-2xl font-extrabold outline-none"
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div className="mt-1 text-sm text-gray-500">EMPLOYEE</div>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setDark((v) => !v)}
            className="rounded-xl px-3 py-2 border text-sm inline-flex items-center gap-2"
            title="Tema"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? 'Light' : 'Dark'}
          </button>
         </div>
      </section>

      {/* Contact & Org */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-bold mb-3">Credential</h3>
          <InfoRow icon={<Mail size={16} />} label="Email">
            <input
              className="w-full bg-transparent outline-none"
              value={form.email ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </InfoRow>
          <InfoRow icon={<Phone size={16} />} label="Phone Number">
          <input
              className="w-full bg-transparent outline-none"
              value={form.phone ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </InfoRow>
          <InfoRow icon={<Building2 size={16} />} label="Department">
            <input
              className="w-full bg-transparent outline-none"
              value={form.department ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            />
          </InfoRow>
          <InfoRow icon={<Wallet size={16} />} label="Wallet">
            <input
              className="w-full bg-transparent outline-none"
              value={form.wallet ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, wallet: e.target.value }))}
            />
          </InfoRow>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button onClick={logout} className="btn">Logout</button>
          </div>
        </div>
     </section>

      {/* Security */}
      <section className="card p-4">
        <h3 className="font-bold mb-3">Security</h3>
        <InfoRow icon={<Shield size={16} />} label="Password">
          <button
            className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            onClick={() => toast('Ganti Password (front-end)')}
          >
            Change Password
          </button>
        </InfoRow>
      </section>
      </>
      )}
    </div>
  )
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-b-0">
      <div className="shrink-0 size-8 rounded-lg bg-gray-50 text-gray-700 grid place-items-center">{icon}</div>
      <div className="w-32 text-sm text-gray-500">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
