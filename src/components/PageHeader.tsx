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
  /** Offset for sticky/fixed top (defaults to -10 to tuck under rounded corners) */
  topOffsetPx?: number

  /** Make the header bleed edge-to-edge across the viewport */
  fullBleed?: boolean
  /**
   * NEW: When true, full-bleed applies only on mobile (below md).
   * At md+ the header stays inside the main column (so it won’t overlap the sidebar).
   */
  bleedMobileOnly?: boolean

  /** Pull up by N pixels to cancel parent top padding (e.g., 24 for pt-6) */
  pullUpPx?: number
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
  topOffsetPx = -10,

  fullBleed = false,
  bleedMobileOnly = false,
  pullUpPx = 0,
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

  // For fixed headers, don’t force left/right when using bleed math.
  const posCls =
    position === 'fixed'
      ? (fullBleed || bleedMobileOnly ? 'fixed z-50' : 'fixed left-0 right-0 z-50')
      : 'sticky z-50'

  const topStyle: CSSProperties = { top: topOffsetPx }
  const pullUpStyle: CSSProperties = pullUpPx ? { marginTop: -pullUpPx } : {}

  const useBleed = fullBleed || bleedMobileOnly

  // Full-bleed without 0.5px seams; overscan by 2px. Cancel at md+ if mobileOnly.
  const bleedCls = useBleed
    ? cn(
        'relative overflow-x-clip left-1/2 -translate-x-1/2 w-[calc(100dvw+2px)]',
        bleedMobileOnly && 'md:left-auto md:translate-x-0 md:w-auto'
      )
    : ''

  // Inner padding: safe-area on mobile when bleeding; normal px-5 at md+
  const innerPadCls = useBleed
    ? (bleedMobileOnly
        ? 'pl-[max(env(safe-area-inset-left),1.25rem)] pr-[max(env(safe-area-inset-right),1.25rem)] md:px-5'
        : 'pl-[max(env(safe-area-inset-left),1.25rem)] pr-[max(env(safe-area-inset-right),1.25rem)]')
    : 'px-5'

  return (
    <>
      <section
        ref={wrapRef as any}
        className={cn(
          'overflow-hidden text-white',
          posCls,
          bleedCls,
          rounded && 'rounded-b-[28px]',
          'shadow-sm',
          className
        )}
        style={{ background, ...topStyle, ...pullUpStyle, ...style }}
      >
        <div className={cn('max-w-6xl mx-auto py-5 flex items-center gap-2', innerPadCls)}>
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

      {/* Spacer for fixed headers so content below isn't covered */}
      {position === 'fixed' ? <div style={{ height: measuredH }} /> : null}
    </>
  )
}
