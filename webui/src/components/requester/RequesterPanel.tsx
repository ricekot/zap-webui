import { RequestEditor } from "./RequestEditor"
import { ResponseViewer } from "./ResponseViewer"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { useTabState } from "@/stores/tabState"
import { buildRawRequest, parseZapResponse } from "./requesterUtils"
import type { ZapMessage } from "@/lib/api/types"
import { zapAction } from "@/lib/api"

export interface HttpRequest {
  method: string
  url: string
  headers: Array<{ key: string; value: string; enabled: boolean }>
  body: string
}

export interface HttpResponse {
  statusCode: number
  statusText: string
  time: number
  size: number
  headers: Array<{ key: string; value: string }>
  body: string
}

interface RequesterState {
  request: HttpRequest
  response: HttpResponse | null
  error: string | null
}

const defaultRequest: HttpRequest = {
  method: "GET",
  url: "",
  headers: [{ key: "", value: "", enabled: true }],
  body: "",
}

const defaultState: RequesterState = {
  request: defaultRequest,
  response: null,
  error: null,
}

export function RequesterPanel() {
  const [state, setState] = useTabState<RequesterState>("requester", defaultState)
  const [isLoading, setIsLoading] = useTabState("requester-loading", false)

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
      let rawRequest: string
      try {
        rawRequest = buildRawRequest(request)
      } catch (err) {
        setError(
          err instanceof Error ? `Failed to build request: ${err.message}` : "Failed to build request"
        )
        return
      }

      // Use ZAP's sendRequest API via the centralized API client
      const data = await zapAction<{ sendRequest: ZapMessage | ZapMessage[] }>("core", "sendRequest", {
        request: rawRequest,
        followRedirects: "true",
      })

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
  )
}
