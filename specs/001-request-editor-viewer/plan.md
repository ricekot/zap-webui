# Implementation Plan: ZAP Request Editor & Response Viewer

**Branch**: `001-request-editor-viewer` | **Date**: 2026-03-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-request-editor-viewer/spec.md`

## Summary

Build a minimal Postman-like HTTP request editor and response viewer as a web frontend for ZAP. The frontend is a React + TypeScript SPA served by a lightweight ZAP add-on using ZAP's `ExtensionNetwork` (replacing the previous embedded Jetty server). Users compose HTTP requests (method, URL, headers, body), send them through ZAP's existing REST API (handled in-process via `API.getInstance().handleApiRequest()`), and view syntax-highlighted responses. Before building the new feature, the existing codebase is stripped down to boilerplate infrastructure, removing all custom panels (sites tree, output log), WebSocket event handlers, Jetty dependencies, and unused API hooks.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode, ES2022 target) for frontend; Java 17 for backend add-on  
**Primary Dependencies**: React 19, Vite 7, Tailwind CSS 3, shadcn/ui (new-york style), CodeMirror 6 (@uiw/react-codemirror), Zustand 5, TanStack React Query 5
**Package Manager**: bun (migrating from npm)  
**Storage**: N/A (no persistent storage; session state via Zustand in-memory)  
**Testing**: Vitest 4 + Testing Library (React) + jsdom for frontend; JUnit 5 + Mockito for backend  
**Target Platform**: Modern browsers (Chrome, Firefox, Edge, Safari), served by ZAP's `ExtensionNetwork` HTTP server (Netty-based)  
**Project Type**: Web application (ZAP add-on with embedded SPA)  
**Performance Goals**: Sub-3-second initial page load; response body rendering under 2 seconds for 1 MB payloads  
**Constraints**: Bundle size must stay small (CodeMirror over Monaco); ZAP add-on must remain lightweight (serve static files + handle API requests in-process); frontend must not block UI thread  
**Scale/Scope**: Single-user tool (security professional), single request editor (no collections/history), ~5 components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Code Quality | TypeScript strict mode, ESLint zero warnings, no dead code, single responsibility, naming clarity | PASS | Strict mode already enabled. Cleanup phase removes all dead code. New components follow single-responsibility. |
| II. Testing Standards | Full project builds, new hooks/stores have unit tests, browser console error-free | PASS | Build verification is part of cleanup acceptance criteria. New requester utilities and hooks will have unit tests. WebSocket manual verification N/A (WebSocket handlers being removed). |
| III. UX Consistency | shadcn/ui components, Tailwind-only styling, responsive 768-1920px, loading/error states, keyboard accessible, proper state management | PASS | All UI uses shadcn/ui + Tailwind. Loading/error states specified in FR-011/FR-012. Keyboard shortcut in FR-014. Zustand for global state, TanStack Query for server state. |
| IV. Performance | Bundle < 3s load, no UI blocking, dependency discipline, memory management | PASS | CodeMirror chosen over Monaco for bundle size. No new heavy dependencies. Session-only state (no leak risk). |
| Security | Input sanitization, no dangerouslySetInnerHTML, no secrets in repo | PASS | React default escaping used. CodeMirror handles rendering (no raw HTML injection). API key not needed (in-process API handling). |
| Development Workflow | Build verification, branch-based, shadcn via CLI, incremental commits | PASS | All work on feature branch. shadcn components added via CLI. |

**Gate Result**: PASS — No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-request-editor-viewer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── zap-api.md       # ZAP REST API contract for sendRequest
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
addon/                                  # ZAP add-on (Java) — lightweight
├── src/main/java/org/zaproxy/addon/webui/
│   ├── ExtensionWebUi.java            # Main extension (simplified: obtain ExtensionNetwork, start/stop server)
│   ├── WebUiServer.java               # ExtensionNetwork-based server: static files + in-process API handling (rewritten)
│   └── WebUiParam.java                # Configuration (port, enabled)
└── src/test/java/org/zaproxy/addon/webui/
    └── WebUiParamTest.java            # Param validation tests (retained)

webui/                                  # React frontend
├── src/
│   ├── main.tsx                        # Entry point
│   ├── App.tsx                         # Root: QueryClientProvider + AppShell (no WebSocket)
│   ├── components/
│   │   ├── ui/                         # shadcn/ui primitives (retained as-is)
│   │   ├── editor/
│   │   │   └── CodeEditor.tsx          # Reusable CodeMirror wrapper (retained)
│   │   ├── shared/
│   │   │   ├── HeadersDisplay.tsx      # Reusable header key-value display (retained)
│   │   │   └── headerUtils.ts          # Header parsing utility (retained)
│   │   ├── layout/
│   │   │   └── AppShell.tsx            # Main layout (simplified: single requester panel)
│   │   └── requester/
│   │       ├── RequesterPanel.tsx      # Request editor + response viewer container
│   │       ├── RequestEditor.tsx       # Method selector, URL bar, headers, body tabs
│   │       ├── ResponseViewer.tsx      # Status, headers, body with syntax highlighting
│   │       └── requesterUtils.ts       # buildRawRequest, parseZapResponse
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts              # Base ZAP API client (zapApi, zapView, zapAction)
│   │   │   └── types.ts               # API response types (trimmed to used types only)
│   │   ├── hooks/
│   │   │   └── index.ts               # Re-exports (simplified: no WebSocket hooks)
│   │   └── utils.ts                   # cn() utility
│   └── stores/
│       ├── ui.ts                       # UI state (simplified: theme, active panel)
│       └── tabState.ts                 # Cross-tab state persistence
├── bun.lock                            # bun lockfile (replaces package-lock.json)
├── package.json                        # Dependencies and scripts
├── vite.config.ts                      # Vite config with API proxy
├── tailwind.config.js                  # Tailwind config with shadcn/ui theme
├── components.json                     # shadcn/ui config
└── tsconfig.json                       # TypeScript config (strict mode)
```

