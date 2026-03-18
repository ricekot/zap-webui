import { useState } from "react"
import { CodeEditor } from "@/components/editor/CodeEditor"
import { Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { HttpResponse } from "./types"

interface ResponseViewerProps {
  response: HttpResponse | null
  error: string | null
  isLoading: boolean
}

export function ResponseViewer({ response, error, isLoading }: ResponseViewerProps) {
  const [activeSection, setActiveSection] = useState<"headers" | "body">("body")

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
      {/* Section Tabs & Status Bar */}
      <div className="flex shrink-0 items-center justify-between border-b">
        <div className="flex gap-4">
          <button
            className={cn(
              "pb-2 text-sm font-medium border-b-2 transition-colors",
              activeSection === "headers"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveSection("headers")}
          >
            Headers
            {response.headers.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({response.headers.length})
              </span>
            )}
          </button>
          <button
            className={cn(
              "pb-2 text-sm font-medium border-b-2 transition-colors",
              activeSection === "body"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveSection("body")}
          >
            Body
          </button>
        </div>

        <div className="flex items-center gap-3 pb-2 text-xs">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-xs font-medium",
                    statusColorClass
                  )}
                >
                  {response.statusCode}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {response.statusCode} {response.statusText}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-muted-foreground hidden sm:inline">
            <span className="font-medium">{response.time}ms</span>
          </span>
          <span className="text-muted-foreground hidden sm:inline">
            <span className="font-medium">{formatBytes(response.size)}</span>
          </span>
        </div>
      </div>

      {/* Headers Section */}
      {activeSection === "headers" && (
        <div className="min-h-0 flex-1 overflow-auto">
          {response.headers.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No headers</p>
          ) : (
            <div className="space-y-2">
              {response.headers.map((header, index) => (
                <div
                  key={index}
                  className="flex gap-2 text-sm font-mono border-b border-border/50 pb-2 last:border-0"
                >
                  <span className="font-medium text-foreground shrink-0 w-1/3 break-words">
                    {header.key}:
                  </span>
                  <span className="text-muted-foreground break-all w-2/3">{header.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Body Section */}
      {activeSection === "body" && (
        <div className="min-h-0 flex-1">
          <CodeEditor
            value={formatBody(response.body, language)}
            language={language as "json" | "html" | "xml" | "text"}
            readOnly
            height="100%"
            className="h-full"
          />
        </div>
      )}
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
