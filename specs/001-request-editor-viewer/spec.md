# Feature Specification: ZAP Request Editor & Response Viewer

**Feature Branch**: `001-request-editor-viewer`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Build a web-based frontend for ZAP, the popular open-source penetration testing toolkit (primarily a proxy and scanner). We want to start very small - with a core request editor + response viewer, with the goal of being a basic Postman replacement for security professionals. I want to start from scratch. Remove everything that exists in the current project but the boilerplate stuff (i.e. keep barebones ZAP-addon, UI structure, but remove things like custom websocket handler, all UI pages, etc.)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compose and Send an HTTP Request (Priority: P1)

A security professional opens the ZAP web interface and sees a clean request editor. They select an HTTP method (e.g., GET, POST, PUT, DELETE), type in a target URL, optionally add headers and a request body, and click "Send." The request is routed through ZAP (the proxy), and the response appears in a dedicated response viewer area below or beside the editor. This is the fundamental "send a request and see what comes back" workflow — the core value proposition of the tool.

**Why this priority**: Without the ability to compose and send a request, nothing else in the tool has value. This is the minimum viable interaction that makes the product useful.

**Independent Test**: Can be fully tested by opening the web UI, entering a URL, clicking Send, and verifying a response is displayed — delivering the core value of an HTTP request tool.

**Acceptance Scenarios**:

1. **Given** the user has the web UI open, **When** they select "GET" as the method, enter a valid URL, and click Send, **Then** the system sends the request through ZAP and displays the response status code, headers, and body.
2. **Given** the user has selected "POST" as the method, **When** they enter a URL, add a JSON body, and click Send, **Then** the request is sent with the body included and the response is displayed.
3. **Given** the user has entered custom request headers, **When** they click Send, **Then** the request includes all user-specified headers.
4. **Given** the user clicks Send, **When** the request is in flight, **Then** a loading indicator is displayed until the response arrives.
5. **Given** the user sends a request, **When** the server returns a response, **Then** the response time and response size are displayed alongside the response.

---

### User Story 2 - Inspect the Response (Priority: P2)

After sending a request, the security professional wants to thoroughly examine the response. They can see the response status code prominently displayed (with visual differentiation for 2xx, 3xx, 4xx, 5xx ranges), browse the response headers, and read the response body with syntax highlighting appropriate to the content type (JSON, HTML, XML, or plain text). JSON responses are automatically formatted for readability.

**Why this priority**: Inspecting responses is the second half of the core request/response workflow. A security professional needs to analyze responses to understand application behavior, find vulnerabilities, and verify security controls.

**Independent Test**: Can be tested by sending any request and verifying the response is displayed with syntax highlighting, formatted JSON, visible status code, headers, and body — delivering the core analysis value.

**Acceptance Scenarios**:

1. **Given** a response has been received, **When** the user views the response, **Then** the status code is prominently displayed with color coding (green for 2xx, yellow for 3xx, red for 4xx/5xx).
2. **Given** the response body is JSON, **When** it is displayed, **Then** it is automatically pretty-printed and syntax-highlighted.
3. **Given** the response body is HTML or XML, **When** it is displayed, **Then** it is syntax-highlighted for the appropriate language.
4. **Given** the response includes headers, **When** the user views the response, **Then** all response headers are visible as key-value pairs.
5. **Given** a response is large, **When** the user views the response body, **Then** they can scroll through the content without UI degradation.

---

### User Story 3 - Edit Request Headers (Priority: P3)

The security professional needs fine-grained control over request headers for security testing. They can add custom headers (e.g., Authorization tokens, custom security headers), remove headers they don't want sent, and enable or disable individual headers without deleting them. This allows rapid iteration when testing how an application responds to different header configurations.

**Why this priority**: Header manipulation is essential for security testing (authentication tokens, CSRF tokens, custom headers for bypasses) but the tool is still usable for basic requests without it. This adds the depth that differentiates it from just typing a URL in a browser.

**Independent Test**: Can be tested by adding, removing, enabling, and disabling headers on a request and verifying they are correctly included/excluded in the sent request.

**Acceptance Scenarios**:

1. **Given** the user is composing a request, **When** they add a new header with a key and value, **Then** the header appears in the headers list and is included when the request is sent.
2. **Given** the user has multiple headers defined, **When** they disable one header using a toggle, **Then** that header is excluded from the sent request but remains visible in the editor for later re-enabling.
3. **Given** the user has headers defined, **When** they remove a header, **Then** it is deleted from the list and no longer sent with the request.

---

### User Story 4 - Clean Codebase Starting Point (Priority: P1)

Before building the request editor and response viewer, the existing project must be stripped down to its boilerplate foundation. All custom feature code (sites tree panel, output log panel, custom WebSocket event handlers, sites-tree-specific hooks, and unused API hooks) must be removed, leaving only the structural scaffolding: the application shell layout, the embedded server with REST API proxy, reusable UI primitives, the code editor component, the base API client, and build tooling. The result is a clean, minimal codebase ready for focused development of the request/response workflow.

**Why this priority**: This is a prerequisite for all other work. Building on a cluttered codebase with unrelated features creates confusion, increases maintenance burden, and makes the new feature harder to develop and test. A clean slate ensures every line of code serves the request editor/response viewer purpose.

**Independent Test**: Can be verified by confirming the application builds and loads successfully with a minimal shell, and that no custom feature panels (sites tree, output log) or WebSocket event handlers remain in the codebase.

