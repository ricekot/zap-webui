# Tasks: ZAP Request Editor & Response Viewer

**Input**: Design documents from `/specs/001-request-editor-viewer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/zap-api.md, quickstart.md

**Tests**: Tests are included where existing test files need updating. No TDD approach was explicitly requested.

**Organization**: Tasks are grouped by user story. User Story 4 (Clean Codebase) is P1 and a prerequisite for all other stories, so it forms the Foundational phase. User Story 1 (Compose & Send) and User Story 2 (Inspect Response) build the core feature. User Story 3 (Edit Headers) refines it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Package Manager Migration)

**Purpose**: Migrate from npm to bun per R-002 decision, establishing the build toolchain before any code changes.

- [X] T001 Run `bun install` in `webui/` to generate `bun.lock`, then delete `webui/package-lock.json`
- [X] T002 Update Gradle build to use bun: rename `npmCommand` to `bunCommand`, swap `"npm"` → `"bun"`, change `"ci"` to `"install", "--frozen-lockfile"`, update lockfile input reference in `build.gradle.kts`
- [X] T003 Verify full build with bun: run `./gradlew build` and confirm all tasks pass (Java compilation, frontend build, lint, tests)

---

## Phase 2: Foundational — User Story 4: Clean Codebase Starting Point (Priority: P1) 🎯

**Goal**: Strip the existing codebase to boilerplate, removing all custom panels (sites tree, output log), WebSocket infrastructure, Jetty server, and unused API hooks. Replace the backend with ExtensionNetwork. Result: a clean, buildable project with only the requester panel and reusable infrastructure.

**Independent Test**: Application builds (`./gradlew build`), loads in browser with a minimal shell, and no sites-tree, output log, or WebSocket code remains.

**⚠️ CRITICAL**: No feature work (US1/US2/US3) can begin until this phase is complete.

### Backend Cleanup (US4)

- [X] T004 [US4] Delete `addon/src/main/java/org/zaproxy/addon/webui/WebUiEventEndpoint.java` and `addon/src/test/java/org/zaproxy/addon/webui/WebUiEventEndpointTest.java`
- [X] T005 [US4] Remove Jetty dependencies from `addon/build.gradle.kts`: delete all 4 Jetty `implementation` lines (jetty-server, jetty-servlet, jetty-proxy, websocket-jetty-server). Add `zapAddOn("network")` as compile-time dependency. Add `network` add-on to manifest dependencies block (version `>= 0.18.0 & < 1.0.0`)
- [X] T006 [US4] Simplify `addon/src/main/java/org/zaproxy/addon/webui/ExtensionWebUi.java`: remove `EventConsumer` interface, `eventReceived()` method, EventBus subscription/unsubscription, `WebUiEventEndpoint` references, and all Jetty/EventBus imports. Add `ExtensionNetwork` field obtained via `getExtension(ExtensionNetwork.class)` in `hook()`. Wire `ExtensionNetwork` into `WebUiServer` constructor. Retain `WebUiParam` registration, server start in `postInit()`, and server stop in `unload()`
- [X] T007 [US4] Rewrite `addon/src/main/java/org/zaproxy/addon/webui/WebUiServer.java` from scratch using `ExtensionNetwork.createHttpServer()` pattern. Implement `HttpMessageHandler` with: (1) API routing — paths starting with `/JSON/`, `/UI/`, `/OTHER/`, or ending with `/script.js` forwarded to `API.getInstance().handleApiRequest()` in-process; (2) Static file serving — all other paths serve from classpath `webui/` resource directory using `Files.readAllBytes()`; (3) SPA fallback — non-file paths (no recognized extension) serve `index.html`; (4) Content-type map for `.html`, `.css`, `.js`, `.json`, `.svg`, `.woff`, `.woff2`, `.ttf`, `.ico`, `.png`, `.jpg`, `.gif`, `.map`, `.txt`. Reference: `/Users/ricekot/gh/ricekot/zap-extensions/addOns/webuipoc/src/main/java/org/zaproxy/addon/webuipoc/TestProxyServer.java`
- [X] T008 [US4] Verify backend builds: run `./gradlew compileJava` and confirm zero errors. Run `./gradlew test` to confirm `WebUiParamTest` still passes

### Frontend Cleanup (US4)

- [X] T009 [P] [US4] Delete removed feature files: `webui/src/components/panels/sites-tree/` (4 files: SitesTree.tsx, SitesTreePanel.tsx, SiteNode.tsx, SiteContextMenu.tsx), `webui/src/components/panels/request-viewer/RequestViewerPanel.tsx`, `webui/src/components/panels/output/` (2 files: OutputLog.tsx, OutputPanel.tsx), `webui/src/components/layout/ActivityBar.tsx`
- [X] T010 [P] [US4] Delete removed hook and API files: `webui/src/lib/hooks/useZapEvents.ts`, `webui/src/lib/hooks/useZapConnection.ts`, `webui/src/lib/hooks/useSitesTree.ts`, `webui/src/lib/hooks/useSitesTree.test.ts`, `webui/src/lib/hooks/useMessage.ts`, `webui/src/lib/hooks/useMessage.test.ts`, `webui/src/lib/hooks/useOutputLogs.ts`, `webui/src/lib/api/hooks.ts`
- [X] T011 [P] [US4] Update API client to remove `/api` prefix: in `webui/src/lib/api/client.ts` change `API_BASE` from `"/api"` to `""` and update the JSDoc comment to reference ZAP native API paths (`/JSON/`, `/UI/`, `/OTHER/`)
- [X] T012 [P] [US4] Update Vite dev proxy: in `webui/vite.config.ts` replace the single `/api` proxy with three proxies for `/JSON`, `/UI`, `/OTHER` all targeting `http://localhost:8080` with `changeOrigin: true` and no path rewrite. Remove the WebSocket comment
- [X] T013 [US4] Move requester panel files out of nested `panels/` directory: move `webui/src/components/panels/requester/RequesterPanel.tsx`, `RequestEditor.tsx`, `ResponseViewer.tsx`, `requesterUtils.ts`, `requesterUtils.test.ts` to `webui/src/components/requester/`. Delete the now-empty `webui/src/components/panels/` directory
- [X] T014 [US4] Simplify `webui/src/App.tsx`: remove `useZapEvents()` call and its import. Remove the `AppContent` inner component pattern — render `AppShell` directly inside `QueryClientProvider`
- [X] T015 [US4] Simplify `webui/src/components/layout/AppShell.tsx`: remove all sidebar, bottom panel, activity bar, and tab infrastructure. Render a simple full-screen layout with a minimal toolbar ("ZAP Web UI" branding) and `RequesterPanel` filling the remaining space. Update import path for `RequesterPanel` to `@/components/requester/RequesterPanel`
- [X] T016 [US4] Simplify `webui/src/stores/ui.ts`: remove sidebar activity, bottom panel activity, active tab, output filter, selected message state and their actions. Keep only `theme` preference with `persist` middleware to localStorage
- [X] T017 [US4] Update barrel exports: in `webui/src/lib/hooks/index.ts` remove all deleted hook re-exports (keep file empty or with a comment). In `webui/src/lib/api/index.ts` remove `hooks` re-export. In `webui/src/stores/index.ts` update to export simplified `useUIStore`
- [X] T018 [US4] Trim `webui/src/lib/api/types.ts`: remove unused types (`Alert`, `AlertsResponse`, `ScanProgress`, `ActiveScanStatus`, `SpiderStatus`, `Version`, `Mode`, `Sites`, `Hosts`, `MessagesResponse`). Retain only `HttpMessage` (used by requester as `ZapMessage` equivalent — consolidate if appropriate)
- [X] T019 [US4] Verify frontend builds cleanly: run `bun run build` (zero errors), `bun run lint` (zero warnings), `bun run test` (all tests pass). Fix any remaining broken imports or references
- [X] T020 [US4] Verify full project build: run `./gradlew build` — all tasks pass (Java compilation, frontend build, lint, tests)

