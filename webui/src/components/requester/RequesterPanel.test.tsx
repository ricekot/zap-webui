import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import type { HttpRequest } from "./types"
import { useRequestHistoryStore, type RequestHistoryEntry } from "@/stores/requestHistory"
import { useTabStateStore } from "@/stores/tabState"
import { RequesterPanel } from "./RequesterPanel"

const zapActionMock = vi.fn()

vi.mock("@/lib/api", () => ({
  zapAction: (...args: unknown[]) => zapActionMock(...args),
}))

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResizablePanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div data-testid="resize-handle" />,
}))

vi.mock("./RequestEditor", () => ({
  RequestEditor: ({
    request,
    onChange,
    onSend,
  }: {
    request: HttpRequest
    onChange: (request: HttpRequest) => void
    onSend: () => void
  }) => (
    <div>
      <p data-testid="editor-method">{request.method}</p>
      <p data-testid="editor-url">{request.url}</p>
      <p data-testid="editor-body">{request.body}</p>
      <p data-testid="editor-headers">{request.headers.length}</p>
      <button
        type="button"
        onClick={() => onChange({ ...request, url: `${request.url}/edited`, body: "edited" })}
      >
        mutate-request
      </button>
      <button type="button" onClick={onSend}>
        send-request
      </button>
    </div>
  ),
}))

vi.mock("./ResponseViewer", () => ({
  ResponseViewer: () => <div>response-viewer</div>,
}))

function createHistoryEntry(overrides: Partial<RequestHistoryEntry> = {}): RequestHistoryEntry {
  return {
    id: "history-1",
    timestamp: "2026-03-17T00:00:00.000Z",
    method: "POST",
    url: "https://example.com/replay",
    headers: [{ name: "Content-Type", value: "application/json" }],
    body: '{"key":"value"}',
    ...overrides,
  }
}

describe("RequesterPanel replay flow", () => {
  beforeEach(() => {
    zapActionMock.mockReset()
    localStorage.clear()
    useTabStateStore.getState().clearAll()
    useRequestHistoryStore.setState({ entries: [], maxEntries: 50 })
  })

  it("loads selected history entry into editor without auto-sending", async () => {
    const user = userEvent.setup()
    useRequestHistoryStore.setState({ entries: [createHistoryEntry()], maxEntries: 50 })

    render(<RequesterPanel />)

    await user.click(screen.getByRole("button", { name: /https:\/\/example.com\/replay/i }))

    expect(screen.getByTestId("editor-method")).toHaveTextContent("POST")
    expect(screen.getByTestId("editor-url")).toHaveTextContent("https://example.com/replay")
    expect(screen.getByTestId("editor-body")).toHaveTextContent('{"key":"value"}')
    expect(screen.getByTestId("editor-headers")).toHaveTextContent("1")
    expect(zapActionMock).not.toHaveBeenCalled()
  })

  it("records send attempts even when send fails", async () => {
    const user = userEvent.setup()
    zapActionMock.mockRejectedValue(new Error("network failed"))
    useRequestHistoryStore.setState({ entries: [createHistoryEntry()], maxEntries: 50 })

    render(<RequesterPanel />)

    await user.click(screen.getByRole("button", { name: /https:\/\/example.com\/replay/i }))
    await user.click(screen.getByRole("button", { name: "send-request" }))

    await waitFor(() => {
      expect(useRequestHistoryStore.getState().entries).toHaveLength(2)
    })
  })

  it("keeps stored history entries immutable after reload and edit", async () => {
    const user = userEvent.setup()
    const storedEntry = createHistoryEntry({ id: "immutable-entry" })
    useRequestHistoryStore.setState({ entries: [storedEntry], maxEntries: 50 })

    render(<RequesterPanel />)

    await user.click(screen.getByRole("button", { name: /https:\/\/example.com\/replay/i }))
    await user.click(screen.getByRole("button", { name: "mutate-request" }))

    const latestStored = useRequestHistoryStore.getState().entries[0]

    expect(latestStored.url).toBe("https://example.com/replay")
    expect(latestStored.body).toBe('{"key":"value"}')
    expect(latestStored.headers[0].name).toBe("Content-Type")
  })
})
