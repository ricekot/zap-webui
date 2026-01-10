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

interface MessageResponse {
  message: Array<{
    id: string
    requestHeader: string
    requestBody: string
    responseHeader: string
    responseBody: string
  }>
}

export function useMessage(messageId: string | null) {
  return useQuery({
    queryKey: ["message", messageId],
    queryFn: async () => {
      if (!messageId) return null

      const response = await zapView<MessageResponse>("core", "message", {
        id: messageId,
      })

      if (!response.message || response.message.length === 0) {
        throw new Error("Message not found")
      }

      const msg = response.message[0]
      const parsed = parseMessage(msg)
      return parsed
    },
    enabled: !!messageId,
  })
}

function parseMessage(msg: {
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
  const path = requestMatch ? requestMatch[2] : "/"

  // Get Host header to build full URL
  const hostHeader = requestLines.find((line) =>
    line.toLowerCase().startsWith("host:")
  )
  const host = hostHeader ? hostHeader.substring(5).trim() : "unknown"
  const url = `https://${host}${path}`

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
