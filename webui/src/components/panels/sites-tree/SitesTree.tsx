import { useState } from "react"
import { SiteNode } from "./SiteNode"
import { useSitesTree } from "@/lib/hooks/useSitesTree"
import { Loader2 } from "lucide-react"

export function SitesTree() {
  const { data: sites, isLoading, error } = useSitesTree()
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm">Loading sites...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load sites tree
      </div>
    )
  }

  if (!sites || sites.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No sites discovered yet. Spider a URL to get started.
      </div>
    )
  }

  return (
    <div className="p-1">
      {sites.map((node) => (
        <SiteNode
          key={node.id}
          node={node}
          depth={0}
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
        />
      ))}
    </div>
  )
}
