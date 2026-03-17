import { RequesterPanel } from "@/components/requester/RequesterPanel"

export function AppShell() {
  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="h-10 border-b flex items-center px-2 gap-1 shrink-0">
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground">ZAP Web UI</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <RequesterPanel />
      </div>
    </div>
  )
}
