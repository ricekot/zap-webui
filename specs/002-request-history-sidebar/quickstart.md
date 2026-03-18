# Quickstart: Request History Sidebar

**Branch**: `002-request-history-sidebar` | **Date**: 2026-03-17

## Goal

Implement and validate request history capture, sidebar inspection, and replay in the requester UI.

## Prerequisites

- Java 17+
- bun installed
- Project dependencies installed (`bun install` in `webui/`)

## Implementation Steps

1. Add a dedicated request history store with:
   - append-on-send behavior
   - max size of 50 entries
   - persistence across browser refresh
2. Add request history sidebar UI in requester area:
   - reverse-chronological entries
   - empty state messaging
   - click-to-reload interaction
3. Wire requester send flow to record each send attempt.
4. Wire history selection to replace current editor content immediately.
   - Selection should only load data into the editor; it must not auto-send.
5. Ensure reload uses copied values so stored history entries remain immutable.

## Validation Steps

### Frontend checks

```bash
cd /Users/ricekot/gh/ricekot/zap-webui/webui
bun run test
bun run lint
```

### Full project build

```bash
cd /Users/ricekot/gh/ricekot/zap-webui
./gradlew build
```

## Manual Verification

1. Send 3 distinct requests, then confirm all appear in sidebar in newest-first order.
2. Click an older entry and verify method, URL, headers, and body reload into editor.
3. Make unsent editor edits, click a history entry, confirm edits are replaced immediately.
4. Send more than 50 requests and confirm only the 50 most recent remain.
5. Refresh browser and confirm history persists with same retained entries.
6. Trigger a failed send (for example, using an unreachable host) and confirm the attempt still appears in history.
7. Reload a history entry, edit the request, then re-select the same history entry and confirm the stored values are unchanged.
