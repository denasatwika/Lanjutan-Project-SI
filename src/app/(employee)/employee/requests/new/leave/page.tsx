'use client'

import { PageHeader } from '@/components/PageHeader'
import { LeaveRequestForm } from '../../forms/LeaveRequestForm'

export default function Page() {
  return (
    <div className="min-h-screen">
      <PageHeader title="Leave Request" backHref="/employee/requests" fullBleed bleedMobileOnly pullUpPx={24} />

      <div className="mx-auto mt-3 max-w-screen-sm px-4 md:max-w-2xl">
        <div className="rounded-2xl border bg-white p-4 shadow-md sm:p-6">
          <LeaveRequestForm />
        </div>
      </div>

      <div className="h-24 md:hidden" />
    </div>
  )
}