**Structure Decision**: Retain the existing two-project structure (addon/ for Java backend, webui/ for React frontend). The backend is rewritten to use ZAP's `ExtensionNetwork` instead of embedded Jetty, removing all Jetty dependencies and WebSocket infrastructure. The frontend is simplified by removing all panels except the requester, removing WebSocket hooks, and removing unused API hooks. The `components/panels/` nesting is flattened to `components/requester/` since there is only one panel. The frontend API client no longer uses an `/api/` prefix — ZAP's native API paths (`/JSON/`, `/UI/`, `/OTHER/`) are used directly.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. Code Quality | PASS | Cleanup removes all dead code. ~5 focused components follow single responsibility. TypeScript strict mode. No `any` usage. |
| II. Testing Standards | PASS | requesterUtils (buildRawRequest, parseZapResponse) have unit tests. headerUtils already tested. Build verification via `./gradlew build`. WebSocket testing N/A (removed). |
| III. UX Consistency | PASS | All UI via shadcn/ui + Tailwind. CodeMirror themed via CSS variables. Loading/error states, keyboard shortcut specified. Zustand for global state, tabState for requester persistence. |
| IV. Performance | PASS | CodeMirror chosen over Monaco (~150KB vs ~2-4MB bundle). Jetty dependencies removed entirely (replaced by ZAP's built-in ExtensionNetwork/Netty). No new heavy dependencies introduced. |
| Security | PASS | No dangerouslySetInnerHTML. API requests handled in-process via `API.getInstance().handleApiRequest()` — no API key needed. User input rendered via React JSX escaping and CodeMirror. |
| Dev Workflow | PASS | bun replaces npm (same workflow pattern). `./gradlew build` orchestrates full build. Feature branch development. |

**Gate Result**: PASS — No violations. No complexity tracking needed.
