# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**npmgraph** is a React-based web application that visualizes npm package dependency graphs using Graphviz. It provides an interactive graph diagram showing module relationships, vulnerability detection, and dependency analysis.

**Tech Stack**: React 19, TypeScript, Parcel (bundler), Graphviz WASM, D3.js

## Development Commands

```bash
# Development server ( Parcel with hot reload)
npm start

# Production build
npm run build

# Run all tests (format check, lint, type check, build)
npm run test

# Individual checks
npm run lint           # ESLint
npm run types          # TypeScript type checking
npm run format:check   # Prettier formatting check

# Auto-fix issues
npm run fix            # Run eslint --fix and prettier --write
npm run format:fix     # Prettier formatting only

# Update license database
npm run fetch-licenses
```

## Architecture Overview

### Data Flow Pipeline

```
URL Input → Query Parsing → Module Fetching → Graph Generation → Visualization
```

1. **Query Processing**: `lib/useQuery.tsx` parses `?q=` search parameter for module names
2. **Module Resolution**: `lib/ModuleCache.ts` fetches packages from npm registry
3. **Graph Construction**: `components/GraphDiagram/graph_util.ts` builds dependency tree
4. **Rendering**: Graphviz WASM renders interactive SVG graphs

### Key Architectural Components

#### State Management

- **`lib/GlobalStore.tsx`**: Central state using React's `useSyncExternalStore` API
  - Global state includes: graph data, selected modules, UI pane state, location/URL
  - State changes notify all subscribers via listener pattern
  - Hook: `useGlobalState(key)` returns `[value, setValue]`

- **URL as Source of Truth**:
  - **Search params** (`?q=module`): Module query input
  - **Hash params** (`#color=moduleType`): View configuration (shareable links)
  - `lib/useQuery.tsx` and `lib/useHashParam.ts` provide URL state sync

#### Module System

- **`lib/Module.ts`**: Core data model for npm packages
  - Wraps `PackumentVersion` from `@npm/types`
  - Provides access to metadata: version, maintainers, dependencies, license
  - Methods: `key`, `name`, `version`, `unpackedSize`, `repository`

- **`lib/ModuleCache.ts`**: Two-tier caching system
  - **In-memory cache**: Map of module key → PromiseWithResolvers<Module>
  - **localStorage cache**: Persistent cache across sessions
  - Version selection using `semver.satisfies()` for dist-tags and ranges
  - Fetches from npm registry via `PackumentCache`

- **`lib/PackumentCache.ts`**: Caches npm registry "packument" data (all versions of a package)

#### Graph Visualization

- **`components/GraphDiagram/graph_util.ts`**: Core graph logic
  - `getGraphForQuery()`: Recursive dependency traversal
  - Generates Graphviz DOT format from module relationships
  - Tracks upstream/downstream dependencies per module
  - Supports multiple dependency types: `dependencies`, `devDependencies`, `optionalDependencies`

- **Graph rendering**: Uses `@hpcc-js/wasm-graphviz` to render DOT to SVG
  - Interactive features: pan, zoom, click to expand/collapse
  - Colorization modes: by module type, bus factor, maintenance score, outdated status

#### Custom Hooks (lib/)

- `useQuery.tsx`: Search param management (`?q=`)
- `useHashParam.ts`: Hash param management (`#key=value`)
- `useLocation.ts`: Location changes with history management
- `useActivity.tsx`: Loading progress tracking
- `useCollapse.ts`: Collapse/expand module subtrees
- `useGraphSelection.ts`: Module selection by criteria (name, license, maintainer)
- `useRegistry.ts`: Custom npm registry configuration

### Component Structure

```
components/
├── App/App.tsx                    # Main app container (Intro vs. GraphDiagram)
├── GraphDiagram/
│   ├── GraphDiagram.tsx           # Main graph visualization component
│   └── graph_util.ts              # Graph generation logic
├── Inspector/                     # Module details panel (right side)
├── GraphPane/                     # Analysis/reporting panel (left)
└── InfoPane/                      # Input controls and package management
```

### URL API Architecture

The application uses two types of URL parameters:

1. **Query parameters** (`?`): Search input only
   - `?q=express,react`: Comma-separated module names/URLs

2. **Hash parameters** (`#`): View configuration (persistent, shareable)
   - `#collapse=debug,http-errors`: Modules to collapse
   - `#color=moduleType|bus|outdated|maintenance`: Colorization mode
   - `#deps=devDependencies`: Dependency types to include
   - `#hide`: Hide inspector panel
   - `#packages=<json>`: Custom modules (JSON-encoded package.json array)
   - `#select=exact:name@version|name:foo|license:MIT`: Selection criteria
   - `#sizing`: Scale nodes by unpacked size
   - `#zoom=w|h`: Fit width/height

**Important**: Hash params are URL-encoded query strings (e.g., `#packages=%5B...%5D`)

### Caching Strategy

- **In-memory**: Active session cache for fast access
- **localStorage**: Persistent cache (survives page reloads)
- **Cache invalidation**: Based on module version keys
- **Custom modules**: Provided via `#packages` hash param for private packages

### Serverless Components

**`lambdas/npmRegistryProxyWithCORS.js`**: AWS Lambda function

- Proxies requests to npm registry with CORS headers
- Used for production deployment at npmgraph.js.org
- Not needed for local development

## Important Patterns

### Dependency Resolution

- Only `dependencies` are shown for nested modules (level > 0)
- Top-level modules can show `devDependencies` if configured
- Version resolution uses semver matching and npm dist-tags
- "Stub" modules created for packages that fail to load (errors tracked in `stubError`)

### Error Handling

- Graceful degradation: Continue rendering if some modules fail
- Bugsnag integration for error tracking (initialized in `lib/index.tsx`)
- `HttpError` class for registry request failures
- Feature detection for browser API compatibility (see `lib/index.tsx:detectFeatures`)

### Module Keys

- Format: `name@version` (e.g., `express@4.18.2`)
- Used throughout as unique identifiers
- Parsed by `getModuleKey()` and `parseModuleKey()` in `lib/module_util.ts`

### TypeScript Configuration

- Target: ES2022 with strict type checking
- Uses `@npm/types` for npm registry type definitions
- CSS Modules with TypeScript plugin for type-safe styles

## Common Tasks

### Adding a New Colorization Mode

1. Add mode name to type in `components/GraphPane/GraphPane.tsx`
2. Implement color logic in graph generation (`graph_util.ts`)
3. Add UI option in `components/GraphPane/ColorizeBy.tsx`

### Adding URL Parameters

- For search/input: Use `lib/useQuery.tsx` pattern (search params)
- For configuration: Use `lib/useHashParam.ts` pattern (hash params)
- Update README.md URL API section

### Testing Changes to Module Loading

- Clear localStorage cache to force fresh fetches
- Use `#packages` param to test custom/private modules
- Check Network tab for registry requests

### Graphviz Integration

- Graphviz WASM is loaded from `@hpcc-js/wasm-graphviz`
- DOT format generation in `graph_util.ts`
- Parcel alias configured to prevent WASM loading issues (see `package.json:alias`)
