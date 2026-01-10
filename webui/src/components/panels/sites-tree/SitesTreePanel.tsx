import { ScrollArea } from "@/components/ui/scroll-area"
import { SitesTree } from "./SitesTree"

export function SitesTreePanel() {
  return (
    <div className="h-full flex flex-col border-r">
      <div className="h-9 border-b px-3 flex items-center shrink-0">
        <span className="text-sm font-medium">Sites</span>
      </div>
      <ScrollArea className="flex-1">
        <SitesTree />
      </ScrollArea>
    </div>
  )
}
