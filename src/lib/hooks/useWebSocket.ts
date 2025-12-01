'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export type WSMessageType =
  | 'APPROVAL_COLLECTED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_EXECUTED'
  | 'REQUEST_REJECTED'
  | 'TOKENS_REFUNDED'
  | 'APPROVAL_COUNT_UPDATE'

export interface WSMessage {
  type: WSMessageType
  payload: any
  timestamp: number
}

export interface ApprovalCountUpdate {
  requestId: string
  approvalCount: number
  threshold: number
  percentage: number
}

export interface ApprovalCollected {
  requestId: string
  signer: string
  role: number
}

export interface RequestStatusUpdate {
  requestId: string
  status: string
}

export interface TokensRefunded {
  requestId: string
  requester: string
  amount: number
}

interface UseWebSocketOptions {
  url?: string
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

interface UseWebSocketReturn {
  isConnected: boolean
  isReconnecting: boolean
  lastMessage: WSMessage | null
  subscribe: (requestId: string) => void
  unsubscribe: (requestId: string) => void
  onMessage: (callback: (message: WSMessage) => void) => () => void
}

/**
 * React hook for WebSocket connection to backend real-time updates
 *
 * @example
 * ```tsx
 * const { isConnected, subscribe, onMessage } = useWebSocket()
 *
 * useEffect(() => {
 *   subscribe(requestId)
 *   return () => unsubscribe(requestId)
 * }, [requestId])
 *
 * useEffect(() => {
 *   return onMessage((message) => {
 *     if (message.type === 'APPROVAL_COUNT_UPDATE') {
 *       setApprovalCount(message.payload.approvalCount)
 *     }
 *   })
 * }, [])
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8787',
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messageCallbacksRef = useRef<Set<(message: WSMessage) => void>>(new Set())

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      console.log('[WebSocket] Connecting to:', url)
      const ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('[WebSocket] Connected')
        setIsConnected(true)
        setIsReconnecting(false)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)
          console.log('[WebSocket] Message received:', message.type, message.payload)
          setLastMessage(message)

          // Call all registered callbacks
          messageCallbacksRef.current.forEach((callback) => {
            try {
              callback(message)
            } catch (error) {
              console.error('[WebSocket] Error in message callback:', error)
            }
          })
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error)
      }

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected')
        setIsConnected(false)

        // Attempt to reconnect if not manually closed
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          setIsReconnecting(true)
          reconnectAttemptsRef.current += 1
          console.log(
            `[WebSocket] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else {
          console.log('[WebSocket] Max reconnect attempts reached')
          setIsReconnecting(false)
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('[WebSocket] Connection error:', error)
      setIsConnected(false)
    }
  }, [url, reconnectInterval, maxReconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
    setIsReconnecting(false)
    reconnectAttemptsRef.current = maxReconnectAttempts // Prevent auto-reconnect
  }, [maxReconnectAttempts])

  const subscribe = useCallback((requestId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SUBSCRIBE',
          requestId,
        })
      )
      console.log('[WebSocket] Subscribed to request:', requestId)
    }
  }, [])

  const unsubscribe = useCallback((requestId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'UNSUBSCRIBE',
          requestId,
        })
      )
      console.log('[WebSocket] Unsubscribed from request:', requestId)
    }
  }, [])

  const onMessage = useCallback((callback: (message: WSMessage) => void) => {
    messageCallbacksRef.current.add(callback)

    // Return cleanup function
    return () => {
      messageCallbacksRef.current.delete(callback)
    }
  }, [])

  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  return {
    isConnected,
    isReconnecting,
    lastMessage,
    subscribe,
    unsubscribe,
    onMessage,
  }
}
