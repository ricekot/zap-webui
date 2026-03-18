export interface HttpRequestHeader {
  key: string
  value: string
  enabled: boolean
}

export interface HttpRequest {
  method: string
  url: string
  headers: HttpRequestHeader[]
  body: string
}

export interface HttpResponseHeader {
  key: string
  value: string
}

export interface HttpResponse {
  statusCode: number
  statusText: string
  time: number
  size: number
  headers: HttpResponseHeader[]
  body: string
}

export interface RequesterState {
  request: HttpRequest
  response: HttpResponse | null
  error: string | null
}

export const defaultRequest: HttpRequest = {
  method: "GET",
  url: "",
  headers: [{ key: "", value: "", enabled: true }],
  body: "",
}

export const defaultRequesterState: RequesterState = {
  request: defaultRequest,
  response: null,
  error: null,
}
