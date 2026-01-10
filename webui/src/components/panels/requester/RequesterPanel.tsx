import { RequestEditor } from "./RequestEditor"
import { ResponseViewer } from "./ResponseViewer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { useTabState } from "@/stores/tabState"
import { buildRawRequest, parseZapResponse } from "./requesterUtils"

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
      setError("URL is required")
      return
    }

    setIsLoading(true)
    setError(null)
    setResponse(null)

    const startTime = performance.now()

    try {
      // Use ZAP's sendRequest API
      const params = new URLSearchParams({
        request: buildRawRequest(request),
        followRedirects: "true",
      })

      const res = await fetch(`/api/JSON/core/action/sendRequest/?${params}`)
      const data = await res.json()

      const endTime = performance.now()

      if (data.sendRequest) {
        // Parse the response from ZAP
        const parsed = parseZapResponse(data.sendRequest)
        setResponse({
          ...parsed,
          time: Math.round(endTime - startTime),
        })
      } else if (data.code && data.message) {
        setError(`${data.code}: ${data.message}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ResizablePanelGroup
      orientation="vertical"
      className="h-full"
      id="requester-layout"
      defaultLayout={{ "request-editor": 50, "response-viewer": 50 }}
    >
      <ResizablePanel id="request-editor" defaultSize="50%" minSize="20%">
        <ScrollArea className="h-full">
          <RequestEditor
            request={request}
            onChange={setRequest}
            onSend={handleSend}
            isLoading={isLoading}
          />
        </ScrollArea>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id="response-viewer" defaultSize="50%" minSize="20%">
        <ScrollArea className="h-full">
          <ResponseViewer response={response} error={error} isLoading={isLoading} />
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
