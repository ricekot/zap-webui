# Tasks: Request History Sidebar

**Input**: Design documents from `/specs/002-request-history-sidebar/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include focused unit/component tests because plan.md requires verification for new store/UI behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared types and component/store scaffolding for request history work.

- [X] T001 Extract requester domain types to `webui/src/components/requester/types.ts` and update imports in `webui/src/components/requester/RequesterPanel.tsx`
- [X] T002 [P] Create request history store scaffold in `webui/src/stores/requestHistory.ts`
- [X] T003 [P] Create request history sidebar component scaffold in `webui/src/components/requester/RequestHistorySidebar.tsx`
- [X] T004 Export history store from `webui/src/stores/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared history mechanics required before user-story delivery.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Implement `RequestHistoryEntry` and `RequestHistoryCollection` state model in `webui/src/stores/requestHistory.ts`
- [X] T006 [P] Add store unit tests for append ordering and unique IDs in `webui/src/stores/requestHistory.test.ts`
- [X] T007 [P] Add store unit tests for bounded trim-to-50 behavior in `webui/src/stores/requestHistory.test.ts`
- [X] T008 Implement persistence and rehydration behavior in `webui/src/stores/requestHistory.ts`
- [X] T009 Add store unit tests for persistence/rehydration in `webui/src/stores/requestHistory.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Replay prior request quickly (Priority: P1) 🎯 MVP

**Goal**: Let users click a history entry to reload method/URL/headers/body into the editor and resend.

**Independent Test**: Send multiple requests, click one history entry, and verify editor fields fully match the selected entry and can be sent again.

### Implementation for User Story 1

- [X] T010 [US1] Record each send attempt (including failed attempts) into history from `webui/src/components/requester/RequesterPanel.tsx`
- [X] T011 [US1] Add history entry selection handler that immediately replaces current editor state in `webui/src/components/requester/RequesterPanel.tsx`
- [X] T012 [P] [US1] Implement clickable/selectable entry rows and `onSelect` callback handling in `webui/src/components/requester/RequestHistorySidebar.tsx`
- [X] T013 [US1] Integrate `RequestHistorySidebar` into requester layout in `webui/src/components/requester/RequesterPanel.tsx`
- [X] T014 [P] [US1] Add replay flow component tests (select entry loads editor, does not auto-send) in `webui/src/components/requester/RequesterPanel.test.tsx`

**Checkpoint**: User Story 1 is functional and independently testable.

---

## Phase 4: User Story 2 - Inspect recently sent requests (Priority: P2)

**Goal**: Show a readable history sidebar with identifying request details and a useful empty state.

**Independent Test**: After sending varied requests, confirm sidebar shows newest-first entries with enough metadata to identify each request; confirm empty state when none exist.

### Implementation for User Story 2

- [X] T015 [P] [US2] Add history display formatter utilities in `webui/src/components/requester/requestHistoryUtils.ts`
- [X] T016 [US2] Render reverse-chronological entries with method and URL summary in `webui/src/components/requester/RequestHistorySidebar.tsx`
- [X] T017 [US2] Add timestamp and body-presence indicators to entry rows in `webui/src/components/requester/RequestHistorySidebar.tsx`
- [X] T018 [US2] Add explicit empty-state message when history has no entries in `webui/src/components/requester/RequestHistorySidebar.tsx`
- [X] T019 [P] [US2] Add sidebar component tests for ordering and empty state in `webui/src/components/requester/RequestHistorySidebar.test.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Keep history bounded and current (Priority: P3)

**Goal**: Enforce max-50 retention with persistence and immutable reload behavior.

**Independent Test**: Send more than 50 requests and verify only latest 50 remain; refresh page and confirm retained entries persist; edit after reload and confirm stored entry remains unchanged.

### Implementation for User Story 3

- [X] T020 [US3] Enforce max-entry trimming and oldest-removal behavior in `webui/src/stores/requestHistory.ts`
- [X] T021 [US3] Ensure history reload path clones data to avoid mutating stored entries in `webui/src/components/requester/RequesterPanel.tsx`
- [X] T022 [P] [US3] Add store/component tests for immutability after reload and post-edit behavior in `webui/src/components/requester/RequesterPanel.test.tsx`
- [X] T023 [P] [US3] Add store tests for refresh persistence with 50-entry cap in `webui/src/stores/requestHistory.test.ts`

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final quality checks, docs alignment, and full verification.

- [X] T024 Update request history usage and verification notes in `specs/002-request-history-sidebar/quickstart.md`
- [X] T025 Run and fix frontend lint/test issues using `webui/package.json` scripts
- [X] T026 Run and fix full build issues via `build.gradle.kts` (`./gradlew build`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories.
- **User Stories (Phase 3+)**: Depend on Foundational completion.
- **Polish (Phase 6)**: Depends on all target user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; no dependency on other stories.
- **US2 (P2)**: Starts after Phase 2; can build on sidebar from US1 but remains independently testable.
- **US3 (P3)**: Starts after Phase 2; validates retention/persistence constraints across prior flows.

### Within Each User Story

- Store and shared utility changes before UI wiring.
- UI wiring before story-level tests.
- Story checkpoint must pass before declaring story complete.

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run together after T001.
- **Phase 2**: T006 and T007 can run in parallel; T009 can run after T008.
- **US1**: T012 and T014 can run in parallel once T011/T013 interfaces are stable.
- **US2**: T015 and T019 can run in parallel with careful coordination on display contract.
- **US3**: T022 and T023 can run in parallel after T020/T021.

---

## Parallel Example: User Story 1

```bash
# Parallelizable US1 tasks after base wiring exists:
Task: "Implement clickable/selectable entry rows in webui/src/components/requester/RequestHistorySidebar.tsx"
Task: "Add replay flow component tests in webui/src/components/requester/RequesterPanel.test.tsx"
```

## Parallel Example: User Story 2

```bash
# Parallelizable US2 tasks:
Task: "Add display formatter utilities in webui/src/components/requester/requestHistoryUtils.ts"
Task: "Add sidebar ordering/empty-state tests in webui/src/components/requester/RequestHistorySidebar.test.tsx"
```

## Parallel Example: User Story 3

```bash
# Parallelizable US3 validation tasks:
Task: "Add immutability-after-reload tests in webui/src/components/requester/RequesterPanel.test.tsx"
Task: "Add persistence + 50-entry-cap tests in webui/src/stores/requestHistory.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phases 1-2.
2. Complete Phase 3 (US1).
3. Validate replay flow independently via US1 test criteria.

### Incremental Delivery

1. Deliver US1 (replay) as MVP.
2. Deliver US2 (inspection quality) without regressing replay.
3. Deliver US3 (retention/persistence guarantees).
4. Finish with Phase 6 quality gates.

### Parallel Team Strategy

1. One engineer completes Phase 1-2 foundation.
2. Then split by story:
   - Engineer A: US1 replay wiring
   - Engineer B: US2 sidebar presentation
   - Engineer C: US3 retention/persistence validation

---

## Notes

- All tasks use the required checklist format with task IDs, optional [P], and [US#] labels for story phases.
- Story phases remain independently testable according to `specs/002-request-history-sidebar/spec.md`.
- Keep request values displayed exactly as sent, including sensitive values, per clarification.
