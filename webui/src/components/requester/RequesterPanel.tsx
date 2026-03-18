import { useEffect, useCallback } from "react"
import { RequestEditor } from "./RequestEditor"
import { RequestHistorySidebar } from "./RequestHistorySidebar"
import { ResponseViewer } from "./ResponseViewer"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  Send,
  Loader2,
  SquareSplitHorizontal,
  SquareSplitVertical,
} from "lucide-react"
import { useTabState } from "@/stores/tabState"
import { useRequestHistoryStore } from "@/stores/requestHistory"
import { buildRawRequest, injectAutoHeaders, parseZapResponse } from "./requesterUtils"
import { cn } from "@/lib/utils"
import type { ZapMessage } from "@/lib/api/types"
import { zapAction } from "@/lib/api"
import type { HttpRequest, HttpResponse, RequesterState } from "./types"
import { defaultRequesterState } from "./types"

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]

const methodColors: Record<string, string> = {
  GET: "text-green-600 bg-green-50",
  POST: "text-blue-600 bg-blue-50",
  PUT: "text-orange-600 bg-orange-50",
  DELETE: "text-red-600 bg-red-50",
  PATCH: "text-purple-600 bg-purple-50",
  HEAD: "text-gray-600 bg-gray-50",
  OPTIONS: "text-gray-600 bg-gray-50",
}

export function RequesterPanel() {
  const [state, setState] = useTabState<RequesterState>("requester", defaultRequesterState)
  const [isLoading, setIsLoading] = useTabState("requester-loading", false)
  const [selectedEntryId, setSelectedEntryId] = useTabState<string | null>(
    "requester-history-selected",
    null
  )
  const [orientation, setOrientation] = useTabState<"horizontal" | "vertical">(
    "requester-orientation",
    "horizontal"
  )
  const historyEntries = useRequestHistoryStore((historyState) => historyState.entries)
  const appendRequest = useRequestHistoryStore((historyState) => historyState.appendRequest)

  const { request, response, error } = state

  const setRequest = useCallback(
    (newRequest: HttpRequest) => {
      setState((prev) => ({ ...prev, request: newRequest }))
    },
    [setState]
  )

  const setResponse = useCallback(
    (newResponse: HttpResponse | null) => {
      setState((prev) => ({ ...prev, response: newResponse }))
    },
    [setState]
  )

  const setError = useCallback(
    (newError: string | null) => {
      setState((prev) => ({ ...prev, error: newError }))
    },
    [setState]
  )

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

  const handleSend = useCallback(async () => {
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
  }, [request, appendRequest, setSelectedEntryId, setIsLoading, setError, setResponse, setRequest])

  // Global Ctrl/Cmd+Enter handler to work even when focus is inside CodeMirror
  const handleGlobalKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeyDown)
    return () => document.removeEventListener("keydown", handleGlobalKeyDown)
  }, [handleGlobalKeyDown])

  return (
    <div className="flex h-full min-w-0">
      <RequestHistorySidebar
        entries={historyEntries}
        selectedEntryId={selectedEntryId}
        onSelect={(entry) => handleHistorySelect(entry.id)}
      />
      <div className="min-w-0 flex-1 flex flex-col">
        <div className="flex gap-2 items-center px-4 py-3 border-b bg-muted/10 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-28 justify-between font-mono", methodColors[request.method])}
              >
                {request.method}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {HTTP_METHODS.map((method) => (
                <DropdownMenuItem
                  key={method}
                  onClick={() => setRequest({ ...request, method })}
                  className={cn("font-mono", methodColors[method])}
                >
                  {method}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Input
            placeholder="Enter URL (e.g., https://example.com/api)"
            value={request.url}
            onChange={(e) => setRequest({ ...request, url: e.target.value })}
            className="flex-1 font-mono bg-background"
          />

          <Button onClick={handleSend} disabled={isLoading || !request.url}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Send
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setOrientation(orientation === "horizontal" ? "vertical" : "horizontal")}
            title={
              orientation === "horizontal"
                ? "Request shown above Response"
                : "Request shown beside Response"
            }
          >
            {orientation === "horizontal" ? (
              <SquareSplitVertical className="h-4 w-4" />
            ) : (
              <SquareSplitHorizontal className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <ResizablePanelGroup
            orientation={orientation}
            className="h-full"
            id="requester-layout"
            defaultLayout={{ "request-editor": 50, "response-viewer": 50 }}
          >
            <ResizablePanel id="request-editor" defaultSize="50%" minSize="20%">
              <RequestEditor request={request} onChange={setRequest} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel id="response-viewer" defaultSize="50%" minSize="20%">
              <ResponseViewer response={response} error={error} isLoading={isLoading} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  )
}
