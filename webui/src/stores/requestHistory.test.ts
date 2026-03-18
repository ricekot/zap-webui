import { beforeEach, describe, expect, it } from "vitest"
import type { HttpRequest } from "@/components/requester/types"
import {
  MAX_HISTORY_ENTRIES,
  REQUEST_HISTORY_STORAGE_KEY,
  useRequestHistoryStore,
} from "./requestHistory"

function createRequest(overrides: Partial<HttpRequest> = {}): HttpRequest {
  return {
    method: "GET",
    url: "https://example.com",
    headers: [{ key: "Accept", value: "application/json", enabled: true }],
    body: "",
    ...overrides,
  }
}

describe("requestHistory store", () => {
  beforeEach(() => {
    localStorage.clear()
    useRequestHistoryStore.setState({ entries: [], maxEntries: MAX_HISTORY_ENTRIES })
  })

  it("appends newest entries first with unique IDs", () => {
    const first = useRequestHistoryStore
      .getState()
      .appendRequest(createRequest({ url: "https://example.com/1" }))
    const second = useRequestHistoryStore
      .getState()
      .appendRequest(createRequest({ url: "https://example.com/2" }))

    const entries = useRequestHistoryStore.getState().entries

    expect(entries).toHaveLength(2)
    expect(entries[0].url).toBe("https://example.com/2")
    expect(entries[1].url).toBe("https://example.com/1")
    expect(first.id).not.toBe(second.id)
  })

  it("trims history to a max of 50 entries", () => {
    for (let index = 0; index < 60; index += 1) {
      useRequestHistoryStore
        .getState()
        .appendRequest(createRequest({ url: `https://example.com/${index}` }))
    }

    const entries = useRequestHistoryStore.getState().entries

    expect(entries).toHaveLength(MAX_HISTORY_ENTRIES)
    expect(entries[0].url).toBe("https://example.com/59")
    expect(entries[MAX_HISTORY_ENTRIES - 1].url).toBe("https://example.com/10")
  })

  it("persists entries to local storage", () => {
    useRequestHistoryStore
      .getState()
      .appendRequest(
        createRequest({ method: "POST", url: "https://example.com/persist", body: "payload" })
      )

    const raw = localStorage.getItem(REQUEST_HISTORY_STORAGE_KEY)
    const persisted = raw
      ? (JSON.parse(raw) as { state: { entries: Array<{ url: string }> } })
      : null

    expect(persisted?.state.entries).toHaveLength(1)
    expect(persisted?.state.entries[0].url).toBe("https://example.com/persist")
  })

  it("rehydrates persisted entries", async () => {
    localStorage.setItem(
      REQUEST_HISTORY_STORAGE_KEY,
      JSON.stringify({
        state: {
          entries: [
            {
              id: "persisted-id",
              timestamp: "2026-03-17T00:00:00.000Z",
              method: "GET",
              url: "https://example.com/rehydrated",
              headers: [{ name: "Accept", value: "application/json" }],
              body: "",
            },
          ],
          maxEntries: MAX_HISTORY_ENTRIES,
        },
        version: 0,
      })
    )

    await useRequestHistoryStore.persist.rehydrate()

    const entry = useRequestHistoryStore.getState().entries[0]
    expect(entry.url).toBe("https://example.com/rehydrated")

    entry.headers[0].name = "Mutated"
    await useRequestHistoryStore.persist.rehydrate()

    expect(useRequestHistoryStore.getState().entries[0].headers[0].name).toBe("Accept")
  })
})
