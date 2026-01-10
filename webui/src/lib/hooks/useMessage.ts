import { useQuery } from "@tanstack/react-query"
import { zapView } from "@/lib/api/client"

export interface Message {
  id: string
  url: string
  method: string
  statusCode: number
  statusText: string
  requestHeaders: string
  requestBody: string
  responseHeaders: string
  responseBody: string
  timestamp: string
}

interface MessageData {
  id: string
  requestHeader: string
  requestBody: string
  responseHeader: string
  responseBody: string
}

interface MessageResponse {
  // API can return message as either an array or a single object
  message: MessageData | MessageData[]
}

export function useMessage(messageId: string | null) {
  return useQuery({
    queryKey: ["message", messageId],
    queryFn: async () => {
      if (!messageId) return null

      const response = await zapView<MessageResponse>("core", "message", {
        id: messageId,
      })

      if (!response.message) {
        throw new Error("Message not found")
      }

      // Handle both array and single object response formats
      const msg = Array.isArray(response.message) ? response.message[0] : response.message

      if (!msg) {
        throw new Error("Message not found")
      }

      const parsed = parseMessage(msg)
      return parsed
    },
    enabled: !!messageId,
  })
}

export function parseMessage(msg: {
  id: string
  requestHeader: string
  requestBody: string
  responseHeader: string
  responseBody: string
}): Message {
  // Parse request header to get method and URL
  const requestLines = msg.requestHeader.split(/\r?\n/)
  const requestLine = requestLines[0]
  const requestMatch = requestLine.match(/^(\w+)\s+(\S+)\s+HTTP/)
  const method = requestMatch ? requestMatch[1] : "GET"
  const pathOrUrl = requestMatch ? requestMatch[2] : "/"

  // Determine the full URL - it might already be absolute or just a path
  let url: string
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    // Already a full URL
    url = pathOrUrl
  } else {
    // Just a path, need to get host header to build full URL
    const hostHeader = requestLines.find((line) => line.toLowerCase().startsWith("host:"))
    const host = hostHeader ? hostHeader.substring(5).trim() : "unknown"
    url = `https://${host}${pathOrUrl}`
  }

  // Parse response header to get status code
  const responseLines = msg.responseHeader.split(/\r?\n/)
  const statusLine = responseLines[0]
  const statusMatch = statusLine.match(/HTTP\/[\d.]+ (\d+)\s*(.*)/)
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 0
  const statusText = statusMatch ? statusMatch[2].trim() : ""

  return {
    id: msg.id,
    url,
    method,
    statusCode,
    statusText,
    requestHeaders: msg.requestHeader,
    requestBody: msg.requestBody || "",
    responseHeaders: msg.responseHeader,
    responseBody: msg.responseBody || "",
    timestamp: new Date().toISOString(),
  }
}
