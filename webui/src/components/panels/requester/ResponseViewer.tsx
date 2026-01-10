import { useState } from "react"
import { CodeEditor } from "@/components/editor/CodeEditor"
import { Loader2, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HttpResponse } from "./RequesterPanel"

interface ResponseViewerProps {
  response: HttpResponse | null
  error: string | null
  isLoading: boolean
}

export function ResponseViewer({ response, error, isLoading }: ResponseViewerProps) {
  const [showHeaders, setShowHeaders] = useState(false)

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
    <div className="p-4 space-y-4">
      {/* Status Bar */}
      <div className="flex items-center gap-4 text-sm">
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
      <div className="border rounded-md">
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-accent"
          onClick={() => setShowHeaders(!showHeaders)}
        >
          {showHeaders ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Response Headers
          <span className="text-muted-foreground">({response.headers.length})</span>
        </button>
        {showHeaders && (
          <div className="border-t px-3 py-2 space-y-1 bg-muted/30">
            {response.headers.map((header, index) => (
              <div key={index} className="flex gap-2 text-sm font-mono">
                <span className="font-medium text-foreground">{header.key}:</span>
                <span className="text-muted-foreground break-all">{header.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div>
        <p className="text-sm font-medium mb-2">Response Body</p>
        <CodeEditor
          value={formatBody(response.body, language)}
          language={language as "json" | "html" | "xml" | "text"}
          readOnly
          minHeight="200px"
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
