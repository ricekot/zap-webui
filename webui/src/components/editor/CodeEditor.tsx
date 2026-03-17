import { useRef, useState, useEffect } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { json } from "@codemirror/lang-json"
import { html } from "@codemirror/lang-html"
import { xml } from "@codemirror/lang-xml"
import { EditorView } from "@codemirror/view"
import { cn } from "@/lib/utils"

type Language = "json" | "html" | "xml" | "text"

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: Language
  readOnly?: boolean
  placeholder?: string
  className?: string
  height?: string
}

const languageExtensions = {
  json: [json()],
  html: [html()],
  xml: [xml()],
  text: [],
}

/**
 * Resolve the active theme by checking whether the document root has the
 * Tailwind `dark` class. This stays in sync with however the app toggles
 * dark mode (class-based strategy used by shadcn/ui).
 */
function getDocumentTheme(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function CodeEditor({
  value,
  onChange,
  language = "text",
  readOnly = false,
  placeholder,
  className,
  height = "200px",
}: CodeEditorProps) {
  const fillParent = height === "100%"
  const containerRef = useRef<HTMLDivElement>(null)
  const [measuredHeight, setMeasuredHeight] = useState<string | undefined>(
    fillParent ? undefined : height
  )

  // For fill-parent mode, observe the container's size and pass the
  // measured pixel height to CodeMirror so it renders at the correct size.
  useEffect(() => {
    if (!fillParent) return
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setMeasuredHeight(`${entry.contentRect.height}px`)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fillParent])

  const extensions = [
    ...languageExtensions[language],
    EditorView.lineWrapping,
    EditorView.theme({
      "&": {
        fontSize: "13px",
      },
      ".cm-content": {
        fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
      },
      ".cm-gutters": {
        backgroundColor: "transparent",
        borderRight: "1px solid hsl(var(--border))",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "hsl(var(--accent))",
      },
      ".cm-activeLine": {
        backgroundColor: "hsl(var(--accent) / 0.5)",
      },
    }),
  ]

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-md border border-input bg-background",
        fillParent && "min-h-0 flex-1",
        className
      )}
    >
      {measuredHeight && (
        <CodeMirror
          value={value}
          onChange={onChange}
          extensions={extensions}
          readOnly={readOnly}
          placeholder={placeholder}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: !readOnly,
            rectangularSelection: true,
            crosshairCursor: false,
            highlightSelectionMatches: true,
          }}
          height={measuredHeight}
          theme={getDocumentTheme()}
        />
      )}
    </div>
  )
}
