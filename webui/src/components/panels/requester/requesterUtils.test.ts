import { describe, it, expect } from "vitest"
import { buildRawRequest, parseZapResponse, type ZapMessage } from "./requesterUtils"
import type { HttpRequest } from "./RequesterPanel"

describe("buildRawRequest", () => {
  it("builds a simple GET request with full URL", () => {
    const request: HttpRequest = {
      method: "GET",
      url: "https://example.com/path",
      headers: [],
      body: "",
    }

    const result = buildRawRequest(request)

    expect(result).toBe("GET https://example.com/path HTTP/1.1\r\nHost: example.com\r\n\r\n")
  })

  it("preserves HTTPS in request line", () => {
    const request: HttpRequest = {
      method: "GET",
      url: "https://secure.example.com/api",
      headers: [],
      body: "",
    }

    const result = buildRawRequest(request)

    expect(result).toContain("GET https://secure.example.com/api HTTP/1.1")
    expect(result).toContain("Host: secure.example.com")
  })

  it("includes enabled headers", () => {
    const request: HttpRequest = {
      method: "GET",
      url: "https://example.com/",
      headers: [
        { key: "Accept", value: "application/json", enabled: true },
        { key: "Authorization", value: "Bearer token", enabled: true },
      ],
      body: "",
    }

    const result = buildRawRequest(request)

    expect(result).toContain("Accept: application/json")
    expect(result).toContain("Authorization: Bearer token")
  })

  it("excludes disabled headers", () => {
    const request: HttpRequest = {
      method: "GET",
      url: "https://example.com/",
      headers: [
        { key: "Accept", value: "application/json", enabled: true },
        { key: "X-Disabled", value: "should not appear", enabled: false },
      ],
      body: "",
    }

    const result = buildRawRequest(request)

    expect(result).toContain("Accept: application/json")
    expect(result).not.toContain("X-Disabled")
  })

  it("excludes headers with empty keys", () => {
    const request: HttpRequest = {
      method: "GET",
      url: "https://example.com/",
      headers: [
        { key: "", value: "empty key", enabled: true },
        { key: "Valid", value: "header", enabled: true },
      ],
      body: "",
    }

    const result = buildRawRequest(request)

    expect(result).not.toContain("empty key")
    expect(result).toContain("Valid: header")
  })

  it("builds POST request with body", () => {
    const request: HttpRequest = {
      method: "POST",
      url: "https://api.example.com/data",
      headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
      body: '{"key": "value"}',
    }

    const result = buildRawRequest(request)

    expect(result).toContain("POST https://api.example.com/data HTTP/1.1")
    expect(result).toContain("Content-Type: application/json")
    expect(result).toContain('{"key": "value"}')
  })

  it("builds PUT request with body", () => {
    const request: HttpRequest = {
      method: "PUT",
      url: "https://api.example.com/resource/123",
      headers: [],
      body: '{"updated": true}',
    }

    const result = buildRawRequest(request)

    expect(result).toContain("PUT https://api.example.com/resource/123 HTTP/1.1")
    expect(result).toContain('{"updated": true}')
  })

  it("builds PATCH request with body", () => {
    const request: HttpRequest = {
      method: "PATCH",
      url: "https://api.example.com/resource/123",
      headers: [],
      body: '{"field": "patched"}',
    }

    const result = buildRawRequest(request)

    expect(result).toContain("PATCH")
    expect(result).toContain('{"field": "patched"}')
  })

  it("does not include body for GET request", () => {
    const request: HttpRequest = {
      method: "GET",
      url: "https://example.com/",
      headers: [],
      body: "this should not appear",
    }

    const result = buildRawRequest(request)

    expect(result).not.toContain("this should not appear")
    expect(result.endsWith("\r\n\r\n")).toBe(true)
  })

  it("does not include body for DELETE request", () => {
    const request: HttpRequest = {
      method: "DELETE",
      url: "https://example.com/resource/1",
      headers: [],
      body: "body content",
    }

    const result = buildRawRequest(request)

    expect(result).not.toContain("body content")
  })

  it("handles URL with port", () => {
    const request: HttpRequest = {
      method: "GET",
      url: "https://example.com:8080/api",
      headers: [],
      body: "",
    }

    const result = buildRawRequest(request)

    expect(result).toContain("Host: example.com:8080")
  })

  it("handles URL with query parameters", () => {
    const request: HttpRequest = {
      method: "GET",
      url: "https://example.com/search?q=test&page=1",
      headers: [],
      body: "",
    }

    const result = buildRawRequest(request)

    expect(result).toContain("GET https://example.com/search?q=test&page=1 HTTP/1.1")
  })
})

