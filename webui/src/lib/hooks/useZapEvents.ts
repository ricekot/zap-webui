import { useEffect, useRef, useCallback, useSyncExternalStore } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/hooks"

/**
 * WebSocket event types from ZAP
 */
export interface ZapEvent {
  event: string
  timestamp: number
  [key: string]: unknown
}

export interface AlertEvent extends ZapEvent {
  event: "alert"
  alertId: string
  name: string
  risk: string
  uri: string
}

export interface ScanEvent extends ZapEvent {
  event: "scan.started" | "scan.progress" | "scan.completed"
  scanId: string
  scanType: "active" | "spider"
  progress?: number
}

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error"

interface UseZapEventsOptions {
  /**
   * Auto-reconnect on disconnect (default: true)
   */
  autoReconnect?: boolean
  /**
   * Reconnect delay in ms (default: 3000)
   */
  reconnectDelay?: number
  /**
   * Custom event handler
   */
  onEvent?: (event: ZapEvent) => void
  /**
   * Connection status change handler
   */
  onStatusChange?: (status: WebSocketStatus) => void
}

// WebSocket manager module-level state
type StatusListener = (status: WebSocketStatus) => void
type EventHandler = (event: ZapEvent) => void

let ws: WebSocket | null = null
let status: WebSocketStatus = "disconnected"
const listeners = new Set<StatusListener>()
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
const eventHandlers = new Set<EventHandler>()
let autoReconnectEnabled = true
let reconnectDelayMs = 3000

function setStatus(newStatus: WebSocketStatus) {
  status = newStatus
  listeners.forEach((listener) => listener(newStatus))
}

function handleMessage(messageEvent: MessageEvent) {
  try {
    const event = JSON.parse(messageEvent.data) as ZapEvent
    eventHandlers.forEach((handler) => handler(event))
  } catch (e) {
    console.error("Failed to parse WebSocket message:", e)
  }
}

function wsConnect() {
  // Clean up existing connection
  if (ws) {
    ws.close()
  }

  // Clear any pending reconnect
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }

  setStatus("connecting")

  // Build WebSocket URL
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const wsUrl = `${protocol}//${window.location.host}/api/events`

  try {
    const socket = new WebSocket(wsUrl)
    ws = socket

    socket.onopen = () => {
      setStatus("connected")
    }

    socket.onmessage = handleMessage

    socket.onerror = () => {
      setStatus("error")
    }

    socket.onclose = () => {
      setStatus("disconnected")
      ws = null

      // Auto-reconnect
      if (autoReconnectEnabled) {
        reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null
          wsConnect()
        }, reconnectDelayMs)
      }
    }
  } catch (e) {
    console.error("Failed to create WebSocket:", e)
    setStatus("error")
  }
}

function wsDisconnect() {
  // Temporarily disable auto-reconnect
  const wasAutoReconnect = autoReconnectEnabled
  autoReconnectEnabled = false

  // Clear reconnect timeout
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }

  // Close WebSocket
  if (ws) {
    ws.close()
    ws = null
  }

  setStatus("disconnected")

  // Restore auto-reconnect setting
  autoReconnectEnabled = wasAutoReconnect
}

function wsCleanup() {
  autoReconnectEnabled = false
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  if (ws) {
    ws.close()
    ws = null
  }
}

function wsSetOptions(autoReconnect: boolean, reconnectDelay: number) {
  autoReconnectEnabled = autoReconnect
  reconnectDelayMs = reconnectDelay
}

function wsSubscribe(listener: StatusListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function wsGetStatus() {
  return status
}

function wsAddEventHandler(handler: EventHandler) {
  eventHandlers.add(handler)
  return () => {
    eventHandlers.delete(handler)
  }
}

/**
 * Hook for connecting to ZAP's WebSocket event stream
 *
 * Automatically invalidates relevant TanStack Query caches when events arrive.
 */
export function useZapEvents(options: UseZapEventsOptions = {}) {
  const {
    autoReconnect = true,
    reconnectDelay = 3000,
    onEvent,
    onStatusChange,
  } = options

  const queryClient = useQueryClient()
  const onEventRef = useRef(onEvent)
  const onStatusChangeRef = useRef(onStatusChange)

  // Keep refs updated via effects to avoid setting during render
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])

  // Use useSyncExternalStore for status
  const currentStatus = useSyncExternalStore(wsSubscribe, wsGetStatus, wsGetStatus)

  // Update options
  useEffect(() => {
    wsSetOptions(autoReconnect, reconnectDelay)
  }, [autoReconnect, reconnectDelay])

  // Handle status changes
  useEffect(() => {
    onStatusChangeRef.current?.(currentStatus)
  }, [currentStatus])

  // Handle events
  useEffect(() => {
    const handleEvent = (event: ZapEvent) => {
      // Call custom handler
      onEventRef.current?.(event)

      // Auto-invalidate relevant queries based on event type
      switch (event.event) {
        case "alert":
          queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
          break
        case "scan.started":
        case "scan.progress":
        case "scan.completed": {
          const scanEvent = event as ScanEvent
          if (scanEvent.scanType === "active") {
            queryClient.invalidateQueries({
              queryKey: queryKeys.ascan.status(scanEvent.scanId),
            })
          } else if (scanEvent.scanType === "spider") {
            queryClient.invalidateQueries({
              queryKey: queryKeys.spider.status(scanEvent.scanId),
            })
          }
          break
        }
        case "site.added":
          queryClient.invalidateQueries({ queryKey: queryKeys.core.sites })
          break
      }
    }

    return wsAddEventHandler(handleEvent)
  }, [queryClient])

  // Connect on mount
  useEffect(() => {
    wsConnect()
    return () => {
      wsCleanup()
    }
  }, [])

  const connect = useCallback(() => {
    wsConnect()
  }, [])

  const disconnect = useCallback(() => {
    wsDisconnect()
  }, [])

  return {
    status: currentStatus,
    connect,
    disconnect,
    isConnected: currentStatus === "connected",
  }
}
