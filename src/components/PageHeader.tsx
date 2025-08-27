'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type PositionMode = 'sticky' | 'fixed'

type PageHeaderProps = {
  title: ReactNode
  backHref?: string | false
  right?: ReactNode
  subtitle?: ReactNode
  bg?: string
  gradient?: string
  className?: string
  style?: CSSProperties
  rounded?: boolean
  position?: PositionMode
  topOffsetPx?: number
}

export function PageHeader({
  title,
  backHref = '/employee/dashboard',
  right,
  subtitle,
  bg = 'var(--B-950)',
  gradient,
  className,
  style,
  rounded = true,
  position = 'sticky',
  topOffsetPx = -10, // ⬅ default offset here
}: PageHeaderProps) {
  const background = gradient ?? bg

  const wrapRef = useRef<HTMLElement | null>(null)
  const [measuredH, setMeasuredH] = useState<number>(0)

  const measure = () => {
    if (wrapRef.current) {
      setMeasuredH(wrapRef.current.getBoundingClientRect().height)
    }
  }

  useLayoutEffect(measure, [])
  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const posCls =
    position === 'fixed' ? 'fixed left-0 right-0 z-50' : 'sticky z-50'

  const topStyle: CSSProperties = { top: topOffsetPx }

  return (
    <>
      <section
        ref={wrapRef as any}
        className={cn(
          'overflow-hidden text-white',
          posCls,
          rounded && 'rounded-b-[28px]',
          className,
          'shadow-sm'
        )}
        style={{ background, ...topStyle, ...style }}
      >
        <div className="max-w-6xl mx-auto px-5 py-5 flex items-center gap-2">
          {backHref !== false && (
            <Link href={backHref} className="-ml-1 p-2 rounded-full hover:bg-white/10">
              <ChevronLeft className="size-6" />
            </Link>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold truncate">{title}</h1>
            {subtitle && <p className="text-sm text-white/80 mt-0.5">{subtitle}</p>}
          </div>

          {right && <div className="ml-auto">{right}</div>}
        </div>
      </section>

      {position === 'fixed' ? <div style={{ height: measuredH }} /> : null}
    </>
  )
}