**Checkpoint**: Application builds and loads in browser showing only a minimal shell with the requester panel. No sites-tree, output log, or WebSocket code remains. SC-002 is met.

---

## Phase 3: User Story 1 — Compose and Send an HTTP Request (Priority: P1) 🎯 MVP

**Goal**: A user can select an HTTP method, enter a URL, optionally add headers and body, click Send, and see the response (status, headers, body, time, size).

**Independent Test**: Open the web UI, select GET, enter `https://example.com`, click Send, verify a response with status code, headers, body, time, and size is displayed.

### Implementation for User Story 1

- [X] T021 [US1] Improve URL validation in `webui/src/components/requester/RequesterPanel.tsx`: before calling `buildRawRequest`, validate the URL by attempting `new URL(request.url)`. If it throws, set an error message like "Invalid URL: must include protocol (e.g., https://example.com)" and return early. Also ensure the existing empty-URL check shows a specific message (FR-013)
- [X] T022 [US1] Improve error handling for `buildRawRequest` in `webui/src/components/requester/RequesterPanel.tsx`: wrap the `buildRawRequest()` call in try/catch to handle malformed URLs gracefully instead of letting exceptions propagate. Display user-friendly error via the existing `error` state (FR-012)
- [X] T023 [US1] Verify `handleSend` uses the API client consistently in `webui/src/components/requester/RequesterPanel.tsx`: confirm the `fetch` URL uses the updated API path (`/JSON/core/action/sendRequest/` without `/api/` prefix) per the updated `client.ts`. If `handleSend` uses raw `fetch` instead of `zapAction`, update to use `zapAction("core", "sendRequest", { request: rawRequest, followRedirects: "true" })` for centralized error handling (FR-003)
- [X] T024 [US1] Verify all 7 HTTP methods work end-to-end: confirm `HTTP_METHODS` array in `webui/src/components/requester/RequestEditor.tsx` includes GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS. Verify `buildRawRequest` handles each correctly (FR-001, FR-004)
- [X] T025 [US1] Verify loading indicator works correctly in `webui/src/components/requester/RequestEditor.tsx` and `webui/src/components/requester/ResponseViewer.tsx`: Send button shows spinner and is disabled during loading; response panel shows centered spinner with "Sending request..." text (FR-011)
- [X] T026 [US1] Verify response time and size display in `webui/src/components/requester/ResponseViewer.tsx`: confirm time is displayed in ms and size is formatted (B/KB/MB). Consider using `rtt` from ZAP's response when available for more accurate server-side timing instead of client-side `performance.now()` (FR-005)

