import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type { HttpRequest } from "@/components/requester/types"

export const REQUEST_HISTORY_STORAGE_KEY = "zap-request-history"
export const MAX_HISTORY_ENTRIES = 50

export interface RequestHistoryHeader {
  name: string
  value: string
}

export interface RequestHistoryEntry {
  id: string
  timestamp: string
  method: string
  url: string
  headers: RequestHistoryHeader[]
  body: string
}

export interface RequestHistoryCollection {
  entries: RequestHistoryEntry[]
  maxEntries: number
}

interface RequestHistoryStore extends RequestHistoryCollection {
  appendRequest: (request: HttpRequest) => RequestHistoryEntry
  appendEntry: (entry: RequestHistoryEntry) => void
  clearHistory: () => void
}

function createEntryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

export function cloneEntry(entry: RequestHistoryEntry): RequestHistoryEntry {
  return {
    ...entry,
    headers: entry.headers.map((header) => ({ ...header })),
  }
}

export function trimHistoryEntries(
  entries: RequestHistoryEntry[],
  maxEntries = MAX_HISTORY_ENTRIES
): RequestHistoryEntry[] {
  return entries.slice(0, maxEntries)
}

export function createRequestHistoryEntry(
  request: HttpRequest,
  now = new Date()
): RequestHistoryEntry {
  return {
    id: createEntryId(),
    timestamp: now.toISOString(),
    method: request.method,
    url: request.url,
    headers: request.headers
      .filter((header) => header.enabled && header.key)
      .map((header) => ({ name: header.key, value: header.value })),
    body: request.body,
  }
}

export const useRequestHistoryStore = create<RequestHistoryStore>()(
  persist(
    (set) => ({
      entries: [],
      maxEntries: MAX_HISTORY_ENTRIES,

      appendRequest: (request) => {
        const entry = createRequestHistoryEntry(request)
        set((state) => ({
          entries: trimHistoryEntries([entry, ...state.entries], state.maxEntries),
        }))
        return entry
      },

      appendEntry: (entry) => {
        const safeEntry = cloneEntry(entry)
        set((state) => ({
          entries: trimHistoryEntries([safeEntry, ...state.entries], state.maxEntries),
        }))
      },

      clearHistory: () => set({ entries: [] }),
    }),
    {
      name: REQUEST_HISTORY_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        entries: state.entries,
        maxEntries: state.maxEntries,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<RequestHistoryCollection> | undefined
        const maxEntries = persisted?.maxEntries ?? currentState.maxEntries
        const entries = trimHistoryEntries(
          (persisted?.entries ?? []).map((entry) => cloneEntry(entry)),
          maxEntries
        )

        return {
          ...currentState,
          ...persisted,
          entries,
          maxEntries,
        }
      },
    }
  )
)
