# Implementation Plan: Request History Sidebar

**Branch**: `002-request-history-sidebar` | **Date**: 2026-03-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-request-history-sidebar/spec.md`

## Summary

Add a request history sidebar to the requester UI so users can inspect and replay previously sent requests. The implementation adds a bounded persisted history (max 50), records requests on send attempt, shows recent entries in reverse chronological order, and reloads the selected entry directly into the editor (including immediate replacement of unsent edits).

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode, ES2022 target) and Java 17 (unchanged backend)  
**Primary Dependencies**: React 19, Zustand 5, Tailwind CSS 3, shadcn/ui, existing requester utilities  
**Storage**: Browser local storage via existing frontend state persistence patterns  
**Testing**: Vitest 4 + Testing Library for frontend unit/component tests; existing Gradle build verification  
**Target Platform**: Modern desktop browsers, served by ZAP Web UI add-on  
**Project Type**: Web application (frontend feature with no new backend endpoint)  
**Performance Goals**: Preserve current requester responsiveness; history interactions feel immediate; maintain constitution baseline (<3s initial load)  
**Constraints**: Keep history capped at 50 entries; preserve full request fidelity including sensitive values; no tab-specific behavior; selecting history always replaces editor content immediately  
**Scale/Scope**: Single-user requester workflow, one shared history list, up to 50 retained entries

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Code Quality | Strict TypeScript, ESLint clean, clear responsibilities | PASS | Feature can be isolated into requester history state + sidebar UI with typed models. |
| II. Testing Standards | Build/test verification and test coverage for new store/hooks | PASS | Add tests for history retention, reload behavior, and replacement semantics. |
| III. UX Consistency | shadcn/ui + Tailwind, responsive, empty/error states, keyboard access | PASS | Sidebar uses existing UI primitives, explicit empty state, and keyboard-selectable entries. |
| IV. Performance | No UI blocking, dependency discipline, responsive behavior | PASS | Bounded list of 50 entries and no new heavy dependency keeps impact minimal. |
| Security Requirements | Prevent unsafe rendering, avoid secret leakage in repo | PASS | No raw HTML rendering; sensitive values are intentionally displayed per clarified product requirement. |
| Development Workflow | Branch-based work, frontend checks + full build | PASS | Work stays on feature branch and follows existing validation commands. |

**Gate Result**: PASS — No constitutional violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/002-request-history-sidebar/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── request-history-ui.md
└── tasks.md
```

### Source Code (repository root)

```text
webui/
└── src/
    ├── components/
    │   └── requester/
    │       ├── RequesterPanel.tsx          # Integrates history recording + selection
    │       ├── RequestEditor.tsx           # Receives loaded request state
    │       ├── RequestHistorySidebar.tsx   # New sidebar list and entry interaction
    │       └── requesterUtils.ts           # Existing request parse/build helpers
    ├── stores/
    │   └── requestHistory.ts               # New persisted bounded history store
    └── lib/
        └── hooks/                          # Optional extraction if shared behavior emerges
```

**Structure Decision**: Keep implementation frontend-only in `webui/src/components/requester` and `webui/src/stores`, with no backend changes because request data already exists at send time in the current requester flow.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. Code Quality | PASS | Typed `RequestHistoryEntry` model and dedicated store preserve separation of concerns. |
| II. Testing Standards | PASS | Design includes unit tests for retention cap, ordering, reload fidelity, and unsent-replacement behavior. |
| III. UX Consistency | PASS | Sidebar includes empty state, clear request labels, keyboard interaction, and responsive placement. |
| IV. Performance | PASS | O(1) append + bounded trimming to 50 entries keeps operations lightweight. |
| Security Requirements | PASS | Clarified requirement intentionally preserves and displays full values; no additional rendering bypass introduced. |
| Development Workflow | PASS | No process deviations needed; standard lint/test/build checks apply. |

**Gate Result**: PASS — Proceed to task planning.

## Complexity Tracking

No constitutional violations or complexity exemptions to track.
