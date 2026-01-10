import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CodeEditor } from "@/components/editor/CodeEditor"
import { ChevronDown, Plus, Trash2, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HttpRequest } from "./RequesterPanel"

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

interface RequestEditorProps {
  request: HttpRequest
  onChange: (request: HttpRequest) => void
  onSend: () => void
  isLoading: boolean
}

export function RequestEditor({ request, onChange, onSend, isLoading }: RequestEditorProps) {
  const [activeSection, setActiveSection] = useState<"headers" | "body">("headers")

  const updateHeader = (
    index: number,
    field: "key" | "value" | "enabled",
    value: string | boolean
  ) => {
    const newHeaders = [...request.headers]
    newHeaders[index] = { ...newHeaders[index], [field]: value }
    onChange({ ...request, headers: newHeaders })
  }

  const addHeader = () => {
    onChange({
      ...request,
      headers: [...request.headers, { key: "", value: "", enabled: true }],
    })
  }

  const removeHeader = (index: number) => {
    const newHeaders = request.headers.filter((_, i) => i !== index)
    onChange({
      ...request,
      headers: newHeaders.length > 0 ? newHeaders : [{ key: "", value: "", enabled: true }],
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="p-4 space-y-4" onKeyDown={handleKeyDown}>
      {/* URL Bar */}
      <div className="flex gap-2">
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
                onClick={() => onChange({ ...request, method })}
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
          onChange={(e) => onChange({ ...request, url: e.target.value })}
          className="flex-1 font-mono"
        />

        <Button onClick={onSend} disabled={isLoading || !request.url}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send
        </Button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-4 border-b">
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
          {request.headers.filter((h) => h.key).length > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({request.headers.filter((h) => h.key).length})
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

      {/* Headers Section */}
      {activeSection === "headers" && (
        <div className="space-y-2">
          {request.headers.map((header, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={header.enabled}
                onChange={(e) => updateHeader(index, "enabled", e.target.checked)}
                className="h-4 w-4"
              />
              <Input
                placeholder="Header name"
                value={header.key}
                onChange={(e) => updateHeader(index, "key", e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <Input
                placeholder="Value"
                value={header.value}
                onChange={(e) => updateHeader(index, "value", e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeHeader(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addHeader}>
            <Plus className="h-4 w-4 mr-1" />
            Add Header
          </Button>
        </div>
      )}

      {/* Body Section */}
      {activeSection === "body" && (
        <CodeEditor
          value={request.body}
          onChange={(value) => onChange({ ...request, body: value })}
          language="json"
          placeholder="Request body (JSON, XML, or plain text)"
          minHeight="200px"
        />
      )}
    </div>
  )
}
