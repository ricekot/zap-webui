<!--
  Sync Impact Report
  ==================================================
  Version change: N/A (initial) → 1.0.0
  Modified principles: N/A (initial creation)
  Added sections:
    - Core Principles (4 principles: Code Quality, Testing Standards,
      UX Consistency, Performance Requirements)
    - Security Requirements
    - Development Workflow
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md         ✅ no update needed
    - .specify/templates/spec-template.md          ✅ no update needed
    - .specify/templates/tasks-template.md         ✅ no update needed
    - .specify/templates/commands/*.md             ✅ no command templates exist
  Follow-up TODOs: None
  ==================================================
-->

# ZAP Web UI Constitution

## Core Principles

### I. Code Quality

All code in this project MUST meet the following quality standards:

- **TypeScript strict mode is mandatory.** The frontend MUST compile
  with zero type errors under `strict: true`. No use of `any` except
  where explicitly justified with an inline comment explaining why.
- **Java code MUST follow existing ZAP add-on conventions.** This
  includes Log4j2 for logging, standard ZAP extension lifecycle
  patterns, and consistent JSON handling among other things.
- **ESLint MUST pass with zero warnings and zero errors** before code
  is considered complete. Run `npm run lint` in `webui/` to verify.
- **Single responsibility:** Each module, component, and class MUST
  have a clear, singular purpose. Components exceeding 200 lines
  SHOULD be evaluated for decomposition.
- **No dead code.** Unused imports, unreachable branches, and
  commented-out code blocks MUST be removed before merge.
- **Naming clarity:** Variables, functions, and components MUST use
  descriptive names that convey intent. Abbreviations are acceptable
  only for well-established conventions (e.g., `props`, `ctx`, `ws`).

**Rationale:** ZAP Web UI spans two languages and runtimes. Strict
quality enforcement across both prevents defects from crossing the
frontend-backend boundary and keeps the codebase approachable for
contributors.

### II. Testing Standards

All changes MUST be verified through a defined testing process:

- **Both frontend and backend MUST compile successfully.** Run
  `./gradlew build` to verify the full project builds without errors.
- **WebSocket integration MUST be manually verified** for any change
  that touches event handling, message serialization, or connection
  lifecycle. Confirm: (1) connection establishes on page load,
  (2) sites tree loads, (3) incremental updates arrive in real-time.
- **Browser console MUST be free of errors** after any frontend change.
  Warnings from third-party libraries are acceptable; application
  warnings are not.
- **New React hooks and Zustand stores MUST include unit tests** using
  the project's testing framework. Tests MUST cover the primary
  success path and at least one error/edge case.
- **Contract tests MUST accompany new WebSocket event types.** When
  adding a new event in `ExtensionWebUi`, a corresponding test MUST
  validate the JSON schema of the emitted message.
- **Regression verification:** When fixing a bug, a test (or
  documented manual verification step) MUST be added that
  reproduces the original failure and confirms the fix.

**Rationale:** The WebSocket-based architecture means many defects
manifest only at integration time. Enforcing build verification and
manual WebSocket checks catches issues that unit tests alone miss.

### III. User Experience Consistency

The frontend MUST deliver a coherent, predictable user experience:

- **All UI components MUST use shadcn/ui** as the component library.
  Custom components are permitted only when shadcn/ui does not provide
  the required functionality. Custom components MUST follow shadcn/ui
  design patterns (composition, variant props, Tailwind styling).
- **Tailwind CSS is the sole styling approach.** Inline styles, CSS
  modules, and standalone CSS files MUST NOT be introduced. All
  styling MUST use Tailwind utility classes.
- **Responsive design MUST be considered** for all new UI additions.
  Components MUST render correctly at viewport widths from 768px
  (tablet) through 1920px (desktop).
- **Loading and error states MUST be handled explicitly.** Every
  component that fetches data (via REST API hooks or WebSocket) MUST
  display appropriate loading indicators and error messages. Empty
  states (no data) MUST show a meaningful message, not a blank area.
- **Keyboard accessibility:** Interactive elements MUST be reachable
  and operable via keyboard navigation. Focus indicators MUST be
  visible.
- **State management conventions:** Global application state MUST use
  Zustand stores. Server-cache state MUST use TanStack Query hooks.
  Local component state uses React `useState`/`useReducer`. Mixing
  these patterns for the same concern is prohibited.

**Rationale:** ZAP is a security professional's tool. A consistent,
predictable UI reduces cognitive load and lets users focus on their
security testing workflow rather than learning UI inconsistencies.

### IV. Performance Requirements

The application MUST meet the following performance thresholds:

- **Frontend bundle size:** The production build (`npm run build`)
  MUST NOT exceed a total JavaScript bundle size that causes
  initial page load to take more than 3 seconds on a standard
  broadband connection. Bundle size MUST be monitored when adding
  new dependencies.
- **WebSocket latency:** Event processing on the frontend (from
  WebSocket message receipt to DOM update) MUST complete within
  100ms for incremental updates (e.g., `sitenode.added`). Full
  tree rebuilds (`sitesTree`) are exempt from this target but
  MUST NOT block the UI thread.
- **No UI thread blocking:** Long-running operations (tree parsing,
  large data transformations) MUST NOT cause visible UI freezing.
  Operations exceeding 50ms SHOULD be deferred or chunked.
- **Memory management:** WebSocket reconnection logic MUST NOT
  create memory leaks. Event listeners and subscriptions MUST be
  cleaned up in React `useEffect` cleanup functions and on
  WebSocket disconnect.
- **Dependency discipline:** New npm dependencies MUST be justified.
  Before adding a dependency, verify: (1) the functionality cannot
  be achieved with existing dependencies or a small utility function,
  (2) the package is actively maintained, (3) the bundle size impact
  is acceptable.
- **Backend responsiveness:** The embedded Jetty server MUST handle
  concurrent WebSocket connections without degrading REST API proxy
  response times. REST API proxy responses MUST NOT add more than
  50ms overhead beyond ZAP's native API response time.

**Rationale:** ZAP Web UI runs alongside an active security scanner
that consumes significant system resources. The UI MUST remain
responsive even when ZAP is performing intensive scanning operations.

## Security Requirements

As a UI for a security testing tool, ZAP Web UI MUST uphold elevated
security standards:

- All user-supplied input rendered in the frontend MUST be sanitized
  to prevent XSS. React's default JSX escaping MUST NOT be bypassed
  (no `dangerouslySetInnerHTML`) unless explicitly justified and
  reviewed.
- WebSocket messages received from the backend MUST be validated
  against expected schemas before processing. Malformed messages
  MUST be logged and discarded, not crash the application.
- API proxy configuration MUST NOT expose internal endpoints beyond
  ZAP's intended API surface. Proxy rules MUST be allowlist-based.
- Secrets, credentials, and API keys MUST NOT be committed to the
  repository. Environment-specific configuration MUST use environment
  variables or ZAP's parameter system (`WebUiParam`).
- Dependencies MUST be periodically audited for known vulnerabilities
  (`npm audit` for frontend, Gradle dependency checks for backend).

## Development Workflow

All contributors MUST follow this workflow:

- **Build verification is mandatory.** Before considering any change
  complete, run `./gradlew build` (full project) or at minimum
  `npm run build && npm run lint` (frontend) and
  `./gradlew compileJava` (backend) for the affected component.
- **Incremental commits:** Each commit SHOULD represent a single
  logical change. Avoid combining unrelated changes in one commit.
- **Branch-based development:** Features and fixes MUST be developed
  on dedicated branches, not directly on the main branch.
- **New shadcn/ui components** MUST be added via
  `npx shadcn@latest add <component-name>` from the `webui/`
  directory, not manually copied.
- **WebSocket event additions** MUST follow the two-step process:
  (1) add backend handling in `ExtensionWebUi`, (2) add frontend
  handling in the appropriate hook. Both sides MUST be implemented
  in the same changeset.
- **REST API hook additions** MUST follow existing TanStack Query
  patterns in `webui/src/lib/api/hooks.ts`.

## Governance

This constitution is the authoritative reference for development
standards in the ZAP Web UI project. It supersedes informal
conventions and ad-hoc decisions.

- **Compliance:** All pull requests and code reviews MUST verify
  adherence to the principles defined herein. Reviewers SHOULD
  reference specific principle numbers (I-IV) when requesting
  changes.
- **Amendments:** Changes to this constitution require:
  (1) a written proposal describing the change and its rationale,
  (2) review and approval, and (3) a version bump following
  semantic versioning (MAJOR for principle removals or
  redefinitions, MINOR for new principles or material expansions,
  PATCH for clarifications and wording fixes).
- **Versioning:** This document follows semantic versioning. The
  version, ratification date, and last-amended date MUST be kept
  current in the footer below.
- **Periodic review:** This constitution SHOULD be reviewed whenever
  the project's technology stack, architecture, or team composition
  changes materially.
- **Guidance file:** Refer to `AGENTS.md` for runtime development
  guidance, coding conventions, and common task instructions that
  complement this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-03-14 | **Last Amended**: 2026-03-14