**Checkpoint**: User Story 1 is fully functional. Users can compose and send HTTP requests with any of 7 methods, see loading state, receive responses with status/headers/body/time/size, and get clear errors for invalid URLs or failed requests. SC-001, SC-004, SC-006 are met.

---

## Phase 4: User Story 2 — Inspect the Response (Priority: P2)

**Goal**: Response viewer displays status code with color coding, syntax-highlighted body (JSON/HTML/XML/text), pretty-printed JSON, and browsable headers.

**Independent Test**: Send a request to a JSON API endpoint, verify the response body is pretty-printed with JSON syntax highlighting, status code shows green for 200, and headers are displayed as key-value pairs.

### Implementation for User Story 2

- [X] T027 [US2] Verify status code color coding in `webui/src/components/requester/ResponseViewer.tsx`: confirm 2xx = green, 3xx = yellow, 4xx = red, 5xx = red. Adjust if needed — current implementation groups 4xx+ as red and everything else as yellow (FR-010)
- [X] T028 [US2] Verify syntax highlighting for all content types in `webui/src/components/requester/ResponseViewer.tsx`: confirm JSON, HTML, XML, and plain text are correctly detected from `Content-Type` header and passed to `CodeEditor`. Test with `application/json`, `text/html`, `text/xml`, `application/xml`, `text/plain` (FR-006)
- [X] T029 [US2] Verify JSON pretty-printing in `webui/src/components/requester/ResponseViewer.tsx`: confirm `formatBody()` correctly pretty-prints valid JSON with `JSON.stringify(JSON.parse(), null, 2)` and falls back to raw body for invalid JSON. Test with valid JSON, invalid JSON, and empty body (FR-007)
- [X] T030 [US2] Verify response headers display in `webui/src/components/requester/ResponseViewer.tsx`: confirm headers are shown as key-value pairs via `HeadersDisplay` component. Verify headers with colons in values are parsed correctly (split on first `:` only) (FR-004)
- [X] T031 [US2] Verify large response handling in `webui/src/components/requester/ResponseViewer.tsx`: confirm CodeMirror handles response bodies up to 1 MB without UI freeze. CodeMirror 6's viewport-only rendering should handle this, but verify by testing with a large JSON response (SC-003)

