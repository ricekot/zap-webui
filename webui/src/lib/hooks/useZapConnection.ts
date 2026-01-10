import { useState, useEffect, useCallback } from "react"

interface ZapConnectionState {
  isConnected: boolean
  isReconnecting: boolean
}

export function useZapConnection(): ZapConnectionState {
  const [state, setState] = useState<ZapConnectionState>({
    isConnected: false,
    isReconnecting: false,
  })

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch("/api/JSON/core/view/version/")
      if (response.ok) {
        setState({ isConnected: true, isReconnecting: false })
      } else {
        setState((prev) => ({
          isConnected: false,
          isReconnecting: prev.isConnected,
        }))
      }
    } catch {
      setState((prev) => ({
        isConnected: false,
        isReconnecting: prev.isConnected,
      }))
    }
  }, [])

  useEffect(() => {
    // Use setTimeout for initial check to avoid synchronous setState
    const initialTimeout = setTimeout(checkConnection, 0)

    // Check connection every 5 seconds
    const interval = setInterval(checkConnection, 5000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [checkConnection])

  return state
}
