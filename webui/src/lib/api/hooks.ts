/**
 * TanStack Query hooks for ZAP API
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { zapView, zapAction } from "./client"
import type { AlertsResponse, Version, Mode, Sites } from "./types"

// Query key factory for consistent cache keys
export const queryKeys = {
  core: {
    version: ["core", "version"] as const,
    mode: ["core", "mode"] as const,
    sites: ["core", "sites"] as const,
  },
  alerts: {
    all: ["alerts"] as const,
    list: (params?: { baseurl?: string; start?: number; count?: number }) =>
      ["alerts", "list", params] as const,
    byId: (id: string) => ["alerts", id] as const,
  },
  ascan: {
    status: (scanId?: string) => ["ascan", "status", scanId] as const,
    scans: ["ascan", "scans"] as const,
  },
  spider: {
    status: (scanId?: string) => ["spider", "status", scanId] as const,
    scans: ["spider", "scans"] as const,
  },
}

// ============= Core API Hooks =============

export function useVersion() {
  return useQuery({
    queryKey: queryKeys.core.version,
    queryFn: () => zapView<Version>("core", "version"),
    staleTime: Infinity, // Version doesn't change during runtime
  })
}

export function useMode() {
  return useQuery({
    queryKey: queryKeys.core.mode,
    queryFn: () => zapView<Mode>("core", "mode"),
  })
}

export function useSites() {
  return useQuery({
    queryKey: queryKeys.core.sites,
    queryFn: () => zapView<Sites>("core", "sites"),
  })
}

// ============= Alerts API Hooks =============

export function useAlerts(params?: { baseurl?: string; start?: number; count?: number }) {
  return useQuery({
    queryKey: queryKeys.alerts.list(params),
    queryFn: () =>
      zapView<AlertsResponse>("core", "alerts", {
        ...(params?.baseurl && { baseurl: params.baseurl }),
        ...(params?.start !== undefined && { start: params.start }),
        ...(params?.count !== undefined && { count: params.count }),
      }),
  })
}

// ============= Active Scan API Hooks =============

export function useActiveScanStatus(scanId?: string) {
  return useQuery({
    queryKey: queryKeys.ascan.status(scanId),
    queryFn: () => zapView<{ status: string }>("ascan", "status", scanId ? { scanId } : {}),
    enabled: !!scanId,
    refetchInterval: (query) => {
      // Poll while scan is running
      const status = query.state.data?.status
      return status && parseInt(status) < 100 ? 1000 : false
    },
  })
}

export function useStartActiveScan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { url: string; recurse?: boolean; inScopeOnly?: boolean }) =>
      zapAction<{ scan: string }>("ascan", "scan", {
        url: params.url,
        ...(params.recurse !== undefined && { recurse: params.recurse }),
        ...(params.inScopeOnly !== undefined && { inScopeOnly: params.inScopeOnly }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ascan.scans })
    },
  })
}

export function useStopActiveScan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scanId: string) => zapAction<{ Result: string }>("ascan", "stop", { scanId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ascan"] })
    },
  })
}

// ============= Spider API Hooks =============

export function useSpiderStatus(scanId?: string) {
  return useQuery({
    queryKey: queryKeys.spider.status(scanId),
    queryFn: () => zapView<{ status: string }>("spider", "status", scanId ? { scanId } : {}),
    enabled: !!scanId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && parseInt(status) < 100 ? 1000 : false
    },
  })
}

export function useStartSpider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      url: string
      maxChildren?: number
      recurse?: boolean
      subtreeOnly?: boolean
    }) =>
      zapAction<{ scan: string }>("spider", "scan", {
        url: params.url,
        ...(params.maxChildren !== undefined && { maxChildren: params.maxChildren }),
        ...(params.recurse !== undefined && { recurse: params.recurse }),
        ...(params.subtreeOnly !== undefined && { subtreeOnly: params.subtreeOnly }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spider.scans })
    },
  })
}

export function useStopSpider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scanId: string) => zapAction<{ Result: string }>("spider", "stop", { scanId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spider"] })
    },
  })
}
