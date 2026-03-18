# Feature Specification: Request History Sidebar

**Feature Branch**: `002-request-history-sidebar`  
**Created**: 2026-03-17  
**Status**: Draft  
**Input**: User description: "Add a way to maintain and see request history in the web UI, that will allow users to inspect the sent requests and replay them if they want. Store last N requests (start with 20-50). Show them in a sidebar. Click to reload into the editor."

## Clarifications

### Session 2026-03-17

- Q: How should sensitive request values be handled in history? → A: Store and display all request values exactly as sent.
- Q: What should happen if a user clicks history with unsent editor changes? → A: Always replace editor content immediately.
- Q: Should request history be shared or tab-specific? → A: Tabs are not supported at this stage.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Replay prior request quickly (Priority: P1)

As a user sending multiple requests, I can open a request history list and click a previous entry so the request is loaded back into the editor for re-sending or modification.

**Why this priority**: Replaying prior requests is the core user value and directly reduces repeated manual entry.

**Independent Test**: Send several requests, click one history entry, and verify method, URL, headers, and body are restored in the editor and ready to send.

**Acceptance Scenarios**:

1. **Given** a user has sent at least one request, **When** they select that request from history, **Then** the full request details are loaded into the editor.
2. **Given** a user loaded a request from history, **When** they click send, **Then** the request is sent using the loaded details.

---

### User Story 2 - Inspect recently sent requests (Priority: P2)

As a user troubleshooting or comparing behavior, I can view a sidebar of recent requests and inspect key details to identify the one I want.

**Why this priority**: Visibility into past activity helps users orient themselves and choose the correct request to replay.

**Independent Test**: Send requests with different methods and endpoints, open the history sidebar, and confirm each entry displays enough identifying information to distinguish requests.

**Acceptance Scenarios**:

1. **Given** multiple requests have been sent, **When** the user opens the history sidebar, **Then** entries are shown in reverse chronological order with clear identifying details.
2. **Given** no requests have been sent yet, **When** the user views the history sidebar, **Then** an empty state message explains that history will appear after sending requests.

---

### User Story 3 - Keep history bounded and current (Priority: P3)

As a user, I want only a manageable number of recent requests retained so history stays relevant and performant.

**Why this priority**: A bounded history prevents unmanageable growth while preserving useful recent context.

**Independent Test**: Send more than the configured maximum number of requests and verify only the most recent entries are retained.

**Acceptance Scenarios**:

1. **Given** the user has sent more than 50 requests, **When** they view history, **Then** only the 50 most recent requests are kept and older entries are removed.

---

### Edge Cases

- When a request send fails (for example network or server error), the attempted request still appears in history so it can be inspected and replayed.
- When the same request is sent repeatedly, each send is recorded as a separate history entry to preserve chronology.
- When a request has a very large body or many headers, history still remains usable by showing concise entry details while retaining full request content for reload.
- When a user edits the current request after loading from history, those unsent edits do not alter the stored historical entry.
- When a user has unsent edits and selects a history entry, the current editor content is replaced immediately and unsent edits are discarded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST record each request immediately after a send attempt is initiated.
- **FR-002**: The system MUST store, per history entry, the request method, target URL, headers, body content, and timestamp.
- **FR-003**: The system MUST display request history in a dedicated sidebar in reverse chronological order (most recent first).
- **FR-004**: Users MUST be able to select any history entry and reload its full request details into the request editor.
- **FR-005**: The system MUST retain a maximum of 50 history entries and remove the oldest entries when the limit is exceeded.
- **FR-006**: The system MUST show a clear empty state in the sidebar when no history exists.
- **FR-007**: The system MUST preserve request history across page refreshes in the same browser until entries age out by the max-history limit.
- **FR-008**: Reloading a history entry into the editor MUST NOT mutate the stored history entry when the user makes subsequent edits.
- **FR-009**: The system MUST store and display request values exactly as sent, including sensitive header and body values, to preserve full inspection fidelity.
- **FR-010**: Selecting a history entry MUST immediately replace the current editor content, including when unsent edits exist.
- **FR-011**: The system MUST maintain a single request history list for the requester interface while tab-specific behavior is out of scope.

### Key Entities *(include if feature involves data)*

- **Request History Entry**: A record of a sent request with method, URL, headers, body, timestamp, and recency position.
- **Request History Collection**: An ordered list of recent request history entries with a fixed maximum capacity of 50.

### Assumptions

- The initial maximum history size is set to 50 entries, which satisfies the requested starting range of 20 to 50.
- History is scoped to the current browser profile and is not synchronized across different devices or users.
- Replay behavior means loading a prior request into the editor; the request is sent only when the user explicitly triggers send.
- The requester currently operates without tab support, so history partitioning by tab is not applicable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability testing, at least 90% of users can find and reload a previously sent request in under 15 seconds.
- **SC-002**: After sending 60 requests, users consistently see exactly 50 most-recent entries in history.
- **SC-003**: In first-attempt testing, at least 95% of selected history entries reload with matching method, URL, headers, and body.
- **SC-004**: At least 85% of users report that request history makes repeat-request workflows easier than manual re-entry.