**Checkpoint**: User Story 2 is complete. Response viewer provides full inspection capabilities with color-coded status, syntax highlighting, pretty-printed JSON, and browsable headers. SC-003 is met.

---

## Phase 5: User Story 3 — Edit Request Headers (Priority: P3)

**Goal**: Users can add, remove, enable, and disable individual request headers with full control over what gets sent.

**Independent Test**: Add 3 headers, disable one, remove another, send the request, and verify only the enabled header is included in the sent request.

### Implementation for User Story 3

- [X] T032 [US3] Verify header add/remove/enable/disable in `webui/src/components/requester/RequestEditor.tsx`: confirm checkbox toggles `enabled` state, trash icon removes header, "Add Header" button appends a new empty header row. Verify at least one empty row is always present (FR-008)
- [X] T033 [US3] Verify `buildRawRequest` correctly filters headers in `webui/src/components/requester/requesterUtils.ts`: confirm only headers where `enabled === true` AND `key` is non-empty are included in the raw request string. Disabled or empty-key headers must be excluded (FR-008)
- [X] T034 [US3] Verify state persistence for headers in `webui/src/components/requester/RequesterPanel.tsx`: confirm header state (including enabled/disabled toggles) is preserved when switching tabs and returning. Uses `useTabState` (FR-017, SC-005)
- [X] T035 [US3] Add missing test cases for header handling in `webui/src/components/requester/requesterUtils.test.ts`: add tests for HEAD and OPTIONS methods (no body), empty header list, all headers disabled, and mixed enabled/disabled headers (SC-005)

**Checkpoint**: User Story 3 is complete. Users have full control over request headers with add/remove/enable/disable functionality. SC-005 is met.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements that span multiple user stories.

