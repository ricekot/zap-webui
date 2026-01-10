import { describe, it, expect } from "vitest"
import { parseHeaders } from "./headerUtils"

describe("parseHeaders", () => {
  it("parses simple header string into key-value pairs", () => {
    const raw = "Content-Type: application/json\r\nHost: example.com"
    const result = parseHeaders(raw)

    expect(result).toEqual([
      { key: "Content-Type", value: "application/json" },
      { key: "Host", value: "example.com" },
    ])
  })

  it("handles headers with colons in values (e.g., URLs)", () => {
    const raw = "Location: https://example.com/path?query=1"
    const result = parseHeaders(raw)

    expect(result).toEqual([{ key: "Location", value: "https://example.com/path?query=1" }])
  })

  it("filters out empty lines", () => {
    const raw = "Content-Type: text/html\r\n\r\nCache-Control: no-cache"
    const result = parseHeaders(raw)

    expect(result).toEqual([
      { key: "Content-Type", value: "text/html" },
      { key: "Cache-Control", value: "no-cache" },
    ])
  })

  it("skips HTTP request line (GET /path HTTP/1.1)", () => {
    const raw = "GET /path HTTP/1.1\r\nHost: example.com\r\nAccept: */*"
    const result = parseHeaders(raw)

    expect(result).toEqual([
      { key: "Host", value: "example.com" },
      { key: "Accept", value: "*/*" },
    ])
  })

  it("skips HTTP response status line (HTTP/1.1 200 OK)", () => {
    const raw = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: 1234"
    const result = parseHeaders(raw)

    expect(result).toEqual([
      { key: "Content-Type", value: "text/html" },
      { key: "Content-Length", value: "1234" },
    ])
  })

  it("trims whitespace from keys and values", () => {
    const raw = "  Content-Type  :   application/json   \r\n  Host :  example.com  "
    const result = parseHeaders(raw)

    expect(result).toEqual([
      { key: "Content-Type", value: "application/json" },
      { key: "Host", value: "example.com" },
    ])
  })

  it("handles unix-style line endings (LF only)", () => {
    const raw = "Content-Type: text/plain\nHost: example.com"
    const result = parseHeaders(raw)

    expect(result).toEqual([
      { key: "Content-Type", value: "text/plain" },
      { key: "Host", value: "example.com" },
    ])
  })

  it("returns empty array for empty input", () => {
    const result = parseHeaders("")
    expect(result).toEqual([])
  })

  it("returns empty array for input with only request/status line", () => {
    const result = parseHeaders("GET /path HTTP/1.1")
    expect(result).toEqual([])
  })

  it("skips lines without colon", () => {
    const raw = "Content-Type: text/html\r\nInvalid line without colon\r\nHost: example.com"
    const result = parseHeaders(raw)

    expect(result).toEqual([
      { key: "Content-Type", value: "text/html" },
      { key: "Host", value: "example.com" },
    ])
  })

  it("handles header with empty value", () => {
    const raw = "X-Custom-Header:"
    const result = parseHeaders(raw)

    expect(result).toEqual([{ key: "X-Custom-Header", value: "" }])
  })
})
