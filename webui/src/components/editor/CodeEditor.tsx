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
  minHeight?: string
}

const languageExtensions = {
  json: [json()],
  html: [html()],
  xml: [xml()],
  text: [],
}

export function CodeEditor({
  value,
  onChange,
  language = "text",
  readOnly = false,
  placeholder,
  className,
  minHeight = "100px",
}: CodeEditorProps) {
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
      className={cn(
        "overflow-hidden rounded-md border border-input bg-background",
        className
      )}
    >
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
        style={{ minHeight }}
        theme="light"
      />
    </div>
  )
}
