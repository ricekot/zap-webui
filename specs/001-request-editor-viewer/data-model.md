# Data Model: ZAP Request Editor & Response Viewer

**Branch**: `001-request-editor-viewer` | **Date**: 2026-03-16

## Frontend State Entities

### HttpRequest

Represents a user-composed HTTP request in the editor.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| method | `"GET" \| "POST" \| "PUT" \| "DELETE" \| "PATCH" \| "HEAD" \| "OPTIONS"` | HTTP method | Required, must be one of the enum values |
| url | `string` | Target URL | Required, non-empty. Must include scheme (http/https) for ZAP to route correctly |
| headers | `RequestHeader[]` | User-defined request headers | Optional, may be empty array |
| body | `string` | Request body content | Optional. Only meaningful for POST, PUT, PATCH |

**State transitions**: None — this is a simple value object managed by the editor's form state.

### RequestHeader

An individual header within an HttpRequest.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| key | `string` | Header name (e.g., `Content-Type`) | Must be non-empty for the header to be included in the sent request |
| value | `string` | Header value | May be empty string |
| enabled | `boolean` | Whether the header is active | When `false`, header is excluded from the sent request but remains in the UI |

### HttpResponse

Represents a received HTTP response displayed in the viewer.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| statusCode | `number` | HTTP status code (e.g., 200, 404, 500) | Extracted from response status line |
| statusText | `string` | HTTP status text (e.g., "OK", "Not Found") | Extracted from response status line |
| headers | `string` | Raw response headers | Parsed for display as key-value pairs |
| body | `string` | Response body content | Displayed with syntax highlighting based on Content-Type |
| time | `number` | Response time in milliseconds | Measured client-side (performance.now delta) |
| size | `number` | Response size in bytes | Calculated from header + body length |
| contentType | `string` | Content-Type header value | Used to determine syntax highlighting language |

**State transitions**: None — created once from a ZAP API response, then read-only.

### RequesterState

Persisted state for the requester panel (survives tab switches within session).

| Field | Type | Description |
|-------|------|-------------|
| request | `HttpRequest` | Current request being edited |
| response | `HttpResponse \| null` | Last received response, or null if none |
| isLoading | `boolean` | Whether a request is currently in flight |
| error | `string \| null` | Error message from last failed request |

**State management**: Zustand store using `useTabState` pattern — persists in memory across component mount/unmount cycles but not across page reloads.

### UIState

Global UI preferences (persisted to localStorage).

| Field | Type | Description |
|-------|------|-------------|
| theme | `"light" \| "dark" \| "system"` | Color theme preference |

**State management**: Zustand store with `persist` middleware to localStorage.

## Relationships

```
RequesterState
├── request: HttpRequest
│   └── headers: RequestHeader[]
├── response: HttpResponse (nullable)
├── isLoading: boolean
└── error: string (nullable)

UIState (independent)
└── theme: string
```

## ZAP API Entities (External)

These are ZAP's response shapes — not managed by the frontend, but parsed on receipt.

### ZapMessage

Returned by ZAP's sendRequest API.

| Field | Type | Description |
|-------|------|-------------|
| id | `string` | Message ID in ZAP's history |
| requestHeader | `string` | Raw HTTP request header as sent |
| requestBody | `string` | Raw request body as sent |
| responseHeader | `string` | Raw HTTP response header (status line + headers) |
| responseBody | `string` | Raw response body |
| rtt | `string` (optional) | Round-trip time |

### ZapErrorResponse

Returned by ZAP on API errors.

| Field | Type | Description |
|-------|------|-------------|
| code | `string` | Error code |
| message | `string` | Human-readable error description |
