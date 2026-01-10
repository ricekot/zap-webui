# Unit Testing Plan

This document outlines the plan for adding unit tests to both the Java backend (addon) and React frontend (webui) of zap-webui.

## Current State

- **No test infrastructure exists** for either Java addon or React frontend
- No test dependencies configured
- No test files present

## Technology Choices

| Component | Framework | Rationale |
|-----------|-----------|-----------|
| Frontend | Vitest | Native Vite integration, fast, Jest-compatible API |
| Backend | JUnit 5 + Mockito | Standard for Java, good ZAP ecosystem compatibility |

## Scope

**Initial focus**: Core utility functions (pure functions) only
- No component tests initially
- No integration tests initially
- No E2E tests

---

## Phase 1: Infrastructure Setup

### 1.1 React Frontend (`webui/`)

#### Install Dependencies

```bash
cd webui
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

#### Create `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

#### Create `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom'
```

#### Add Scripts to `package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

### 1.2 Java Backend (`addon/`)

#### Update `addon/build.gradle.kts`

Add test dependencies:

```kotlin
dependencies {
    // ... existing dependencies ...
    
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
    testImplementation("org.mockito:mockito-core:5.11.0")
    testImplementation("org.mockito:mockito-junit-jupiter:5.11.0")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}
```

#### Create Directory Structure

```
addon/src/test/java/org/zaproxy/addon/webui/
```

---

## Phase 2: Frontend Test Files

### 2.1 `HeadersDisplay.test.ts`

**File**: `src/components/shared/HeadersDisplay.test.ts`

**Function to test**: `parseHeaders()`

```typescript
describe('parseHeaders', () => {
  it('parses multi-line header string into key-value pairs')
  it('handles headers with colons in values (e.g., URLs)')
  it('filters out empty lines')
  it('handles request line (first line without colon)')
  it('trims whitespace from keys and values')
})
```

**Example test cases**:
- Input: `"Content-Type: application/json\nHost: example.com"` → `[{key: "Content-Type", value: "application/json"}, ...]`
- Input: `"Location: https://example.com/path"` → Correctly preserves URL with colons

### 2.2 `useSitesTree.test.ts`

**File**: `src/lib/hooks/useSitesTree.test.ts`

**Functions to test**: `insertNodeIntoTree()`, `transformNode()`

```typescript
describe('insertNodeIntoTree', () => {
  it('inserts node under correct host based on hierarchicNodeName URL')
  it('creates intermediate folder nodes when path segments are missing')
  it('handles URLs with multiple path segments (e.g., /api/v1/users)')
  it('handles root-level host nodes correctly')
  it('preserves existing children when inserting new sibling')
  it('handles HTTP and HTTPS URLs separately')
})

describe('transformNode', () => {
  it('includes protocol in host node name (https://example.com)')
  it('strips method prefix from endpoint names (GET:resource → resource)')
  it('only sets method property on endpoint-type nodes')
  it('handles nodes without method prefix')
  it('correctly identifies node types (host, folder, endpoint)')
})
```

**Example test cases**:
- `hierarchicNodeName: "https://example.com/api/users"` → inserts under `https://example.com` > `api` > `users`
- `name: "GET:resource"`, `type: "endpoint"` → `{ name: "resource", method: "GET" }`
- `name: "GET:resource"`, `type: "folder"` → `{ name: "GET:resource", method: undefined }`

### 2.3 `useMessage.test.ts`

**File**: `src/lib/hooks/useMessage.test.ts`

**Function to test**: Response parsing logic

```typescript
describe('message parsing', () => {
  it('handles single message object response from API')
  it('handles array of messages response from API')
  it('extracts URL correctly when request path is relative')
  it('extracts URL correctly when request path is already absolute URL')
  it('parses request headers correctly')
  it('parses response headers correctly')
})
```

**Example test cases**:
- API returns `{ requestHeader: "...", responseHeader: "..." }` → works
- API returns `[{ requestHeader: "..." }]` → extracts first element
- Request line `GET /path HTTP/1.1` with host `example.com` → URL: `https://example.com/path`
- Request line `GET https://example.com/path HTTP/1.1` → URL: `https://example.com/path` (no duplication)

### 2.4 `tabState.test.ts`

**File**: `src/stores/tabState.test.ts`

**Function to test**: `useTabState()` hook, `useTabStateStore`

```typescript
describe('useTabStateStore', () => {
  it('returns undefined for uninitialized keys')
  it('sets and gets state by key')
  it('isolates state between different keys')
  it('overwrites existing state on set')
})

describe('useTabState', () => {
  it('returns initial state on first call for a key')
  it('persists state after setter is called')
  it('returns persisted state on subsequent calls')
  it('different keys have independent state')
})
```

