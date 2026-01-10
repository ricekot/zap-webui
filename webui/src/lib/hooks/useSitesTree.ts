import { useState, useEffect } from "react"
import type { SiteTreeNode } from "@/components/panels/sites-tree/SiteNode"
import {
  wsAddEventHandler,
  wsGetStatus,
  wsSubscribe,
  wsSend,
  type ZapEvent,
} from "./useZapEvents"

/**
 * Raw node data from the WebSocket API
 * This matches the format from WebUiEventEndpoint.serializeSiteNode()
 */
interface RawSiteNode {
  node: string
  hierarchicNodeName: string
  url?: string
  method?: string
  statusCode?: number
  responseLength?: number
  messageId?: number
  children?: RawSiteNode[]
}

/**
 * Transforms a raw site node from the WebSocket API into our UI tree node format
 */
function transformNode(raw: RawSiteNode, parentPath: string = ""): SiteTreeNode {
  // Build a unique ID from the hierarchic path
  const id = raw.hierarchicNodeName || `${parentPath}/${raw.node}`

  // Determine node type based on the node content
  const isRoot = raw.node === "Sites"
  const hasChildren = raw.children && raw.children.length > 0

  // Extract host from URL for host-level nodes
  let name = raw.node
  let type: "host" | "folder" | "endpoint" = "endpoint"

  if (isRoot) {
    type = "folder"
    name = "Sites"
  } else if (raw.url) {
    try {
      const url = new URL(raw.url)
      // If the node name matches the host pattern, it's a host node
      if (raw.node.includes("://") || raw.node === url.host) {
        type = "host"
        name = url.host
      } else if (hasChildren) {
        type = "folder"
      }
    } catch {
      // If URL parsing fails, determine type by children presence
      type = hasChildren ? "folder" : "endpoint"
    }
  } else if (hasChildren) {
    type = "folder"
  }

  const node: SiteTreeNode = {
    id,
    name,
    type,
    method: raw.method,
    statusCode: raw.statusCode,
    responseSize: raw.responseLength,
    messageId: raw.messageId?.toString(),
    url: raw.url,
  }

  if (raw.children && raw.children.length > 0) {
    node.children = raw.children.map((child) => transformNode(child, id))
  }

  return node
}

/**
 * Inserts a node into the tree at the correct position based on its hierarchicNodeName
 */
function insertNodeIntoTree(
  tree: SiteTreeNode[],
  newNode: RawSiteNode
): SiteTreeNode[] {
  const pathParts = newNode.hierarchicNodeName.split(" - ")

  // Skip the "Sites" root prefix
  if (pathParts[0] === "Sites") {
    pathParts.shift()
  }

  if (pathParts.length === 0) {
    // This is a root-level node (shouldn't happen, but handle it)
    return tree
  }

  // First part is the host
  const hostPart = pathParts[0]
  let hostNode = tree.find((n) => n.name === hostPart || n.id.includes(hostPart))

  if (!hostNode) {
    // Need to create a new host node
    const transformedNode = transformNode(newNode)
    // If this is a host-level node, add it directly
    if (pathParts.length === 1) {
      return [...tree, transformedNode]
    }
    // Otherwise create a host node with this as a child
    hostNode = {
      id: hostPart,
      name: hostPart,
      type: "host",
      url: newNode.url,
      children: [],
    }
    tree = [...tree, hostNode]
  }

  if (pathParts.length === 1) {
    // This is the host node itself, update it with the new data
    return tree.map((n) =>
      n.id === hostNode!.id ? { ...n, ...transformNode(newNode) } : n
    )
  }

  // Navigate to the correct parent and insert
  const insertAtPath = (
    nodes: SiteTreeNode[],
    parts: string[],
    depth: number
  ): SiteTreeNode[] => {
    if (depth >= parts.length - 1) {
      // We're at the parent level, insert the new node
      const transformedNode = transformNode(newNode)
      const existingIndex = nodes.findIndex((n) => n.id === transformedNode.id)
      if (existingIndex >= 0) {
        // Update existing node
        const updated = [...nodes]
        updated[existingIndex] = { ...updated[existingIndex], ...transformedNode }
        return updated
      }
      return [...nodes, transformedNode]
    }

    const currentPart = parts[depth]
    return nodes.map((node) => {
      if (node.name === currentPart || node.id.includes(currentPart)) {
        return {
          ...node,
          children: insertAtPath(node.children || [], parts, depth + 1),
        }
      }
      return node
    })
  }

  return insertAtPath(tree, pathParts, 0)
}

// Module-level state for the sites tree
let sitesTree: SiteTreeNode[] | undefined = undefined
let sitesTreeLoading = true
let sitesTreeError: Error | null = null
const sitesTreeListeners = new Set<() => void>()
let treeRequestPending = false

function notifyListeners() {
  sitesTreeListeners.forEach((listener) => listener())
}

function subscribeSitesTree(listener: () => void) {
  sitesTreeListeners.add(listener)
  return () => {
    sitesTreeListeners.delete(listener)
  }
}

function getSitesTreeSnapshot() {
  return { data: sitesTree, isLoading: sitesTreeLoading, error: sitesTreeError }
}

interface UseSitesTreeResult {
  data: SiteTreeNode[] | undefined
  isLoading: boolean
  error: Error | null
}

/**
 * Hook for managing the sites tree via WebSocket.
 * - Requests the full tree on initial connection
 * - Listens for sitenode.added events to update the tree incrementally
 */
export function useSitesTree(): UseSitesTreeResult {
  // Force re-render when tree changes
  const [, forceUpdate] = useState({})

  // Subscribe to tree changes
  useEffect(() => {
    const unsubscribe = subscribeSitesTree(() => forceUpdate({}))
    return unsubscribe
  }, [])

  // Subscribe to WebSocket status changes to request tree when connected
  useEffect(() => {
    const handleStatusChange = (newStatus: string) => {
      if (newStatus === "connected" && !treeRequestPending) {
        // Request the full sites tree when we connect
        treeRequestPending = true
        sitesTreeLoading = true
        notifyListeners()
        wsSend({ type: "getSitesTree" })
      } else if (newStatus === "disconnected" || newStatus === "error") {
        // Reset request pending flag so we request again on reconnect
        treeRequestPending = false
      }
    }

    // Check current status immediately
    const currentStatus = wsGetStatus()
    if (currentStatus === "connected" && !treeRequestPending) {
      treeRequestPending = true
      sitesTreeLoading = true
      notifyListeners()
      wsSend({ type: "getSitesTree" })
    }

    return wsSubscribe(handleStatusChange)
  }, [])

  // Subscribe to WebSocket events
  useEffect(() => {
    const handleEvent = (event: ZapEvent) => {
      switch (event.type) {
        case "sitesTree":
          // Initial full tree load
          treeRequestPending = false
          if (event.data) {
            const root = transformNode(event.data as RawSiteNode)
            // The root node is "Sites", we want its children as the top-level
            sitesTree = root.children || []
          } else {
            sitesTree = []
          }
          sitesTreeLoading = false
          sitesTreeError = null
          notifyListeners()
          break

        case "sitesTree.error":
          treeRequestPending = false
          sitesTreeError = new Error("Failed to load sites tree")
          sitesTreeLoading = false
          notifyListeners()
          break

        case "sitenode.added":
          // Incremental update - insert the new node into the tree
          if (event.data && sitesTree) {
            sitesTree = insertNodeIntoTree(sitesTree, event.data as RawSiteNode)
            notifyListeners()
          }
          break
      }
    }

    return wsAddEventHandler(handleEvent)
  }, [])

  return getSitesTreeSnapshot()
}