**Acceptance Scenarios**:

1. **Given** the current codebase, **When** the cleanup is complete, **Then** the application compiles and loads in a browser showing only a minimal application shell.
2. **Given** the cleanup is complete, **When** a developer inspects the codebase, **Then** no sites-tree panel code, output log panel code, or custom WebSocket event handling code remains.
3. **Given** the cleanup is complete, **When** the application is loaded, **Then** the embedded server still serves the web UI, proxies REST API requests to ZAP, and the base API client functions correctly.
4. **Given** the cleanup is complete, **When** a developer reviews the codebase, **Then** reusable infrastructure remains intact: UI primitives, code editor component, header display utilities, base API client, application shell layout, and build configuration.

---

### Edge Cases

- What happens when the user sends a request to an unreachable host? The system should display a clear error message indicating the request failed, without crashing or hanging indefinitely.
- What happens when the response body is extremely large (e.g., multiple megabytes)? The response viewer should handle it gracefully, potentially with a warning or truncation, without freezing the UI.
- What happens when the user sends a request with an empty URL? The system should prevent sending and display a validation message.
- What happens when the user sends a request and ZAP is not running or the proxy connection is lost? The system should display an appropriate connection error.
- What happens when the response contains binary content (e.g., images, PDFs)? The response viewer should indicate that the content is binary and display it as raw text or hex, rather than attempting to render it.
- What happens when the server returns a redirect? The system should follow redirects and display the final response, with an indication that redirects were followed.
- What happens when the user presses the keyboard shortcut to send while the URL field is empty? The system should behave the same as clicking Send with an empty URL — prevent sending and show validation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to select an HTTP method from at minimum: GET, POST, PUT, DELETE, PATCH, HEAD, and OPTIONS.
- **FR-002**: System MUST allow users to enter a target URL for the request.
- **FR-003**: System MUST send the composed request through ZAP's proxy when the user triggers "Send."
- **FR-004**: System MUST display the full response including status code, response headers, and response body.
- **FR-005**: System MUST display response metadata: response time (duration from send to receive) and response size.
- **FR-006**: System MUST provide syntax highlighting for response bodies based on content type (JSON, HTML, XML, plain text at minimum).
- **FR-007**: System MUST automatically pretty-print JSON response bodies.
- **FR-008**: System MUST allow users to add, remove, enable, and disable individual request headers.
- **FR-009**: System MUST allow users to compose a request body (at minimum for POST, PUT, and PATCH methods).
- **FR-010**: System MUST visually differentiate HTTP status code ranges (2xx success, 3xx redirect, 4xx client error, 5xx server error) using color coding.
- **FR-011**: System MUST display a loading indicator while a request is in flight.
- **FR-012**: System MUST display clear error messages when a request fails (network error, timeout, unreachable host, ZAP unavailable).
- **FR-013**: System MUST validate that a URL is provided before allowing a request to be sent.
- **FR-014**: System MUST support a keyboard shortcut to send the request (in addition to the Send button).
- **FR-015**: System MUST follow redirects and display the final response.
- **FR-016**: System MUST remove all existing custom feature code (sites tree, output log, custom WebSocket event handlers, unused API hooks) while preserving reusable infrastructure (application shell, UI primitives, code editor, base API client, server proxy, build tooling).
- **FR-017**: System MUST preserve the request editor state (method, URL, headers, body) and response when the user navigates away and returns within the same session.

### Key Entities

- **HTTP Request**: Represents a request to be sent. Attributes: method, URL, headers (each with key, value, and enabled/disabled state), body (optional text content).
- **HTTP Response**: Represents a received response. Attributes: status code, status text, headers (key-value pairs), body (text content), response time, response size, content type.
- **Request Header**: An individual header within a request. Attributes: key, value, enabled (boolean toggle).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can compose and send an HTTP request (selecting method, entering URL, adding headers/body) and view the response in under 30 seconds from opening the tool.
- **SC-002**: 100% of existing custom feature code (sites tree, output log, WebSocket event handlers) is removed, and the application still builds and loads successfully.
- **SC-003**: Response bodies up to 1 MB render with syntax highlighting without noticeable UI delay (under 2 seconds).
- **SC-004**: All seven supported HTTP methods (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) can be successfully sent and their responses viewed.
- **SC-005**: Users can add, disable, re-enable, and remove request headers, and the sent request correctly reflects the current header state every time.
- **SC-006**: Error states (network failure, empty URL, ZAP unavailable) display clear, actionable messages rather than blank screens or unhandled errors.
- **SC-007**: The request editor state persists across tab or panel navigation within a single session — users never lose their in-progress request by accidentally navigating away.

## Assumptions

- ZAP is running and accessible when the web UI is used. The tool is designed to work as a ZAP add-on, not as a standalone application.
- ZAP's existing API for sending HTTP requests is available and sufficient for routing user-composed requests through the proxy.
- The embedded server will continue to serve the web UI and proxy API requests to ZAP — this infrastructure is considered boilerplate and is retained.
- Request history, saved requests, and collections are out of scope for this initial feature. This is a single-request editor, not a full Postman replacement with workspaces.
- Authentication to ZAP's API is handled transparently by the server-side proxy — the user does not need to manage API keys in the web UI.
- The "clean codebase" effort removes custom feature code (real-time event handling, sites tree updates, event broadcasting) but retains the base server and API proxy infrastructure.
