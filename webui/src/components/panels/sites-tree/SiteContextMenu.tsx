import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useUIStore } from "@/stores/ui"
import { useTabStateStore } from "@/stores/tabState"
import { zapView } from "@/lib/api/client"
import type { SiteTreeNode } from "./SiteNode"
import { Copy, ExternalLink, Eye } from "lucide-react"

interface SiteContextMenuProps {
  node: SiteTreeNode
  children: React.ReactNode
}

interface MessageData {
  id: string
  requestHeader: string
  requestBody: string
  responseHeader: string
  responseBody: string
}

interface MessageResponse {
  message: MessageData | MessageData[]
}

export function SiteContextMenu({ node, children }: SiteContextMenuProps) {
  const { setSelectedMessageId, setActiveTab } = useUIStore()
  const { setState } = useTabStateStore()

  const handleOpenInRequester = async () => {
    if (!node.messageId) return

    try {
      // Fetch the message details
      const response = await zapView<MessageResponse>("core", "message", {
        id: node.messageId,
      })

      const msg = Array.isArray(response.message) ? response.message[0] : response.message

      if (msg) {
        // Parse the request header to extract method, URL, and headers
        const lines = msg.requestHeader.split(/\r?\n/)
        const requestLine = lines[0]
        const requestMatch = requestLine.match(/^(\w+)\s+(\S+)\s+HTTP/)
        const method = requestMatch ? requestMatch[1] : "GET"
        const url = requestMatch ? requestMatch[2] : node.url || ""

        // Parse headers (skip request line, stop at empty line)
        const headers: Array<{ key: string; value: string; enabled: boolean }> = []
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i]
          if (!line || line === "\r") break
          const colonIndex = line.indexOf(":")
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim()
            // Skip Host header as it's auto-added
            if (key.toLowerCase() !== "host") {
              headers.push({
                key,
                value: line.substring(colonIndex + 1).trim(),
                enabled: true,
              })
            }
          }
        }

        // Add empty header row for user to add more
        headers.push({ key: "", value: "", enabled: true })

        // Update requester state
        setState("requester", {
          request: {
            method,
            url,
            headers,
            body: msg.requestBody || "",
          },
          response: null,
          error: null,
        })
      }
    } catch (error) {
      console.error("Failed to fetch message for requester:", error)
    }

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
