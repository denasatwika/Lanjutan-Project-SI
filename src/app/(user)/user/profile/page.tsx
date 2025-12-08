// app/(employee)/employee/profile/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/state/auth'
import { PageHeader } from '@/components/PageHeader'
import { CutiTokenApproval } from '@/components/CutiTokenApproval'
import { Camera, Mail, Phone, Wallet, Building2, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { useDisconnect } from 'wagmi'
import { getEmployee, updateEmployee } from '@/lib/api/employees'
import type { EmployeeResponse, EmployeeUpdatePayload } from '@/lib/api/employees'

type ProfileFormState = {
  name: string
  email: string
  phone: string
  departmentName: string
  departmentId?: string
  wallet: string
  avatarUrl: string | null
}

export default function ProfilePage() {
  const auth = useAuth()
  const user = auth.user
  const { disconnect } = useDisconnect()
  const firstName = useMemo(() => user?.name?.split(' ')[0] ?? 'User', [user?.name])
  const initial = firstName.charAt(0).toUpperCase()

  const [profile, setProfile] = useState<EmployeeResponse | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const initialForm = useMemo<ProfileFormState>(() => {
    const profileName =
      typeof profile?.name === 'string' && profile.name.trim().length > 0
        ? profile.name
        : undefined
    const userName =
      typeof user?.name === 'string' && user.name.trim().length > 0 ? user.name : undefined
    const resolvedName = profileName ?? userName ?? ''

    const profileEmail =
      typeof profile?.email === 'string' && profile.email.trim().length > 0
        ? profile.email
        : undefined
    const userEmail =
      typeof user?.email === 'string' && user.email.trim().length > 0 ? user.email : undefined
    const resolvedEmail = profileEmail ?? userEmail ?? ''

    const profilePhone =
      typeof profile?.phone === 'string' && profile.phone.trim().length > 0
        ? profile.phone
        : undefined
    const userPhone =
      typeof user?.phone === 'string' && user.phone.trim().length > 0 ? user.phone : undefined
    const resolvedPhone = profilePhone ?? userPhone ?? ''

    const rawProfileDepartment = profile?.departmentName ?? profile?.department
    let profileDepartmentName: string | undefined
    if (typeof rawProfileDepartment === 'string' && rawProfileDepartment.trim().length > 0) {
      profileDepartmentName = rawProfileDepartment
    } else if (
      rawProfileDepartment &&
      typeof rawProfileDepartment === 'object' &&
      'name' in rawProfileDepartment &&
      typeof (rawProfileDepartment as any).name === 'string'
    ) {
      const value = (rawProfileDepartment as any).name.trim()
      profileDepartmentName = value.length > 0 ? value : undefined
    }
    const userDepartment =
      typeof user?.department === 'string' && user.department.trim().length > 0
        ? user.department
        : undefined
    const resolvedDepartmentName = profileDepartmentName ?? userDepartment ?? ''

    const profileDepartmentId =
      typeof profile?.departmentId === 'string' && profile.departmentId.length > 0
        ? profile.departmentId
        : undefined
    const profileDepartmentObjId =
      rawProfileDepartment &&
        typeof rawProfileDepartment === 'object' &&
        'id' in rawProfileDepartment &&
        typeof (rawProfileDepartment as any).id === 'string'
        ? (rawProfileDepartment as any).id
        : undefined
    const userDepartmentId =
      typeof user?.departmentId === 'string' && user.departmentId.length > 0
        ? user.departmentId
        : undefined
    const resolvedDepartmentId =
      profileDepartmentId ?? profileDepartmentObjId ?? userDepartmentId ?? undefined

    const profileAddress =
      typeof profile?.address === 'string' && profile.address.trim().length > 0
        ? profile.address
        : undefined
    const userAddress =
      typeof user?.address === 'string' && user.address.trim().length > 0
        ? user.address
        : undefined
    const resolvedWallet = profileAddress ?? userAddress ?? ''

    const profileAvatar =
      typeof profile?.avatarUrl === 'string' || profile?.avatarUrl === null
        ? profile.avatarUrl
        : undefined
    const userAvatar =
      typeof user?.avatarUrl === 'string' || user?.avatarUrl === null ? user.avatarUrl : undefined
    const resolvedAvatar = profileAvatar ?? userAvatar ?? null

    return {
      name: resolvedName,
      email: resolvedEmail,
      phone: resolvedPhone,
      departmentName: resolvedDepartmentName,
      departmentId: resolvedDepartmentId,
      wallet: resolvedWallet,
      avatarUrl: resolvedAvatar,
    }
  }, [profile, user])

  // local editable state (front-end only)
  const [form, setForm] = useState<ProfileFormState>(initialForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(initialForm)
  }, [initialForm])

  useEffect(() => {
    if (!user?.id) {
      setProfile(null)
      return
    }

    let cancelled = false
    setLoadingProfile(true)

    getEmployee(user.id)
      .then((data) => {
        if (cancelled) return
        setProfile(data)
      })
      .catch((error) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Failed to load profile'
        toast.error(message)
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id])

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
      toast.error('Please sign in first')
      return
    }

    const payload: EmployeeUpdatePayload = {}

    const nextName = form.name.trim()
    const previousName = initialForm.name.trim()
    if (nextName !== previousName) {
      payload.name = nextName
    }

    const nextEmail = form.email.trim()
    const previousEmail = initialForm.email.trim()
    if (nextEmail !== previousEmail) {
      payload.email = nextEmail
    }

    const nextPhone = form.phone.trim()
    const previousPhone = initialForm.phone.trim()
    if (nextPhone !== previousPhone) {
      payload.phone = nextPhone
    }

    if (form.departmentId && form.departmentId !== initialForm.departmentId) {
      payload.departmentId = form.departmentId
    }

    const nextAvatar = form.avatarUrl ?? null
    const previousAvatar = initialForm.avatarUrl ?? null
    if (nextAvatar !== previousAvatar) {
      payload.avatarUrl = nextAvatar
    }

    if (Object.keys(payload).length === 0) {
      toast.info('Nothing to update')
      return
    }

    setSaving(true)
    try {
      const updated = await updateEmployee(user.id, payload)
      const departmentName =
        (typeof updated.departmentName === 'string' && updated.departmentName.length > 0
          ? updated.departmentName
          : undefined) ??
        (typeof updated.department === 'string' && updated.department.length > 0
          ? updated.department
          : undefined)

      setProfile(updated)

      auth.setUser({
        ...user,
        name: typeof updated.name === 'string' ? updated.name : user.name,
        email: typeof updated.email === 'string' ? updated.email : user.email,
        phone: typeof updated.phone === 'string' ? updated.phone : user.phone,
        department: departmentName ?? user.department,
        departmentId:
          typeof updated.departmentId === 'string' && updated.departmentId.length > 0
            ? updated.departmentId
            : user.departmentId,
        avatarUrl:
          updated.avatarUrl !== undefined ? (updated.avatarUrl as string | null) : user.avatarUrl,
      })

      toast.success('Profile updated')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile'
      toast.error(message)
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
    }
    reader.readAsDataURL(file)
  }

  async function logout() {
    disconnect()
    try {
      await auth.logout()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to logout'
      toast.error(message)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Profile"
        backHref="/user/dashboard"
        fullBleed
        bleedMobileOnly
        pullUpPx={24}
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
                <div className="w-full text-xl md:text-2xl font-extrabold">
                  {form.name}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {profile?.level}
                </div>
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

          {/* CutiToken Approval */}
          <CutiTokenApproval />

          {/* Contact & Org */}
          <section className="grid md:grid-cols-2 gap-4">
            <div className="card p-4">
              <h3 className="font-bold mb-3">Credential</h3>
              <InfoRow icon={<Mail size={16} />} label="Email">
                <input
                  className="w-full bg-transparent outline-none"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </InfoRow>
              <InfoRow icon={<Phone size={16} />} label="Phone Number">
                <input
                  className="w-full bg-transparent outline-none"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </InfoRow>
              <InfoRow icon={<Building2 size={16} />} label="Department">
                <input
                  className="w-full bg-transparent outline-none text-gray-500"
                  value={form.departmentName}
                  readOnly
                />
              </InfoRow>
              <InfoRow icon={<Wallet size={16} />} label="Wallet">
                <input
                  className="w-full bg-transparent outline-none text-gray-500"
                  value={form.wallet}
                  readOnly
                />
              </InfoRow>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={saveProfile}
                  disabled={saving || loadingProfile}
                  className="btn btn-primary"
                >
                  {saving ? 'Saving' : loadingProfile ? 'Loading...' : 'Save'}
                </button>
                <button onClick={logout} className="btn">Logout</button>
              </div>
            </div>
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
