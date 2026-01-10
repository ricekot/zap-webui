import type { HttpRequest, HttpResponse } from "./RequesterPanel"

export interface ZapMessage {
  id: string
  requestHeader: string
  requestBody: string
  responseHeader: string
  responseBody: string
  rtt?: string
}

/**
 * Builds a raw HTTP request string from the HttpRequest object
 * Format: METHOD URL HTTP/1.1\r\nHeaders\r\n\r\nBody
 */
export function buildRawRequest(request: HttpRequest): string {
  const url = new URL(request.url)

  const headers = request.headers
    .filter((h) => h.enabled && h.key)
    .map((h) => `${h.key}: ${h.value}`)
    .join("\r\n")

  const hostHeader = `Host: ${url.host}`
  const allHeaders = headers ? `${hostHeader}\r\n${headers}` : hostHeader

  // Use full URL (including scheme) so ZAP knows whether to use http or https
  let raw = `${request.method} ${request.url} HTTP/1.1\r\n${allHeaders}\r\n\r\n`

  if (request.body && ["POST", "PUT", "PATCH"].includes(request.method)) {
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
