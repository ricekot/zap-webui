import { useState } from "react"
import { RequestEditor } from "./RequestEditor"
import { ResponseViewer } from "./ResponseViewer"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"

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

const defaultRequest: HttpRequest = {
  method: "GET",
  url: "",
  headers: [{ key: "", value: "", enabled: true }],
  body: "",
}

export function RequesterPanel() {
  const [request, setRequest] = useState<HttpRequest>(defaultRequest)
  const [response, setResponse] = useState<HttpResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      // Build headers object from enabled headers
      const headersObj: Record<string, string> = {}
      request.headers
        .filter((h) => h.enabled && h.key)
        .forEach((h) => {
          headersObj[h.key] = h.value
        })

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

function buildRawRequest(request: HttpRequest): string {
  const url = new URL(request.url)
  const path = url.pathname + url.search

  const headers = request.headers
    .filter((h) => h.enabled && h.key)
    .map((h) => `${h.key}: ${h.value}`)
    .join("\r\n")

  const hostHeader = `Host: ${url.host}`
  const allHeaders = headers ? `${hostHeader}\r\n${headers}` : hostHeader

  let raw = `${request.method} ${path} HTTP/1.1\r\n${allHeaders}\r\n\r\n`

  if (request.body && ["POST", "PUT", "PATCH"].includes(request.method)) {
    raw += request.body
  }

  return raw
}

interface ZapMessage {
  id: string
  requestHeader: string
  requestBody: string
  responseHeader: string
  responseBody: string
  rtt?: string
}

function parseZapResponse(
  messages: ZapMessage | ZapMessage[]
): Omit<HttpResponse, "time"> {
  // Handle both single message and array of messages (redirect chain)
  // Use the last message in the chain (final response after redirects)
  const msg = Array.isArray(messages) ? messages[messages.length - 1] : messages

  const lines = msg.responseHeader.split(/\r?\n/)
  const statusLine = lines[0]
  const statusMatch = statusLine.match(/HTTP\/[\d.]+ (\d+)\s*(.*)/)

  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 0
  const statusText = statusMatch ? statusMatch[2].trim() : ""

  // Parse headers (skip status line, stop at empty line)
  const headers: Array<{ key: string; value: string }> = []

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "" || lines[i] === "\r") {
      break
    }
    const colonIndex = lines[i].indexOf(":")
    if (colonIndex > 0) {
      headers.push({
        key: lines[i].substring(0, colonIndex).trim(),
        value: lines[i].substring(colonIndex + 1).trim(),
      })
    }
  }

  const body = msg.responseBody || ""

  return {
    statusCode,
    statusText,
    size: new Blob([msg.responseHeader + body]).size,
    headers,
    body,
  }
}
