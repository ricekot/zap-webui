import { useSyncExternalStore } from "react"
import { wsSubscribe, wsGetStatus } from "./useZapEvents"

interface ZapConnectionState {
  isConnected: boolean
  isReconnecting: boolean
}

/**
 * Hook to get ZAP connection status based on WebSocket state.
 * No longer polls - uses the shared WebSocket connection status.
 */
export function useZapConnection(): ZapConnectionState {
  const status = useSyncExternalStore(wsSubscribe, wsGetStatus, wsGetStatus)

  return {
    isConnected: status === "connected",
    isReconnecting: status === "connecting",
  }
}