### 2.5 `requesterUtils.test.ts`

**File**: `src/components/panels/requester/requesterUtils.test.ts`

**Note**: May need to extract `buildRawRequest()` and `parseZapResponse()` into a separate utils file for easier testing.

```typescript
describe('buildRawRequest', () => {
  it('builds GET request with full URL in request line')
  it('builds POST request with body')
  it('includes all provided headers')
  it('preserves HTTPS protocol in request line')
  it('adds blank line between headers and body')
})

describe('parseZapResponse', () => {
  it('parses single ZapMessage object')
  it('parses array of ZapMessage and returns last one')
  it('extracts status code from response header')
  it('extracts response headers correctly')
  it('handles response with body')
})
```

---

## Phase 3: Backend Test Files

### 3.1 `WebUiParamTest.java`

**File**: `addon/src/test/java/org/zaproxy/addon/webui/WebUiParamTest.java`

```java
class WebUiParamTest {
    @Test void shouldReturnDefaultPort()
    @Test void shouldSetAndGetPort()
    @Test void shouldReturnDefaultHostname()
    @Test void shouldSetAndGetHostname()
    // ... other configuration parameters
}
```

### 3.2 `WebUiEventEndpointTest.java`

**File**: `addon/src/test/java/org/zaproxy/addon/webui/WebUiEventEndpointTest.java`

```java
class WebUiEventEndpointTest {
    @Test void serializeSiteNode_shouldIncludeNodeName()
    @Test void serializeSiteNode_shouldIncludeHierarchicName()
    @Test void serializeSiteNode_shouldIncludeMethod()
    @Test void serializeSiteNode_shouldHandleNullMethod()
    @Test void serializeSiteNode_shouldSerializeChildren()
    // ... message handling tests with mocked sessions
}
```

---

## Implementation Order

| # | Task | Priority | Estimated Time |
|---|------|----------|----------------|
| 1 | Setup Vitest infrastructure | High | 15 min |
| 2 | Test `parseHeaders()` | High | 15 min |
| 3 | Test `useSitesTree` utilities | High | 30 min |
| 4 | Test `useMessage` parsing | High | 20 min |
| 5 | Test `tabState` store | Medium | 15 min |
| 6 | Extract & test requester utils | Medium | 25 min |
| 7 | Setup JUnit infrastructure | High | 10 min |
| 8 | Test `WebUiParam` | Medium | 15 min |
| 9 | Test `WebUiEventEndpoint` | Medium | 30 min |

**Total estimated time**: ~3 hours

---

## Test File Locations

```
webui/
├── vitest.config.ts
├── src/
│   ├── test/
│   │   └── setup.ts
│   ├── components/
│   │   ├── shared/
│   │   │   ├── HeadersDisplay.tsx
│   │   │   └── HeadersDisplay.test.ts
│   │   └── panels/
│   │       └── requester/
│   │           ├── requesterUtils.ts      # extracted utilities
│   │           └── requesterUtils.test.ts
│   ├── lib/
│   │   └── hooks/
│   │       ├── useSitesTree.ts
│   │       ├── useSitesTree.test.ts
│   │       ├── useMessage.ts
│   │       └── useMessage.test.ts
│   └── stores/
│       ├── tabState.ts
│       └── tabState.test.ts

addon/
└── src/
    ├── main/java/org/zaproxy/addon/webui/
    │   ├── WebUiParam.java
    │   └── WebUiEventEndpoint.java
    └── test/java/org/zaproxy/addon/webui/
        ├── WebUiParamTest.java
        └── WebUiEventEndpointTest.java
```

---

## Running Tests

### Frontend

```bash
cd webui
npm test              # Run all tests once
npm run test:watch    # Watch mode for development
npm run test:coverage # Generate coverage report
```

### Backend

```bash
./gradlew :addon:test # Run only addon tests
```

### All Tests via Gradle

```bash
./gradlew testWebUi :addon:test  # Run frontend + backend tests
./gradlew check                   # Run all checks including tests
```

### Full Build with Tests

```bash
./gradlew build       # Includes test task
```

---

## Future Enhancements

Once core utility tests are in place, consider adding:

1. **Component tests** - Test React components with React Testing Library
2. **Hook tests** - Test custom hooks with `@testing-library/react-hooks`
3. **Integration tests** - Test WebSocket communication end-to-end
4. **E2E tests** - Playwright or Cypress for full user flow testing
5. **CI integration** - Run tests on pull requests via GitHub Actions
