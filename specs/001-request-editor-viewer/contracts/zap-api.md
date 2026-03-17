# API Contract: ZAP sendRequest

**Branch**: `001-request-editor-viewer` | **Date**: 2026-03-16

This documents the ZAP REST API contract used by the request editor to send HTTP requests through ZAP's proxy.

## Endpoint

```
GET /JSON/core/action/sendRequest/
```

ZAP's native API paths are used directly (no `/api/` prefix). In production, the `WebUiServer` (using `ExtensionNetwork`) handles these requests in-process via `API.getInstance().handleApiRequest()`. In development, the Vite dev server proxies `/JSON/` requests to ZAP's API on `localhost:8080`.

## Request

### Parameters (query string)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `request` | string | Yes | URL-encoded raw HTTP request string |
| `followRedirects` | string | No | `"true"` to follow redirects (recommended default) |

### Raw Request String Format

The `request` parameter contains a full HTTP/1.1 request:

```
METHOD <full-URL-with-scheme> HTTP/1.1\r\n
Host: <hostname>\r\n
<Header-Key>: <Header-Value>\r\n
...\r\n
\r\n
<body, if applicable>
```

**Key rules**:
- The request line MUST include the full URL with scheme (`http://` or `https://`) so ZAP can determine the target and protocol.
- A `Host` header MUST be included (derived from the URL).
- The body is only included for methods that support it (POST, PUT, PATCH).
- Headers with empty keys are excluded.

### Example

```
GET https://example.com/api/users HTTP/1.1\r\n
Host: example.com\r\n
Accept: application/json\r\n
Authorization: Bearer token123\r\n
\r\n
```

URL-encoded as the `request` parameter:
```
/JSON/core/action/sendRequest/?request=GET%20https%3A%2F%2Fexample.com%2Fapi%2Fusers%20HTTP%2F1.1%0D%0AHost%3A%20example.com%0D%0AAccept%3A%20application%2Fjson%0D%0AAuthorization%3A%20Bearer%20token123%0D%0A%0D%0A&followRedirects=true
```

## Response

### Success (single response, no redirects)

```json
{
  "sendRequest": {
    "id": "42",
    "requestHeader": "GET https://example.com/api/users HTTP/1.1\r\nHost: example.com\r\n...",
    "requestBody": "",
    "responseHeader": "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n...",
    "responseBody": "{\"users\": [...]}",
    "rtt": "150"
  }
}
```

### Success (redirect chain)

When `followRedirects=true` and the server returns redirects, the response is an **array** of messages:

```json
{
  "sendRequest": [
    {
      "id": "42",
      "requestHeader": "GET https://example.com/old HTTP/1.1\r\n...",
      "requestBody": "",
      "responseHeader": "HTTP/1.1 301 Moved Permanently\r\nLocation: https://example.com/new\r\n...",
      "responseBody": ""
    },
    {
      "id": "43",
      "requestHeader": "GET https://example.com/new HTTP/1.1\r\n...",
      "requestBody": "",
      "responseHeader": "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n...",
      "responseBody": "<html>...</html>"
    }
  ]
}
```

The frontend MUST use the **last element** in the array as the final response to display.

### Error

```json
{
  "code": "illegal_parameter",
  "message": "Failed to send the request: Connection refused"
}
```

Error responses have `code` and `message` fields at the top level (no `sendRequest` field).

## Response Header Parsing

The `responseHeader` field contains a raw HTTP response header. Parsing rules:

1. Split on `\r\n` (or `\n` as fallback)
2. First line is the status line: matches pattern `HTTP/[\d.]+ (\d+)\s*(.*)`
   - Group 1: status code (number)
   - Group 2: status text (string, may be empty)
3. Subsequent non-empty lines are headers in `Key: Value` format
   - Split on first `:` only (values may contain colons)
   - Trim whitespace from both key and value

## Authentication

The ZAP API key is **not required**. API requests are handled in-process by `API.getInstance().handleApiRequest()` within the `WebUiServer`'s `HttpMessageHandler`. Since requests never leave the server process, they bypass ZAP's API key check — the web UI server is a trusted component.

In development (Vite dev server proxying to `localhost:8080`), the ZAP instance must have its API key disabled or the dev server must inject it. For simplicity, run ZAP with `-config api.disablekey=true` during development.

## Request Routing

```
Production (ExtensionNetwork server):
  Frontend request:  /JSON/core/action/sendRequest/?request=...
                         ↓ (HttpMessageHandler detects /JSON/ prefix)
  In-process call:   API.getInstance().handleApiRequest(msg, ...)

Development (Vite dev server):
  Frontend request:  /JSON/core/action/sendRequest/?request=...
                         ↓ (Vite proxy matches /JSON/ prefix)
  Proxied to:        http://localhost:8080/JSON/core/action/sendRequest/?request=...
```
