import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CodeEditor } from "@/components/editor/CodeEditor"
import { Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HttpRequest } from "./types"

const BODY_METHODS = ["POST", "PUT", "PATCH"]

interface RequestEditorProps {
  request: HttpRequest
  onChange: (request: HttpRequest) => void
}

export function RequestEditor({ request, onChange }: RequestEditorProps) {
  const [activeSection, setActiveSection] = useState<"headers" | "body">("headers")
  const hasBody = BODY_METHODS.includes(request.method)

  // If on body tab but method doesn't support body, show headers instead
  const effectiveSection = !hasBody && activeSection === "body" ? "headers" : activeSection

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

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Section Tabs */}
      <div className="flex shrink-0 gap-4 border-b">
        <button
          className={cn(
            "pb-2 text-sm font-medium border-b-2 transition-colors",
            effectiveSection === "headers"
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
        {hasBody && (
          <button
            className={cn(
              "pb-2 text-sm font-medium border-b-2 transition-colors",
              effectiveSection === "body"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveSection("body")}
          >
            Body
          </button>
        )}
      </div>

      {/* Headers Section */}
      {effectiveSection === "headers" && (
        <div className="min-h-0 flex-1 space-y-2 overflow-auto">
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
      {hasBody && effectiveSection === "body" && (
        <div className="min-h-0 flex-1">
          <CodeEditor
            value={request.body}
            onChange={(value) => onChange({ ...request, body: value })}
            language="json"
            placeholder="Request body (JSON, XML, or plain text)"
            height="100%"
            className="h-full"
          />
        </div>
      )}
    </div>
  )
}
