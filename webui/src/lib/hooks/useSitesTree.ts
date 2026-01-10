import { useQuery } from "@tanstack/react-query"
import { zapView } from "@/lib/api/client"
import type { SiteTreeNode } from "@/components/panels/sites-tree/SiteNode"

interface SiteTreeResponse {
  siteNodes: Array<{
    site: string
    children?: Array<{
      name: string
      hRef: string
      method?: string
      statusCode?: string
      responseLength?: string
      messageId?: string
      children?: unknown[]
    }>
  }>
}

// Transform ZAP API response to our tree structure
function transformSiteTree(response: SiteTreeResponse): SiteTreeNode[] {
  if (!response.siteNodes) return []

  return response.siteNodes.map((site) => {
    const host = new URL(site.site).host
    return {
      id: site.site,
      name: host,
      type: "host" as const,
      url: site.site,
      children: site.children ? transformChildren(site.children, site.site) : [],
    }
  })
}

function transformChildren(
  children: SiteTreeResponse["siteNodes"][0]["children"],
  basePath: string
): SiteTreeNode[] {
  if (!children) return []

  return children.map((child) => {
    const isEndpoint = !child.children || child.children.length === 0
    const id = `${basePath}/${child.name}`

    return {
      id,
      name: child.name || "/",
      type: isEndpoint ? ("endpoint" as const) : ("folder" as const),
      method: child.method,
      statusCode: child.statusCode ? parseInt(child.statusCode, 10) : undefined,
      responseSize: child.responseLength
        ? parseInt(child.responseLength, 10)
        : undefined,
      messageId: child.messageId,
      url: child.hRef,
      children: child.children
        ? transformChildren(
            child.children as SiteTreeResponse["siteNodes"][0]["children"],
            id
          )
        : undefined,
    }
  })
}

export function useSitesTree() {
  return useQuery({
    queryKey: ["sitesTree"],
    queryFn: async () => {
      const response = await zapView<SiteTreeResponse>("core", "sitesTree")
      return transformSiteTree(response)
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  })
}
