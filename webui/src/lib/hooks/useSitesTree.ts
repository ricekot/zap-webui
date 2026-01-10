import { useState, useEffect } from "react"
import type { SiteTreeNode } from "@/components/panels/sites-tree/SiteNode"
import { wsAddEventHandler, wsGetStatus, wsSubscribe, wsSend, type ZapEvent } from "./useZapEvents"

/**
 * Raw node data from the WebSocket API
 * This matches the format from WebUiEventEndpoint.serializeSiteNode()
 */
export interface RawSiteNode {
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
export function transformNode(raw: RawSiteNode, parentPath: string = ""): SiteTreeNode {
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
        // Include protocol to distinguish http:// vs https://
        name = `${url.protocol}//${url.host}`
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

  // Strip method prefix from name (e.g., "GET:resource" -> "resource")
  // The method is already available in raw.method for endpoints
  if (name.includes(":") && raw.method) {
    const methodPrefix = `${raw.method}:`
    if (name.startsWith(methodPrefix)) {
      name = name.slice(methodPrefix.length)
    }
  }

  const node: SiteTreeNode = {
    id,
    name,
    type,
    // Only include method for leaf nodes (endpoints)
    method: type === "endpoint" ? raw.method : undefined,
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
export function insertNodeIntoTree(tree: SiteTreeNode[], newNode: RawSiteNode): SiteTreeNode[] {
  // hierarchicNodeName is a URL like "https://example.com/path/to/resource"
  // Parse it to extract host and path segments
  let hostPart: string
  let pathSegments: string[] = []

  try {
    const url = new URL(newNode.hierarchicNodeName)
    // Host includes protocol for matching (e.g., "https://example.com")
    hostPart = `${url.protocol}//${url.host}`
    // Path segments, filtering out empty strings from leading/trailing slashes
    pathSegments = url.pathname.split("/").filter((s) => s.length > 0)
  } catch {
    // Fallback: if not a valid URL, treat the whole thing as the node name
    // This shouldn't happen based on the data format, but handle it gracefully
    const transformedNode = transformNode(newNode)
    return [...tree, transformedNode]
  }

  // Find the host node - match by name (protocol://host) or URL
  let hostNode = tree.find((n) => {
    // Direct match on name (now includes protocol)
    if (n.name === hostPart) return true
    // Try to match the host part of the URL
    try {
      const nodeUrl = n.url ? new URL(n.url) : null
      if (nodeUrl && `${nodeUrl.protocol}//${nodeUrl.host}` === hostPart) {
        return true
      }
    } catch {
      // Ignore URL parsing errors
    }
    // Fallback: check by id
    return n.id === hostPart
  })

  if (!hostNode) {
    // Need to create a new host node
    const transformedNode = transformNode(newNode)
    // If this is a host-level node (no path segments), add it directly
    if (pathSegments.length === 0) {
      return [...tree, transformedNode]
    }
    // Otherwise create a host node - use hostPart (protocol://host) as name
    hostNode = {
      id: hostPart,
      name: hostPart,
      type: "host" as const,
      url: newNode.url,
      children: [],
    }
    tree = [...tree, hostNode]
  }

  if (pathSegments.length === 0) {
    // This is the host node itself, update it with the new data
    return tree.map((n) => (n === hostNode ? { ...n, ...transformNode(newNode) } : n))
  }

  // Navigate to the correct parent within the host and insert
  const insertAtPath = (
    nodes: SiteTreeNode[],
    segments: string[],
    depth: number
  ): SiteTreeNode[] => {
    if (depth >= segments.length - 1) {
      // We're at the parent level, insert the new node
      const transformedNode = transformNode(newNode)
      const existingIndex = nodes.findIndex((n) => n.id === transformedNode.id)
      if (existingIndex >= 0) {
        // Update existing node
        const updated = [...nodes]
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...transformedNode,
        }
        return updated
      }
      return [...nodes, transformedNode]
    }

    const currentSegment = segments[depth]
    const existingNode = nodes.find((n) => n.name === currentSegment)

    if (existingNode) {
      // Node exists, recurse into it
      return nodes.map((node) => {
        if (node === existingNode) {
          return {
            ...node,
            children: insertAtPath(node.children || [], segments, depth + 1),
          }
        }
        return node
      })
    } else {
      // Intermediate node doesn't exist, create a folder node
      const folderPath = segments.slice(0, depth + 1).join("/")
      const newFolder: SiteTreeNode = {
        id: `${hostPart}/${folderPath}`,
        name: currentSegment,
        type: "folder",
        children: insertAtPath([], segments, depth + 1),
      }
      return [...nodes, newFolder]
    }
  }

  // Insert into the host node's children
  return tree.map((n) => {
    if (n === hostNode) {
      return {
        ...n,
        children: insertAtPath(n.children || [], pathSegments, 0),
      }
    }
    return n
  })
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
