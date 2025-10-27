'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { PageHeader } from '@/components/PageHeader'
import { LeaveRequestForm } from './forms/LeaveRequestForm'
import { OvertimeRequestForm } from './forms/OvertimeRequestForm'

type RequestView = 'leave' | 'overtime'

const TABS: { key: RequestView; label: string; description: string }[] = [
  { key: 'leave', label: 'Leave', description: 'Time off, sick leave, or other absence' },
  { key: 'overtime', label: 'Overtime', description: 'Extra working hours outside schedule' },
]

export default function Page() {
  const [view, setView] = useState<RequestView>('leave')

  return (
    <div className="min-h-screen">
      <PageHeader title="Request" backHref="/user/dashboard" fullBleed bleedMobileOnly pullUpPx={24} />

      <div className="mx-auto mt-3 max-w-screen-sm px-4 md:max-w-2xl">
        <div className="rounded-2xl border bg-white shadow-md">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2 rounded-xl bg-white p-1 shadow-sm">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setView(tab.key)}
                    className={clsx(
                      'flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition',
                      view === tab.key
                        ? 'bg-[#00156B] text-white shadow'
                        : 'bg-transparent text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 sm:text-right">
                {TABS.find((tab) => tab.key === view)?.description}
              </p>
            </div>
          </div>

          <div className="space-y-4 px-4 py-6 sm:px-6">
            {view === 'leave' ? (
              <LeaveRequestForm onSubmitted={() => setView('leave')} />
            ) : (
              <OvertimeRequestForm onSubmitted={() => setView('overtime')} />
            )}
          </div>
        </div>
      </div>

      <div className="h-24 md:hidden" />
    </div>
  )
}
