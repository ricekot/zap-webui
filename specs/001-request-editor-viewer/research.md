# Research: ZAP Request Editor & Response Viewer

**Branch**: `001-request-editor-viewer` | **Date**: 2026-03-16

## R-001: Code Editor Choice — CodeMirror 6 vs Monaco

**Decision**: CodeMirror 6 (via `@uiw/react-codemirror`)

**Rationale**:
- **Bundle size**: CodeMirror 6 adds ~150-250 KB (minified+gzipped) vs Monaco at ~2-4 MB. The constitution requires initial page load under 3 seconds — Monaco's size is a serious risk to that constraint.
- **Already integrated**: The existing codebase uses `@uiw/react-codemirror` with JSON, HTML, and XML language packs. No migration work needed.
- **Performance**: CodeMirror 6 was designed from scratch with performance as a core goal. Its flat document model and viewport-only rendering handle 1 MB+ documents efficiently — exactly what's needed for large response bodies.
- **Theming**: CodeMirror's CSS-based theming integrates naturally with Tailwind CSS variables. Monaco uses its own proprietary theme API, requiring a parallel theme definition.
- **Sufficient for use case**: The tool needs syntax highlighting and read-only display. It does not need IDE features (IntelliSense, schema validation, multi-cursor) — Monaco's strengths that justify its size.

**Alternatives considered**:
- **Monaco Editor**: Superior IDE features but 10-15x larger bundle. Worker-based architecture adds complexity. Theming harder to align with Tailwind. Overkill for syntax highlighting + read-only display.
- **Plain textarea / `<pre>` with highlight.js**: Much smaller but no line numbers, code folding, or decent scrolling for large documents. Poor UX for security professionals who expect code-editor-quality viewing.

---

## R-002: Package Manager Migration — npm to bun

**Decision**: Migrate from npm to bun as the package manager.

**Rationale**: User requirement. bun provides faster installs and is compatible with the existing Node.js runtime tooling (Vite, Vitest run on Node.js regardless of package manager).

**Migration steps**:
1. Run `bun install` in `webui/` to generate `bun.lock`
2. Delete `package-lock.json`
3. In root `build.gradle.kts`, rename `npmCommand` helper to `bunCommand` and swap `"npm"` → `"bun"`. Change `"ci"` to `"install", "--frozen-lockfile"`. Update input file references from `package-lock.json` to `bun.lock`.
4. Update `AGENTS.md` to reference `bun` instead of `npm` for frontend commands.

