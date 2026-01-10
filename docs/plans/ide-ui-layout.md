# ZAP Web UI - IDE-Style Layout Plan

## Overview

This document describes the redesign of the ZAP Web UI from a SaaS-style dashboard to an IDE-style interface similar to VS Code. The layout features resizable, collapsible panels with a tabbed center workspace.

## Layout Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌───────────────┐┌────────────────────────────────────┐┌──────────────┐ │
│ │               ││ [Requester] [Request/Response]     ││              │ │
│ │               ││ ──────────────────────────────────-││   (future)   │ │
│ │   Sites       ││                                    ││    Right     │ │
│ │   Tree        ││        Center Panel                ││   Sidebar    │ │
│ │               ││        (Tab Content)               ││              │ │
│ │               ││                                    ││   collapsed  │ │
│ │               │├────────────────────────────────────┤│   by         │ │
│ │               ││ Output    [All][Spider][Scanner]   ││   default    │ │
│ │               ││ ─────────────────────────────────  ││              │ │
│ │               ││ > Spider started on http://...     ││              │ │
│ │               ││ > Found 12 URLs                    ││              │ │
│ │               ││ ● Connected                        ││              │ │
│ └───────────────┘└────────────────────────────────────┘└──────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Panels

### Left Sidebar - Sites Tree

**Purpose:** Display the hierarchical site structure discovered by ZAP.

**Features:**
- Hierarchical tree view (domain → path → endpoints)
- Request metadata display (HTTP method, status code, response size)
- Alert indicators (color-coded by severity: High=red, Medium=orange, Low=yellow, Info=blue)
- Context menu actions:
  - Open in Requester
  - Open in Request/Response Viewer
  - Resend Request
  - Copy URL
- Collapsible panel with drag-to-resize

**Default width:** 280px  
**Min width:** 200px

### Bottom Panel - Output

**Purpose:** Display ZAP logs, scan progress, and connection status.

**Features:**
- Tabbed/filterable output:
  - All (combined view)
  - Spider (spider-specific messages)
  - Scanner (active scan messages)
- Real-time log streaming via WebSocket
- Connection status indicator (Connected/Disconnected/Reconnecting)
- Auto-scroll with pause on user scroll-up
- Collapsible panel with drag-to-resize

**Default height:** 200px  
**Min height:** 100px

### Center Panel - Tabbed Workspace

**Purpose:** Main workspace for viewing and editing requests/responses.

**Tab behavior:** Fixed tabs (not closable or reorderable)

#### Tab 1: Requester

**Purpose:** Manually craft and send HTTP requests.

**Features:**
- URL input with HTTP method dropdown (GET, POST, PUT, DELETE, etc.)
- Headers editor (key-value table with add/remove rows)
- Request body editor (CodeMirror 6 with syntax highlighting)
- Send button
- Response viewer:
  - Status code, time, size
  - Response headers (collapsible key-value display)
  - Response body (CodeMirror 6, read-only, with syntax highlighting)

#### Tab 2: Request/Response Viewer

**Purpose:** View details of a selected request from the Sites Tree.

**Features:**
- Request section:
  - Method, URL, HTTP version
  - Headers (key-value display)
  - Body (CodeMirror 6, read-only)
- Response section:
  - Status code, reason phrase
  - Headers (key-value display)
  - Body (CodeMirror 6, read-only)
- Split view (request left, response right) or stacked view toggle

### Right Sidebar (Future)

**Purpose:** Reserved for future panels (e.g., alerts details, scan config, scripts).

**Default state:** Collapsed/hidden  
**Default width:** 300px (when expanded)

## Technical Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Resizable panels | shadcn/ui Resizable (react-resizable-panels) | Well-integrated with existing stack |
| Code editor | CodeMirror 6 | Good balance of features vs bundle size |
| Tab component | shadcn/ui Tabs | Consistent styling |
| Tree component | Custom with Radix primitives | Flexibility for context menus, icons |
| Panel size persistence | None | Reset to defaults on refresh (simpler) |

## Directory Structure

