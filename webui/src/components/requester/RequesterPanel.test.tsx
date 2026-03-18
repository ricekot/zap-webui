import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import type { HttpRequest, HttpResponse } from "./types"
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
  }: {
    request: HttpRequest
    onChange: (request: HttpRequest) => void
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
    </div>
  ),
}))

vi.mock("./ResponseViewer", () => ({
  ResponseViewer: ({
    response,
    error,
    isLoading,
  }: {
    response: HttpResponse | null
    error: string | null
    isLoading: boolean
  }) => (
    <div>
      <p data-testid="viewer-loading">{isLoading ? "loading" : "idle"}</p>
      <p data-testid="viewer-error">{error ?? "none"}</p>
      <p data-testid="viewer-status">{response ? `${response.statusCode}` : "none"}</p>
    </div>
  ),
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

function createResponse(statusCode: number): HttpResponse {
  return {
    statusCode,
    statusText: "OK",
    time: 12,
    size: 128,
    headers: [{ key: "Content-Type", value: "application/json" }],
    body: "{}",
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
    await user.click(screen.getByRole("button", { name: "Send" }))

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

  it("loads saved response when history entry includes one", async () => {
    const user = userEvent.setup()
    useRequestHistoryStore.setState({
      entries: [createHistoryEntry({ id: "with-response", response: createResponse(201) })],
      maxEntries: 50,
    })

    render(<RequesterPanel />)

    await user.click(screen.getByRole("button", { name: /https:\/\/example.com\/replay/i }))

    expect(screen.getByTestId("viewer-status")).toHaveTextContent("201")
  })

  it("clears current response when selecting legacy entry without response", async () => {
    const user = userEvent.setup()
    useRequestHistoryStore.setState({
      entries: [
        createHistoryEntry({ id: "legacy-entry" }),
        createHistoryEntry({
          id: "with-response",
          url: "https://example.com/with-response",
          response: createResponse(202),
        }),
      ],
      maxEntries: 50,
    })

    render(<RequesterPanel />)

    await user.click(screen.getByRole("button", { name: /https:\/\/example.com\/with-response/i }))
    expect(screen.getByTestId("viewer-status")).toHaveTextContent("202")

    await user.click(screen.getByRole("button", { name: /https:\/\/example.com\/replay/i }))
    expect(screen.getByTestId("viewer-status")).toHaveTextContent("none")
  })
})
