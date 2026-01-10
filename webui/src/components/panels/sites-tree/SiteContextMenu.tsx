import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useUIStore } from "@/stores/ui"
import type { SiteTreeNode } from "./SiteNode"
import { Copy, ExternalLink, Send, Eye } from "lucide-react"

interface SiteContextMenuProps {
  node: SiteTreeNode
  children: React.ReactNode
}

export function SiteContextMenu({ node, children }: SiteContextMenuProps) {
  const { setSelectedMessageId, setActiveTab } = useUIStore()

  const handleOpenInRequester = () => {
    // TODO: Populate requester with this request
    setActiveTab("requester")
  }

  const handleOpenInViewer = () => {
    if (node.messageId) {
      setSelectedMessageId(node.messageId)
      setActiveTab("request-viewer")
    }
  }

  const handleCopyUrl = async () => {
    if (node.url) {
      await navigator.clipboard.writeText(node.url)
    }
  }

  const handleResend = () => {
    // TODO: Implement resend functionality
    console.log("Resend request:", node.messageId)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {node.type === "endpoint" && node.messageId && (
          <>
            <ContextMenuItem onClick={handleOpenInViewer}>
              <Eye className="mr-2 h-4 w-4" />
              View Request/Response
            </ContextMenuItem>
            <ContextMenuItem onClick={handleOpenInRequester}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Requester
            </ContextMenuItem>
            <ContextMenuItem onClick={handleResend}>
              <Send className="mr-2 h-4 w-4" />
              Resend Request
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        {node.url && (
          <ContextMenuItem onClick={handleCopyUrl}>
            <Copy className="mr-2 h-4 w-4" />
            Copy URL
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
