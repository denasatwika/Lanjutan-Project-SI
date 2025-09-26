'use client'

import { PageHeader } from '@/components/PageHeader'
import { OvertimeRequestForm } from '../../forms/OvertimeRequestForm'

export default function Page() {
  return (
    <div className="min-h-screen">
      <PageHeader title="Overtime Request" backHref="/employee/izin" fullBleed bleedMobileOnly pullUpPx={24} />

      <div className="mx-auto mt-3 max-w-screen-sm px-4 md:max-w-2xl">
        <div className="rounded-2xl border bg-white p-4 shadow-md sm:p-6">
          <OvertimeRequestForm />
        </div>
      </div>

      <div className="h-24 md:hidden" />
    </div>
  )
}
