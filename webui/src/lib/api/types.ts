/**
 * Type definitions for ZAP API responses
 */

// Alert types
export interface Alert {
  id: string
  pluginId: string
  alertRef: string
  alert: string
  name: string
  risk: "Informational" | "Low" | "Medium" | "High"
  confidence: "False Positive" | "Low" | "Medium" | "High" | "Confirmed"
  description: string
  uri: string
  method: string
  param?: string
  attack?: string
  evidence?: string
  otherInfo?: string
  solution?: string
  reference?: string
  cweid?: string
  wascid?: string
  sourceid?: string
  inputVector?: string
  tags?: Record<string, string>
}

export interface AlertsResponse {
  alerts: Alert[]
}

// Scan types
export interface ScanProgress {
  id: string
  progress: string
  state: string
}

export interface ActiveScanStatus {
  status: string
}

export interface SpiderStatus {
  status: string
}

// Core types
export interface Version {
  version: string
}

export interface Mode {
  mode: string
}

export interface Sites {
  sites: string[]
}

export interface Hosts {
  hosts: string[]
}

// Message types
export interface HttpMessage {
  id: string
  requestHeader: string
  requestBody: string
  responseHeader: string
  responseBody: string
  cookieParams: string
  note: string
  tags: string[]
  timestamp: string
  responseTime: string
  type: string
}

export interface MessagesResponse {
  messages: HttpMessage[]
}
