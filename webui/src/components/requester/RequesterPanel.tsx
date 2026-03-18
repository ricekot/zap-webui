import { RequestEditor } from "./RequestEditor"
import { RequestHistorySidebar } from "./RequestHistorySidebar"
import { ResponseViewer } from "./ResponseViewer"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { useTabState } from "@/stores/tabState"
import { useRequestHistoryStore } from "@/stores/requestHistory"
import { buildRawRequest, injectAutoHeaders, parseZapResponse } from "./requesterUtils"
import type { ZapMessage } from "@/lib/api/types"
import { zapAction } from "@/lib/api"
import type { HttpRequest, HttpResponse, RequesterState } from "./types"
import { defaultRequesterState } from "./types"

export function RequesterPanel() {
  const [state, setState] = useTabState<RequesterState>("requester", defaultRequesterState)
  const [isLoading, setIsLoading] = useTabState("requester-loading", false)
  const [selectedEntryId, setSelectedEntryId] = useTabState<string | null>(
    "requester-history-selected",
    null
  )
  const historyEntries = useRequestHistoryStore((historyState) => historyState.entries)
  const appendRequest = useRequestHistoryStore((historyState) => historyState.appendRequest)

  const { request, response, error } = state

  const setRequest = (newRequest: HttpRequest) => {
    setState((prev) => ({ ...prev, request: newRequest }))
  }

  const setResponse = (newResponse: HttpResponse | null) => {
    setState((prev) => ({ ...prev, response: newResponse }))
  }

  const setError = (newError: string | null) => {
    setState((prev) => ({ ...prev, error: newError }))
  }

  const handleHistorySelect = (entryId: string) => {
    const entry = historyEntries.find((historyEntry) => historyEntry.id === entryId)
    if (!entry) {
      return
    }

    const loadedRequest: HttpRequest = {
      method: entry.method,
      url: entry.url,
      headers: entry.headers.map((header) => ({
        key: header.name,
        value: header.value,
        enabled: true,
      })),
      body: entry.body,
    }

    setRequest(loadedRequest)
    setSelectedEntryId(entry.id)
  }

  const handleSend = async () => {
    if (!request.url) {
      setError("URL is required. Enter a URL to send a request.")
      return
    }

    // Validate URL format
    try {
      new URL(request.url)
    } catch {
      setError("Invalid URL: must include protocol (e.g., https://example.com)")
      return
    }

    setIsLoading(true)
    setError(null)
    setResponse(null)

    const startTime = performance.now()

    try {
      const finalRequest = injectAutoHeaders(request)
      setRequest(finalRequest)

      let rawRequest: string
      try {
        rawRequest = buildRawRequest(finalRequest)
      } catch (err) {
        setError(
          err instanceof Error
            ? `Failed to build request: ${err.message}`
            : "Failed to build request"
        )
        return
      }

      const recordedEntry = appendRequest(finalRequest)
      setSelectedEntryId(recordedEntry.id)

      // Use ZAP's sendRequest API via the centralized API client
      const data = await zapAction<{ sendRequest: ZapMessage | ZapMessage[] }>(
        "core",
        "sendRequest",
        {
          request: rawRequest,
          followRedirects: "true",
        }
      )

      const endTime = performance.now()

      if (data.sendRequest) {
        // Parse the response from ZAP
        const parsed = parseZapResponse(data.sendRequest)
        setResponse({
          ...parsed,
          time: Math.round(endTime - startTime),
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full min-w-0">
      <RequestHistorySidebar
        entries={historyEntries}
        selectedEntryId={selectedEntryId}
        onSelect={(entry) => handleHistorySelect(entry.id)}
      />
      <div className="min-w-0 flex-1">
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full"
          id="requester-layout"
          defaultLayout={{ "request-editor": 50, "response-viewer": 50 }}
        >
          <ResizablePanel id="request-editor" defaultSize="50%" minSize="20%">
            <RequestEditor
              request={request}
              onChange={setRequest}
              onSend={handleSend}
              isLoading={isLoading}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="response-viewer" defaultSize="50%" minSize="20%">
            <ResponseViewer response={response} error={error} isLoading={isLoading} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
