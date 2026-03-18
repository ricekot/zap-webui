# Data Model: Request History Sidebar

**Branch**: `002-request-history-sidebar` | **Date**: 2026-03-17

## Entities

### RequestHistoryEntry

Represents one send attempt captured in the history list.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string | Stable unique identifier for the entry | Required, unique within collection |
| timestamp | string | Time request was recorded | Required, valid date-time |
| method | string | HTTP method used in request | Required, one of supported requester methods |
| url | string | Full target URL as sent | Required, non-empty |
| headers | HistoryHeader[] | Header key/value pairs captured as sent | Required, may be empty array |
| body | string | Request body content as sent | Optional, defaults to empty string |

### HistoryHeader

Represents a single request header saved in an entry.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| name | string | Header name | Required, non-empty |
| value | string | Header value | Required, may be empty string |

### RequestHistoryCollection

Bounded ordered history container used by the requester UI.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| entries | RequestHistoryEntry[] | Most-recent-first list of saved entries | Required, max length 50 |
| maxEntries | number | Retention cap | Required, fixed at 50 |

## Relationships

- A `RequestHistoryCollection` contains zero or more `RequestHistoryEntry` records.
- Each `RequestHistoryEntry` contains zero or more `HistoryHeader` records.

## State Transitions

1. **Record send attempt**: New `RequestHistoryEntry` is inserted at the front of `entries`.
2. **Trim overflow**: If `entries.length > maxEntries`, oldest entries at the end are removed.
3. **Reload entry**: Selected `RequestHistoryEntry` is copied into the request editor state.
4. **Edit after reload**: Editor changes do not mutate previously stored `RequestHistoryEntry`.

## Derived Display Fields

These values are computed for list readability and not stored as canonical data:

- Request summary label (method + normalized URL preview)
- Relative time label (for example, "just now", "2m ago")
- Optional body-present indicator
