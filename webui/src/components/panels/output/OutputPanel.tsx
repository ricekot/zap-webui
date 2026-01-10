import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUIStore } from "@/stores/ui"
import { OutputLog } from "./OutputLog"
import { cn } from "@/lib/utils"
import { Circle } from "lucide-react"
import { useZapConnection } from "@/lib/hooks/useZapConnection"

export function OutputPanel() {
  const { outputFilter, setOutputFilter } = useUIStore()
  const { isConnected, isReconnecting } = useZapConnection()

  return (
    <div className="h-full flex flex-col border-t bg-muted/30">
      <div className="h-9 border-b px-2 flex items-center justify-between shrink-0">
        <Tabs
          value={outputFilter}
          onValueChange={(v) => setOutputFilter(v as "all" | "spider" | "scanner")}
        >
          <TabsList className="h-7 bg-transparent p-0 gap-1">
            <TabsTrigger value="all" className="h-6 px-2 text-xs data-[state=active]:bg-muted">
              All
            </TabsTrigger>
            <TabsTrigger value="spider" className="h-6 px-2 text-xs data-[state=active]:bg-muted">
              Spider
            </TabsTrigger>
            <TabsTrigger value="scanner" className="h-6 px-2 text-xs data-[state=active]:bg-muted">
              Scanner
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs",
              isConnected ? "text-green-600" : isReconnecting ? "text-yellow-600" : "text-red-600"
            )}
          >
            <Circle className={cn("h-2 w-2 fill-current", isReconnecting && "animate-pulse")} />
            <span>
              {isConnected ? "Connected" : isReconnecting ? "Reconnecting..." : "Disconnected"}
            </span>
          </div>
        </div>
      </div>
      <OutputLog filter={outputFilter} />
    </div>
  )
}
