/**
 * Type definitions for ZAP API responses
 */

/**
 * Minimal message shape returned by ZAP's sendRequest API.
 * Contains only the fields needed for the requester panel.
 */
export interface ZapMessage {
  id: string
  requestHeader: string
  requestBody: string
  responseHeader: string
  responseBody: string
  rtt?: string
}

/**
 * Full message shape returned by ZAP's message APIs (e.g., messageById).
 * Extends ZapMessage with additional metadata fields.
 */
export interface HttpMessage extends ZapMessage {
  cookieParams: string
  note: string
  tags: string[]
  timestamp: string
  responseTime: string
  type: string
}
