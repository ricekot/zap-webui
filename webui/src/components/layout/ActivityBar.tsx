import { cn } from "@/lib/utils"
import { useUIStore, type SidebarActivity, type BottomPanelActivity } from "@/stores/ui"
import { Globe, Logs } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ActivityBarItemProps {
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
}

function ActivityBarItem({ icon, label, isActive, onClick }: ActivityBarItemProps) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "relative flex h-12 w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground",
            isActive && "text-foreground",
            // Active indicator on the left edge
            isActive && "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-0.5 before:bg-foreground before:rounded-r"
          )}
          aria-label={label}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function ActivityBar() {
  const {
    activeSidebarItem,
    activeBottomItem,
    setActiveSidebarItem,
    setActiveBottomItem,
  } = useUIStore()

  const handleSidebarItemClick = (item: SidebarActivity) => {
    // Toggle: if already active, close it; otherwise open it
    setActiveSidebarItem(activeSidebarItem === item ? null : item)
  }

  const handleBottomItemClick = (item: BottomPanelActivity) => {
    // Toggle: if already active, close it; otherwise open it
    setActiveBottomItem(activeBottomItem === item ? null : item)
  }

  return (
    <TooltipProvider>
      <div className="flex h-full w-12 flex-col border-r bg-muted/30">
        {/* Top section - Sidebar activities */}
        <div className="flex flex-col">
          <ActivityBarItem
            icon={<Globe className="h-5 w-5" />}
            label="Sites"
            isActive={activeSidebarItem === "sites"}
            onClick={() => handleSidebarItemClick("sites")}
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom section - Bottom panel activities */}
        <div className="flex flex-col">
          <ActivityBarItem
            icon={<Logs className="h-5 w-5" />}
            label="Output"
            isActive={activeBottomItem === "output"}
            onClick={() => handleBottomItemClick("output")}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