```
webui/src/
├── components/
│   ├── ui/                         # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── resizable.tsx           # Panel resizing
│   │   ├── tabs.tsx                # Tab navigation
│   │   ├── scroll-area.tsx         # Scrollable containers
│   │   ├── context-menu.tsx        # Right-click menus
│   │   ├── dropdown-menu.tsx       # Method selector, etc.
│   │   ├── input.tsx               # URL input, etc.
│   │   └── ...
│   │
│   ├── layout/
│   │   └── AppShell.tsx            # Main IDE layout with all panels
│   │
│   ├── panels/
│   │   ├── sites-tree/
│   │   │   ├── SitesTreePanel.tsx  # Panel wrapper with header
│   │   │   ├── SitesTree.tsx       # Tree component
│   │   │   ├── SiteNode.tsx        # Individual tree node
│   │   │   └── SiteContextMenu.tsx # Right-click menu
│   │   │
│   │   ├── output/
│   │   │   ├── OutputPanel.tsx     # Panel wrapper with tabs
│   │   │   └── OutputLog.tsx       # Log display component
│   │   │
│   │   ├── requester/
│   │   │   ├── RequesterPanel.tsx  # Main requester tab content
│   │   │   ├── RequestEditor.tsx   # URL, method, headers, body
│   │   │   └── ResponseViewer.tsx  # Response display
│   │   │
│   │   └── request-viewer/
│   │       └── RequestViewerPanel.tsx  # Read-only req/res viewer
│   │
│   └── editor/
│       └── CodeEditor.tsx          # CodeMirror wrapper component
│
├── stores/
│   └── ui.ts                       # Panel collapse states, active tab
│
├── lib/
│   ├── api/                        # Existing API client (keep)
│   └── hooks/                      # Existing hooks (keep)
│
├── App.tsx                         # Simplified - just renders AppShell
└── main.tsx                        # Entry point (keep)
```

## Files to Remove

From the current Phase 3 implementation:

- `src/routes/` (entire directory)
  - Dashboard.tsx
  - Alerts.tsx
  - Scan.tsx
  - Spider.tsx
  - Sites.tsx
  - Settings.tsx
  - index.ts
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/index.ts`

## Dependencies to Add

```json
{
  "dependencies": {
    "react-resizable-panels": "^2.x",
    "@codemirror/lang-json": "^6.x",
    "@codemirror/lang-html": "^6.x",
    "@codemirror/lang-xml": "^6.x",
    "codemirror": "^6.x",
    "@uiw/react-codemirror": "^4.x"
  }
}
```

## Zustand Store Updates

```typescript
interface UIState {
  // Panel visibility
  leftSidebarOpen: boolean
  bottomPanelOpen: boolean
  rightSidebarOpen: boolean

  // Panel toggles
  toggleLeftSidebar: () => void
  toggleBottomPanel: () => void
  toggleRightSidebar: () => void

  // Active center tab
  activeTab: 'requester' | 'request-viewer'
  setActiveTab: (tab: 'requester' | 'request-viewer') => void

  // Output panel active filter
  outputFilter: 'all' | 'spider' | 'scanner'
  setOutputFilter: (filter: 'all' | 'spider' | 'scanner') => void

  // Selected site tree node (for request viewer)
  selectedMessageId: string | null
  setSelectedMessageId: (id: string | null) => void
}
```

## Implementation Phases

### Phase 3.1: Layout Restructure

1. Install new dependencies (react-resizable-panels, codemirror)
2. Add shadcn/ui components (resizable, tabs, scroll-area, context-menu)
3. Create AppShell with resizable panel structure
4. Remove old layout components and routes
5. Update Zustand store for new panel states

### Phase 3.2: Sites Tree Panel

1. Create SitesTree component with hierarchical display
2. Add ZAP API hooks for fetching site tree data
3. Implement tree node with method/status/size display
4. Add alert severity indicators
5. Implement context menu

### Phase 3.3: Output Panel

1. Create OutputPanel with tabbed filters
2. Connect to WebSocket for real-time logs
3. Add connection status indicator
4. Implement auto-scroll behavior

### Phase 3.4: Requester Panel

1. Create CodeEditor wrapper for CodeMirror
2. Build RequestEditor (URL, method, headers table, body)
3. Build ResponseViewer (status, headers, body)
4. Wire up to ZAP API for sending requests

### Phase 3.5: Request/Response Viewer Panel

1. Create read-only request/response display
2. Connect to selected message from Sites Tree
3. Add split/stacked view toggle
