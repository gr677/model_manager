# Mind Suite (OmniModel Studio)

An enterprise-grade, multi-paradigm diagramming, modeling, and workflow architecture suite built with React 19, TypeScript, Tailwind CSS, and a full-stack Express REST API backend.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-REST_API-green.svg)](https://expressjs.com/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

---

## Key Features

- **20 Standardized Diagram Methodologies**:
  - **Universal Freeform Studio**: Unrestricted multi-paradigm canvas with no notation rules — mix all shapes freely.
  - **ERD (Entity-Relationship Database)**: Relational tables with typed columns, PK/FK badges, and Crow's foot cardinalities (`1..*`, `0..*`).
  - **BPMN 2.0**: Start/Intermediate/End events, User/Service tasks, Exclusive XOR & Parallel AND gateways, Sub-processes with drill-down navigation.
  - **Swimlanes & Cross-Functional Pools**: Horizontal and vertical organizational boundary containers with automatic child node enclosure.
  - **UML Models**: Class diagrams (attributes, methods, visibility `+`, `-`, `#`, stereotypes `«interface»`, `«service»`), Sequence diagrams, Use Case diagrams, and State Machines.
  - **DFD & Yourdon**: Process bubbles, open-ended parallel data stores (`D1: ...`), external source/sink entities.
  - **IDEF0 (ICOM Function Architecture)**: Strict systems engineering standard with Inputs (left), Controls (top), Outputs (right), and Mechanisms (bottom).
  - **CEQA Process Flows**: California Environmental Quality Act Phase 1-5 roadmap (Preliminary Review, Initial Study Appendix G, MND vs. EIR decision, 45-day Public Review, Notice of Determination).
  - **SIPOC Matrices**: Suppliers, Inputs, Process, Outputs, Customers value streams.
  - **PERT & Gantt Charts**: 6-quadrant PERT nodes with Early Start (ES), Duration, Early Finish (EF), Late Start (LS), Slack time, and Critical Path highlighting, alongside Gantt milestone bars.
  - **C4 Software Architecture**: Context, Containers, Components, and Code level abstractions.
  - **Mind Mapping & Concept Maps**: Radiating knowledge trees with thought connectors.
  - **Value Stream Mapping (VSM)**: Lean manufacturing cycles, cycle times (C/T), uptime, and inventory buffers.
  - **Cause & Effect (Ishikawa Fishbone)**: 6M root cause analysis (Machine, Method, Material, Measurement, Milieu, Man).
  - **Standard Flowcharts**: ANSI/ISO decision diamonds, process steps, terminals, and I/O.
- **Sticky Notes & Documentation**: 5-color sticky notes with author attribution, plus dedicated architecture specification drawers (markdown, status, tags, linked API endpoints).
- **Nested Grouping & Child Enclosure**: Group boxes dynamically enclose child nodes; dragging groups moves all children with boundary snapping.
- **Multi-Page Hierarchy & Breadcrumbs**: Navigate sub-processes with clickable breadcrumb trails.
- **Smart Diagram Flipping**: Automatically remembers the last open diagram of any type or instantiates rich starter examples so you never start from a blank canvas.
- **Full-Stack REST API**: Express backend at port 3000 (`/api/diagrams`, `/api/diagrams/:id`, `/api/diagrams/:id/pages`, `/api/diagrams/:id/versions`, `/api/sync`, `/api/openapi.json`).
- **Interactive REST API Hub & Swagger**: Built-in live API runner, raw JSON viewer, cURL/Python snippets, and export/import tools.
- **Real-Time Collaboration**: Live simulated cursor roaming, team presence halos (Sarah Chen, Alex Rivera, Jordan Taylor, David Kim), and threaded comments.
- **Version History Tracking**: Named snapshot commits with rollback and visual change summaries.
- **Role-Based Access Control (RBAC)**: Live switching between Admin, Editor, Reviewer, and Viewer roles with permission enforcement.
- **Offline Synchronization**: Mobile and desktop offline caching via IndexedDB/localStorage with conflict resolution queue and offline simulator.
- **Dark & Light Mode**: Complete responsive styling with high-contrast canvas dot grid.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/gr677/mind_suite.git
cd mind_suite

# Install dependencies
npm install

# Start the full-stack development server (Express + Vite on port 3000)
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/diagrams` | List all diagram suites |
| `GET` | `/api/diagrams/:id` | Get complete diagram JSON document |
| `PUT` | `/api/diagrams/:id` | Update complete diagram JSON document |
| `GET` | `/api/diagrams/:id/pages` | List all pages & sub-processes |
| `GET` | `/api/diagrams/:id/pages/:pageId` | Get specific page nodes & edges |
| `POST` | `/api/diagrams/:id/pages` | Add a new page or sub-process |
| `GET` | `/api/diagrams/:id/versions` | List version snapshot history |
| `POST` | `/api/diagrams/:id/versions` | Commit a named version snapshot |
| `POST` | `/api/diagrams/:id/versions/:id/restore` | Restore historical version |
| `POST` | `/api/sync` | Batch sync offline mutation queue |
| `GET` | `/api/openapi.json` | OpenAPI 3.0 specification |

---

## Project Structure

```
mind_suite/
├── server.ts                       # Full-stack Express backend with REST API
├── index.html                      # HTML entry point with metadata
├── package.json                    # Project scripts & dependencies
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite + Tailwind CSS plugin config
└── src/
    ├── App.tsx                     # Main application entry point
    ├── main.tsx                    # React DOM root
    ├── index.css                   # Global Tailwind CSS imports
    ├── types/
    │   └── diagram.ts              # Core schemas for 20 diagram types, nodes & edges
    ├── data/
    │   ├── diagramTypesCatalog.ts  # Catalog definitions, standards & elements
    │   ├── diagramExamples.ts      # Instant starter diagram generators
    │   ├── shapeDefinitions.ts     # Shape templates for all diagram types
    │   └── seedDiagrams.ts         # Pre-seeded sample architecture diagrams
    ├── services/
    │   ├── offlineSync.ts          # Offline storage, sync queue & network detector
    │   └── collaboration.ts        # Real-time simulated presence & cursors
    └── components/
        ├── header/
        │   └── AppHeader.tsx       # Breadcrumbs, RBAC switcher, status pills
        ├── sidebar/
        │   └── ShapePaletteSidebar.tsx # Categorized shape library with search
        ├── canvas/
        │   ├── DiagramCanvas.tsx   # Pan, zoom, grid snapping, cursor rendering
        │   ├── NodeRenderer.tsx    # Node UI for 20 diagram types
        │   └── EdgeRenderer.tsx    # Orthogonal, straight, and curved connectors
        ├── inspector/
        │   └── NodeInspector.tsx   # Properties, docs, comments & hierarchy
        └── modals/
            ├── DiagramTypesGalleryModal.tsx # Showcase for 20 diagram types
            ├── GitHubPublishModal.tsx       # GitHub publishing & git CLI guide
            ├── RestApiModal.tsx             # Interactive REST API explorer
            ├── VersionHistoryModal.tsx      # Snapshots & restore timeline
            ├── OfflineSyncModal.tsx         # Mobile offline queue manager
            └── NewPageModal.tsx             # Multi-page creation modal
```

---

## License

Apache-2.0
