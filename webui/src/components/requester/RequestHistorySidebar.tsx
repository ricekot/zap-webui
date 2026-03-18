import { cn } from "@/lib/utils"
import type { RequestHistoryEntry } from "@/stores/requestHistory"
import { formatEntryTimestamp, formatEntryUrlSummary, hasEntryBody } from "./requestHistoryUtils"

interface RequestHistorySidebarProps {
  entries: RequestHistoryEntry[]
  selectedEntryId: string | null
  onSelect: (entry: RequestHistoryEntry) => void
}

export function RequestHistorySidebar({
  entries,
  selectedEntryId,
  onSelect,
}: RequestHistorySidebarProps) {
  return (
    <aside
      className="flex h-full w-80 shrink-0 flex-col border-r bg-muted/20"
      aria-label="Request history"
    >
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Request History</h2>
        <p className="text-xs text-muted-foreground">Most recent requests (max 50)</p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          Send a request to build your history.
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {entries.map((entry) => {
            const isSelected = entry.id === selectedEntryId

            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onSelect(entry)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isSelected
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border bg-background"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold">{entry.method}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatEntryTimestamp(entry.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs">
                    {formatEntryUrlSummary(entry.url)}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{entry.headers.length} headers</span>
                    {hasEntryBody(entry) && <span>Body included</span>}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
