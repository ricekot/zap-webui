import { useState, useCallback } from "react"

export interface LogEntry {
  id: string
  timestamp: Date
  message: string
  source: "all" | "spider" | "scanner"
  level: "info" | "warning" | "error"
}

interface OutputLogsState {
  logs: LogEntry[]
  addLog: (log: Omit<LogEntry, "id" | "timestamp">) => void
  clearLogs: () => void
}

// Simple incrementing ID generator
let logIdCounter = 0
function generateLogId(): string {
  return `log-${++logIdCounter}`
}

export function useOutputLogs(): OutputLogsState {
  const [logs, setLogs] = useState<LogEntry[]>(() => [
    // Initialize with a welcome log
    {
      id: generateLogId(),
      timestamp: new Date(),
      message: "ZAP Web UI initialized",
      source: "all",
      level: "info",
    },
  ])

  const addLog = useCallback(
    (log: Omit<LogEntry, "id" | "timestamp">) => {
      setLogs((prev) => [
        ...prev.slice(-999), // Keep only last 1000 logs
        {
          ...log,
          id: generateLogId(),
          timestamp: new Date(),
        },
      ])
    },
    []
  )

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return { logs, addLog, clearLogs }
}
