import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { Header } from "./headerUtils"

interface HeadersDisplayProps {
  headers: Header[]
  title?: string
  defaultExpanded?: boolean
}

export function HeadersDisplay({
  headers,
  title = "Headers",
  defaultExpanded = true,
}: HeadersDisplayProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="border rounded-md">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-accent"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
        <span className="text-muted-foreground">({headers.length})</span>
      </button>
      {expanded && (
        <div className="border-t px-3 py-2 space-y-1 bg-muted/30">
          {headers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No headers</p>
          ) : (
            headers.map((header, index) => (
              <div key={index} className="flex gap-2 text-sm font-mono">
                <span className="font-medium text-foreground shrink-0">{header.key}:</span>
                <span className="text-muted-foreground break-all">{header.value}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
