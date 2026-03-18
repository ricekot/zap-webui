# UI Contract: Request History Sidebar

**Branch**: `002-request-history-sidebar` | **Date**: 2026-03-17

## Purpose

Define the observable UI behaviors that must remain stable for request history capture, display, and replay.

## Contracted Behaviors

### 1) Capture on send attempt

- When a user initiates a request send, a history entry is created immediately.
- Capture includes method, URL, headers, body, and timestamp.
- Failed send attempts are captured the same as successful attempts.

### 2) Sidebar list behavior

- History is shown in a dedicated sidebar region.
- Entries are listed in reverse chronological order (most recent first).
- Empty history shows a non-blank explanatory empty state.

### 3) Bounded retention

- The list retains at most 50 entries.
- When adding the 51st entry, the oldest retained entry is removed.

### 4) Entry selection and replay

- Clicking an entry reloads full request details into the editor.
- Reload always replaces current editor content immediately.
- Reload does not auto-send; user must explicitly send again.

### 5) Fidelity and mutability

- Stored entries preserve request values exactly as sent, including sensitive values.
- Editing the request after reload does not mutate the stored history entry.

## Acceptance-oriented checks

- After 60 sends, exactly 50 entries remain.
- Selecting a specific entry restores matching method, URL, headers, and body.
- With unsent editor changes present, selecting an entry still replaces editor contents immediately.
