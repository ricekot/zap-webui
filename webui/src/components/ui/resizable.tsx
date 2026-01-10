import { GripHorizontal, GripVertical } from "lucide-react"
import { Group, Panel, Separator } from "react-resizable-panels"
import type { GroupProps, PanelProps, SeparatorProps } from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({ className, ...props }: GroupProps) => (
  <Group className={cn("flex h-full w-full", className)} {...props} />
)

const ResizablePanel = Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: Omit<SeparatorProps, "children"> & {
  withHandle?: boolean
}) => (
  <Separator
    className={cn(
      "group relative flex w-1 items-center justify-center bg-border hover:bg-primary/20 transition-colors cursor-col-resize",
      "aria-[orientation=horizontal]:h-1 aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:cursor-row-resize",
      className
    )}
    {...props}
  >
    {withHandle && (
      <>
        {/* Vertical grip (for vertical separator - side by side panels) */}
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border group-aria-[orientation=horizontal]:hidden">
          <GripVertical className="h-2.5 w-2.5" />
        </div>
        {/* Horizontal grip (for horizontal separator - stacked panels) */}
        <div className="z-10 hidden h-3 w-4 items-center justify-center rounded-sm border bg-border group-aria-[orientation=horizontal]:flex">
          <GripHorizontal className="h-2.5 w-2.5" />
        </div>
      </>
    )}
  </Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
export type { GroupProps as ResizablePanelGroupProps, PanelProps as ResizablePanelProps }
