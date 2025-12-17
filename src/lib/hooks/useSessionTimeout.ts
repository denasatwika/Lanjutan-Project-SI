'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '../state/auth'

const INACTIVITY_TIMEOUT = 60 * 60 * 1000 // 1 hour in milliseconds

/**
 * Hook to handle automatic logout after 1 hour of inactivity
 * Tracks user activity (mouse, keyboard, touch) and logs out when inactive
 */
export function useSessionTimeout() {
  const { user, logout } = useAuth()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  useEffect(() => {
    // Only track activity if user is logged in
    if (!user) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    const resetTimer = () => {
      lastActivityRef.current = Date.now()

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        console.log('Session expired due to inactivity')
        await logout()
        window.location.href = '/login?reason=inactivity'
      }, INACTIVITY_TIMEOUT)
    }

    // Activity events to track
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true })
    })

    // Start the timer
    resetTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [user, logout])
}
