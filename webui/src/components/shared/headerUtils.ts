export interface Header {
  key: string
  value: string
}

/**
 * Parses raw HTTP headers string into an array of Header objects
 */
export function parseHeaders(rawHeaders: string): Header[] {
  const lines = rawHeaders.split(/\r?\n/)
  const headers: Header[] = []

  for (const line of lines) {
    // Skip empty lines and the request/status line
    if (!line || line.startsWith("HTTP/") || line.match(/^[A-Z]+\s+/)) {
      continue
    }

    const colonIndex = line.indexOf(":")
    if (colonIndex > 0) {
      headers.push({
        key: line.substring(0, colonIndex).trim(),
        value: line.substring(colonIndex + 1).trim(),
      })
    }
  }

  return headers
}
