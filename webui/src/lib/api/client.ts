/**
 * Base API client for ZAP API
 *
 * All requests go directly to ZAP native API paths (/JSON/*, /UI/*, /OTHER/*).
 * In production, the WebUiServer handles these requests in-process via
 * API.getInstance().handleApiRequest(). In development, the Vite dev server
 * proxies these paths to ZAP's API on localhost:8080.
 */

const API_BASE = ""

export interface ZapApiResponse<T = unknown> {
  Result?: T
  [key: string]: unknown
}

export interface ZapApiError {
  code: string
  message: string
}

export class ApiError extends Error {
  code: string
  status?: number

  constructor(code: string, message: string, status?: number) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.status = status
  }
}

/**
 * Make a request to the ZAP JSON API
 */
export async function zapApi<T = unknown>(
  component: string,
  type: "view" | "action" | "other",
  method: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  const url = new URL(`${API_BASE}/JSON/${component}/${type}/${method}/`, window.location.origin)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorText = await response.text()
    throw new ApiError("HTTP_ERROR", errorText || response.statusText, response.status)
  }

  const data = await response.json()

  // ZAP API returns errors in a specific format
  if (data.code && data.message) {
    throw new ApiError(data.code, data.message)
  }

  return data as T
}

/**
 * Shorthand for view endpoints
 */
export function zapView<T = unknown>(
  component: string,
  method: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  return zapApi<T>(component, "view", method, params)
}

/**
 * Shorthand for action endpoints
 */
export function zapAction<T = unknown>(
  component: string,
  method: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  return zapApi<T>(component, "action", method, params)
}
