# Research: Request History Sidebar

**Branch**: `002-request-history-sidebar` | **Date**: 2026-03-17

## R-001: History retention size

**Decision**: Retain exactly the 50 most recent requests.

**Rationale**:
- Matches the requested initial range (20-50) while maximizing replay utility.
- Keeps UI rendering and local persistence bounded and predictable.
- Simplifies validation with deterministic trimming behavior.

**Alternatives considered**:
- Retain 20 requests: lower memory use but reduced utility for longer testing sessions.
- Make size configurable now: adds UI/settings scope not requested for MVP.

---

## R-002: Persistence scope for history

**Decision**: Persist history across page refreshes in the same browser profile.

**Rationale**:
- Required by the spec for continuity during normal user workflows.
- Aligns with existing frontend state persistence patterns.
- Avoids backend coupling and keeps feature local to requester UI.

**Alternatives considered**:
- In-memory session only: loses history on refresh and fails requirement.
- Backend-synced persistence: adds API and multi-user complexity beyond scope.

---

## R-003: Handling sensitive values in history

**Decision**: Store and display request values exactly as sent, including sensitive values.

**Rationale**:
- Explicitly clarified by user during `/speckit.clarify`.
- Preserves full inspection and replay fidelity for troubleshooting.

**Alternatives considered**:
- Mask values in list display: reduces exposure risk but conflicts with clarification.
- Drop sensitive fields from history: harms replay fidelity and inspection completeness.

---

## R-004: Behavior on unsent editor changes

**Decision**: Selecting a history entry always replaces current editor content immediately.

**Rationale**:
- Explicitly clarified by user during `/speckit.clarify`.
- Keeps interaction model simple and deterministic.

**Alternatives considered**:
- Confirmation prompt when dirty: safer for edits, but adds branching UX not chosen.
- Preview-before-load flow: stronger protection, but slower interaction and higher scope.

---

## R-005: History scope with tab behavior

**Decision**: Maintain one requester history list; tab-specific behavior is out of scope.

**Rationale**:
- Explicitly clarified by user: requester tabs are not supported at this stage.
- Prevents unnecessary state partitioning work.

**Alternatives considered**:
- Per-tab histories: inapplicable until tabs exist.
- Mixed shared + filtered behavior: unnecessary complexity for current scope.