- [X] T036 [P] Ensure keyboard shortcut (Ctrl/Cmd+Enter) works reliably in `webui/src/components/requester/RequestEditor.tsx`: verify it fires even when focus is inside CodeMirror body editor. If not, add a global keydown listener or CodeMirror keybinding (FR-014)
- [X] T037 [P] Hide or disable Body tab for non-body methods (GET, DELETE, HEAD, OPTIONS) in `webui/src/components/requester/RequestEditor.tsx`: improve UX so users aren't confused by a body editor on methods that ignore the body (FR-009)
- [X] T038 [P] Verify request state persistence across tab/panel navigation in `webui/src/components/requester/RequesterPanel.tsx`: confirm method, URL, headers (with enabled state), body, response, and error state all survive tab switches via `useTabState`. Document that page reloads reset state (per FR-017 scope — within same session) (SC-007)
- [X] T039 [P] Consolidate `ZapMessage` type in `webui/src/components/requester/requesterUtils.ts` with `HttpMessage` type in `webui/src/lib/api/types.ts`: either move `ZapMessage` to `types.ts` or remove the duplicate, ensuring a single source of truth
- [X] T040 Update `AGENTS.md` with: new architecture (ExtensionNetwork instead of Jetty), updated frontend structure (no `panels/` nesting, no WebSocket), bun commands instead of npm, updated API paths (no `/api/` prefix), and remove the WebSocket Communication section
- [X] T041 Run final full build verification: `./gradlew build` passes, `bun run lint` has zero warnings, `bun run test` has all tests passing, no unused imports or unreferenced files remain

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational/US4 (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion
- **US2 (Phase 4)**: Depends on Phase 2 completion. Can run in parallel with US1 (separate concerns: send logic vs response display)
- **US3 (Phase 5)**: Depends on Phase 2 completion. Can run in parallel with US1/US2 (header editing is independent)
- **Polish (Phase 6)**: Depends on all user story phases being complete

### User Story Dependencies

- **US4 (Clean Codebase)**: Foundational — must complete first
- **US1 (Compose & Send)**: After US4 — independent of US2/US3
- **US2 (Inspect Response)**: After US4 — independent of US1/US3 (builds on same response viewer)
- **US3 (Edit Headers)**: After US4 — independent of US1/US2 (builds on same header editor)

### Within Phase 2 (Backend then Frontend)

- T004, T005 can run in parallel (different files)
- T006 depends on T004 (deleted file references removed)
- T007 depends on T005, T006 (new dependencies, new extension wiring)
- T008 depends on T007 (compilation verification)
- T009, T010, T011, T012 can all run in parallel (different files)
- T013 depends on T009 (files moved after originals deleted)
- T014, T015, T016, T017, T018 depend on T009, T010, T013 (imports reference moved/deleted files)
- T019 depends on all above (build verification)
- T020 depends on T008 + T019 (full build)

### Parallel Opportunities

**Phase 2 Frontend (after file deletions):**
```
Parallel: T009, T010, T011, T012 (different files, no dependencies)
```

**Phase 2 Frontend (after moves):**
```
Parallel: T014, T015, T016, T017, T018 (different files, all reference cleanup)
```

**Phase 3-5 (after Phase 2):**
```
Parallel: US1 (T021-T026), US2 (T027-T031), US3 (T032-T035) — different concerns
```

**Phase 6:**
```
Parallel: T036, T037, T038, T039, T040 (different files/concerns)
```

---

## Parallel Example: Phase 2 Frontend Cleanup

```
# Step 1: Delete files in parallel
Task T009: Delete sites-tree, request-viewer, output panel, ActivityBar
Task T010: Delete WebSocket hooks, unused API hooks
Task T011: Update API client (client.ts)
Task T012: Update Vite proxy (vite.config.ts)

# Step 2: Move requester files (after deletions)
Task T013: Move requester/ out of panels/

# Step 3: Simplify remaining files in parallel (after moves)
Task T014: Simplify App.tsx
Task T015: Simplify AppShell.tsx
Task T016: Simplify stores/ui.ts
Task T017: Update barrel exports
Task T018: Trim api/types.ts
```

---

## Implementation Strategy

### MVP First (User Story 4 + User Story 1)

1. Complete Phase 1: Setup (bun migration)
2. Complete Phase 2: US4 Clean Codebase (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 Compose & Send
4. **STOP and VALIDATE**: Test US1 independently — can you send a request and see a response?
5. This is the MVP — a working HTTP requester through ZAP

### Incremental Delivery

1. Setup + US4 (Clean Codebase) → Clean, buildable project
2. Add US1 (Compose & Send) → Test independently → **MVP ready**
3. Add US2 (Inspect Response) → Test independently → Enhanced response viewing
4. Add US3 (Edit Headers) → Test independently → Full header control
5. Polish → Production-quality code
6. Each story adds value without breaking previous stories

### Recommended Single-Developer Order

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
(Sequential, P1 → P2 → P3 priority order)
