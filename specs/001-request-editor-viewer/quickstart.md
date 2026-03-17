# Quickstart: ZAP Request Editor & Response Viewer

**Branch**: `001-request-editor-viewer` | **Date**: 2026-03-16

## Prerequisites

- **Java 17+** — required to build and run the ZAP add-on
- **bun** — package manager for the frontend (`npm install -g bun` or see [bun.sh](https://bun.sh))
- **ZAP 2.16.0+** — the running ZAP instance that the web UI connects to

## Getting Started

### 1. Install frontend dependencies

```bash
cd webui
bun install
```

### 2. Build the full project

```bash
./gradlew build
```

This compiles the Java add-on, builds the React frontend, runs linting, and runs tests.

### 3. Development mode (frontend only)

Start the Vite dev server with hot module replacement:

```bash
cd webui
bun run dev
```

The dev server starts at `http://localhost:5173`. API requests to `/JSON/*`, `/UI/*`, and `/OTHER/*` are proxied to `http://localhost:8080` (ZAP's API port).

**Requirement**: ZAP must be running with its API enabled on port 8080 and API key disabled (`-config api.disablekey=true`) for the dev proxy to work.

### 4. Run frontend tests

```bash
cd webui
bun run test          # Single run
bun run test:watch    # Watch mode
bun run test:coverage # With coverage
```

### 5. Lint and format

```bash
cd webui
bun run lint          # Check for lint errors
bun run format:check  # Check formatting
bun run format        # Auto-fix formatting
```

### 6. Add a new shadcn/ui component

```bash
cd webui
bunx --bun shadcn@latest add <component-name>
```

## Project Structure Overview

```
addon/          → Java ZAP add-on (ExtensionNetwork server, in-process API handling)
webui/          → React frontend (Vite, TypeScript, Tailwind, shadcn/ui)
specs/          → Feature specifications and implementation plans
```

The add-on uses ZAP's `ExtensionNetwork` to serve the built frontend as static files and handle API requests (`/JSON/`, `/UI/`, `/OTHER/`) in-process via `API.getInstance().handleApiRequest()`.

## Key Commands Summary

| Command | Location | Description |
|---------|----------|-------------|
| `./gradlew build` | root | Full project build (Java + frontend) |
| `./gradlew compileJava` | root | Java compilation only |
| `bun install` | webui/ | Install frontend dependencies |
| `bun run dev` | webui/ | Start dev server with HMR |
| `bun run build` | webui/ | Production frontend build |
| `bun run test` | webui/ | Run frontend tests |
| `bun run lint` | webui/ | Run ESLint |
