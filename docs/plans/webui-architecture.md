# ZAP Web UI Add-on Architecture Plan

## Overview

This document outlines the architecture and implementation plan for a web-based UI for ZAP (Zed Attack Proxy). The web UI will be accessible directly via URL (e.g., `http://localhost:9999/`) and will communicate with ZAP via its existing API and WebSocket infrastructure.

## Technology Stack

### Frontend (`webui/`)

| Technology | Purpose |
|------------|---------|
| **Vite** | Build tool and dev server |
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **React Router** | Client-side routing (browser history) |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Accessible, customizable UI components |
| **TanStack Query** | Server state management (API calls, caching) |
| **Zustand** | Client-side state management |

### Backend (`addon/`)

| Technology | Purpose |
|------------|---------|
| **Java 17** | Add-on runtime |
| **Jetty** | Embedded HTTP server + WebSocket proxy (already a ZAP dependency) |
| **ZAP API** | Existing API for ZAP operations |
| **WebSocket** | Real-time updates |

## Directory Structure

```
zap-webui/
├── addon/                                  # ZAP add-on (Gradle project)
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── gradle.properties
│   ├── CHANGELOG.md
│   └── src/main/
│       ├── java/org/zaproxy/addon/webui/
│       │   ├── ExtensionWebUi.java         # Main extension entry point
│       │   ├── WebUiServer.java            # Embedded HTTP server for web UI
│       │   └── resources/
│       │       └── Messages.properties     # i18n strings
│       ├── javahelp/                       # Help documentation
│       └── zapHomeFiles/
│           └── webui/                      # Built React app (copied from webui/dist)
│               ├── index.html
│               └── assets/
│                   ├── index-[hash].js
│                   └── index-[hash].css
│
├── webui/                                  # React frontend (npm project)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── components.json                     # shadcn/ui config
│   ├── index.html
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.tsx                        # Entry point
│       ├── App.tsx                         # Root component + router setup
│       ├── index.css                       # Tailwind imports
│       ├── components/
│       │   ├── ui/                         # shadcn/ui components
│       │   └── layout/                     # App layout components
│       ├── routes/                         # Page components
│       ├── lib/
│       │   ├── api/                        # ZAP API client
│       │   ├── hooks/                      # Custom React hooks
│       │   └── utils/                      # Utility functions
│       └── stores/                         # Zustand stores
│
├── docs/
│   └── plans/
│       └── webui-architecture.md           # This file
│
├── build.gradle.kts                        # Root build orchestration
├── settings.gradle.kts                     # Includes addon/ as subproject
├── gradle/wrapper/
├── gradlew
├── gradlew.bat
├── .gitignore
├── LICENSE
└── README.md
```

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  http://localhost:9999/                                    │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              React SPA                               │  │  │
│  │  │                                                      │  │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐   │  │  │
│  │  │  │ TanStack    │  │   Zustand   │  │  React     │   │  │  │
│  │  │  │ Query       │  │   Store     │  │  Router    │   │  │  │
│  │  │  │ (API state) │  │  (UI state) │  │ (history)  │   │  │  │
│  │  │  └─────────────┘  └─────────────┘  └────────────┘   │  │  │
│  │  │         │                                            │  │  │
│  │  │         ▼                                            │  │  │
│  │  │  ┌─────────────────────────────────────────────┐    │  │  │
│  │  │  │              API Client                      │    │  │  │
│  │  │  │  - Calls to /api/JSON/...                    │    │  │  │
│  │  │  │  - WebSocket to /api/events                  │    │  │  │
│  │  │  └─────────────────────────────────────────────┘    │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│         │ HTTP (static + API)           │ WebSocket              │
└─────────┼───────────────────────────────┼────────────────────────┘
          │ Single origin (:9999)         │
          ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                          ZAP                                     │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  WebUiServer.java (Jetty) - Port 9999                      │  │
