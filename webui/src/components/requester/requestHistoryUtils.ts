import type { RequestHistoryEntry } from "@/stores/requestHistory"

const URL_SUMMARY_MAX_LENGTH = 56

export function formatEntryUrlSummary(url: string): string {
  if (url.length <= URL_SUMMARY_MAX_LENGTH) {
    return url
  }

  return `${url.slice(0, URL_SUMMARY_MAX_LENGTH - 1)}...`
}

export function formatEntryTimestamp(isoTimestamp: string, now = Date.now()): string {
  const timestamp = new Date(isoTimestamp).getTime()

  if (Number.isNaN(timestamp)) {
    return "Unknown time"
  }

  const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000))

  if (diffSeconds < 10) {
    return "just now"
  }

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`
  }

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  return new Date(isoTimestamp).toLocaleString()
}

export function hasEntryBody(entry: RequestHistoryEntry): boolean {
  return entry.body.trim().length > 0
}
