# PMTools

A browser-based project management suite with Gantt charts, critical path analysis, resource management, and budget tracking. No server. No signup. Data lives in your browser.

---

## Design Documentation

This repository contains the complete design package for PMTools. All documents are in the `docs/` folder.

| Document | Contents |
|---|---|
| [A — Product Specification](docs/A-product-spec.md) | User goals, workflows, screens, domain entities, business rules, scheduling logic, reporting, export formats, MVP vs future |
| [B — Technical Specification](docs/B-technical-spec.md) | Frontend architecture, state management, persistence, component structure, Gantt approach, dependency engine, budget model, export pipeline, deployment |
| [C — IA and UX Structure](docs/C-ia-ux.md) | Navigation model, screen layouts, modal patterns, key user flows, responsive behavior |
| [D — Data Model](docs/D-data-model.ts) | TypeScript interfaces for all domain objects, relationships, and the root store shape |
| [E — Build Plan](docs/E-build-plan.md) | 8-sprint MVP plan + Phase 2–5 expansion roadmap |
| [F — File/Folder Structure](docs/F-file-structure.md) | Full source tree, naming conventions, CI config |
| [G — Acceptance Criteria](docs/G-acceptance-criteria.md) | Testable criteria for all major modules |
| [H — Starter Code Plan](docs/H-starter-code-plan.md) | Exact stack, library list, installation commands, implementation order, key patterns |
| [I — Risks and Tradeoffs](docs/I-risks-tradeoffs.md) | 9 major risks with mitigations; decision rationale table |
| [J — Seed Data](docs/J-seed-data.ts) | Two complete demo projects with tasks, dependencies, milestones, resources, assignments, and budget data |
| [Product Summary](docs/product-summary.md) | One-page summary: what it is, who it's for, capabilities |
| [Feature List and MVP Scope](docs/feature-list-and-mvp.md) | Must/Should/Nice-to-have feature tiers; MVP scope definition; future iteration prompts |

---

## Quick Start (when code is ready)

```bash
npm create vite@latest pmtools -- --template react-ts
cd pmtools
npm install
npm run dev
```

See [H — Starter Code Plan](docs/H-starter-code-plan.md) for the complete installation sequence.

---

## Stack Summary

- **React 18 + TypeScript** — UI framework
- **Vite** — build tool
- **Zustand** — state management with localStorage persistence
- **TanStack Table** — headless, virtualized task table
- **Recharts** — budget burn and resource load charts
- **Custom SVG Gantt** — full control over layout, drag, and dependency arrows
- **date-fns** — working-day arithmetic
- **shadcn/ui + Tailwind CSS** — accessible component library
- **PapaParse + jsPDF + html2canvas** — CSV, PDF, and PNG export

---

## Architecture Overview

```
Browser (no server required)
├── React SPA (Vite)
│   ├── Zustand store → localStorage (persist middleware)
│   ├── Scheduling engine (pure TS, CPM forward/backward pass)
│   ├── Gantt SVG renderer (custom, draggable)
│   └── Export pipeline (CSV / JSON / PDF / PNG)
└── Static hosting (Vercel / Netlify / GitHub Pages)
```
