import { useRef, useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useOutputLogs, type LogEntry } from "@/lib/hooks/useOutputLogs"
import { cn } from "@/lib/utils"

interface OutputLogProps {
  filter: "all" | "spider" | "scanner"
}

export function OutputLog({ filter }: OutputLogProps) {
  const { logs } = useOutputLogs()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Filter logs based on the selected filter
  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true
    return log.source === filter
  })

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filteredLogs, autoScroll])

  // Detect manual scroll to pause auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const isAtBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 10
    setAutoScroll(isAtBottom)
  }

  if (filteredLogs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        No output yet
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div ref={scrollRef} onScroll={handleScroll} className="p-2 font-mono text-xs space-y-0.5">
        {filteredLogs.map((log) => (
          <LogLine key={log.id} log={log} />
        ))}
      </div>
    </ScrollArea>
  )
}

function LogLine({ log }: { log: LogEntry }) {
  return (
    <div
      className={cn(
        "flex gap-2 py-0.5 hover:bg-accent/50 rounded px-1",
        log.level === "error" && "text-red-600",
        log.level === "warning" && "text-yellow-600"
      )}
    >
      <span className="text-muted-foreground shrink-0">{formatTime(log.timestamp)}</span>
      {log.source !== "all" && (
        <span
          className={cn(
            "shrink-0 uppercase text-[10px] px-1 rounded",
            log.source === "spider" && "bg-blue-100 text-blue-700",
            log.source === "scanner" && "bg-purple-100 text-purple-700"
          )}
        >
          {log.source}
        </span>
      )}
      <span className="break-all">{log.message}</span>
    </div>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}
