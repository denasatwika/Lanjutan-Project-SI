'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { cn } from '@/lib/utils/cn'

type Props = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function BottomSheet({ open, onClose, children, className }: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white shadow-2xl p-4 sm:p-5',
              className
            )}
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
