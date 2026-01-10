import { ChevronRight, ChevronDown, Globe, Folder, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { SiteContextMenu } from "./SiteContextMenu"
import { useUIStore } from "@/stores/ui"

export interface SiteTreeNode {
  id: string
  name: string
  type: "host" | "folder" | "endpoint"
  method?: string
  statusCode?: number
  responseSize?: number
  alertSeverity?: "high" | "medium" | "low" | "info"
  children?: SiteTreeNode[]
  messageId?: string
  url?: string
}

interface SiteNodeProps {
  node: SiteTreeNode
  depth: number
  expandedNodes: Set<string>
  onToggle: (nodeId: string) => void
}

const severityColors = {
  high: "text-red-500",
  medium: "text-orange-500",
  low: "text-yellow-500",
  info: "text-blue-500",
}

const methodColors: Record<string, string> = {
  GET: "text-green-600",
  POST: "text-blue-600",
  PUT: "text-orange-600",
  DELETE: "text-red-600",
  PATCH: "text-purple-600",
}

export function SiteNode({ node, depth, expandedNodes, onToggle }: SiteNodeProps) {
  const isExpanded = expandedNodes.has(node.id)
  const hasChildren = node.children && node.children.length > 0
  const { setSelectedMessageId, setActiveTab } = useUIStore()

  const handleClick = () => {
    if (hasChildren) {
      onToggle(node.id)
    } else if (node.messageId) {
      setSelectedMessageId(node.messageId)
      setActiveTab("request-viewer")
    }
  }

  const handleDoubleClick = () => {
    if (node.messageId) {
      setSelectedMessageId(node.messageId)
      setActiveTab("request-viewer")
    }
  }

  const Icon = node.type === "host" ? Globe : node.type === "folder" ? Folder : FileText

  return (
    <SiteContextMenu node={node}>
      <div>
        <div
          className={cn(
            "flex items-center gap-1 px-1 py-0.5 rounded-sm cursor-pointer hover:bg-accent text-sm",
            node.alertSeverity && "font-medium"
          )}
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          {hasChildren ? (
            <button
              className="p-0.5 hover:bg-accent rounded"
              onClick={(e) => {
                e.stopPropagation()
                onToggle(node.id)
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              node.alertSeverity && severityColors[node.alertSeverity]
            )}
          />

          {node.method && (
            <span
              className={cn(
                "text-xs font-mono shrink-0",
                methodColors[node.method] || "text-muted-foreground"
              )}
            >
              {node.method}
            </span>
          )}

          <span className="truncate flex-1">{node.name}</span>

          {node.statusCode && (
            <span
              className={cn(
                "text-xs font-mono shrink-0",
                node.statusCode >= 200 && node.statusCode < 300
                  ? "text-green-600"
                  : node.statusCode >= 400
                  ? "text-red-600"
                  : "text-muted-foreground"
              )}
            >
              {node.statusCode}
            </span>
          )}

          {node.responseSize !== undefined && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatBytes(node.responseSize)}
            </span>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children!.map((child) => (
              <SiteNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}
      </div>
    </SiteContextMenu>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
