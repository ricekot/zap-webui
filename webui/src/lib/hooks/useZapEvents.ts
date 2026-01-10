import { useEffect, useRef, useSyncExternalStore } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/hooks"

/**
 * WebSocket event types from ZAP
 */
export interface ZapEvent {
  type: string
  timestamp: number
  data?: unknown
  [key: string]: unknown
}

export interface AlertEvent extends ZapEvent {
  type: "alert"
  data: {
    alertId: string
    name: string
    risk: string
    uri: string
  }
}

export interface ScanEvent extends ZapEvent {
  type: "scan.started" | "scan.progress" | "scan.completed"
  data: {
    scanId: string
    scanType: "active" | "spider"
    progress?: number
  }
}

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error"

interface UseZapEventsOptions {
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
type RequestCallback = (response: ZapEvent) => void

let ws: WebSocket | null = null
let status: WebSocketStatus = "disconnected"
const statusListeners = new Set<StatusListener>()
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
const eventHandlers = new Set<EventHandler>()
const reconnectDelayMs = 3000

// Pending request callbacks for request/response pattern
const pendingRequests = new Map<string, RequestCallback>()

function setStatus(newStatus: WebSocketStatus) {
  status = newStatus
  statusListeners.forEach((listener) => listener(newStatus))
}

function handleMessage(messageEvent: MessageEvent) {
  try {
    const event = JSON.parse(messageEvent.data) as ZapEvent

    // Check if this is a response to a pending request
    const responseType = event.type
    const callback = pendingRequests.get(responseType)
    if (callback) {
      pendingRequests.delete(responseType)
      callback(event)
    }

    // Always notify event handlers
    eventHandlers.forEach((handler) => handler(event))
  } catch (e) {
    console.error("Failed to parse WebSocket message:", e)
  }
}

function wsConnect() {
  // Don't reconnect if already connected or connecting
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

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

      // Always auto-reconnect
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null
        wsConnect()
      }, reconnectDelayMs)
    }
  } catch (e) {
    console.error("Failed to create WebSocket:", e)
    setStatus("error")
    
    // Retry on error
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null
      wsConnect()
    }, reconnectDelayMs)
  }
}

function wsSubscribe(listener: StatusListener) {
  statusListeners.add(listener)
  return () => {
    statusListeners.delete(listener)
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

// Connect immediately when module loads
wsConnect()

/**
 * Send a message through the WebSocket
 */
export function wsSend(message: Record<string, unknown>): boolean {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
    return true
  }
  return false
}

/**
 * Send a request and wait for a response of the specified type
 */
export function wsRequest(
  message: Record<string, unknown>,
  responseType: string
): Promise<ZapEvent> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error("WebSocket not connected"))
      return
    }

    // Set up callback for the response
    pendingRequests.set(responseType, resolve)

    // Set up timeout
    const timeout = setTimeout(() => {
      pendingRequests.delete(responseType)
      reject(new Error(`Request timeout waiting for ${responseType}`))
    }, 10000)

    // Modify callback to clear timeout
    const originalCallback = pendingRequests.get(responseType)!
    pendingRequests.set(responseType, (response) => {
      clearTimeout(timeout)
      originalCallback(response)
    })

    // Send the message
    ws.send(JSON.stringify(message))
  })
}

/**
 * Get the WebSocket instance (for advanced use cases)
 */
export function wsGetSocket(): WebSocket | null {
  return ws
}

/**
 * Hook for connecting to ZAP's WebSocket event stream
 *
 * Automatically invalidates relevant TanStack Query caches when events arrive.
 */
export function useZapEvents(options: UseZapEventsOptions = {}) {
  const { onEvent, onStatusChange } = options

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
      switch (event.type) {
        case "alert":
          queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
          break
        case "scan.started":
        case "scan.progress":
        case "scan.completed": {
          const scanEvent = event as ScanEvent
          if (scanEvent.data?.scanType === "active") {
            queryClient.invalidateQueries({
              queryKey: queryKeys.ascan.status(scanEvent.data.scanId),
            })
          } else if (scanEvent.data?.scanType === "spider") {
            queryClient.invalidateQueries({
              queryKey: queryKeys.spider.status(scanEvent.data.scanId),
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

  return {
    status: currentStatus,
    isConnected: currentStatus === "connected",
  }
}

// Export for use in useSitesTree and useZapConnection
export { wsAddEventHandler, wsGetStatus, wsSubscribe }
