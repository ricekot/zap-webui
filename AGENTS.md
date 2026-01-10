# AI Agent Instructions

This document provides guidance for AI coding agents working on this repository.

## Project Overview

ZAP Web UI is a modern web-based user interface for ZAP (Zed Attack Proxy). It consists of two main components:

1. **Backend (Java Add-on)**: Located in `addon/` - A ZAP add-on that serves the web UI and provides WebSocket-based real-time communication
2. **Frontend (React/TypeScript)**: Located in `webui/` - A React application built with Vite, TypeScript, Tailwind CSS, and shadcn/ui

## Repository Structure

```
zap-webui/
├── addon/                      # ZAP add-on (Java)
│   └── src/main/java/org/zaproxy/addon/webui/
│       ├── ExtensionWebUi.java      # Main extension, event handling
│       ├── WebUiServer.java         # Embedded Jetty server
│       ├── WebUiEventEndpoint.java  # WebSocket endpoint
│       └── WebUiParam.java          # Configuration parameters
├── webui/                      # React frontend
│   └── src/
│       ├── components/         # UI components (shadcn/ui based)
│       ├── lib/
│       │   ├── api/            # REST API client and hooks
│       │   └── hooks/          # Custom React hooks
│       └── stores/             # Zustand state stores
├── build.gradle.kts            # Root Gradle build
└── docs/                       # Documentation
```

## Build Commands

### Full Build
```bash
./gradlew build
```

### Frontend Only
```bash
cd webui
npm install    # First time only
npm run build  # Production build
npm run dev    # Development server with HMR
npm run lint   # Run ESLint
```

### Backend Only
```bash
./gradlew compileJava
```

## Architecture Notes

### WebSocket Communication

The frontend communicates with ZAP via WebSocket for real-time updates:

- **Connection**: `ws://host:port/api/events`
- **Auto-connects**: The WebSocket connects immediately when the frontend loads (see `useZapEvents.ts`)
- **Events from server**:
  - `connected` - Welcome message on connection
  - `sitesTree` - Full sites tree response
  - `sitenode.added` - Incremental site node update
- **Messages to server**:
  - `{ type: "getSitesTree" }` - Request full sites tree
  - `{ type: "ping" }` - Keepalive ping

### REST API

The frontend proxies REST API calls to ZAP's existing API:
- Development: Vite dev server proxies `/api/*` to `localhost:8080`
- Production: The add-on's embedded server proxies to ZAP's API

### Sites Tree

The sites tree is managed via WebSocket:
1. Frontend requests tree on connection via `getSitesTree` message
2. Backend serializes ZAP's `SiteMap` and sends `sitesTree` response
3. Backend broadcasts `sitenode.added` events when nodes are added
4. Frontend incrementally updates its tree state

## Code Conventions

### Java (Backend)
- Follow existing ZAP add-on conventions
- Use Log4j2 for logging (`LOGGER.debug()`, `LOGGER.info()`, etc.)
- JSON handling via `net.sf.json.JSONObject`

### TypeScript (Frontend)
- Use TypeScript strict mode
- React functional components with hooks
- State management: Zustand for global state, React Query for server state
- Styling: Tailwind CSS utility classes
- UI components: shadcn/ui (add via `npx shadcn@latest add <component>`)

## Testing

When making changes:
1. Build both frontend and backend to verify compilation
2. Test WebSocket connection establishes on page load
3. Verify sites tree loads and updates in real-time
4. Check browser console for errors

## Common Tasks

### Adding a New WebSocket Event

1. **Backend**: Add event handling in `ExtensionWebUi.eventReceived()` or broadcast from appropriate location using `WebUiEventEndpoint.broadcastEvent()`
2. **Frontend**: Handle the event in the appropriate hook (e.g., `useSitesTree.ts`) by adding a case to the event handler

### Adding a New UI Component

```bash
cd webui
npx shadcn@latest add <component-name>
```

### Adding a New REST API Endpoint Hook

Add to `webui/src/lib/api/hooks.ts` following the existing patterns using TanStack Query.
