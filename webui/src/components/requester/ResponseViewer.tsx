import { CodeEditor } from "@/components/editor/CodeEditor"
import { HeadersDisplay } from "@/components/shared/HeadersDisplay"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HttpResponse } from "./RequesterPanel"

interface ResponseViewerProps {
  response: HttpResponse | null
  error: string | null
  isLoading: boolean
}

export function ResponseViewer({ response, error, isLoading }: ResponseViewerProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Sending request...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
          <p className="font-medium">Request failed</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Send a request to see the response</p>
      </div>
    )
  }

  const statusColorClass =
    response.statusCode >= 200 && response.statusCode < 300
      ? "text-green-600 bg-green-50"
      : response.statusCode >= 400
        ? "text-red-600 bg-red-50"
        : "text-yellow-600 bg-yellow-50"

  // Detect language from content-type header
  const contentType =
    response.headers.find((h) => h.key.toLowerCase() === "content-type")?.value || ""
  const language = contentType.includes("json")
    ? "json"
    : contentType.includes("html")
      ? "html"
      : contentType.includes("xml")
        ? "xml"
        : "text"

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Status Bar */}
      <div className="flex shrink-0 items-center gap-4 text-sm">
        <span className={cn("px-2 py-1 rounded font-mono font-medium", statusColorClass)}>
          {response.statusCode} {response.statusText}
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium">{response.time}ms</span> time
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium">{formatBytes(response.size)}</span> size
        </span>
      </div>

      {/* Headers Section */}
      <div className="shrink-0">
        <HeadersDisplay
          headers={response.headers}
          title="Response Headers"
          defaultExpanded={false}
        />
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="mb-2 shrink-0 text-sm font-medium">Response Body</p>
        <CodeEditor
          value={formatBody(response.body, language)}
          language={language as "json" | "html" | "xml" | "text"}
          readOnly
          height="100%"
          className="h-full"
        />
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatBody(body: string, language: string): string {
  if (language === "json") {
    try {
      return JSON.stringify(JSON.parse(body), null, 2)
    } catch {
      return body
    }
  }
  return body
}
