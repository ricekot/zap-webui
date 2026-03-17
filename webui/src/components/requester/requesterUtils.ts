import type { HttpRequest, HttpResponse } from "./RequesterPanel"
import type { ZapMessage } from "@/lib/api/types"

export type { ZapMessage }

/**
 * Builds a raw HTTP request string from the HttpRequest object
 * Format: METHOD URL HTTP/1.1\r\nHeaders\r\n\r\nBody
 */
export function buildRawRequest(request: HttpRequest): string {
  const url = new URL(request.url)

  const enabledHeaders = request.headers.filter((h) => h.enabled && h.key)

  const headerLines = enabledHeaders.map((h) => `${h.key}: ${h.value}`).join("\r\n")

  const hostHeader = `Host: ${url.host}`
  let allHeaders = headerLines ? `${hostHeader}\r\n${headerLines}` : hostHeader

  const hasBody = request.body && ["POST", "PUT", "PATCH"].includes(request.method)

  // Auto-add Content-Type if the request has a body and no Content-Type header is set
  if (hasBody) {
    const hasContentType = enabledHeaders.some((h) => h.key.toLowerCase() === "content-type")
    if (!hasContentType) {
      allHeaders += "\r\nContent-Type: application/json"
    }

    // Auto-add Content-Length for the body
    const bodyBytes = new TextEncoder().encode(request.body).length
    const hasContentLength = enabledHeaders.some((h) => h.key.toLowerCase() === "content-length")
    if (!hasContentLength) {
      allHeaders += `\r\nContent-Length: ${bodyBytes}`
    }
  }

  // Use full URL (including scheme) so ZAP knows whether to use http or https
  let raw = `${request.method} ${request.url} HTTP/1.1\r\n${allHeaders}\r\n\r\n`

  if (hasBody) {
    raw += request.body
  }

  return raw
}

/**
 * Parses ZAP's sendRequest response into an HttpResponse object
 * Handles both single message and array of messages (redirect chain)
 */
export function parseZapResponse(messages: ZapMessage | ZapMessage[]): Omit<HttpResponse, "time"> {
  // Handle both single message and array of messages (redirect chain)
  // Use the last message in the chain (final response after redirects)
  const msg = Array.isArray(messages) ? messages[messages.length - 1] : messages

  const lines = msg.responseHeader.split(/\r?\n/)
  const statusLine = lines[0]
  const statusMatch = statusLine.match(/HTTP\/[\d.]+ (\d+)\s*(.*)/)

  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 0
  const statusText = statusMatch ? statusMatch[2].trim() : ""

  // Parse headers (skip status line, stop at empty line)
  const headers: Array<{ key: string; value: string }> = []

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "" || lines[i] === "\r") {
      break
    }
    const colonIndex = lines[i].indexOf(":")
    if (colonIndex > 0) {
      headers.push({
        key: lines[i].substring(0, colonIndex).trim(),
        value: lines[i].substring(colonIndex + 1).trim(),
      })
    }
  }

  const body = msg.responseBody || ""

  return {
    statusCode,
    statusText,
    size: new Blob([msg.responseHeader + body]).size,
    headers,
    body,
  }
}
