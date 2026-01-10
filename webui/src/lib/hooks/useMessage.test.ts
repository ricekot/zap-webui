import { describe, it, expect } from "vitest"
import { parseMessage } from "./useMessage"

describe("parseMessage", () => {
  it("parses a simple GET request with relative path", () => {
    const msg = {
      id: "1",
      requestHeader: "GET /path HTTP/1.1\r\nHost: example.com\r\nAccept: */*",
      requestBody: "",
      responseHeader: "HTTP/1.1 200 OK\r\nContent-Type: text/html",
      responseBody: "<html></html>",
    }

    const result = parseMessage(msg)

    expect(result.id).toBe("1")
    expect(result.method).toBe("GET")
    expect(result.url).toBe("https://example.com/path")
    expect(result.statusCode).toBe(200)
    expect(result.statusText).toBe("OK")
    expect(result.requestHeaders).toBe(msg.requestHeader)
    expect(result.responseBody).toBe("<html></html>")
  })

  it("parses request with absolute URL (no duplication)", () => {
    const msg = {
      id: "2",
      requestHeader: "GET https://example.com/api/users HTTP/1.1\r\nHost: example.com",
      requestBody: "",
      responseHeader: "HTTP/1.1 200 OK",
      responseBody: "[]",
    }

    const result = parseMessage(msg)

    // Should NOT duplicate: "https://example.comhttps://example.com/..."
    expect(result.url).toBe("https://example.com/api/users")
    expect(result.method).toBe("GET")
  })

  it("parses POST request with body", () => {
    const msg = {
      id: "3",
      requestHeader:
        "POST /api/data HTTP/1.1\r\nHost: api.example.com\r\nContent-Type: application/json",
      requestBody: '{"key": "value"}',
      responseHeader: "HTTP/1.1 201 Created",
      responseBody: '{"id": 123}',
    }

    const result = parseMessage(msg)

    expect(result.method).toBe("POST")
    expect(result.url).toBe("https://api.example.com/api/data")
    expect(result.statusCode).toBe(201)
    expect(result.statusText).toBe("Created")
    expect(result.requestBody).toBe('{"key": "value"}')
  })

  it("handles response with no status text", () => {
    const msg = {
      id: "4",
      requestHeader: "GET / HTTP/1.1\r\nHost: example.com",
      requestBody: "",
      responseHeader: "HTTP/1.1 204",
      responseBody: "",
    }

    const result = parseMessage(msg)

    expect(result.statusCode).toBe(204)
    expect(result.statusText).toBe("")
  })

  it("handles HTTP/2 response format", () => {
    const msg = {
      id: "5",
      requestHeader: "GET /resource HTTP/2\r\nHost: example.com",
      requestBody: "",
      responseHeader: "HTTP/2 200 OK\r\nContent-Type: application/json",
      responseBody: "{}",
    }

    const result = parseMessage(msg)

    expect(result.statusCode).toBe(200)
    expect(result.statusText).toBe("OK")
  })

  it("handles missing Host header gracefully", () => {
    const msg = {
      id: "6",
      requestHeader: "GET /path HTTP/1.1",
      requestBody: "",
      responseHeader: "HTTP/1.1 200 OK",
      responseBody: "",
    }

    const result = parseMessage(msg)

    expect(result.url).toBe("https://unknown/path")
  })

  it("handles malformed request line gracefully", () => {
    const msg = {
      id: "7",
      requestHeader: "malformed request",
      requestBody: "",
      responseHeader: "HTTP/1.1 400 Bad Request",
      responseBody: "",
    }

    const result = parseMessage(msg)

    expect(result.method).toBe("GET") // Default
    expect(result.statusCode).toBe(400)
  })

  it("handles empty response body", () => {
    const msg = {
      id: "8",
      requestHeader: "DELETE /resource/123 HTTP/1.1\r\nHost: api.example.com",
      requestBody: "",
      responseHeader: "HTTP/1.1 204 No Content",
      responseBody: "",
    }

    const result = parseMessage(msg)

    expect(result.method).toBe("DELETE")
    expect(result.statusCode).toBe(204)
    expect(result.responseBody).toBe("")
  })

  it("handles unix-style line endings", () => {
    const msg = {
      id: "9",
      requestHeader: "GET /path HTTP/1.1\nHost: example.com\nAccept: */*",
      requestBody: "",
      responseHeader: "HTTP/1.1 200 OK\nContent-Type: text/plain",
      responseBody: "data",
    }

    const result = parseMessage(msg)

    expect(result.url).toBe("https://example.com/path")
    expect(result.statusCode).toBe(200)
  })

  it("extracts URL with query parameters", () => {
    const msg = {
      id: "10",
      requestHeader: "GET /search?q=test&page=1 HTTP/1.1\r\nHost: example.com",
      requestBody: "",
      responseHeader: "HTTP/1.1 200 OK",
      responseBody: "",
    }

    const result = parseMessage(msg)

    expect(result.url).toBe("https://example.com/search?q=test&page=1")
  })

  it("handles case-insensitive Host header", () => {
    const msg = {
      id: "11",
      requestHeader: "GET /path HTTP/1.1\r\nhOsT: EXAMPLE.COM",
      requestBody: "",
      responseHeader: "HTTP/1.1 200 OK",
      responseBody: "",
    }

    const result = parseMessage(msg)

    expect(result.url).toBe("https://EXAMPLE.COM/path")
  })
})