│  │                                                             │  │
│  │  Static Files:                                              │  │
│  │   /                       → index.html                      │  │
│  │   /alerts, /scan, etc.    → index.html (SPA fallback)       │  │
│  │   /assets/*               → static files                    │  │
│  │                                                             │  │
│  │  Proxy Layer:                                               │  │
│  │   /api/JSON/*             → localhost:8080/JSON/*           │  │
│  │   /api/OTHER/*            → localhost:8080/OTHER/*          │  │
│  │                                                             │  │
│  │  WebSocket (native endpoint, not a proxy):                  │  │
│  │   /api/events             → WebUiEventEndpoint              │  │
│  │                                                             │  │
│  │  Security:                                                  │  │
│  │   - Injects API key into proxied requests                  │  │
│  │   - Browser never sees API key                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                 │                                │
│                                 │ Proxied requests               │
│                                 ▼                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ZAP API Server - Port 8080                                │  │
│  │                                                             │  │
│  │   - /JSON/core/alerts                                       │  │
│  │   - /JSON/ascan/scan                                        │  │
│  │   - /JSON/spider/scan                                       │  │
│  │   - etc.                                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Routing Strategy

**Browser history routing** with clean URLs:

```
http://localhost:9999/             → Dashboard
http://localhost:9999/alerts       → Alerts view
http://localhost:9999/scan         → Active scan
http://localhost:9999/spider       → Spider
http://localhost:9999/settings     → Settings
```

The embedded HTTP server handles SPA fallback routing:
- Requests for static assets (`*.js`, `*.css`, `*.png`, etc.) → serve the actual file
- Requests for routes (`/alerts`, `/scan/*`) → serve `index.html`
- React Router handles the actual routing client-side

### Proxy Architecture

The `WebUiServer` (Jetty) acts as a reverse proxy, providing a single origin for the frontend and eliminating CORS complexity:

```
URL Pattern              → Action
──────────────────────────────────────────────────────────────────
/                        → index.html (SPA entry point)
/alerts, /scan, etc.     → index.html (SPA fallback for all routes)
/assets/*                → Static files (js, css, images, fonts)
/api/JSON/*              → Proxy to http://localhost:8080/JSON/*
/api/OTHER/*             → Proxy to http://localhost:8080/OTHER/*
/api/events              → WebSocket endpoint (WebUiEventEndpoint)
```

**Benefits:**
- **Single origin** - No CORS configuration needed
- **API key security** - Server injects API key into proxied requests; browser never sees it
- **Consistent workflow** - Production behavior matches development (Vite also proxies)
- **Native WebSocket** - Real-time event endpoint served by the add-on itself
- **Simplified frontend** - API client just calls `/api/JSON/...` without origin concerns

### State Management Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                     State Management                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Server State (TanStack Query)      Client State (Zustand)     │
│   ─────────────────────────────      ─────────────────────      │
│   • Alerts list                      • Sidebar open/closed      │
│   • Scan status & progress           • Selected theme           │
│   • Spider results                   • Active tab               │
│   • Site tree                        • Filter preferences       │
│   • Messages/history                 • Pending scan config      │
│   • Session data                     • Modal states             │
│                                                                  │
│   Characteristics:                   Characteristics:            │
│   • Fetched from ZAP API             • UI-only state            │
│   • Cached & auto-refreshed          • Persisted to localStorage│
│   • Invalidated on mutations         • Instant updates          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Project Setup

- [x] Restructure repository (move current code to `addon/`)
- [x] Create `webui/` with Vite + React + TypeScript
- [x] Configure Tailwind CSS and shadcn/ui
- [x] Set up root Gradle build orchestration
- [x] Configure Vite dev server proxy to ZAP API

### Phase 2: Add-on HTTP Server

- [x] Implement `WebUiServer.java` using Jetty
- [x] Serve static files from `zapHomeFiles/webui/`
- [x] Handle MIME types (html, js, css, images, fonts)
- [x] Implement SPA fallback routing (non-asset paths → index.html)
- [x] Implement HTTP reverse proxy for `/api/*` → ZAP API
- [x] Implement WebSocket event endpoint at `/api/events`
- [x] Inject API key into proxied requests
- [x] Make port configurable via ZAP options

### Phase 3: Core Frontend Infrastructure

- [ ] Set up React Router with browser history routing
- [ ] Create base layout (sidebar, header, content area)
- [ ] Implement ZAP API client with TanStack Query
- [ ] Set up Zustand store for UI state
- [ ] Create WebSocket hook for real-time updates

### Phase 4: Essential Views

- [ ] Dashboard (overview, quick stats)
- [ ] Alerts view (list, filters, details)
- [ ] Active Scan (start, progress, results)
- [ ] Spider (start, progress, results)
- [ ] Sites tree view

### Phase 5: Advanced Features

- [ ] Settings/configuration panel
- [ ] Request/response viewer
- [ ] Manual request editor
- [ ] Export functionality
- [ ] Keyboard shortcuts

### Phase 6: Polish

- [ ] Dark/light theme support
- [ ] Responsive design
- [ ] Error handling & loading states
- [ ] Performance optimization
- [ ] Documentation

## Build Integration

### Development Workflow

1. **Start ZAP** with the add-on installed (for API access)
2. **Run dev server**: `cd webui && npm run dev`
3. **Vite proxies** API calls to ZAP API at `localhost:8080`
4. **Edit React code** → instant HMR updates
5. **Build for production**: `./gradlew build`

### Production Build

1. `npm run build` in `webui/` → outputs to `webui/dist/`
2. Gradle copies `webui/dist/` → `addon/src/main/zapHomeFiles/webui/`
3. Add-on packages everything into a `.zap` file
4. At runtime, `WebUiServer.java` serves files from ZAP home directory

## Open Questions

1. **Authentication**: API key is handled at proxy layer (injected server-side). Should the web UI itself require authentication (e.g., login page before accessing the UI)?

2. **Offline support**: Should the web UI work when ZAP is not running? (Service worker caching)

3. **Mobile support**: How important is mobile/tablet responsiveness?

4. **Port configuration**: Should the web UI port (9999) be configurable? What's the default?

5. **Multi-user**: Should the web UI support multiple concurrent users, or is it single-user only?

## References

- [ZAP HUD Source Code](https://github.com/zaproxy/zap-hud) - Reference for ZAP add-on patterns
- [ZAP API Documentation](https://www.zaproxy.org/docs/api/)
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [TanStack Query](https://tanstack.com/query/latest) - Data fetching
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
