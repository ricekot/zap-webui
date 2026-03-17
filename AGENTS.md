# AI Agent Instructions

This document provides guidance for AI coding agents working on this repository.

## Project Overview

ZAP Web UI is a modern web-based user interface for ZAP (Zed Attack Proxy). It consists of two main components:

1. **Backend (Java Add-on)**: Located in `addon/` - A ZAP add-on that serves the web UI via ExtensionNetwork and proxies API requests to ZAP's built-in API
2. **Frontend (React/TypeScript)**: Located in `webui/` - A React application built with Vite, TypeScript, Tailwind CSS, and shadcn/ui

## Repository Structure

```
zap-webui/
├── addon/                      # ZAP add-on (Java)
│   └── src/main/java/org/zaproxy/addon/webui/
│       ├── ExtensionWebUi.java      # Main extension, wires ExtensionNetwork
│       ├── WebUiServer.java         # HTTP server via ExtensionNetwork (static files + API proxy)
│       └── WebUiParam.java          # Configuration parameters
├── webui/                      # React frontend
│   └── src/
│       ├── components/
│       │   ├── editor/         # CodeMirror-based code editor
│       │   ├── layout/         # AppShell layout
│       │   ├── requester/      # HTTP request editor & response viewer
│       │   ├── shared/         # Shared components (HeadersDisplay)
│       │   └── ui/             # shadcn/ui primitives
│       ├── lib/
│       │   ├── api/            # REST API client (zapAction/zapView) and types
│       │   └── hooks/          # Custom React hooks (currently empty)
│       └── stores/             # Zustand state stores (ui theme, tab state)
├── build.gradle.kts            # Root Gradle build (uses bun)
└── docs/                       # Documentation
```

## Build Commands

### Full Build
```bash
./gradlew build
```

Note: If npm/node are not in PATH, use `-x spotlessWebui -x spotlessWebuiCheck` to skip the Spotless prettier check.

### Frontend Only
```bash
cd webui
bun install    # First time only
bun run build  # Production build
bun run dev    # Development server with HMR
bun run lint   # Run ESLint
bun run test   # Run Vitest tests
```

### Backend Only
```bash
./gradlew compileJava
```

## Architecture Notes

### Backend Server (ExtensionNetwork)

The backend uses ZAP's ExtensionNetwork to create an HTTP server (no embedded Jetty or WebSocket):

- **API routing**: Paths starting with `/JSON/`, `/UI/`, `/OTHER/`, or ending with `/script.js` are forwarded to `API.getInstance().handleApiRequest()` in-process
- **Static file serving**: All other paths serve files from the `webui/` classpath resource directory
- **SPA fallback**: Non-file paths (no recognized extension) serve `index.html` for client-side routing

### REST API

The frontend calls ZAP's API directly using native API paths:

- **API paths**: `/JSON/core/action/sendRequest/`, `/JSON/core/view/...`, etc.
- **No `/api/` prefix**: The frontend API client uses `API_BASE = ""` and calls ZAP paths directly
- **Development**: Vite dev server proxies `/JSON`, `/UI`, `/OTHER` to `localhost:8080`
- **Production**: The add-on's ExtensionNetwork server handles API routing in-process

### Requester Panel

The main feature is a Postman-like HTTP request editor and response viewer:

1. User selects HTTP method, enters URL, optionally adds headers and body
2. Frontend calls `zapAction("core", "sendRequest", { request: rawRequest })` 
3. ZAP sends the request and returns the response
4. Frontend parses and displays status code, headers, body with syntax highlighting

## Code Conventions

### Java (Backend)
- Follow existing ZAP add-on conventions
- Use Log4j2 for logging (`LOGGER.debug()`, `LOGGER.info()`, etc.)
- JSON handling via `net.sf.json.JSONObject`
- ExtensionNetwork dependency: `compileOnly("org.zaproxy.addon:network:0.25.0")`

### TypeScript (Frontend)
- Use TypeScript strict mode
- React functional components with hooks
- State management: Zustand for global state (theme), `useTabState` for per-tab state
- Styling: Tailwind CSS utility classes
- UI components: shadcn/ui (add via `bunx shadcn@latest add <component>`)
- Package manager: bun (not npm)

## Testing

When making changes:
1. Run `bun run test` in `webui/` to verify frontend tests pass
2. Run `bun run lint` in `webui/` to verify no lint errors
3. Run `./gradlew build` (with `-x spotlessWebui -x spotlessWebuiCheck` if needed) to verify full build
4. Check browser console for errors

## Common Tasks

### Adding a New UI Component

```bash
cd webui
bunx shadcn@latest add <component-name>
```

### Adding a New REST API Call

Use `zapAction` or `zapView` from `webui/src/lib/api/client.ts`:

```typescript
import { zapAction, zapView } from "@/lib/api"

// For actions (mutations)
const result = await zapAction("core", "sendRequest", { request: rawRequest })

// For views (queries)  
const result = await zapView("core", "someView", { param: "value" })
```

### Modifying the Request Editor

Key files:
- `webui/src/components/requester/RequesterPanel.tsx` — Main panel, state management, send logic
- `webui/src/components/requester/RequestEditor.tsx` — URL bar, method selector, headers, body editor
- `webui/src/components/requester/ResponseViewer.tsx` — Status display, response headers, body viewer
- `webui/src/components/requester/requesterUtils.ts` — `buildRawRequest()` and `parseZapResponse()` utilities

## Active Technologies
- TypeScript 5.9 (strict mode, ES2022 target) for frontend; Java 17 for backend add-on + React 19, Vite 7, Tailwind CSS 3, shadcn/ui (new-york style), CodeMirror 6 (@uiw/react-codemirror), Zustand 5, TanStack React Query 5 (001-request-editor-viewer)
- N/A (no persistent storage; session state via Zustand in-memory) (001-request-editor-viewer)

## Recent Changes
- 001-request-editor-viewer: Migrated from npm to bun, replaced Jetty/WebSocket with ExtensionNetwork, stripped frontend to boilerplate, built Postman-like HTTP request editor with 7 methods, URL validation, header management (add/remove/enable/disable), syntax-highlighted response viewer with JSON pretty-printing, status color coding, and keyboard shortcuts (Ctrl/Cmd+Enter to send)
