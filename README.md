# ZAP Web UI

An experimental new UI for ZAP using web technologies.

## Project Structure

```
zap-webui/
├── addon/          # ZAP add-on (Gradle/Java project)
├── webui/          # React frontend (npm/Vite project)
├── docs/           # Documentation and plans
├── build.gradle.kts    # Root Gradle build orchestration
└── settings.gradle.kts # Gradle settings
```

## Prerequisites

- **Java 17** or later (for building the ZAP add-on)
- **Node.js 18** or later (for building the web UI)
- **npm** (comes with Node.js)

## Development Setup

### Frontend Development (Hot Reload)

For rapid frontend development with hot module replacement:

1. **Start ZAP** with the API enabled (default port 8080)

2. **Install dependencies** (first time only):
   ```bash
   cd webui
   npm install
   ```

3. **Start the development server**:
   ```bash
   cd webui
   npm run dev
   ```

4. **Open** http://localhost:5173 in your browser

The Vite dev server automatically proxies API requests (`/api/*`) to ZAP's API server at `localhost:8080`.

### Full Build (Add-on)

To build the complete ZAP add-on including the web UI:

```bash
./gradlew build
```

This will:
1. Install npm dependencies
2. Build the React app for production
3. Copy the built assets to the add-on
4. Build the ZAP add-on JAR/ZAP file

The built add-on will be in `addon/build/zapAddOn/`.

### Build Tasks

| Task | Description |
|------|-------------|
| `./gradlew build` | Full build (add-on + web UI) |
| `./gradlew check` | Run all checks (includes linting) |
| `./gradlew lintWebUi` | Run ESLint on the web UI |
| `./gradlew buildWebUi` | Build only the web UI |
| `./gradlew copyWebUiToAddon` | Build web UI and copy to add-on |
| `./gradlew clean` | Clean all build artifacts |

### Frontend Scripts

Run these from the `webui/` directory:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Technology Stack

### Frontend
- [Vite](https://vite.dev/) - Build tool and dev server
- [React 19](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components

### Backend (Add-on)
- Java 17
- ZAP Add-on framework

## Adding UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/) for UI components. To add a new component:

```bash
cd webui
npx shadcn@latest add <component-name>
```

For example:
```bash
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add table
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