describe("parseZapResponse", () => {
  it("parses single message response", () => {
    const msg: ZapMessage = {
      id: "1",
      requestHeader: "",
      requestBody: "",
      responseHeader: "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n",
      responseBody: "<html></html>",
    }

    const result = parseZapResponse(msg)

    expect(result.statusCode).toBe(200)
    expect(result.statusText).toBe("OK")
    expect(result.body).toBe("<html></html>")
    expect(result.headers).toContainEqual({ key: "Content-Type", value: "text/html" })
  })

  it("parses array of messages and returns last one", () => {
    const messages: ZapMessage[] = [
      {
        id: "1",
        requestHeader: "",
        requestBody: "",
        responseHeader: "HTTP/1.1 301 Moved Permanently\r\nLocation: /new\r\n\r\n",
        responseBody: "",
      },
      {
        id: "2",
        requestHeader: "",
        requestBody: "",
        responseHeader: "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n",
        responseBody: '{"final": true}',
      },
    ]

    const result = parseZapResponse(messages)

    // Should use the last message (final response after redirect)
    expect(result.statusCode).toBe(200)
    expect(result.statusText).toBe("OK")
    expect(result.body).toBe('{"final": true}')
  })

  it("extracts status code from response header", () => {
    const msg: ZapMessage = {
      id: "1",
      requestHeader: "",
      requestBody: "",
      responseHeader: "HTTP/1.1 404 Not Found\r\n\r\n",
      responseBody: "",
    }

    const result = parseZapResponse(msg)

    expect(result.statusCode).toBe(404)
    expect(result.statusText).toBe("Not Found")
  })

  it("parses multiple response headers", () => {
    const msg: ZapMessage = {
      id: "1",
      requestHeader: "",
      requestBody: "",
      responseHeader:
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nCache-Control: no-cache\r\nX-Request-Id: abc123\r\n\r\n",
      responseBody: "{}",
    }

    const result = parseZapResponse(msg)

    expect(result.headers).toHaveLength(3)
    expect(result.headers).toContainEqual({ key: "Content-Type", value: "application/json" })
    expect(result.headers).toContainEqual({ key: "Cache-Control", value: "no-cache" })
    expect(result.headers).toContainEqual({ key: "X-Request-Id", value: "abc123" })
  })

  it("handles headers with colons in values", () => {
    const msg: ZapMessage = {
      id: "1",
      requestHeader: "",
      requestBody: "",
      responseHeader: "HTTP/1.1 200 OK\r\nDate: Mon, 01 Jan 2024 12:00:00 GMT\r\n\r\n",
      responseBody: "",
    }

    const result = parseZapResponse(msg)

    expect(result.headers).toContainEqual({
      key: "Date",
      value: "Mon, 01 Jan 2024 12:00:00 GMT",
    })
  })

  it("handles response with no status text", () => {
    const msg: ZapMessage = {
      id: "1",
      requestHeader: "",
      requestBody: "",
      responseHeader: "HTTP/1.1 204\r\n\r\n",
      responseBody: "",
    }

    const result = parseZapResponse(msg)

    expect(result.statusCode).toBe(204)
    expect(result.statusText).toBe("")
  })

  it("handles empty response body", () => {
    const msg: ZapMessage = {
      id: "1",
      requestHeader: "",
      requestBody: "",
      responseHeader: "HTTP/1.1 204 No Content\r\n\r\n",
      responseBody: "",
    }

    const result = parseZapResponse(msg)

    expect(result.body).toBe("")
  })

  it("handles HTTP/2 response", () => {
    const msg: ZapMessage = {
      id: "1",
      requestHeader: "",
      requestBody: "",
      responseHeader: "HTTP/2 200 OK\r\nContent-Type: text/plain\r\n\r\n",
      responseBody: "data",
    }

    const result = parseZapResponse(msg)

    expect(result.statusCode).toBe(200)
    expect(result.statusText).toBe("OK")
  })

  it("calculates response size", () => {
    const msg: ZapMessage = {
      id: "1",
      requestHeader: "",
      requestBody: "",
      responseHeader: "HTTP/1.1 200 OK\r\n\r\n",
      responseBody: "12345",
    }

    const result = parseZapResponse(msg)

    // Size should be header + body
    expect(result.size).toBeGreaterThan(0)
    expect(result.size).toBe(new Blob(["HTTP/1.1 200 OK\r\n\r\n12345"]).size)
  })

  it("handles unix-style line endings", () => {
    const msg: ZapMessage = {
      id: "1",
      requestHeader: "",
      requestBody: "",
      responseHeader: "HTTP/1.1 200 OK\nContent-Type: text/html\n\n",
      responseBody: "<html></html>",
    }

    const result = parseZapResponse(msg)

    expect(result.statusCode).toBe(200)
    expect(result.headers).toContainEqual({ key: "Content-Type", value: "text/html" })
  })
})
