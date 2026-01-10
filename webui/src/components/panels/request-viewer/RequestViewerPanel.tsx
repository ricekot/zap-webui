import { useState } from "react"
import { useUIStore } from "@/stores/ui"
import { useMessage } from "@/lib/hooks/useMessage"
import { CodeEditor } from "@/components/editor/CodeEditor"
import { HeadersDisplay } from "@/components/shared/HeadersDisplay"
import { parseHeaders } from "@/components/shared/headerUtils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { Loader2, Columns, Rows } from "lucide-react"
import { cn } from "@/lib/utils"

type ViewMode = "split" | "stacked"

export function RequestViewerPanel() {
  const { selectedMessageId } = useUIStore()
  const { data: message, isLoading, error } = useMessage(selectedMessageId)
  const [viewMode, setViewMode] = useState<ViewMode>("split")

  if (!selectedMessageId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a request from the Sites tree to view details</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading message...</span>
      </div>
    )
  }

  if (error || !message) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
          <p className="font-medium">Failed to load message</p>
          <p className="text-sm mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
        </div>
      </div>
    )
  }

  const orientation = viewMode === "split" ? "horizontal" : "vertical"

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="h-9 border-b px-3 flex items-center justify-between shrink-0">
        <span className="text-sm text-muted-foreground truncate max-w-md">{message.url}</span>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "split" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("split")}
            title="Split view"
          >
            <Columns className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "stacked" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("stacked")}
            title="Stacked view"
          >
            <Rows className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ResizablePanelGroup
        orientation={orientation}
        className="flex-1"
        id="request-viewer-layout"
        defaultLayout={{ "request-section": 50, "response-section": 50 }}
      >
        <ResizablePanel id="request-section" defaultSize="50%" minSize="20%">
          <RequestSection
            method={message.method}
            url={message.url}
            headers={message.requestHeaders}
            body={message.requestBody}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="response-section" defaultSize="50%" minSize="20%">
          <ResponseSection
            statusCode={message.statusCode}
            statusText={message.statusText}
            headers={message.responseHeaders}
            body={message.responseBody}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

interface RequestSectionProps {
  method: string
  url: string
  headers: string
  body: string
}

function RequestSection({ method, url, headers, body }: RequestSectionProps) {
  const parsedHeaders = parseHeaders(headers)

  return (
    <ScrollArea className="h-full bg-muted/30">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Request</h3>
          <span className="text-sm font-mono text-muted-foreground">
            {method} {new URL(url).pathname}
          </span>
        </div>

        <HeadersDisplay headers={parsedHeaders} title="Headers" />

        {/* Body */}
        {body && (
          <div>
            <p className="text-sm font-medium mb-2">Body</p>
            <CodeEditor value={body} language={detectLanguage(body)} readOnly minHeight="150px" />
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

interface ResponseSectionProps {
  statusCode: number
  statusText: string
  headers: string
  body: string
}

function ResponseSection({ statusCode, statusText, headers, body }: ResponseSectionProps) {
  const parsedHeaders = parseHeaders(headers)

  const statusColorClass =
    statusCode >= 200 && statusCode < 300
      ? "text-green-600 bg-green-50"
      : statusCode >= 400
        ? "text-red-600 bg-red-50"
        : "text-yellow-600 bg-yellow-50"

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Response</h3>
          <span className={cn("px-2 py-1 rounded font-mono text-sm", statusColorClass)}>
            {statusCode} {statusText}
          </span>
        </div>

        <HeadersDisplay headers={parsedHeaders} title="Headers" />

        {/* Body */}
        {body && (
          <div>
            <p className="text-sm font-medium mb-2">Body</p>
            <CodeEditor
              value={formatBody(body)}
              language={detectLanguage(body)}
              readOnly
              minHeight="200px"
            />
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

function detectLanguage(content: string): "json" | "html" | "xml" | "text" {
  const trimmed = content.trim()
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed)
      return "json"
    } catch {
      // Not valid JSON
    }
  }
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    return "html"
  }
  if (trimmed.startsWith("<?xml") || (trimmed.startsWith("<") && trimmed.includes("xmlns"))) {
    return "xml"
  }
  return "text"
}

function formatBody(body: string): string {
  const trimmed = body.trim()
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2)
    } catch {
      return body
    }
  }
  return body
}