**Gotchas**:
- Use `bun run test` (invokes Vitest via package.json script) not `bun test` (invokes bun's native test runner).
- Spotless Prettier integration in Gradle uses its own internal npm install — no change needed.
- `bun install --frozen-lockfile` is the equivalent of `npm ci` for CI reproducibility.

**Alternatives considered**:
- **Stay with npm**: Simpler (no migration), but user explicitly wants bun.
- **pnpm**: Fast, strict dependency resolution, but user specifically requested bun.

---

## R-003: ZAP API Contract for Sending Requests

**Decision**: Use ZAP's `core/action/sendRequest` REST API endpoint, called via `API.getInstance().handleApiRequest()` in-process.

**Rationale**: This is ZAP's built-in mechanism for sending HTTP requests through the proxy. It accepts a raw HTTP request string and returns the full response (including redirect chains). The existing codebase already uses this endpoint successfully. With the move to `ExtensionNetwork` (see R-004), API requests are handled in-process rather than proxied — the frontend calls `/JSON/core/action/sendRequest/` directly (no `/api/` prefix), and the server passes the request to ZAP's API singleton.

**API details**:
- **Endpoint**: `GET /JSON/core/action/sendRequest/` (note: no `/api/` prefix — ZAP native API paths are used directly)
- **Parameters**: `request` (raw HTTP request string), `followRedirects` (`"true"`)
- **Request format**: Full HTTP/1.1 request with scheme in the request line (so ZAP knows HTTP vs HTTPS), Host header, user headers, optional body.
- **Response format**: `{ "sendRequest": <ZapMessage | ZapMessage[]> }` where `ZapMessage` has `requestHeader`, `requestBody`, `responseHeader`, `responseBody`, `rtt`. Array when redirects occurred (use last element).
- **Error format**: `{ "code": "<error-code>", "message": "<error-description>" }`
- **API key**: Not needed — `API.getInstance().handleApiRequest()` is called in-process, bypassing the API key check since requests originate from the trusted web UI server.

**Frontend API path change**: The existing frontend API client (`client.ts`) builds URLs as `/api/JSON/{component}/{type}/{method}/`. This must be updated to `/JSON/{component}/{type}/{method}/` to match ZAP's native API paths. The Vite dev proxy must also be updated to proxy `/JSON/`, `/UI/`, `/OTHER/` to `localhost:8080` instead of stripping an `/api/` prefix.

**Alternatives considered**:
- **WebSocket-based request sending**: More complex, no clear benefit for a request/response workflow where the user explicitly triggers each request.
- **Direct proxy (frontend sends to target directly)**: Defeats the purpose — requests must go through ZAP so they appear in ZAP's history and can be scanned.

---

## R-004: Backend Architecture — Replace Embedded Jetty with ZAP's ExtensionNetwork

**Decision**: Remove the embedded Jetty server entirely. Use ZAP's `ExtensionNetwork` add-on to create an HTTP server via `extensionNetwork.createHttpServer()`, following the pattern established in the `webuipoc` reference add-on.

**Rationale**: The user explicitly requested removing the embedded Jetty server. ZAP's Network add-on already provides an HTTP server abstraction (`Server` + `HttpMessageHandler`) built on Netty. Using it eliminates all Jetty dependencies, making the add-on significantly lighter and more aligned with ZAP's ecosystem. The `webuipoc` add-on demonstrates this pattern works for serving SPAs and proxying API requests.

**Architecture**:
- `ExtensionWebUi` obtains `ExtensionNetwork` from ZAP's extension loader in `hook()`
- A new `WebUiServer` class (rewritten, not the Jetty-based one) calls `extensionNetwork.createHttpServer(handler)` to create a server
- The `HttpMessageHandler` implementation handles two types of requests:
  1. **API requests**: Paths starting with `/JSON/`, `/UI/`, `/OTHER/`, or `/script.js` are forwarded to `API.getInstance().handleApiRequest()` in-process (following the webuipoc pattern)
  2. **Static file requests**: All other paths serve files from the web UI build directory, with SPA fallback routing

**Key improvements over the webuipoc reference**:
- **SPA routing**: Non-file paths (no file extension or unrecognized extension) serve `index.html` instead of `404.html`. This enables React Router client-side routing.
- **Binary file support**: Use `Files.readAllBytes()` instead of `Files.readString()` to correctly serve images, fonts, and other binary assets.
- **Extended content types**: Support `.svg`, `.woff`, `.woff2`, `.ttf`, `.ico`, `.png`, `.jpg`, `.gif`, `.map` in addition to `.html`, `.css`, `.js`, `.json`.

**What to remove from backend**:
- `WebUiServer.java` — Entire Jetty-based server (rewrite from scratch)
- `WebUiEventEndpoint.java` — WebSocket endpoint (entire file)
- `WebUiEventEndpointTest.java` — WebSocket endpoint tests (entire file)
- EventBus subscription and `eventReceived()` in `ExtensionWebUi.java`
- EventConsumer interface from `ExtensionWebUi.java`
- All Jetty dependencies from `addon/build.gradle.kts` (jetty-server, jetty-servlet, jetty-proxy, websocket-jetty-server)

**What to add to backend**:
- Dependency on ZAP's `network` add-on (`zapAddOn("network")` — compile-time dependency on `ExtensionNetwork`, `Server`, `HttpMessageHandler`)
- Rewritten `WebUiServer.java` using `ExtensionNetwork.createHttpServer()` pattern
- `HttpMessageHandler` implementation with API routing and static file serving

**What to retain**:
- `ExtensionWebUi.java` — Simplified extension lifecycle (obtain `ExtensionNetwork`, start/stop server)
- `WebUiParam.java` — Configuration parameters (port, enabled)
- `WebUiParamTest.java` — Param validation tests

**Alternatives considered**:
- **Keep embedded Jetty**: More feature-rich (servlet model, WebSocket, DefaultServlet) but brings in ~4 heavy dependencies. User explicitly wants it removed.
- **Keep Jetty but strip WebSocket only**: Still carries unnecessary dependency weight for what is essentially a static file server + API passthrough.

---

## R-005: Frontend Cleanup Scope

**Decision**: Remove all custom panels and feature-specific code; retain structural boilerplate and reusable utilities.

**What to remove from frontend**:

| Path | Reason |
|------|--------|
| `components/panels/sites-tree/*` (4 files) | Sites tree feature removed |
| `components/panels/request-viewer/*` (1 file) | Read-only viewer for stored messages — replaced by integrated response viewer |
| `components/panels/output/*` (2 files) | Output log feature removed |
| `components/layout/ActivityBar.tsx` | Sidebar toggle for removed panels |
| `lib/hooks/useZapEvents.ts` | WebSocket connection manager — WebSocket removed |
| `lib/hooks/useZapConnection.ts` | WebSocket status hook — WebSocket removed |
| `lib/hooks/useSitesTree.ts` + test | Sites tree WebSocket hook — feature removed |
| `lib/hooks/useMessage.ts` + test | Message fetching for request viewer — replaced by direct API call in requester |
| `lib/hooks/useOutputLogs.ts` | Output log state — feature removed |
| `lib/api/hooks.ts` | TanStack Query hooks for unused endpoints (version, mode, sites, alerts, ascan, spider) |
| `stores/ui.ts` | Heavily tied to removed panels (sidebar activity, bottom panel, output filter, selected message) — rewrite simplified version |

**What to retain from frontend**:

| Path | Reason |
|------|--------|
| `components/ui/*` | shadcn/ui primitives — reusable boilerplate |
| `components/editor/CodeEditor.tsx` | Reusable CodeMirror wrapper — used by response viewer and body editor |
| `components/shared/HeadersDisplay.tsx` + `headerUtils.ts` + test | Reusable header display — used by response viewer |
| `lib/api/client.ts` | Base ZAP API client — used by requester |
| `lib/api/types.ts` | API types — trim to used types only |
| `lib/utils.ts` | `cn()` class merge utility |
| `stores/tabState.ts` + test | Cross-tab state persistence — used by requester |
| `main.tsx` | Entry point |
| All config files | vite, tsconfig, tailwind, eslint, components.json, postcss |

**What to modify in frontend**:

| Path | Change |
|------|--------|
| `lib/api/client.ts` | Remove `/api` prefix from `API_BASE` (change `"/api"` → `""`). ZAP native API paths (`/JSON/`, `/UI/`, `/OTHER/`) are used directly since the ExtensionNetwork server handles API requests in-process via `API.getInstance().handleApiRequest()`. |
| `vite.config.ts` | Replace the single `/api` proxy with three separate proxies for `/JSON/`, `/UI/`, `/OTHER/` targeting `http://localhost:8080` (no path rewrite needed since ZAP's API already expects these paths). Remove WebSocket proxy comment. |

**What to rebuild**:

| Path | Description |
|------|-------------|
| `App.tsx` | Simplified: remove `useZapEvents()`, keep QueryClientProvider |
| `components/layout/AppShell.tsx` | Simplified: single full-screen requester panel, no sidebar/bottom panels |
| `components/requester/*` | Moved from `panels/requester/`, potentially refined |
| `stores/ui.ts` | Simplified: only theme preference |
| `lib/hooks/index.ts` | Simplified re-export barrel |

**Alternatives considered**:
- **Keep everything, just hide panels**: Violates constitution principle I (no dead code). Adds confusion for developers.
- **Remove everything including reusable utilities**: Would require rewriting header parsing, code editor wrapper, API client — unnecessary work since they're well-tested and directly useful.
